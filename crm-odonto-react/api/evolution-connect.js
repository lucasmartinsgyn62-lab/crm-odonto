// Ações de conexão QR (Evolution API) chamadas pela tela do admin.
// Auth: JWT do usuário (admin do tenant). A api_key da Evolution fica no banco
// (evolution_config) e nunca vai pro browser — este backend faz o proxy.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const WEBHOOK_URL = 'https://crm-odonto-react.vercel.app/api/evolution-webhook';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const auth = req.headers.authorization || '';
    const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!jwt) return res.status(401).json({ error: 'sem token' });
    const { data: userData, error: aerr } = await supabase.auth.getUser(jwt);
    if (aerr || !userData?.user) return res.status(401).json({ error: 'sessão inválida' });
    const { data: profile } = await supabase.from('profiles')
      .select('id, nome, tenant_id, role, ativo').eq('id', userData.user.id).maybeSingle();
    if (!profile?.ativo || profile.role !== 'admin') return res.status(403).json({ error: 'somente admin' });

    const t = profile.tenant_id;
    const { acao, nome, setor, conexao_id } = req.body || {};

    const { data: cfg } = await supabase.from('evolution_config')
      .select('base_url, api_key').eq('tenant_id', t).maybeSingle();
    if (!cfg?.base_url || !cfg?.api_key) {
      return res.status(409).json({ error: 'Evolution API não configurada. Cadastre a URL do VPS e a API key primeiro.' });
    }
    const base = cfg.base_url.replace(/\/$/, '');
    const H = { 'Content-Type': 'application/json', apikey: cfg.api_key };

    // ── criar nova conexão + gerar QR ──
    if (acao === 'conectar') {
      if (!nome?.trim()) return res.status(422).json({ error: 'informe o nome/funcionário' });
      const instancia = `avancer_${t.slice(0, 8)}_${Date.now().toString(36)}`;

      const r = await fetch(`${base}/instance/create`, {
        method: 'POST', headers: H,
        body: JSON.stringify({
          instanceName: instancia, qrcode: true, integration: 'WHATSAPP-BAILEYS',
          webhook: {
            url: WEBHOOK_URL, byEvents: false,
            events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE', 'MESSAGES_UPSERT'],
          },
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return res.status(502).json({ error: `Evolution: ${j?.message || r.status}` });

      const qr = j?.qrcode?.base64 || j?.qrcode?.code || null;
      const { data: conexao } = await supabase.from('whatsapp_conexoes').insert({
        tenant_id: t, nome: nome.trim(), tipo: 'qr', setor: setor || null,
        status: 'pendente', instancia, evo_base_url: base, qr_code: qr,
        evo_updated_at: new Date().toISOString(),
      }).select('id, instancia').single();
      return res.status(201).json({ conexao_id: conexao.id, qr_code: qr });
    }

    // ── reobter QR de uma conexão pendente ──
    if (acao === 'atualizar_qr') {
      const { data: cx } = await supabase.from('whatsapp_conexoes')
        .select('instancia').eq('id', conexao_id).eq('tenant_id', t).maybeSingle();
      if (!cx) return res.status(404).json({ error: 'conexão não encontrada' });
      const r = await fetch(`${base}/instance/connect/${cx.instancia}`, { headers: H });
      const j = await r.json().catch(() => ({}));
      const qr = j?.base64 || j?.qrcode?.base64 || null;
      if (qr) await supabase.from('whatsapp_conexoes').update({ qr_code: qr, evo_updated_at: new Date().toISOString() }).eq('id', conexao_id);
      return res.status(200).json({ qr_code: qr });
    }

    // ── desconectar / remover ──
    if (acao === 'desconectar') {
      const { data: cx } = await supabase.from('whatsapp_conexoes')
        .select('instancia').eq('id', conexao_id).eq('tenant_id', t).maybeSingle();
      if (!cx) return res.status(404).json({ error: 'conexão não encontrada' });
      await fetch(`${base}/instance/logout/${cx.instancia}`, { method: 'DELETE', headers: H }).catch(() => {});
      await fetch(`${base}/instance/delete/${cx.instancia}`, { method: 'DELETE', headers: H }).catch(() => {});
      await supabase.from('whatsapp_conexoes').update({ status: 'desconectado', qr_code: null }).eq('id', conexao_id);
      return res.status(200).json({ ok: true });
    }

    return res.status(422).json({ error: 'ação desconhecida' });
  } catch (e) {
    console.error('evolution-connect error', e);
    return res.status(500).json({ error: 'erro interno' });
  }
}
