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
      .select('id, tenant_id, nome, numero, status')
      .eq('instancia', instancia).maybeSingle();
    if (!conexao) return;

    // Segurança: a instância só existe se foi criada pelo CRM e seu nome é aleatório
    // (avancer_<tenant8>_<timestamp36>) — funciona como segredo compartilhado, então a
    // conexão só é encontrada por quem conhece o nome. NÃO validamos o apikey do webhook:
    // a Evolution manda o HASH da instância (não a key global), então comparar rejeitaria tudo.

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
      // MODO MONITORAMENTO: capturamos AMBOS os lados.
      //  - fromMe=false → mensagem que o cliente mandou pro funcionário (recebida)
      //  - fromMe=true  → resposta que o FUNCIONÁRIO deu pelo celular dele (enviada)
      // Assim o admin vê a conversa inteira, dos dois lados, na Central.
      const msgs = Array.isArray(body.data) ? body.data : [body.data];
      for (const m of msgs) {
        if (!m?.key) continue;
        const jid = m.key.remoteJid || '';
        if (jid.endsWith('@g.us') || jid === 'status@broadcast') continue; // ignora grupos e status
        const doFuncionario = !!m.key.fromMe;
        const telefone = jid.split('@')[0];                  // o contato (cliente) é sempre o remoteJid
        const nomeContato = m.pushName || telefone;
        const { tipo, texto } = extrair(m.message);
        const waId = m.key.id;

        const conversa = await garantirConversa(conexao.tenant_id, conexao.id, telefone, nomeContato);
        const { error } = await supabase.from('mensagens').insert({
          tenant_id: conexao.tenant_id, conversa_id: conversa.id,
          direcao: doFuncionario ? 'enviada' : 'recebida',
          tipo, conteudo: texto, wa_msg_id: waId,
          autor_nome: doFuncionario ? conexao.nome : null, // nome do funcionário na bolha enviada
        });
        if (error) { if (error.code !== '23505') console.error('evo msg:', error.message); continue; }

        await supabase.from('conversas').update({
          ...(doFuncionario ? {} : { contato_nome: nomeContato }),
          ultima_msg: texto, ultima_msg_at: new Date().toISOString(),
          // só conta "não lida" quando é o cliente que fala; resposta do funcionário não é pendência
          ...(doFuncionario ? {} : { nao_lidas: (conversa.nao_lidas || 0) + 1 }),
          ...(!doFuncionario && conversa.status === 'resolvida' ? { status: 'aberta' } : {}),
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
