-- ═══════════════════════════════════════════════════════════════
-- API Pública AvancerCRM — schema completo (referência versionada)
-- JÁ APLICADO em produção via Supabase MCP em 09-10/07/2026, nas migrações:
--   api_publica_keys_webhooks, fix_enqueue_webhook_teste,
--   claim_webhook_deliveries, fix_review_claim_pausado_e_pg_cron
-- Este arquivo existe para versionar o DDL no repo e permitir recriação
-- do zero (ex.: réplica do CRM para outro nicho). Idempotente.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ── Chaves de API ────────────────────────────────────────────────
create table if not exists api_keys (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  nome         text not null,
  prefix       text not null,              -- ex: avancer_live_a1b2… (exibição)
  key_hash     text not null unique,       -- sha256 hex da chave completa
  permissao    text not null default 'full' check (permissao in ('read','full')),
  ativo        boolean not null default true,
  last_used_at timestamptz,
  created_by   text,
  created_at   timestamptz default now()
);
create index if not exists idx_api_keys_tenant on api_keys(tenant_id);
alter table api_keys enable row level security;
drop policy if exists "apik_admin" on api_keys;
create policy "apik_admin" on api_keys for all
  using  (get_my_role() = 'super_admin' or (tenant_id = get_my_tenant() and get_my_role() = 'admin'))
  with check (get_my_role() = 'super_admin' or (tenant_id = get_my_tenant() and get_my_role() = 'admin'));

-- ── Endpoints de webhook ─────────────────────────────────────────
create table if not exists webhook_endpoints (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  url        text not null,
  descricao  text,
  eventos    text[] not null default '{lead.created,lead.updated,lead.stage_changed,lead.deleted}',
  secret     text not null,                -- assina HMAC-SHA256 (X-Avancer-Signature)
  ativo      boolean not null default true,
  created_at timestamptz default now()
);
create index if not exists idx_wh_endpoints_tenant on webhook_endpoints(tenant_id);
alter table webhook_endpoints enable row level security;
drop policy if exists "whe_admin" on webhook_endpoints;
create policy "whe_admin" on webhook_endpoints for all
  using  (get_my_role() = 'super_admin' or (tenant_id = get_my_tenant() and get_my_role() = 'admin'))
  with check (get_my_role() = 'super_admin' or (tenant_id = get_my_tenant() and get_my_role() = 'admin'));

-- ── Fila/log de entregas ─────────────────────────────────────────
create table if not exists webhook_deliveries (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  endpoint_id       uuid not null references webhook_endpoints(id) on delete cascade,
  evento            text not null,
  payload           jsonb not null,
  status            text not null default 'pendente' check (status in ('pendente','sucesso','falha')),
  tentativas        int  not null default 0,
  ultimo_erro       text,
  http_status       int,
  proxima_tentativa timestamptz default now(),
  delivered_at      timestamptz,
  created_at        timestamptz default now()
);
create index if not exists idx_wh_deliv_pending on webhook_deliveries(status, proxima_tentativa) where status = 'pendente';
create index if not exists idx_wh_deliv_tenant  on webhook_deliveries(tenant_id, created_at desc);
create index if not exists idx_wh_deliv_endpoint on webhook_deliveries(endpoint_id);
alter table webhook_deliveries enable row level security;
drop policy if exists "whd_admin_read" on webhook_deliveries;
create policy "whd_admin_read" on webhook_deliveries for select
  using (get_my_role() = 'super_admin' or (tenant_id = get_my_tenant() and get_my_role() = 'admin'));

-- ── Config interna (RLS sem policy = só service_role) ───────────
create table if not exists internal_config (
  chave text primary key,
  valor text not null
);
alter table internal_config enable row level security;
revoke all on internal_config from anon, authenticated;
-- Preencher manualmente (valores reais NÃO ficam no repo):
-- insert into internal_config (chave, valor) values
--   ('dispatch_secret', '<segredo aleatório — mesmo do header x-dispatch-secret>'),
--   ('dispatch_url', 'https://<projeto>.vercel.app/api/v1/webhooks/dispatch')
-- on conflict (chave) do update set valor = excluded.valor;

-- ── Enfileirar evento + acordar o dispatcher ─────────────────────
create or replace function fn_enqueue_webhook(p_tenant uuid, p_evento text, p_payload jsonb, p_endpoint uuid default null)
returns int
language plpgsql security definer set search_path = public, extensions as $$
declare
  n int := 0;
  v_url text;
  v_secret text;
begin
  insert into webhook_deliveries (tenant_id, endpoint_id, evento, payload)
  select p_tenant, e.id, p_evento,
         jsonb_build_object('event', p_evento, 'created_at', now(), 'data', p_payload)
  from webhook_endpoints e
  where e.tenant_id = p_tenant
    and e.ativo
    and (p_evento = any(e.eventos) or p_endpoint is not null)  -- teste direcionado ignora filtro
    and (p_endpoint is null or e.id = p_endpoint);
  get diagnostics n = row_count;

  if n > 0 then
    select valor into v_url    from internal_config where chave = 'dispatch_url';
    select valor into v_secret from internal_config where chave = 'dispatch_secret';
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type','application/json','x-dispatch-secret', v_secret),
      body := '{}'::jsonb
    );
  end if;
  return n;
