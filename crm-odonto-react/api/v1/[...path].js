// ═══════════════════════════════════════════════════════════════
// API Pública AvancerCRM v1 — /api/v1/*
// Auth: header  Authorization: Bearer avancer_live_xxxxx
// Docs: https://avancercrm.com.br/api-docs
// ═══════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { processarWebhooks } from '../_lib/webhook-dispatch.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LEAD_FIELDS = ['nome', 'telefone', 'email', 'valor', 'responsavel', 'origem', 'anotacoes'];
const WEBHOOK_EVENTOS = ['lead.created', 'lead.updated', 'lead.stage_changed', 'lead.deleted', 'webhook.test'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const path = [].concat(req.query.path || []);
  const rota = path.join('/');

  try {
    // ── interno: dispatcher da fila de webhooks (chamado pelo banco/pg_net) ──
    if (rota === 'webhooks/dispatch' && req.method === 'POST') {
      const { data: cfg } = await supabase.from('internal_config').select('valor').eq('chave', 'dispatch_secret').single();
      if (!cfg || req.headers['x-dispatch-secret'] !== cfg.valor) return erro(res, 401, 'unauthorized', 'Segredo interno inválido.');
      const r = await processarWebhooks(supabase);
      return res.status(200).json(r);
    }

    // ── autenticação por chave de API ──
    const auth = req.headers.authorization || '';
    const chave = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
    if (!chave) return erro(res, 401, 'missing_key', 'Envie o header: Authorization: Bearer avancer_live_...');

    const hash = crypto.createHash('sha256').update(chave).digest('hex');
    const { data: key } = await supabase.from('api_keys').select('id, tenant_id, nome, permissao, ativo, last_used_at').eq('key_hash', hash).maybeSingle();
    if (!key || !key.ativo) return erro(res, 401, 'invalid_key', 'Chave de API inválida ou revogada.');

    const escrita = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method);
    if (escrita && key.permissao !== 'full') return erro(res, 403, 'read_only_key', 'Esta chave é somente leitura.');

    // marca uso no máx. 1x/min (evita um UPDATE por request em integrações de alto volume)
    if (!key.last_used_at || Date.now() - new Date(key.last_used_at).getTime() > 60000) {
      await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id);
    }
    const t = key.tenant_id;

    // ── rotas ──
    if (rota === 'ping' && req.method === 'GET')
      return res.status(200).json({ ok: true, api: 'AvancerCRM v1', chave: key.nome, permissao: key.permissao });

    if (rota === 'stages' && req.method === 'GET') {
      const { data } = await supabase.from('pipeline_colunas').select('id, nome, cor, ordem').eq('tenant_id', t).order('ordem');
      return res.status(200).json({ data: data || [] });
    }

    if (rota === 'leads' && req.method === 'GET') return listarLeads(req, res, t);
    if (rota === 'leads' && req.method === 'POST') return criarLead(req, res, t);

    if (path[0] === 'leads' && path[1]) {
      const id = path[1];
      if (path[2] === 'stage' && req.method === 'PUT') return moverLead(req, res, t, id);
      if (!path[2] && req.method === 'GET') return pegarLead(res, t, id);
      if (!path[2] && req.method === 'PATCH') return editarLead(req, res, t, id);
      if (!path[2] && req.method === 'DELETE') return deletarLead(res, t, id);
    }

    if (rota === 'contacts' && req.method === 'GET') {
      const { limit, offset } = paginacao(req);
      // Só dados de contato — prontuário/observações clínicas NUNCA saem pela API pública
      let q = supabase.from('clientes').select('id, nome, wpp, orig, tipo, created_at', { count: 'exact' })
        .eq('tenant_id', t).range(offset, offset + limit - 1);
      if (req.query.search) q = q.ilike('nome', `%${req.query.search}%`);
      const { data, count, error } = await q;
      if (error) return erro(res, 500, 'db_error', error.message);
      return res.status(200).json({
        data: (data || []).map(c => ({ id: c.id, nome: c.nome, telefone: c.wpp, origem: c.orig, tipo: c.tipo, created_at: c.created_at })),
        total: count, limit, offset,
      });
    }

    if (rota === 'webhooks' && req.method === 'GET') {
      const { data } = await supabase.from('webhook_endpoints').select('id, url, descricao, eventos, ativo, created_at').eq('tenant_id', t).order('created_at');
      return res.status(200).json({ data: data || [] });
    }

    if (rota === 'webhooks' && req.method === 'POST') {
      const { url, eventos, descricao } = req.body || {};
      if (!url || !/^https?:\/\//.test(url)) return erro(res, 422, 'invalid_url', 'Informe uma URL http(s) válida.');
      let evs;
      if (eventos !== undefined) {
        evs = Array.isArray(eventos) ? eventos.filter(e => WEBHOOK_EVENTOS.includes(e)) : [];
        if (!evs.length) return erro(res, 422, 'invalid_events', `Nenhum evento válido. Disponíveis: ${WEBHOOK_EVENTOS.join(', ')}`);
      }
      const secret = 'whsec_' + crypto.randomBytes(24).toString('hex');
      const { data, error } = await supabase.from('webhook_endpoints')
        .insert({ tenant_id: t, url, descricao: descricao || null, ...(evs ? { eventos: evs } : {}), secret })
        .select('id, url, eventos, descricao, ativo, created_at').single();
      if (error) return erro(res, 500, 'db_error', error.message);
      return res.status(201).json({ data: { ...data, secret }, aviso: 'Guarde o secret: ele não será mostrado novamente.' });
    }

    if (path[0] === 'webhooks' && path[1] && !path[2] && req.method === 'DELETE') {
      const { error } = await supabase.from('webhook_endpoints').delete().eq('tenant_id', t).eq('id', path[1]);
      if (error) return erro(res, 500, 'db_error', error.message);
      return res.status(200).json({ ok: true });
    }

    return erro(res, 404, 'not_found', `Rota desconhecida: ${req.method} /api/v1/${rota}`);
  } catch (e) {
    console.error('api/v1 error', e);
    return erro(res, 500, 'internal_error', 'Erro interno. Tente novamente.');
  }
}

