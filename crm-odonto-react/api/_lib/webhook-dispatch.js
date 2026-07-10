import crypto from 'crypto';

const BACKOFF_MIN = [1, 5, 30, 120, 360]; // minutos entre tentativas
const MAX_TENTATIVAS = 5;

// Processa a fila de webhook_deliveries pendentes: assina, envia e atualiza status.
// O claim é atômico (FOR UPDATE SKIP LOCKED no banco) — dispatcher em tempo real
// e varredura do cron podem rodar juntos sem entregar o mesmo evento duas vezes.
export async function processarWebhooks(supabase, batch = 20) {
  const { data: pendentes, error } = await supabase.rpc('claim_webhook_deliveries', { p_batch: batch });
  if (error) throw new Error('claim_webhook_deliveries: ' + error.message);

  let ok = 0, falhas = 0;
  for (const d of pendentes || []) {
    // O claim já filtra endpoints pausados; este guard só cobre corrida rara
    // (pausado entre o claim e o envio) — devolve pra fila em vez de descartar.
    if (!d.url || !d.endpoint_ativo) {
      await supabase.from('webhook_deliveries').update({
        status: 'pendente',
        ultimo_erro: 'endpoint pausado — aguardando reativação',
        proxima_tentativa: new Date(Date.now() + 30 * 60000).toISOString(),
      }).eq('id', d.id);
      continue;
    }
    const ep = { url: d.url, secret: d.secret };
    const body = JSON.stringify(d.payload);
    const assinatura = crypto.createHmac('sha256', ep.secret).update(body).digest('hex');

    let httpStatus = 0, erro = null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const resp = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Avancer-Event': d.evento,
          'X-Avancer-Signature': `sha256=${assinatura}`,
          'X-Avancer-Delivery': d.id,
        },
        body,
        signal: ctrl.signal,
      });
      httpStatus = resp.status;
      if (!resp.ok) erro = `HTTP ${resp.status}`;
    } catch (e) {
      erro = e.name === 'AbortError' ? 'timeout (8s)' : String(e.message || e);
    } finally {
      clearTimeout(timer);
    }

    if (!erro) {
      await supabase.from('webhook_deliveries').update({
        status: 'sucesso', http_status: httpStatus, tentativas: d.tentativas + 1,
        delivered_at: new Date().toISOString(), ultimo_erro: null,
      }).eq('id', d.id);
      ok++;
    } else {
      const tentativas = d.tentativas + 1;
      const esgotou = tentativas >= MAX_TENTATIVAS;
      const proxMin = BACKOFF_MIN[Math.min(tentativas - 1, BACKOFF_MIN.length - 1)];
      await supabase.from('webhook_deliveries').update({
        status: esgotou ? 'falha' : 'pendente',
        http_status: httpStatus || null,
        tentativas,
        ultimo_erro: erro,
        proxima_tentativa: new Date(Date.now() + proxMin * 60000).toISOString(),
      }).eq('id', d.id);
      falhas++;
    }
  }
  return { processados: (pendentes || []).length, sucesso: ok, falhas };
}
