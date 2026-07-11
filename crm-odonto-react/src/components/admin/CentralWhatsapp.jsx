import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useCRM } from '../../context/CRMContext';

const STATUS_TABS = [
  { id: 'aberta',    label: 'Abertas' },
  { id: 'pendente',  label: 'Pendentes' },
  { id: 'resolvida', label: 'Resolvidas' },
  { id: 'todas',     label: 'Todas' },
];

function horaCurta(d) {
  if (!d) return '';
  const dt = new Date(d);
  const hoje = new Date().toDateString() === dt.toDateString();
  return hoje ? dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
function iniciais(nome) { return (nome || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(); }

export default function CentralWhatsapp() {
  const { usuario, showToast } = useCRM();
  const tenantId = usuario?.tenant_id;
  const isAdmin = usuario?.role === 'admin';

  const [conversas, setConversas] = useState([]);
  const [mensagens, setMensagens] = useState([]);      // da conversa aberta
  const [conexoes, setConexoes] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [filas, setFilas] = useState([]);
  const [rapidas, setRapidas] = useState([]);
  const [ativa, setAtiva] = useState(null);            // conversa aberta (objeto)
  const [tab, setTab] = useState('aberta');
  const [busca, setBusca] = useState('');
  const [filtroFila, setFiltroFila] = useState('');
  const [filtroAtend, setFiltroAtend] = useState('');
  const [filtroConexao, setFiltroConexao] = useState(''); // = filtrar por funcionário (WhatsApp)
  const [texto, setTexto] = useState('');
  const [modoNota, setModoNota] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [painelContato, setPainelContato] = useState(true);
  const [pacienteVinculado, setPacienteVinculado] = useState(null);
  const [showConfig, setShowConfig] = useState(false); // gerenciar filas/respostas rápidas

  const fimRef = useRef(null);
  const ativaRef = useRef(null);
  ativaRef.current = ativa;

  // ── carga inicial ──────────────────────────────────────────
  useEffect(() => { if (tenantId) init(); }, [tenantId]);

  async function init() {
    setLoading(true);
    const [cv, cx, eq, fl, rr] = await Promise.all([
      supabase.from('conversas').select('*').order('ultima_msg_at', { ascending: false }).limit(300),
      supabase.from('whatsapp_conexoes').select('id, nome, tipo, setor, status, numero'),
      supabase.from('profiles').select('id, nome, role').eq('ativo', true),
      supabase.from('whatsapp_filas').select('*').order('ordem'),
      supabase.from('respostas_rapidas').select('*').order('atalho'),
    ]);
    setConversas(cv.data || []);
    setConexoes(cx.data || []);
    setEquipe(eq.data || []);
    setFilas(fl.data || []);
    setRapidas(rr.data || []);
    setLoading(false);
  }

  // ── realtime: conversas e mensagens ao vivo ────────────────
  useEffect(() => {
    if (!tenantId) return;
    const ch = supabase.channel(`central-${tenantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversas', filter: `tenant_id=eq.${tenantId}` }, payload => {
        setConversas(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(c => c.id !== payload.old.id);
          const nova = payload.new;
          const sem = prev.filter(c => c.id !== nova.id);
          return [...sem, nova].sort((a, b) => new Date(b.ultima_msg_at) - new Date(a.ultima_msg_at));
        });
        if (payload.eventType === 'UPDATE' && ativaRef.current?.id === payload.new.id) {
          setAtiva(a => ({ ...a, ...payload.new }));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `tenant_id=eq.${tenantId}` }, payload => {
        const m = payload.new;
        if (ativaRef.current?.id === m.conversa_id) {
          setMensagens(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
          marcarLida(m.conversa_id);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensagens', filter: `tenant_id=eq.${tenantId}` }, payload => {
        if (ativaRef.current?.id === payload.new.conversa_id) {
          setMensagens(prev => prev.map(x => x.id === payload.new.id ? payload.new : x));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tenantId]);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensagens]);

  // ── abrir conversa ─────────────────────────────────────────
  async function abrirConversa(c) {
    setAtiva(c);
    setMensagens([]);
    setPacienteVinculado(null);
    const { data } = await supabase.from('mensagens').select('*')
      .eq('conversa_id', c.id).order('created_at').limit(500);
    setMensagens(data || []);
    if (c.nao_lidas > 0) marcarLida(c.id);
    // paciente com esse telefone?
    const tel = (c.contato_numero || '').replace(/\D/g, '').slice(-8);
    if (tel.length >= 8) {
      const { data: pac } = await supabase.from('clientes').select('id, nome, wpp').ilike('wpp', `%${tel}`).limit(1);
      if (pac?.length) setPacienteVinculado(pac[0]);
    }
  }

  async function marcarLida(conversaId) {
    await supabase.from('conversas').update({ nao_lidas: 0 }).eq('id', conversaId);
    setConversas(prev => prev.map(c => c.id === conversaId ? { ...c, nao_lidas: 0 } : c));
  }

  // ── enviar ─────────────────────────────────────────────────
  async function enviar() {
    const msg = texto.trim();
    if (!msg || !ativa || enviando) return;
    setEnviando(true);
    try {
      // Nota interna não passa pelo WhatsApp — grava direto (RLS por tenant)
      if (modoNota) {
        const { data, error } = await supabase.from('mensagens').insert({
          tenant_id: tenantId, conversa_id: ativa.id, direcao: 'nota', tipo: 'texto',
          conteudo: msg, autor_id: usuario.id, autor_nome: usuario.nome,
        }).select().single();
        if (error) { showToast('Erro: ' + error.message, 'error'); return; }
        setTexto('');
        setMensagens(prev => prev.some(x => x.id === data.id) ? prev : [...prev, data]);
        return;
      }
      // Mensagem real sai pela função serverless (token da Meta nunca vem pro navegador)
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch('/api/whatsapp-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess?.session?.access_token}` },
        body: JSON.stringify({ conversa_id: ativa.id, texto: msg }),
      });
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        showToast('Envio real funciona no site publicado (a função /api não roda no ambiente de desenvolvimento).', 'warning');
        return;
      }
      const j = await r.json();
      if (!r.ok) { showToast(j.error || 'Erro ao enviar', 'error'); return; }
      setTexto('');
      setMensagens(prev => prev.some(x => x.id === j.data.id) ? prev : [...prev, j.data]);
    } catch (e) {
      showToast('Falha de rede ao enviar', 'error');
    } finally {
      setEnviando(false);
    }
  }

  // ── ações da conversa ──────────────────────────────────────
  async function mudarStatus(status) {
    const { error } = await supabase.from('conversas').update({ status }).eq('id', ativa.id);
    if (error) { showToast('Erro: ' + error.message, 'error'); return; }
    setAtiva(a => ({ ...a, status }));
    setConversas(prev => prev.map(c => c.id === ativa.id ? { ...c, status } : c));
    showToast(status === 'resolvida' ? '✔ Conversa resolvida' : 'Status atualizado', 'success');
  }

  async function atribuir(userId) {
    const valor = userId || null;
    const { error } = await supabase.from('conversas').update({ atribuido_a: valor }).eq('id', ativa.id);
    if (error) { showToast('Erro: ' + error.message, 'error'); return; }
    setAtiva(a => ({ ...a, atribuido_a: valor }));
    setConversas(prev => prev.map(c => c.id === ativa.id ? { ...c, atribuido_a: valor } : c));
  }

  async function mudarFila(filaId) {
    const valor = filaId || null;
    const { error } = await supabase.from('conversas').update({ fila_id: valor }).eq('id', ativa.id);
    if (error) { showToast('Erro: ' + error.message, 'error'); return; }
    setAtiva(a => ({ ...a, fila_id: valor }));
    setConversas(prev => prev.map(c => c.id === ativa.id ? { ...c, fila_id: valor } : c));
  }

  async function criarLeadNoFunil() {
    const { data: cols } = await supabase.from('pipeline_colunas').select('id, nome').order('ordem');
    const col = (cols || []).find(c => /LEADS/i.test(c.nome)) || cols?.[0];
    if (!col) { showToast('Crie o funil primeiro na aba Vendas Pipeline', 'warning'); return; }
    const { error } = await supabase.from('pipeline_cards').insert({
      tenant_id: tenantId, coluna_id: col.id,
      nome: ativa.contato_nome || ativa.contato_numero,
      telefone: ativa.contato_numero,
      origem: 'WhatsApp',
      anotacoes: `Criado da Central WhatsApp em ${new Date().toLocaleString('pt-BR')}`,
    });
    if (error) { showToast('Erro: ' + error.message, 'error'); return; }
    showToast('✔ Lead criado no funil! (webhooks disparados)', 'success');
  }

  // ── lista filtrada ─────────────────────────────────────────
  const listaFiltrada = useMemo(() => {
    let l = conversas;
    if (tab !== 'todas') l = l.filter(c => c.status === tab);
    if (filtroConexao) l = l.filter(c => c.conexao_id === filtroConexao);
    if (filtroFila) l = l.filter(c => c.fila_id === filtroFila);
    if (filtroAtend === 'ninguem') l = l.filter(c => !c.atribuido_a);
    else if (filtroAtend) l = l.filter(c => c.atribuido_a === filtroAtend);
    if (busca.trim()) {
      const b = busca.toLowerCase();
      l = l.filter(c => (c.contato_nome || '').toLowerCase().includes(b) || (c.contato_numero || '').includes(b));
    }
    return l;
  }, [conversas, tab, busca, filtroConexao, filtroFila, filtroAtend]);

  const nomeEquipe = id => equipe.find(e => e.id === id)?.nome || null;
  const nomeConexao = id => conexoes.find(x => x.id === id)?.nome || 'WhatsApp';
  const filaDe = id => filas.find(f => f.id === id) || null;

  // ── métricas do dia (painel do dono) ───────────────────────
  const kpis = useMemo(() => {
    const hoje = new Date().toDateString();
    return {
      abertas: conversas.filter(c => c.status === 'aberta').length,
      semAtendente: conversas.filter(c => c.status !== 'resolvida' && !c.atribuido_a).length,
      naoLidas: conversas.reduce((s, c) => s + (c.nao_lidas || 0), 0),
      resolvidasHoje: conversas.filter(c => c.status === 'resolvida' && new Date(c.ultima_msg_at).toDateString() === hoje).length,
    };
  }, [conversas]);

  // ── respostas rápidas: "/" no composer ─────────────────────
  const sugestoes = useMemo(() => {
    if (!texto.startsWith('/') || modoNota) return [];
    const q = texto.slice(1).toLowerCase();
    return rapidas.filter(r => r.atalho.toLowerCase().includes(q)).slice(0, 6);
  }, [texto, rapidas, modoNota]);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cinza)' }}>Carregando central…</div>;

  // ── sem conexão ainda: onboarding ──
  if (!conexoes.length && !conversas.length) return (
    <div className="fp" style={{ maxWidth: 640, textAlign: 'center', padding: '3rem 2rem' }}>
      <div style={{ fontSize: 42, marginBottom: '.5rem' }}>💬</div>
      <h3 style={{ color: 'var(--v2)', marginBottom: '.6rem' }}>Central WhatsApp</h3>
      <p style={{ fontSize: 14, color: 'var(--cinza)', lineHeight: 1.8, marginBottom: '1rem' }}>
        Todas as conversas de WhatsApp da clínica em uma tela só: filas, atribuição por atendente,
        notas internas e criação de lead no funil direto do chat.
      </p>
      <p style={{ fontSize: 13, color: 'var(--cinza)', lineHeight: 1.8 }}>
        <strong>Para ativar:</strong> conecte o número oficial da empresa em
        <strong> WhatsApp &amp; IA → Conexão</strong>. Assim que a primeira mensagem chegar,
        a conversa aparece aqui automaticamente.<br />
        <em>(Conexão de números por QR Code — um por funcionário — chega na próxima fase.)</em>
      </p>
    </div>
  );

  return (
    <div>
    {/* ── Painel do dono: visão geral do atendimento ── */}
    {isAdmin && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '.6rem', marginBottom: '.75rem' }}>
        {[
          { label: 'Conversas abertas', valor: kpis.abertas, cor: 'var(--v2)' },
          { label: 'Sem atendente', valor: kpis.semAtendente, cor: kpis.semAtendente > 0 ? '#e65100' : '#2e7d32' },
          { label: 'Msgs não lidas', valor: kpis.naoLidas, cor: kpis.naoLidas > 0 ? '#c62828' : '#2e7d32' },
          { label: 'Resolvidas hoje', valor: kpis.resolvidasHoje, cor: '#2e7d32' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid var(--borda)', borderRadius: 'var(--r)', padding: '.5rem .8rem' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--cinza)', textTransform: 'uppercase', letterSpacing: .5 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.cor }}>{k.valor}</div>
          </div>
        ))}
      </div>
    )}

    <div style={{ display: 'flex', height: isAdmin ? 'calc(100vh - 205px)' : 'calc(100vh - 130px)', minHeight: 440, border: '1px solid var(--borda)', borderRadius: 'var(--r)', overflow: 'hidden', background: '#fff' }}>

      {/* ═══ Coluna 1: lista de conversas ═══ */}
      <div style={{ width: 320, minWidth: 260, borderRight: '1px solid var(--borda)', display: 'flex', flexDirection: 'column', background: 'var(--b2)' }}>
        <div style={{ padding: '.75rem .75rem .5rem' }}>
          <div style={{ display: 'flex', gap: '.4rem', marginBottom: '.5rem' }}>
            <input className="inf" placeholder="🔍 Buscar nome ou número…" value={busca} onChange={e => setBusca(e.target.value)} style={{ flex: 1 }} />
            {isAdmin && (
              <button className="btn-pront" title="Filas e respostas rápidas" onClick={() => setShowConfig(true)} style={{ padding: '.4rem .6rem' }}>⚙</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: '.45rem' }}>
            {STATUS_TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ flex: 1, padding: '.35rem 0', fontSize: 11, fontWeight: 700, borderRadius: 8, cursor: 'pointer', border: '1px solid var(--borda)',
                  background: tab === t.id ? 'var(--v2)' : '#fff', color: tab === t.id ? '#fff' : 'var(--cinza)' }}>
                {t.label}
              </button>
            ))}
          </div>
          {/* filtro por FUNCIONÁRIO (cada WhatsApp conectado) — principal no modo monitoramento */}
          {conexoes.length > 1 && (
            <select className="inf" style={{ width: '100%', fontSize: 12, padding: '.35rem .5rem', marginBottom: 4, fontWeight: 700, borderColor: filtroConexao ? 'var(--v2)' : 'var(--borda)' }}
              value={filtroConexao} onChange={e => setFiltroConexao(e.target.value)}>
              <option value="">👥 Todos os funcionários / WhatsApps</option>
              {conexoes.map(cx => <option key={cx.id} value={cx.id}>{cx.tipo === 'qr' ? '📱' : '🏢'} {cx.nome}{cx.setor ? ` (${cx.setor})` : ''}</option>)}
            </select>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            <select className="inf" style={{ flex: 1, fontSize: 11, padding: '.3rem .4rem' }} value={filtroFila} onChange={e => setFiltroFila(e.target.value)}>
              <option value="">Todas as categorias</option>
              {filas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
            <select className="inf" style={{ flex: 1, fontSize: 11, padding: '.3rem .4rem' }} value={filtroAtend} onChange={e => setFiltroAtend(e.target.value)}>
              <option value="">Todos atendentes</option>
              <option value="ninguem">⚠ Sem atendente</option>
              {equipe.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {listaFiltrada.length === 0 && <div style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: 13, color: 'var(--cinza)' }}>Nenhuma conversa aqui.</div>}
          {listaFiltrada.map(c => (
            <div key={c.id} onClick={() => abrirConversa(c)}
              style={{ display: 'flex', gap: '.6rem', padding: '.7rem .75rem', cursor: 'pointer', borderBottom: '1px solid var(--borda)',
                background: ativa?.id === c.id ? '#fff' : 'transparent', borderLeft: ativa?.id === c.id ? '3px solid var(--v2)' : '3px solid transparent' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--v2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                {iniciais(c.contato_nome)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.contato_nome || c.contato_numero}</span>
                  <span style={{ fontSize: 10, color: 'var(--cinza)', flexShrink: 0 }}>{horaCurta(c.ultima_msg_at)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 12, color: 'var(--cinza)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.ultima_msg || '—'}</span>
                  {c.nao_lidas > 0 && <span style={{ background: '#22c55e', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 10, padding: '1px 6px', flexShrink: 0 }}>{c.nao_lidas}</span>}
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--v2)', background: 'var(--vc, #ede9fe)', borderRadius: 8, padding: '0 6px' }}>{nomeConexao(c.conexao_id)}</span>
                  {filaDe(c.fila_id) && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: filaDe(c.fila_id).cor || 'var(--v2)', borderRadius: 8, padding: '0 6px' }}>{filaDe(c.fila_id).nome}</span>}
                  {c.atribuido_a && <span style={{ fontSize: 9, fontWeight: 700, color: '#666', background: '#eee', borderRadius: 8, padding: '0 6px' }}>👤 {nomeEquipe(c.atribuido_a) || '—'}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Coluna 2: chat ═══ */}
      {!ativa ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cinza)', fontSize: 14, flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 40 }}>💬</div>
          Selecione uma conversa ao lado
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* header do chat */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.6rem .9rem', borderBottom: '1px solid var(--borda)', flexWrap: 'wrap' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--v2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
              {iniciais(ativa.contato_nome)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{ativa.contato_nome || ativa.contato_numero}</div>
              <div style={{ fontSize: 11, color: 'var(--cinza)' }}>{ativa.contato_numero}</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="inf" style={{ width: 150, fontSize: 12, padding: '.3rem .5rem' }} value={ativa.atribuido_a || ''} onChange={e => atribuir(e.target.value)}>
                <option value="">Sem atendente</option>
                {equipe.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
              {ativa.status !== 'resolvida'
                ? <button className="btn-salvar-atualiz" style={{ fontSize: 11, padding: '.4rem .7rem' }} onClick={() => mudarStatus('resolvida')}>✔ Resolver</button>
                : <button className="btn-pront" style={{ fontSize: 11 }} onClick={() => mudarStatus('aberta')}>↩ Reabrir</button>}
              <button className="btn-pront" style={{ fontSize: 11 }} title="Dados do contato" onClick={() => setPainelContato(p => !p)}>ℹ</button>
            </div>
          </div>

          {/* mensagens */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: '#f4f1fa', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {mensagens.map(m => {
              const minha = m.direcao === 'enviada';
              const nota = m.direcao === 'nota';
              return (
                <div key={m.id} style={{ alignSelf: nota ? 'center' : minha ? 'flex-end' : 'flex-start', maxWidth: '72%' }}>
                  <div style={{
                    background: nota ? '#fef9c3' : minha ? 'var(--v2)' : '#fff',
                    color: nota ? '#713f12' : minha ? '#fff' : 'var(--preto)',
                    border: nota ? '1px dashed #eab308' : '1px solid var(--borda)',
                    borderRadius: nota ? 10 : minha ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    padding: '.5rem .75rem', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {nota && <div style={{ fontSize: 10, fontWeight: 800, marginBottom: 2 }}>📌 NOTA INTERNA {m.autor_nome ? `— ${m.autor_nome}` : ''}</div>}
                    {!nota && minha && m.autor_nome && <div style={{ fontSize: 10, fontWeight: 700, opacity: .85, marginBottom: 2 }}>{m.autor_nome}</div>}
                    {m.conteudo}
                    <div style={{ fontSize: 9, opacity: .7, textAlign: 'right', marginTop: 3 }}>
                      {horaCurta(m.created_at)}
                      {minha && m.status_envio === 'erro' && ' ⚠ falhou'}
                      {minha && m.status_envio === 'lido' && ' ✓✓'}
                      {minha && m.status_envio === 'entregue' && ' ✓✓'}
                      {minha && m.status_envio === 'enviado' && ' ✓'}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={fimRef} />
          </div>

          {/* caixa de envio */}
          <div style={{ borderTop: '1px solid var(--borda)', padding: '.6rem .75rem', background: modoNota ? '#fefce8' : '#fff', position: 'relative' }}>
            {/* respostas rápidas: digite "/" */}
            {sugestoes.length > 0 && (
              <div style={{ position: 'absolute', bottom: '100%', left: 60, right: 120, background: '#fff', border: '1px solid var(--borda)', borderRadius: 10, boxShadow: '0 -6px 24px rgba(0,0,0,.12)', overflow: 'hidden', zIndex: 10 }}>
                {sugestoes.map(r => (
                  <div key={r.id} onClick={() => setTexto(r.texto)}
                    style={{ padding: '.5rem .75rem', cursor: 'pointer', borderBottom: '1px solid var(--borda)', fontSize: 12 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--b2)'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <span style={{ fontWeight: 800, color: 'var(--v2)' }}>/{r.atalho}</span>
                    <span style={{ color: 'var(--cinza)', marginLeft: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.texto.slice(0, 70)}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-end' }}>
              <button onClick={() => setModoNota(n => !n)} title={modoNota ? 'Voltar pra mensagem' : 'Nota interna (cliente não vê)'}
                style={{ border: '1px solid var(--borda)', background: modoNota ? '#fef08a' : '#fff', borderRadius: 8, padding: '.5rem .6rem', cursor: 'pointer', fontSize: 14 }}>
                📌
              </button>
              <textarea className="inf" rows={1} value={texto} style={{ flex: 1, resize: 'none', maxHeight: 110 }}
                placeholder={modoNota ? '📌 Nota interna — o cliente NÃO recebe isso…' : 'Digite a mensagem…  (dica: "/" abre respostas rápidas)'}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!sugestoes.length) enviar(); else setTexto(sugestoes[0].texto); } }} />
              <button className="btn-salvar-atualiz" style={{ padding: '.55rem 1rem' }} disabled={enviando} onClick={enviar}>
                {enviando ? '…' : modoNota ? '📌 Anotar' : '➤ Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Coluna 3: painel do contato ═══ */}
      {ativa && painelContato && (
        <div style={{ width: 250, minWidth: 220, borderLeft: '1px solid var(--borda)', padding: '1rem .9rem', overflowY: 'auto', background: 'var(--b2)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--v2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, margin: '0 auto .5rem' }}>
              {iniciais(ativa.contato_nome)}
            </div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{ativa.contato_nome || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--cinza)' }}>{ativa.contato_numero}</div>
          </div>

          <div style={{ display: 'grid', gap: '.5rem' }}>
            <div className="fgg"><label style={{ fontSize: 10 }}>Fila</label>
              <select className="inf" style={{ fontSize: 12, padding: '.35rem .5rem' }} value={ativa.fila_id || ''} onChange={e => mudarFila(e.target.value)}>
                <option value="">Sem fila</option>
                {filas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <button className="btn-salvar-atualiz" style={{ fontSize: 12, justifyContent: 'center' }} onClick={criarLeadNoFunil}>
              🎯 Criar lead no funil
            </button>
            {pacienteVinculado
              ? <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '.5rem .6rem', fontSize: 12 }}>
                  🦷 Paciente: <strong>{pacienteVinculado.nome}</strong>
                </div>
              : <div style={{ background: '#fff', border: '1px solid var(--borda)', borderRadius: 8, padding: '.5rem .6rem', fontSize: 12, color: 'var(--cinza)' }}>
                  Não é paciente cadastrado
                </div>}
          </div>

          <div style={{ marginTop: '1rem', fontSize: 11, color: 'var(--cinza)', lineHeight: 1.9 }}>
            <div><strong>Conexão:</strong> {nomeConexao(ativa.conexao_id)}</div>
            <div><strong>Status:</strong> {ativa.status}</div>
            <div><strong>Atendente:</strong> {nomeEquipe(ativa.atribuido_a) || 'não atribuído'}</div>
            <div><strong>Iniciada em:</strong> {new Date(ativa.created_at).toLocaleDateString('pt-BR')}</div>
          </div>

          {isAdmin && (
            <div style={{ marginTop: '1rem', paddingTop: '.75rem', borderTop: '1px solid var(--borda)', fontSize: 11, color: 'var(--cinza)' }}>
              👑 Como admin, você vê as conversas de <strong>todos os atendentes</strong> — use o filtro de status e a busca na lista.
            </div>
          )}
        </div>
      )}
    </div>

    {/* ── Modal ⚙: conexões QR, filas e respostas rápidas (admin) ── */}
    {showConfig && (
      <ConfigModal
        filas={filas} setFilas={setFilas}
        rapidas={rapidas} setRapidas={setRapidas}
        conexoes={conexoes} setConexoes={setConexoes}
        tenantId={tenantId} showToast={showToast}
        onClose={() => setShowConfig(false)}
      />
    )}
    </div>
  );
}

// ─── Modal de configuração: conexões QR + filas + respostas rápidas ──
function ConfigModal({ filas, setFilas, rapidas, setRapidas, conexoes, setConexoes, tenantId, showToast, onClose }) {
  const [novaFila, setNovaFila] = useState('');
  const [novoAtalho, setNovoAtalho] = useState('');
  const [novoTexto, setNovoTexto] = useState('');

  // conexões QR
  const [evoCfg, setEvoCfg] = useState(null);       // {base_url} ou null
  const [evoForm, setEvoForm] = useState({ base_url: '', api_key: '' });
  const [novoWpp, setNovoWpp] = useState('');
  const [novoSetor, setNovoSetor] = useState('recepcao');
  const [qrConexao, setQrConexao] = useState(null); // { id, qr_code }
  const [conectando, setConectando] = useState(false);

  useEffect(() => {
    supabase.from('evolution_config').select('base_url').eq('tenant_id', tenantId).maybeSingle()
      .then(({ data }) => setEvoCfg(data || null));
  }, [tenantId]);

  // realtime: quando o funcionário escaneia, o status/QR muda no banco → some o QR
  useEffect(() => {
    if (!qrConexao) return;
    const ch = supabase.channel(`qr-${qrConexao.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_conexoes', filter: `id=eq.${qrConexao.id}` },
        payload => {
          if (payload.new.status === 'conectado') {
            showToast('✅ WhatsApp conectado!', 'success');
            setConexoes(p => p.map(c => c.id === payload.new.id ? payload.new : c));
            setQrConexao(null);
          } else if (payload.new.qr_code && payload.new.qr_code !== qrConexao.qr_code) {
            setQrConexao(q => ({ ...q, qr_code: payload.new.qr_code }));
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qrConexao?.id]);

  async function salvarEvoCfg() {
    if (!/^https?:\/\//.test(evoForm.base_url) || !evoForm.api_key.trim()) {
      showToast('Informe a URL do VPS (http/https) e a API key', 'warning'); return;
    }
    const { error } = await supabase.from('evolution_config')
      .upsert({ tenant_id: tenantId, base_url: evoForm.base_url.trim(), api_key: evoForm.api_key.trim() });
    if (error) { showToast('Erro: ' + error.message, 'error'); return; }
    setEvoCfg({ base_url: evoForm.base_url.trim() });
    setEvoForm({ base_url: '', api_key: '' });
    showToast('✔ Servidor de conexões salvo', 'success');
  }

  async function conectarWpp() {
    if (!novoWpp.trim()) { showToast('Dê um nome (ex: Recepção — Ana)', 'warning'); return; }
    setConectando(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch('/api/evolution-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess?.session?.access_token}` },
        body: JSON.stringify({ acao: 'conectar', nome: novoWpp.trim(), setor: novoSetor }),
      });
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('application/json')) { showToast('Conexão QR funciona no site publicado (não no dev local).', 'warning'); return; }
      const j = await r.json();
      if (!r.ok) { showToast(j.error || 'Erro ao conectar', 'error'); return; }
      setNovoWpp('');
      setQrConexao({ id: j.conexao_id, qr_code: j.qr_code });
      const { data: cx } = await supabase.from('whatsapp_conexoes').select('id, nome, tipo, setor, status, numero').eq('tenant_id', tenantId);
      setConexoes(cx || []);
    } catch { showToast('Falha de rede', 'error'); } finally { setConectando(false); }
  }

  async function desconectar(cx) {
    if (!confirm(`Desconectar "${cx.nome}"? As conversas ficam salvas.`)) return;
    const { data: sess } = await supabase.auth.getSession();
    const r = await fetch('/api/evolution-connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess?.session?.access_token}` },
      body: JSON.stringify({ acao: 'desconectar', conexao_id: cx.id }),
    }).catch(() => null);
    if (r && r.ok) { setConexoes(p => p.map(c => c.id === cx.id ? { ...c, status: 'desconectado' } : c)); showToast('Desconectado', 'success'); }
    else showToast('Não consegui desconectar agora', 'error');
  }

  const conexoesQr = (conexoes || []).filter(c => c.tipo === 'qr');

  async function addFila() {
    const nome = novaFila.trim();
    if (!nome) return;
    const cores = ['#7C3AED', '#0288D1', '#2E7D32', '#E65100', '#C62828', '#5B21B6'];
    const { data, error } = await supabase.from('whatsapp_filas')
      .insert({ tenant_id: tenantId, nome, cor: cores[filas.length % cores.length], ordem: filas.length })
      .select().single();
    if (error) { showToast('Erro: ' + error.message, 'error'); return; }
    setFilas(p => [...p, data]); setNovaFila('');
  }

  async function delFila(f) {
    if (!confirm(`Excluir a fila "${f.nome}"? As conversas dela ficam sem fila (não são apagadas).`)) return;
    const { error } = await supabase.from('whatsapp_filas').delete().eq('id', f.id);
    if (error) { showToast('Erro: ' + error.message, 'error'); return; }
    setFilas(p => p.filter(x => x.id !== f.id));
  }

  async function addRapida() {
    const atalho = novoAtalho.trim().replace(/^\//, '').toLowerCase().replace(/\s+/g, '-');
    const txt = novoTexto.trim();
    if (!atalho || !txt) { showToast('Preencha atalho e texto', 'warning'); return; }
    const { data, error } = await supabase.from('respostas_rapidas')
      .insert({ tenant_id: tenantId, atalho, texto: txt }).select().single();
    if (error) { showToast(error.code === '23505' ? 'Já existe esse atalho' : 'Erro: ' + error.message, 'error'); return; }
    setRapidas(p => [...p, data].sort((a, b) => a.atalho.localeCompare(b.atalho)));
    setNovoAtalho(''); setNovoTexto('');
  }

  async function delRapida(r) {
    const { error } = await supabase.from('respostas_rapidas').delete().eq('id', r.id);
    if (error) { showToast('Erro: ' + error.message, 'error'); return; }
    setRapidas(p => p.filter(x => x.id !== r.id));
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: 'var(--r)', boxShadow: '0 24px 60px rgba(0,0,0,.25)', width: '100%', maxWidth: 620, maxHeight: '88vh', overflowY: 'auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--v2)' }}>⚙ Configurações da Central</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--cinza)' }}>✕</button>
        </div>

        {/* ── conexões WhatsApp via QR Code ── */}
        <h4 style={{ fontSize: 13, fontWeight: 800, marginBottom: '.5rem' }}>📱 WhatsApps conectados (QR Code)</h4>
        {!evoCfg ? (
          <div style={{ background: 'var(--b2)', border: '1px solid var(--borda)', borderRadius: 10, padding: '.8rem', marginBottom: '1.2rem' }}>
            <p style={{ fontSize: 12, color: 'var(--cinza)', marginBottom: '.6rem', lineHeight: 1.6 }}>
              Para espelhar o WhatsApp dos funcionários por QR Code, informe o servidor de conexões (Evolution API no seu VPS).
              A chave fica guardada com segurança e nunca aparece no navegador.
            </p>
            <div style={{ display: 'grid', gap: '.4rem' }}>
              <input className="inf" placeholder="URL do servidor (ex: https://evo.seudominio.com)" value={evoForm.base_url} onChange={e => setEvoForm(f => ({ ...f, base_url: e.target.value }))} />
              <div style={{ display: 'flex', gap: '.4rem' }}>
                <input className="inf" style={{ flex: 1 }} placeholder="API key global da Evolution" value={evoForm.api_key} onChange={e => setEvoForm(f => ({ ...f, api_key: e.target.value }))} />
                <button className="btn-salvar-atualiz" style={{ fontSize: 12 }} onClick={salvarEvoCfg}>Salvar</button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', gap: '.4rem', marginBottom: '.6rem', flexWrap: 'wrap' }}>
              <input className="inf" style={{ flex: 1, minWidth: 160 }} placeholder="Nome (ex: Recepção — Ana)" value={novoWpp} onChange={e => setNovoWpp(e.target.value)} />
              <select className="inf" style={{ width: 130, fontSize: 12 }} value={novoSetor} onChange={e => setNovoSetor(e.target.value)}>
                <option value="recepcao">Recepção</option>
                <option value="comercial">Comercial</option>
              </select>
              <button className="btn-salvar-atualiz" style={{ fontSize: 12 }} disabled={conectando} onClick={conectarWpp}>
                {conectando ? '…' : '➕ Conectar por QR'}
              </button>
            </div>

            {/* QR pra escanear */}
            {qrConexao && (
              <div style={{ textAlign: 'center', background: 'var(--b2)', border: '1px solid var(--borda)', borderRadius: 10, padding: '1rem', marginBottom: '.8rem' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: '.5rem' }}>📲 Abra o WhatsApp do funcionário → Aparelhos conectados → Conectar aparelho</div>
                {qrConexao.qr_code
                  ? <img src={qrConexao.qr_code} alt="QR Code" style={{ width: 220, height: 220, borderRadius: 8, background: '#fff' }} />
                  : <div style={{ fontSize: 12, color: 'var(--cinza)', padding: '2rem' }}>Gerando QR Code…</div>}
                <div style={{ fontSize: 11, color: 'var(--cinza)', marginTop: '.5rem' }}>O código some sozinho quando conectar. Some antes? Clique em Conectar de novo.</div>
              </div>
            )}

            {/* lista de conexões QR */}
            <div style={{ display: 'grid', gap: '.35rem' }}>
              {conexoesQr.length === 0 && <span style={{ fontSize: 12, color: 'var(--cinza)' }}>Nenhum WhatsApp conectado por QR ainda.</span>}
              {conexoesQr.map(cx => (
                <div key={cx.id} style={{ display: 'flex', gap: '.6rem', alignItems: 'center', border: '1px solid var(--borda)', borderRadius: 8, padding: '.45rem .6rem', fontSize: 12 }}>
                  <span style={{ fontSize: 13 }}>{cx.status === 'conectado' ? '🟢' : cx.status === 'pendente' ? '🟡' : '🔴'}</span>
                  <span style={{ fontWeight: 700 }}>{cx.nome}</span>
                  {cx.numero && <span style={{ color: 'var(--cinza)' }}>{cx.numero}</span>}
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--cinza)', textTransform: 'uppercase' }}>{cx.setor || ''}</span>
                  <button onClick={() => desconectar(cx)} style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* filas */}
        <h4 style={{ fontSize: 13, fontWeight: 800, marginBottom: '.5rem' }}>📋 Filas de atendimento</h4>
        <div style={{ display: 'flex', gap: '.4rem', marginBottom: '.5rem' }}>
          <input className="inf" placeholder="Nova fila (ex: Recepção, Comercial)" value={novaFila}
            onChange={e => setNovaFila(e.target.value)} onKeyDown={e => e.key === 'Enter' && addFila()} />
          <button className="btn-salvar-atualiz" style={{ fontSize: 12 }} onClick={addFila}>＋</button>
        </div>
        <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
          {filas.length === 0 && <span style={{ fontSize: 12, color: 'var(--cinza)' }}>Nenhuma fila ainda — crie Recepção e Comercial, por exemplo.</span>}
          {filas.map(f => (
            <span key={f.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: f.cor, color: '#fff', fontSize: 12, fontWeight: 700, borderRadius: 12, padding: '.25rem .7rem' }}>
              {f.nome}
              <button onClick={() => delFila(f)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, padding: 0 }}>✕</button>
            </span>
          ))}
        </div>

        {/* respostas rápidas */}
        <h4 style={{ fontSize: 13, fontWeight: 800, marginBottom: '.5rem' }}>⚡ Respostas rápidas (digite "/" no chat)</h4>
        <div style={{ display: 'grid', gap: '.4rem', marginBottom: '.6rem' }}>
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <input className="inf" style={{ width: 160 }} placeholder="/atalho (ex: valores)" value={novoAtalho} onChange={e => setNovoAtalho(e.target.value)} />
            <input className="inf" style={{ flex: 1 }} placeholder="Texto completo da resposta" value={novoTexto}
              onChange={e => setNovoTexto(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRapida()} />
            <button className="btn-salvar-atualiz" style={{ fontSize: 12 }} onClick={addRapida}>＋</button>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '.35rem' }}>
          {rapidas.length === 0 && <span style={{ fontSize: 12, color: 'var(--cinza)' }}>Nenhuma resposta rápida ainda.</span>}
          {rapidas.map(r => (
            <div key={r.id} style={{ display: 'flex', gap: '.6rem', alignItems: 'center', border: '1px solid var(--borda)', borderRadius: 8, padding: '.4rem .6rem', fontSize: 12 }}>
              <code style={{ fontWeight: 800, color: 'var(--v2)', flexShrink: 0 }}>/{r.atalho}</code>
              <span style={{ flex: 1, color: 'var(--cinza)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.texto}</span>
              <button onClick={() => delRapida(r)} style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', flexShrink: 0 }}>🗑</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
