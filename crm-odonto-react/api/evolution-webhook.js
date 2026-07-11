// Recebe eventos da Evolution API (WhatsApp via QR Code, rodando no VPS).
// Adapta os eventos para as MESMAS tabelas da Central (whatsapp_conexoes/conversas/mensagens),
// então a tela não distingue conexão oficial de conexão por QR.
// Segurança: a Evolution manda o header 'apikey' (global) — validamos contra evolution_config.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  res.status(200).json({ received: true }); // responde rápido; processa depois

  try {
    const body = req.body || {};
    const evento = body.event || body.type;
    const instancia = body.instance || body.instanceName;
    if (!instancia) return;

    // acha a conexão + tenant pela instância
    const { data: conexao } = await supabase.from('whatsapp_conexoes')
      .select('id, tenant_id, contato_nome, numero, status')
      .eq('instancia', instancia).maybeSingle();
    if (!conexao) return;

    // valida a apikey global do tenant (defesa: só a Evolution do cliente escreve)
    const { data: cfg } = await supabase.from('evolution_config')
      .select('api_key').eq('tenant_id', conexao.tenant_id).maybeSingle();
    const apikey = req.headers['apikey'] || req.headers['x-api-key'];
    if (!cfg || !apikey || apikey !== cfg.api_key) return;

    const ev = String(evento || '').toLowerCase().replace(/\./g, '_');

    if (ev === 'qrcode_updated') {
      const qr = body.data?.qrcode?.base64 || body.data?.base64 || body.data?.qrcode;
      await supabase.from('whatsapp_conexoes')
        .update({ qr_code: qr, status: 'pendente', evo_updated_at: new Date().toISOString() })
        .eq('id', conexao.id);
      return;
    }

    if (ev === 'connection_update') {
      const state = body.data?.state || body.data?.connection;
      const map = { open: 'conectado', connecting: 'pendente', close: 'desconectado' };
      const status = map[state] || 'pendente';
      const numero = body.data?.wuid?.split?.('@')?.[0] || conexao.numero;
      await supabase.from('whatsapp_conexoes')
        .update({ status, numero, qr_code: status === 'conectado' ? null : undefined, evo_updated_at: new Date().toISOString() })
        .eq('id', conexao.id);
      return;
    }

    if (ev === 'messages_upsert') {
      const msgs = Array.isArray(body.data) ? body.data : [body.data];
      for (const m of msgs) {
        if (!m?.key || m.key.fromMe) continue;               // ignora o que o próprio número enviou
        const jid = m.key.remoteJid || '';
        if (jid.endsWith('@g.us')) continue;                 // ignora grupos
        const telefone = jid.split('@')[0];
        const nome = m.pushName || telefone;
        const { tipo, texto } = extrair(m.message);
        const waId = m.key.id;

        const conversa = await garantirConversa(conexao.tenant_id, conexao.id, telefone, nome);
        const { error } = await supabase.from('mensagens').insert({
          tenant_id: conexao.tenant_id, conversa_id: conversa.id,
          direcao: 'recebida', tipo, conteudo: texto, wa_msg_id: waId,
        });
        if (error) { if (error.code !== '23505') console.error('evo msg:', error.message); continue; }

        await supabase.from('conversas').update({
          contato_nome: nome, ultima_msg: texto, ultima_msg_at: new Date().toISOString(),
          nao_lidas: (conversa.nao_lidas || 0) + 1,
          ...(conversa.status === 'resolvida' ? { status: 'aberta' } : {}),
        }).eq('id', conversa.id);
      }
      return;
    }
  } catch (e) {
    console.error('evolution-webhook error', e);
  }
}

function extrair(message) {
  if (!message) return { tipo: 'outro', texto: '' };
  if (message.conversation) return { tipo: 'texto', texto: message.conversation };
  if (message.extendedTextMessage) return { tipo: 'texto', texto: message.extendedTextMessage.text || '' };
  if (message.imageMessage) return { tipo: 'imagem', texto: message.imageMessage.caption || '📷 Imagem' };
  if (message.audioMessage) return { tipo: 'audio', texto: '🎤 Áudio' };
  if (message.videoMessage) return { tipo: 'video', texto: message.videoMessage.caption || '🎬 Vídeo' };
  if (message.documentMessage) return { tipo: 'documento', texto: `📎 ${message.documentMessage.fileName || 'Documento'}` };
  return { tipo: 'outro', texto: '[mensagem]' };
}

async function garantirConversa(tenantId, conexaoId, telefone, nome) {
  const { data: existente } = await supabase.from('conversas')
    .select('id, nao_lidas, status')
    .eq('tenant_id', tenantId).eq('conexao_id', conexaoId).eq('contato_numero', telefone)
    .maybeSingle();
  if (existente) return existente;
  const { data: nova } = await supabase.from('conversas').insert({
    tenant_id: tenantId, conexao_id: conexaoId, contato_numero: telefone,
    contato_nome: nome, status: 'aberta', nao_lidas: 0,
  }).select('id, nao_lidas, status').single();
  return nova;
}
