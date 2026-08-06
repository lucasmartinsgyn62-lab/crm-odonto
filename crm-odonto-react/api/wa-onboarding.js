// COEXISTÊNCIA META (05/08) — conclusão do Embedded Signup.
// O front abre o pop-up oficial da Meta (FB.login com config de coexistência);
// a Meta devolve um `code` + os IDs (waba_id / phone_number_id) via postMessage.
// Aqui, SÓ NO SERVIDOR: troca o code por token de business, assina o app nos
// webhooks da WABA e grava a credencial em wa_credenciais (tabela service-only —
// o token nunca volta pro navegador).
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v24.0'}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const APP_ID = process.env.META_APP_ID, APP_SECRET = process.env.META_APP_SECRET;
  if (!APP_ID || !APP_SECRET) {
    return res.status(503).json({ error: 'aguardando_credenciais_meta', detalhe: 'META_APP_ID/META_APP_SECRET ainda não configurados na Vercel' });
  }

  try {
    // ── quem está conectando (admin da clínica) ──
    const auth = req.headers.authorization || '';
    const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!jwt) return res.status(401).json({ error: 'sem_token' });
    const { data: userData, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !userData?.user) return res.status(401).json({ error: 'sessao_invalida' });
    const { data: profile } = await supabase.from('profiles')
      .select('id, nome, role, tenant_id, ativo').eq('id', userData.user.id).maybeSingle();
    if (!profile?.tenant_id || profile.ativo === false) return res.status(403).json({ error: 'sem_acesso' });
    if (profile.role !== 'admin' && profile.role !== 'super_admin') {
      return res.status(403).json({ error: 'so_admin_conecta' });
    }

    const { code, waba_id, phone_number_id } = req.body || {};
    if (!code || !waba_id || !phone_number_id) {
      return res.status(422).json({ error: 'code, waba_id e phone_number_id são obrigatórios' });
    }

    // ── 1. troca o authorization code por token de business ──
    const tk = await fetch(`${GRAPH}/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&code=${encodeURIComponent(code)}`);
    const tkJson = await tk.json().catch(() => null);
    if (!tk.ok || !tkJson?.access_token) {
      return res.status(502).json({ error: 'troca_do_code_falhou', detalhe: tkJson?.error?.message || 'sem detalhe' });
    }
    const token = tkJson.access_token;

    // ── 2. assina o nosso app nos webhooks da WABA do cliente ──
    const sub = await fetch(`${GRAPH}/${waba_id}/subscribed_apps`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    const subJson = await sub.json().catch(() => null);
    if (!sub.ok) {
      return res.status(502).json({ error: 'subscribe_falhou', detalhe: subJson?.error?.message || 'sem detalhe' });
    }

    // ── 3. dados do número (display + verificação de que pertence à WABA) ──
    let numero = null, businessId = null;
    try {
      const ph = await fetch(`${GRAPH}/${phone_number_id}?fields=display_phone_number,verified_name`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const phJson = await ph.json().catch(() => null);
      numero = phJson?.display_phone_number || null;
    } catch { /* opcional */ }
    try {
      const wb = await fetch(`${GRAPH}/${waba_id}?fields=owner_business_info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const wbJson = await wb.json().catch(() => null);
      businessId = wbJson?.owner_business_info?.id || null;
    } catch { /* opcional */ }

    // ── 4. grava a credencial (service-only) e a conexão visível na Central ──
    const { error: credErr } = await supabase.from('wa_credenciais').upsert({
      tenant_id: profile.tenant_id, business_id: businessId,
      waba_id, phone_number_id, numero, access_token: token,
      modo: 'coexistencia', conectado_por: profile.nome || profile.id,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'tenant_id' });
    if (credErr) return res.status(500).json({ error: 'gravar_credencial', detalhe: credErr.message });

    const { data: conexExistente } = await supabase.from('whatsapp_conexoes')
      .select('id').eq('tenant_id', profile.tenant_id).eq('phone_number_id', phone_number_id).maybeSingle();
    if (conexExistente) {
      await supabase.from('whatsapp_conexoes').update({ status: 'conectado', tipo: 'oficial', numero: numero || undefined })
        .eq('id', conexExistente.id);
    } else {
      await supabase.from('whatsapp_conexoes').insert({
        tenant_id: profile.tenant_id, nome: 'WhatsApp Oficial (Coexistência)', tipo: 'oficial',
        status: 'conectado', phone_number_id, numero,
      });
    }

    // auditoria (best-effort)
    supabase.from('audit_log').insert({
      tenant_id: profile.tenant_id, usuario: profile.nome, usuario_id: profile.id,
      acao: 'criou', entidade: 'whatsapp',
      descricao: `Conectou o WhatsApp oficial por Coexistência (${numero || phone_number_id})`,
    }).then(() => {}, () => {});

    return res.status(200).json({ ok: true, numero, waba_id, phone_number_id });
  } catch (e) {
    return res.status(500).json({ error: 'onboarding_falhou', detalhe: String(e?.message || e).slice(0, 200) });
  }
}
