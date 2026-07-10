import { createClient } from '@supabase/supabase-js';
import { processarWebhooks } from './_lib/webhook-dispatch.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function pad(n) { return n < 10 ? '0' + n : '' + n; }

async function sendWhatsapp(wp, telefone, texto) {
  const tel = String(telefone || '').replace(/\D/g, '');
  if (!tel) return { error: 'sem telefone' };
  const r = await fetch(`https://graph.facebook.com/v19.0/${wp.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${wp.accessToken}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: `55${tel}`,
      type: 'text',
      text: { body: texto },
    }),
  });
  const j = await r.json();
  return j.error ? { error: j.error.message } : { ok: true };
}

// Cron diário: lembra os pacientes agendados para AMANHÃ e processa follow-ups vencidos.
// Só age nos tenants que já configuraram o WhatsApp Cloud API (aba WhatsApp & IA → Conexão).
export default async function handler(req, res) {
  // Vercel envia "Authorization: Bearer <CRON_SECRET>" nos crons quando a env existe
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const resultado = { lembretes: 0, followups: 0, pulados: 0, erros: [] };
  try {
    const { data: configs } = await supabase
      .from('configuracoes').select('tenant_id, valor').eq('chave', 'whatsapp_config');

    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dataStr = `${pad(amanha.getDate())}/${pad(amanha.getMonth() + 1)}/${amanha.getFullYear()}`;

    for (const cfg of configs || []) {
      const wp = cfg.valor;
      if (!wp?.phoneNumberId || !wp?.accessToken) { resultado.pulados++; continue; }

      // 1) Lembretes de consulta de amanhã
      const { data: slots } = await supabase
        .from('agenda_slots').select('ag_key, horario, slot_data')
        .eq('tenant_id', cfg.tenant_id).like('ag_key', `%${dataStr}`);

      for (const row of slots || []) {
        const s = row.slot_data;
        if (!s?.nome || !s?.wpp) continue;
        if (['FALTOU SEM AVISO', 'FALTOU COM AVISO', 'REAGENDOU'].includes(s.status)) continue;
        if (s.lembreteEnviado) continue;
        const hora = row.horario.replace('-ENCAIXE', '');
        const dentista = row.ag_key.includes('||') ? row.ag_key.split('||')[0] : 'nossa equipe';
        const texto = `Olá ${s.nome}! 🦷 Lembrete: você tem consulta amanhã (${dataStr}) às ${hora} com ${dentista}. Responda SIM para confirmar ou entre em contato para reagendar.`;
        const r = await sendWhatsapp(wp, s.wpp, texto);
        if (r.ok) {
          resultado.lembretes++;
          await supabase.from('agenda_slots')
            .update({ slot_data: { ...s, lembreteEnviado: true } })
            .eq('tenant_id', cfg.tenant_id).eq('ag_key', row.ag_key).eq('horario', row.horario);
          await supabase.from('whatsapp_logs').insert({
            tenant_id: cfg.tenant_id, contato: s.nome, telefone: s.wpp,
            mensagem: texto, direcao: 'enviada', respondido_por: 'ia',
          });
        } else {
          resultado.erros.push(`${s.nome}: ${r.error}`);
        }
      }

      // 2) Follow-ups agendados vencidos
      const { data: envios } = await supabase
        .from('followup_envios').select('*')
        .eq('tenant_id', cfg.tenant_id).eq('status', 'agendado')
        .lte('agendado_para', new Date().toISOString());

      for (const env of envios || []) {
        const { data: seq } = env.sequencia_id
          ? await supabase.from('followup_sequencias').select('config').eq('id', env.sequencia_id).maybeSingle()
          : { data: null };
        const texto = seq?.config?.mensagem || `Olá ${env.contato}! Sentimos sua falta — que tal agendar sua próxima consulta? 😊`;
        const r = await sendWhatsapp(wp, env.telefone, texto);
        await supabase.from('followup_envios')
          .update({ status: r.ok ? 'enviado' : 'falhou', enviado_em: new Date().toISOString() })
          .eq('id', env.id);
        if (r.ok) resultado.followups++;
        else resultado.erros.push(`followup ${env.contato}: ${r.error}`);
      }
    }

    // 3) Varredura de webhooks pendentes (retries que o dispatcher em tempo real não pegou)
    try {
      resultado.webhooks = await processarWebhooks(supabase, 100);
    } catch (e) {
      resultado.erros.push(`webhooks: ${e.message}`);
    }

    return res.status(200).json(resultado);
  } catch (e) {
    return res.status(500).json({ error: e.message, ...resultado });
  }
}
