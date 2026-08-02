-- =============================================================
-- Nicho ODONTO — tabelas que faltavam no banco do AvancerCRM para as telas
-- "WhatsApp & IA" e "API & Integrações" não quebrarem.
-- Portado de crm-odonto-react/supabase/{whatsapp,api_publica}_schema.sql,
-- SEM as extensões, o disparador HTTP e o cron job do arquivo original
-- (aqui é demonstração — nada dispara de verdade).
-- =============================================================

-- ── WhatsApp & IA ───────────────────────────────────────────────
create table if not exists public.whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  contato text not null, telefone text, mensagem text,
  direcao text not null check (direcao in ('recebida','enviada')),
  respondido_por text check (respondido_por in ('ia','humano')),
  created_at timestamptz default now()
);
create table if not exists public.disparos_massa (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  campanha text not null, contato text not null, telefone text not null,
  status text not null check (status in ('enviado','falhou')),
  erro text, enviado_em timestamptz default now()
);
create table if not exists public.followup_sequencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  nome text not null, gatilho text not null, ativo boolean default true,
  etapas jsonb not null default '[]'::jsonb, created_at timestamptz default now()
);
create table if not exists public.followup_envios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  sequencia_id uuid references public.followup_sequencias(id) on delete cascade,
  contato text, telefone text, etapa int default 0,
  status text default 'pendente', agendado_para timestamptz, enviado_em timestamptz,
  created_at timestamptz default now()
);

-- ── API & Integrações ───────────────────────────────────────────
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null, prefix text not null, key_hash text not null unique,
  permissao text not null default 'full' check (permissao in ('read','full')),
  ativo boolean not null default true, last_used_at timestamptz,
  created_by text, created_at timestamptz default now()
);
create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  url text not null, descricao text,
  eventos text[] not null default '{lead.created,lead.updated,lead.stage_changed,lead.deleted}',
  secret text not null, ativo boolean not null default true,
  created_at timestamptz default now()
);
create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  evento text not null, payload jsonb not null,
  status text not null default 'pendente' check (status in ('pendente','sucesso','falha')),
  tentativas int not null default 0, ultimo_erro text, http_status int,
  proxima_tentativa timestamptz default now(), delivered_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_wpp_logs_tenant on public.whatsapp_logs(tenant_id, created_at desc);
create index if not exists idx_disparos_tenant on public.disparos_massa(tenant_id, enviado_em desc);
create index if not exists idx_fup_env_seq on public.followup_envios(sequencia_id);
create index if not exists idx_api_keys_tenant on public.api_keys(tenant_id);
create index if not exists idx_wh_endpoints_tenant on public.webhook_endpoints(tenant_id);
create index if not exists idx_wh_deliv_tenant on public.webhook_deliveries(tenant_id, created_at desc);

-- ── RLS: cada clínica só enxerga o que é dela ───────────────────
do $$
declare t text;
begin
  foreach t in array array['whatsapp_logs','disparos_massa','followup_sequencias','followup_envios'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_tenant" on public.%I', t, t);
    execute format($p$create policy "%s_tenant" on public.%I for all
      using (tenant_id = get_my_tenant() or get_my_role() = 'super_admin')
      with check (tenant_id = get_my_tenant() or get_my_role() = 'super_admin')$p$, t, t);
  end loop;
  foreach t in array array['api_keys','webhook_endpoints'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_admin" on public.%I', t, t);
    execute format($p$create policy "%s_admin" on public.%I for all
      using (get_my_role() = 'super_admin' or (tenant_id = get_my_tenant() and get_my_role() = 'admin'))
      with check (get_my_role() = 'super_admin' or (tenant_id = get_my_tenant() and get_my_role() = 'admin'))$p$, t, t);
  end loop;
end $$;
alter table public.webhook_deliveries enable row level security;
drop policy if exists "whd_admin_read" on public.webhook_deliveries;
create policy "whd_admin_read" on public.webhook_deliveries for select
  using (get_my_role() = 'super_admin' or (tenant_id = get_my_tenant() and get_my_role() = 'admin'));

-- Teste de webhook em modo DEMONSTRAÇÃO: registra a entrega, não sai da rede.
create or replace function public.emitir_webhook_teste(p_endpoint uuid)
returns uuid language plpgsql security invoker as $$
declare v_id uuid; v_tenant uuid;
begin
  select tenant_id into v_tenant from public.webhook_endpoints where id = p_endpoint;
  if v_tenant is null then raise exception 'endpoint não encontrado'; end if;
  insert into public.webhook_deliveries (tenant_id, endpoint_id, evento, payload, status, tentativas, http_status, delivered_at)
  values (v_tenant, p_endpoint, 'ping.test',
          jsonb_build_object('evento','ping.test','origem','painel','enviado_em', now()),
          'sucesso', 1, 200, now())
  returning id into v_id;
  return v_id;
end $$;
