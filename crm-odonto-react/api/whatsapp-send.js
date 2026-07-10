// Central WhatsApp — envio de mensagem pela tela de atendimento.
// Auth: JWT do usuário logado no CRM (Authorization: Bearer <token do Supabase Auth>).
// O token da Meta NUNCA vai pro navegador: fica aqui, lido com service role.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // ── autentica o usuário do CRM ──
    const auth = req.headers.authorization || '';
    const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!jwt) return res.status(401).json({ error: 'sem token' });

    const { data: userData, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !userData?.user) return res.status(401).json({ error: 'sessão inválida' });

    const { data: profile } = await supabase.from('profiles')
      .select('id, nome, tenant_id, ativo').eq('id', userData.user.id).maybeSingle();
    if (!profile?.ativo || !profile.tenant_id) return res.status(403).json({ error: 'perfil sem acesso' });

    const { conversa_id, texto, nota } = req.body || {};
    if (!conversa_id || !texto?.trim()) return res.status(422).json({ error: 'conversa_id e texto são obrigatórios' });

    // ── conversa do próprio tenant ──
    const { data: conversa } = await supabase.from('conversas')
      .select('id, tenant_id, contato_numero, conexao_id')
      .eq('id', conversa_id).eq('tenant_id', profile.tenant_id).maybeSingle();
    if (!conversa) return res.status(404).json({ error: 'conversa não encontrada' });

    // ── nota interna: só grava, não envia ──
    if (nota) {
      const { data: msg, error } = await supabase.from('mensagens').insert({
        tenant_id: profile.tenant_id, conversa_id, direcao: 'nota', tipo: 'texto',
        conteudo: texto.trim(), autor_id: profile.id, autor_nome: profile.nome,
      }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ data: msg });
    }

    // ── envia pela Cloud API oficial ──
    const { data: cfgRow } = await supabase.from('configuracoes')
      .select('valor').eq('tenant_id', profile.tenant_id).eq('chave', 'whatsapp_config').maybeSingle();
    const wp = cfgRow?.valor;
    if (!wp?.phoneNumberId || !wp?.accessToken) {
      return res.status(409).json({ error: 'WhatsApp oficial não conectado. Configure em WhatsApp & IA → Conexão.' });
    }

    const r = await fetch(`https://graph.facebook.com/v19.0/${wp.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${wp.accessToken}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: conversa.contato_numero,
        type: 'text',
        text: { body: texto.trim() },
      }),
    });
    const j = await r.json();
    if (j.error) return res.status(502).json({ error: `Meta: ${j.error.message}` });

    const { data: msg, error } = await supabase.from('mensagens').insert({
      tenant_id: profile.tenant_id, conversa_id, direcao: 'enviada', tipo: 'texto',
      conteudo: texto.trim(), autor_id: profile.id, autor_nome: profile.nome,
      wa_msg_id: j.messages?.[0]?.id || null, status_envio: 'enviado',
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });

    await supabase.from('conversas').update({
      ultima_msg: texto.trim(), ultima_msg_at: new Date().toISOString(),
    }).eq('id', conversa_id);

    return res.status(201).json({ data: msg });
  } catch (e) {
    console.error('whatsapp-send error', e);
    return res.status(500).json({ error: 'erro interno' });
  }
}