// ── helpers ─────────────────────────────────────────────────────

function erro(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

// limit 1..200 (default 50), offset >= 0 — nunca gera range invertido/negativo
function paginacao(req) {
  const limRaw = Number.parseInt(req.query.limit, 10);
  const offRaw = Number.parseInt(req.query.offset, 10);
  return {
    limit: Number.isFinite(limRaw) ? Math.min(Math.max(limRaw, 1), 200) : 50,
    offset: Number.isFinite(offRaw) ? Math.max(offRaw, 0) : 0,
  };
}

// valor: aceita number ou string numérica >= 0; ''/null viram null; resto é rejeitado
function parseValor(v) {
  if (v === '' || v === null) return { ok: true, valor: null };
  if (typeof v !== 'number' && typeof v !== 'string') return { ok: false };
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return { ok: false };
  return { ok: true, valor: n };
}

function limparCard(c, stages) {
  const { tenant_id, coluna_id, ...resto } = c;
  const st = stages?.find(s => s.id === coluna_id);
  return { ...resto, stage_id: coluna_id, stage_nome: st?.nome || null };
}

async function getStages(t) {
  const { data } = await supabase.from('pipeline_colunas').select('id, nome, ordem').eq('tenant_id', t).order('ordem');
  return data || [];
}

async function resolverStage(t, body) {
  const stages = await getStages(t);
  if (body?.stage_id) return { stage: stages.find(s => s.id === body.stage_id), stages };
  if (body?.stage_nome) {
    const alvo = String(body.stage_nome).toLowerCase().trim();
    // match exato primeiro (evita "PROPOSTA" cair em "PROPOSTA RECUSADA" quando existe "PROPOSTA")
    const exato = stages.find(s => s.nome.toLowerCase().trim() === alvo);
    return { stage: exato || stages.find(s => s.nome.toLowerCase().includes(alvo)), stages };
  }
  return { stage: stages.find(s => /leads/i.test(s.nome)) || stages[0], stages };
}

async function listarLeads(req, res, t) {
  const { limit, offset } = paginacao(req);
  let q = supabase.from('pipeline_cards').select('*', { count: 'exact' }).eq('tenant_id', t)
    .order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (req.query.stage_id) q = q.eq('coluna_id', req.query.stage_id);
  if (req.query.telefone) q = q.eq('telefone', String(req.query.telefone).replace(/\D/g, ''));
  if (req.query.search) q = q.ilike('nome', `%${req.query.search}%`);
  const { data, count, error } = await q;
  if (error) return erro(res, 500, 'db_error', error.message);
  const stages = await getStages(t);
  return res.status(200).json({ data: (data || []).map(c => limparCard(c, stages)), total: count, limit, offset });
}

async function criarLead(req, res, t) {
  const body = req.body || {};
  if (!body.nome) return erro(res, 422, 'missing_field', 'Campo obrigatório: nome');
  const { stage, stages } = await resolverStage(t, body);
  if (!stage) return erro(res, 422, 'stage_not_found', 'Etapa (stage) não encontrada. Consulte GET /api/v1/stages');

  const payload = { tenant_id: t, coluna_id: stage.id };
  for (const f of LEAD_FIELDS) if (body[f] !== undefined) payload[f] = f === 'telefone' ? String(body[f]).replace(/\D/g, '') : body[f];
  if (payload.valor !== undefined) {
    const v = parseValor(payload.valor);
    if (!v.ok) return erro(res, 422, 'invalid_value', 'Campo valor deve ser um número >= 0.');
    payload.valor = v.valor;
  }

  // dedupe opcional por telefone: ?skip_duplicates=true
  const dedupe = req.query.skip_duplicates === 'true' && payload.telefone;
  if (dedupe) {
    const { data: dup } = await supabase.from('pipeline_cards').select('id').eq('tenant_id', t).eq('telefone', payload.telefone).limit(1);
    if (dup?.length) return res.status(200).json({ data: null, duplicado: true, lead_existente_id: dup[0].id });
  }

  const { data, error } = await supabase.from('pipeline_cards').insert(payload).select().single();
  if (error) return erro(res, 500, 'db_error', error.message);

  // fecha a corrida do check-then-insert: se duas requests passaram do check juntas,
  // só o card mais antigo sobrevive — o nosso é removido e devolvemos o existente
  if (dedupe) {
    const { data: todos } = await supabase.from('pipeline_cards').select('id')
      .eq('tenant_id', t).eq('telefone', payload.telefone)
      .order('created_at', { ascending: true }).order('id', { ascending: true }).limit(2);
    if (todos?.length > 1 && todos[0].id !== data.id) {
      await supabase.from('pipeline_cards').delete().eq('id', data.id);
      return res.status(200).json({ data: null, duplicado: true, lead_existente_id: todos[0].id });
    }
  }
  return res.status(201).json({ data: limparCard(data, stages) });
}

async function pegarLead(res, t, id) {
  const { data } = await supabase.from('pipeline_cards').select('*').eq('tenant_id', t).eq('id', id).maybeSingle();
  if (!data) return erro(res, 404, 'not_found', 'Lead não encontrado.');
  const stages = await getStages(t);
  return res.status(200).json({ data: limparCard(data, stages) });
}

async function editarLead(req, res, t, id) {
  const body = req.body || {};
  const upd = { updated_at: new Date().toISOString() };
  for (const f of LEAD_FIELDS) if (body[f] !== undefined) upd[f] = f === 'telefone' ? String(body[f]).replace(/\D/g, '') : body[f];
  if (upd.valor !== undefined) {
    const v = parseValor(upd.valor);
    if (!v.ok) return erro(res, 422, 'invalid_value', 'Campo valor deve ser um número >= 0.');
    upd.valor = v.valor;
  }
  const { data, error } = await supabase.from('pipeline_cards').update(upd).eq('tenant_id', t).eq('id', id).select().maybeSingle();
  if (error) return erro(res, 500, 'db_error', error.message);
  if (!data) return erro(res, 404, 'not_found', 'Lead não encontrado.');
  const stages = await getStages(t);
  return res.status(200).json({ data: limparCard(data, stages) });
}

async function moverLead(req, res, t, id) {
  if (!req.body?.stage_id && !req.body?.stage_nome)
    return erro(res, 422, 'missing_field', 'Informe stage_id ou stage_nome no corpo. Consulte GET /api/v1/stages');
  const { stage, stages } = await resolverStage(t, req.body);
  if (!stage)
    return erro(res, 422, 'stage_not_found', 'Etapa não encontrada neste funil. Consulte GET /api/v1/stages');
  const { data, error } = await supabase.from('pipeline_cards')
    .update({ coluna_id: stage.id, updated_at: new Date().toISOString() })
    .eq('tenant_id', t).eq('id', id).select().maybeSingle();
  if (error) return erro(res, 500, 'db_error', error.message);
  if (!data) return erro(res, 404, 'not_found', 'Lead não encontrado.');
  return res.status(200).json({ data: limparCard(data, stages) });
}

async function deletarLead(res, t, id) {
  const { data, error } = await supabase.from('pipeline_cards').delete().eq('tenant_id', t).eq('id', id).select('id').maybeSingle();
  if (error) return erro(res, 500, 'db_error', error.message);
  if (!data) return erro(res, 404, 'not_found', 'Lead não encontrado.');
  return res.status(200).json({ ok: true });
}
