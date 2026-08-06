import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// COEXISTÊNCIA (05/08): o corpo precisa chegar CRU para validar a assinatura
// X-Hub-Signature-256 da Meta (o parser da Vercel mudaria os bytes).
export const config = { api: { bodyParser: false } };

function lerCorpoCru(req) {
  return new Promise((resolve, reject) => {
    const partes = [];
    req.on('data', c => partes.push(c));
    req.on('end', () => resolve(Buffer.concat(partes)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method === 'GET') return handleVerify(req, res);
  if (req.method === 'POST') return handleIncoming(req, res);
  return res.status(405).end();
}

// Meta chama com GET na primeira configuração do webhook no Developer Portal.
// Com a Coexistência o webhook é configurado UMA vez no nível do app
// (META_VERIFY_TOKEN); os tokens por clínica seguem valendo (legado Cloud API).
async function handleVerify(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode !== 'subscribe' || !token) return res.status(403).end();

  if (process.env.META_VERIFY_TOKEN && token === process.env.META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  const { data } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'whatsapp_config');

  const known = (data || []).some(row => row.valor?.verifyToken === token);
  if (!known) return res.status(403).end();

  return res.status(200).send(challenge);
}

async function handleIncoming(req, res) {
  // Na Vercel a função congela ao responder — processa ANTES de responder,
  // senão as gravações (mensagens/conversas) não completam. É rápido (<2s).
  try {
    const bruto = await lerCorpoCru(req);

    // Assinatura da Meta: obrigatória quando o APP_SECRET estiver configurado.
    if (process.env.META_APP_SECRET) {
      const recebida = String(req.headers['x-hub-signature-256'] || '');
      const esperada = 'sha256=' + crypto.createHmac('sha256', process.env.META_APP_SECRET).update(bruto).digest('hex');
      const ok = recebida.length === esperada.length &&
        crypto.timingSafeEqual(Buffer.from(recebida), Buffer.from(esperada));
      if (!ok) return res.status(401).end();
    }

    let body;
    try { body = JSON.parse(bruto.toString('utf8')); } catch { return res.status(400).end(); }

    // Percorre TODOS os eventos do lote (a Meta agrupa entries/changes)
    for (const entry of body?.entry || []) {
      for (const ch of entry.changes || []) {
        await processarChange(ch?.value);
      }
    }
  } catch (err) {
    console.error('whatsapp-webhook error', err);
  }
  return res.status(200).json({ received: true });
}

async function processarChange(change) {
  const phoneNumberId = change?.metadata?.phone_number_id;
  if (!phoneNumberId) return;

  const tenant = await findTenantByPhoneNumberId(phoneNumberId);
  if (!tenant) return;

  try {
    // Atualizações de status de mensagens enviadas (entregue/lido/erro)
    for (const st of change.statuses || []) {
      await atualizarStatus(tenant.tenant_id, st);
    }

    // ECO DO CELULAR (coexistência): mensagem que a clínica mandou pelo APP do
    // WhatsApp no telefone chega aqui espelhada — entra como 'enviada', sem
    // contar não-lida, para a Central mostrar a conversa completa.
    for (const eco of change.message_echoes || []) {
      await registrarEco(tenant, phoneNumberId, change, eco);
    }

    for (const message of change.messages || []) {
      const contato = change.contacts?.find(c => c.wa_id === message.from)?.profile?.name
        || change.contacts?.[0]?.profile?.name || message.from;
      const telefone = message.from;
      const { tipo, texto } = extrairConteudo(message);

      // ── Central WhatsApp: conexão → conversa → mensagem ──
      const conexao = await garantirConexao(tenant.tenant_id, phoneNumberId, change.metadata?.display_phone_number);
      const conversa = await garantirConversa(tenant.tenant_id, conexao.id, telefone, contato);

      // insert simples: o índice único (tenant_id, wa_msg_id) barra reentregas da Meta (23505)
      const { error: msgErr } = await supabase.from('mensagens').insert({
        tenant_id: tenant.tenant_id,
        conversa_id: conversa.id,
        direcao: 'recebida',
        tipo,
        conteudo: texto,
        wa_msg_id: message.id,
      });
      if (msgErr) {
        if (msgErr.code !== '23505') console.error('mensagens insert:', msgErr.message);
        continue; // duplicata reentregue pela Meta: não conta não-lida nem atualiza preview de novo
      }

      await supabase.from('conversas').update({
        contato_nome: contato,
        ultima_msg: texto,
        ultima_msg_at: new Date().toISOString(),
        nao_lidas: (conversa.nao_lidas || 0) + 1,
        ...(conversa.status === 'resolvida' ? { status: 'aberta' } : {}),
      }).eq('id', conversa.id);

      // Log legado (relatórios da aba WhatsApp & IA continuam funcionando)
      await supabase.from('whatsapp_logs').insert({
        tenant_id: tenant.tenant_id,
        contato,
        telefone,
        mensagem: texto,
        direcao: 'recebida',
      });

      await maybeAutoReply(tenant, telefone, contato, texto, conversa.id);
    }
  } catch (err) {
    console.error('whatsapp-webhook change error', err);
  }
}

// Coexistência: eco de mensagem enviada pelo APP do WhatsApp no celular.
// `eco.to` é o paciente; grava como 'enviada' sem mexer nas não-lidas.
async function registrarEco(tenant, phoneNumberId, change, eco) {
  try {
    const telefone = eco.to;
    if (!telefone) return;
    const { tipo, texto } = extrairConteudo(eco);
    const conexao = await garantirConexao(tenant.tenant_id, phoneNumberId, change.metadata?.display_phone_number);
    const conversa = await garantirConversa(tenant.tenant_id, conexao.id, telefone, telefone);

    const { error: msgErr } = await supabase.from('mensagens').insert({
      tenant_id: tenant.tenant_id,
      conversa_id: conversa.id,
      direcao: 'enviada',
      tipo,
      conteudo: texto,
      autor_nome: '📱 Celular da clínica',
      wa_msg_id: eco.id,
      status_envio: 'enviado',
    });
    if (msgErr) return; // 23505 = eco reentregue

    await supabase.from('conversas').update({
      ultima_msg: texto,
      ultima_msg_at: new Date().toISOString(),
    }).eq('id', conversa.id);
  } catch (e) {
    console.error('eco error', e);
  }
}

function extrairConteudo(message) {
  switch (message.type) {
    case 'text':     return { tipo: 'texto',     texto: message.text?.body || '' };
    case 'image':    return { tipo: 'imagem',    texto: message.image?.caption || '📷 Imagem' };
    case 'audio':    return { tipo: 'audio',     texto: '🎤 Áudio' };
    case 'video':    return { tipo: 'video',     texto: message.video?.caption || '🎬 Vídeo' };
    case 'document': return { tipo: 'documento', texto: `📎 ${message.document?.filename || 'Documento'}` };
    case 'button':   return { tipo: 'texto',     texto: message.button?.text || '' };
    case 'interactive': return { tipo: 'texto',  texto: message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '' };
    default:         return { tipo: 'outro',     texto: `[${message.type}]` };
  }
}

async function atualizarStatus(tenantId, st) {
  const mapa = { sent: 'enviado', delivered: 'entregue', read: 'lido', failed: 'erro' };
  const status = mapa[st.status];
  if (!status || !st.id) return;
  const upd = { status_envio: status };
  if (status === 'erro') upd.erro = st.errors?.[0]?.title || 'falha no envio';
  await supabase.from('mensagens').update(upd).eq('tenant_id', tenantId).eq('wa_msg_id', st.id);
}

async function garantirConexao(tenantId, phoneNumberId, numeroDisplay) {
  const { data: existente } = await supabase.from('whatsapp_conexoes')
    .select('id').eq('tenant_id', tenantId).eq('phone_number_id', phoneNumberId).maybeSingle();
  if (existente) {
    await supabase.from('whatsapp_conexoes').update({ status: 'conectado' }).eq('id', existente.id);
    return existente;
  }
  const { data: nova } = await supabase.from('whatsapp_conexoes').insert({
    tenant_id: tenantId,
    nome: 'WhatsApp Oficial',
    tipo: 'oficial',
    status: 'conectado',
    phone_number_id: phoneNumberId,
    numero: numeroDisplay || null,
  }).select('id').single();
  return nova;
}

async function garantirConversa(tenantId, conexaoId, telefone, contato) {
  const { data: existente } = await supabase.from('conversas')
    .select('id, nao_lidas, status')
    .eq('tenant_id', tenantId).eq('conexao_id', conexaoId).eq('contato_numero', telefone)
    .maybeSingle();
  if (existente) return existente;

  const { data: nova } = await supabase.from('conversas').insert({
    tenant_id: tenantId,
    conexao_id: conexaoId,
    contato_numero: telefone,
    contato_nome: contato,
    status: 'aberta',
    nao_lidas: 0, // o caller incrementa quando a mensagem realmente entra
  }).select('id, nao_lidas, status').single();
  return nova;
}

async function findTenantByPhoneNumberId(phoneNumberId) {
  // 1º: credencial da COEXISTÊNCIA (server-side, gravada pelo Embedded Signup)
  const { data: cred } = await supabase.from('wa_credenciais')
    .select('tenant_id, phone_number_id, access_token')
    .eq('phone_number_id', phoneNumberId).maybeSingle();
  if (cred) return { tenant_id: cred.tenant_id, whatsapp: { phoneNumberId: cred.phone_number_id, accessToken: cred.access_token } };

  // legado: Cloud API configurada na mão (configuracoes.whatsapp_config)
  const { data } = await supabase
    .from('configuracoes')
    .select('tenant_id, valor')
    .eq('chave', 'whatsapp_config');

  const row = (data || []).find(r => r.valor?.phoneNumberId === phoneNumberId);
  if (!row) return null;
  return { tenant_id: row.tenant_id, whatsapp: row.valor };
}

async function maybeAutoReply(tenant, telefone, contato, textoRecebido, conversaId) {
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

  const envio = await sendWhatsappMessage(tenant.whatsapp, telefone, resposta);

  // Resposta da IA também aparece na Central WhatsApp
  if (conversaId) {
    await supabase.from('mensagens').insert({
      tenant_id: tenant.tenant_id,
      conversa_id: conversaId,
      direcao: 'enviada',
      tipo: 'texto',
      conteudo: resposta,
      autor_nome: respondidoPor === 'ia' ? '🤖 IA' : 'Automático',
      wa_msg_id: envio?.messages?.[0]?.id || null,
    });
    await supabase.from('conversas').update({
      ultima_msg: resposta,
      ultima_msg_at: new Date().toISOString(),
    }).eq('id', conversaId);
  }

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
  const r = await fetch(`https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v24.0'}/${whatsapp.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${whatsapp.accessToken}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: telefone, type: 'text', text: { body: texto } }),
  });
  try { return await r.json(); } catch { return null; }
}