end $$;
revoke all on function fn_enqueue_webhook(uuid, text, jsonb, uuid) from anon, authenticated;

-- ── Trigger: eventos do funil (pipeline_cards = Vendas Pipeline) ─
create or replace function fn_pipeline_cards_webhook()
returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_evento text;
  v_card jsonb;
  v_stage_old text;
  v_stage_new text;
begin
  if tg_op = 'INSERT' then
    v_evento := 'lead.created';
    select nome into v_stage_new from pipeline_colunas where id = new.coluna_id;
    v_card := to_jsonb(new) - 'tenant_id' || jsonb_build_object('stage_nome', v_stage_new);
    perform fn_enqueue_webhook(new.tenant_id, v_evento, v_card);
    return new;
  elsif tg_op = 'UPDATE' then
    if new.coluna_id is distinct from old.coluna_id then
      v_evento := 'lead.stage_changed';
      select nome into v_stage_old from pipeline_colunas where id = old.coluna_id;
      select nome into v_stage_new from pipeline_colunas where id = new.coluna_id;
      v_card := to_jsonb(new) - 'tenant_id' || jsonb_build_object(
        'stage_nome', v_stage_new,
        'stage_anterior_id', old.coluna_id,
        'stage_anterior_nome', v_stage_old);
    else
      v_evento := 'lead.updated';
      select nome into v_stage_new from pipeline_colunas where id = new.coluna_id;
      v_card := to_jsonb(new) - 'tenant_id' || jsonb_build_object('stage_nome', v_stage_new);
    end if;
    perform fn_enqueue_webhook(new.tenant_id, v_evento, v_card);
    return new;
  elsif tg_op = 'DELETE' then
    v_card := to_jsonb(old) - 'tenant_id';
    perform fn_enqueue_webhook(old.tenant_id, 'lead.deleted', v_card);
    return old;
  end if;
  return null;
end $$;

drop trigger if exists trg_pipeline_cards_webhook on pipeline_cards;
create trigger trg_pipeline_cards_webhook
  after insert or update or delete on pipeline_cards
  for each row execute function fn_pipeline_cards_webhook();

-- ── RPC: teste de webhook (botão Testar na tela) ─────────────────
create or replace function emitir_webhook_teste(p_endpoint uuid)
returns int
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_tenant uuid;
begin
  if get_my_role() not in ('admin','super_admin') then
    raise exception 'permissao negada';
  end if;
  select tenant_id into v_tenant from webhook_endpoints where id = p_endpoint;
  if v_tenant is null or (get_my_role() <> 'super_admin' and v_tenant <> get_my_tenant()) then
    raise exception 'endpoint nao encontrado';
  end if;
  return fn_enqueue_webhook(v_tenant, 'webhook.test',
    jsonb_build_object('mensagem','Teste de webhook do AvancerCRM ✅'), p_endpoint);
end $$;

-- ── Claim atômico (sem entrega duplicada; pausado fica na fila) ──
create or replace function claim_webhook_deliveries(p_batch int default 20)
returns table (id uuid, evento text, payload jsonb, tentativas int, endpoint_id uuid, url text, secret text, endpoint_ativo boolean)
language sql security definer set search_path = public as $$
  with claimed as (
    update webhook_deliveries d
    set proxima_tentativa = now() + interval '3 minutes'   -- lease: se o processo morrer, outro retoma em 3min
    where d.id in (
      select w.id from webhook_deliveries w
      join webhook_endpoints e on e.id = w.endpoint_id
      where w.status = 'pendente' and w.proxima_tentativa <= now()
        and e.ativo                                        -- pausado NÃO é claimado: espera reativação
      order by w.created_at
      limit p_batch
      for update of w skip locked
    )
    returning d.id, d.evento, d.payload, d.tentativas, d.endpoint_id
  )
  select c.id, c.evento, c.payload, c.tentativas, c.endpoint_id, e.url, e.secret, e.ativo
  from claimed c join webhook_endpoints e on e.id = c.endpoint_id;
$$;
revoke all on function claim_webhook_deliveries(int) from anon, authenticated;

-- ── pg_cron: dispatcher a cada 5 min (torna real o backoff de retry) ──
do $$
begin
  if exists (select 1 from cron.job where jobname = 'webhook-dispatch-5min') then
    perform cron.unschedule('webhook-dispatch-5min');
  end if;
  perform cron.schedule(
    'webhook-dispatch-5min',
    '*/5 * * * *',
    $job$
    select net.http_post(
      url := (select valor from internal_config where chave = 'dispatch_url'),
      headers := jsonb_build_object('Content-Type','application/json','x-dispatch-secret',
                 (select valor from internal_config where chave = 'dispatch_secret')),
      body := '{}'::jsonb
    )
    where exists (select 1 from webhook_deliveries where status = 'pendente' and proxima_tentativa <= now());
    $job$
  );
end $$;
