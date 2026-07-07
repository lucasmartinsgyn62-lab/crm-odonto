import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'GET') return handleVerify(req, res);
  if (req.method === 'POST') return handleIncoming(req, res);
  return res.status(405).end();
}

// Meta chama com GET na primeira configuração do webhook no Developer Portal.
// O verify_token é por tenant (cada clínica gera o seu na aba Conexão WhatsApp),
// então validamos contra todos os tokens salvos em configuracoes.
async function handleVerify(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode !== 'subscribe' || !token) return res.status(403).end();

  const { data } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'whatsapp_config');

  const known = (data || []).some(row => row.valor?.verifyToken === token);
  if (!known) return res.status(403).end();

  return res.status(200).send(challenge);
}

async function handleIncoming(req, res) {
  // Sempre responde 200 rápido pra Meta não re-enviar o evento.
  res.status(200).json({ received: true });

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const phoneNumberId = change?.metadata?.phone_number_id;
    const message = change?.messages?.[0];
    if (!phoneNumberId || !message) return;

    const tenant = await findTenantByPhoneNumberId(phoneNumberId);
    if (!tenant) return;

    const contato = change.contacts?.[0]?.profile?.name || message.from;
    const telefone = message.from;
    const texto = message.text?.body || '';

    await supabase.from('whatsapp_logs').insert({
      tenant_id: tenant.tenant_id,
      contato,
      telefone,
      mensagem: texto,
      direcao: 'recebida',
    });

    await maybeAutoReply(tenant, telefone, contato, texto);
  } catch (err) {
    console.error('whatsapp-webhook error', err);
  }
}

async function findTenantByPhoneNumberId(phoneNumberId) {
  const { data } = await supabase
    .from('configuracoes')
    .select('tenant_id, valor')
    .eq('chave', 'whatsapp_config');

  const row = (data || []).find(r => r.valor?.phoneNumberId === phoneNumberId);
  if (!row) return null;
  return { tenant_id: row.tenant_id, whatsapp: row.valor };
}

async function maybeAutoReply(tenant, telefone, contato, textoRecebido) {
  const [{ data: aiRow }, { data: autoRow }] = await Promise.all([
    supabase.from('configuracoes').select('valor').eq('tenant_id', tenant.tenant_id).eq('chave', 'openai_config').maybeSingle(),
    supabase.from('configuracoes').select('valor').eq('tenant_id', tenant.tenant_id).eq('chave', 'automacao_config').maybeSingle(),
  ]);

  const ai = aiRow?.valor;
  const auto = autoRow?.valor;
  if (!ai?.iaAtiva || !ai?.openaiKey) return;
  if (!withinAllowedWindow(auto)) return;

  let resposta;
  let respondidoPor = 'ia';
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ai.openaiKey}` },
      body: JSON.stringify({
        model: ai.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: ai.systemPrompt || '' },
          { role: 'user', content: textoRecebido },
        ],
        temperature: parseFloat(ai.temperature ?? 0.7),
        max_tokens: 300,
      }),
    });
    const j = await r.json();
    resposta = j.choices?.[0]?.message?.content;
    if (!resposta) throw new Error(j.error?.message || 'sem resposta da IA');
  } catch {
    resposta = auto?.mensagemFallback || 'Não entendi sua mensagem. Em breve um atendente irá te ajudar! 😊';
    respondidoPor = 'humano';
  }

  await sendWhatsappMessage(tenant.whatsapp, telefone, resposta);

  await supabase.from('whatsapp_logs').insert({
    tenant_id: tenant.tenant_id,
    contato,
    telefone,
    mensagem: resposta,
    direcao: 'enviada',
    respondido_por: respondidoPor,
  });
}

function withinAllowedWindow(auto) {
  if (!auto) return false;
  if (auto.responder24h) return true;
  if (!auto.responderForaHorario) {
    const agora = new Date();
    const hora = agora.getHours() * 60 + agora.getMinutes();
    const [hi, mi] = (auto.horarioInicio || '08:00').split(':').map(Number);
    const [hf, mf] = (auto.horarioFim || '18:00').split(':').map(Number);
    if (hora < hi * 60 + mi || hora > hf * 60 + mf) return false;
  }
  return true;
}

async function sendWhatsappMessage(whatsapp, telefone, texto) {
  await fetch(`https://graph.facebook.com/v19.0/${whatsapp.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${whatsapp.accessToken}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: telefone, type: 'text', text: { body: texto } }),
  });
}
