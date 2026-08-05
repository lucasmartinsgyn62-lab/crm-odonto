// PONTE DO CAUÊ (04/08) — navegador → esta função → VPS (caue-odonto-api:8790) →
// agente `caueodonto` do OpenClaw. Mesmo desenho do assistente do CRM de loja:
//  · roda como Vercel function (não Edge Function);
//  · o token da VPS NUNCA vai para o navegador — fica só no env da Vercel;
//  · a sessão do agente é por USUÁRIO + THREAD, então a memória segue a conversa.
const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SB_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const CAUE_URL = process.env.CAUE_API_URL || '';
const CAUE_TOKEN = process.env.CAUE_API_TOKEN || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'metodo' });
  if (!CAUE_URL || !CAUE_TOKEN) return res.status(500).json({ erro: 'assistente_nao_configurado' });

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ erro: 'sem_sessao' });

  const { mensagem, thread } = (typeof req.body === 'object' && req.body) || {};
  const msg = String(mensagem || '').slice(0, 2000).trim();
  if (!msg) return res.status(400).json({ erro: 'mensagem_vazia' });

  try {
    // quem está perguntando (validado no GoTrue; o perfil vem pela RLS do próprio usuário)
    const u = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` },
    });
    if (!u.ok) return res.status(401).json({ erro: 'sessao_invalida' });
    const user = await u.json();
    if (!user?.id) return res.status(401).json({ erro: 'sessao_invalida' });

    const p = await fetch(`${SB_URL}/rest/v1/profiles?select=nome,role,tenant_id,ativo&id=eq.${user.id}`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` },
    });
    const perfil = (await p.json().catch(() => []))[0];
    if (!perfil || perfil.ativo === false) return res.status(403).json({ erro: 'usuario_inativo' });

    const nome = (perfil.nome || '').split(' ')[0] || 'Doutor(a)';
    const papel = perfil.role === 'recepcao' ? 'recepção' : 'administrador da clínica';
    const sessao = `${user.id.slice(0, 12)}-${String(thread || 'p').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20)}`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 55000);
    let resposta;
    try {
      const r = await fetch(`${CAUE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-caue-token': CAUE_TOKEN },
        body: JSON.stringify({ mensagem: msg, usuario: `${nome} (${papel})`, sessao }),
        signal: ctrl.signal,
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.resposta) throw new Error(j?.detalhe || 'agente_indisponivel');
      resposta = j.resposta;
    } finally { clearTimeout(timer); }

    // histórico gravado com o JWT do próprio usuário (a RLS carimba a clínica dele)
    fetch(`${SB_URL}/rest/v1/caue_conversas`, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: perfil.tenant_id, usuario_id: user.id, thread: thread || null, pergunta: msg, resposta }),
    }).catch(() => { /* o histórico é bônus: nunca derruba a resposta */ });

    return res.status(200).json({ resposta });
  } catch (e) {
    const timeout = e?.name === 'AbortError';
    return res.status(timeout ? 504 : 502).json({
      erro: timeout ? 'demorou' : 'agente_indisponivel',
      detalhe: String(e?.message || e).slice(0, 200),
    });
  }
}
