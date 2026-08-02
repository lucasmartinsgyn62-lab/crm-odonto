import { useEffect, useMemo, useRef, useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import Odontograma, { ESTADOS, LegendaOdontograma } from './Odontograma';
import { FACES, FACES_NOME, nomeDente, SUP_PERM, INF_PERM } from '../../lib/odontograma';
import { enviarAnexo, useAnexoUrl, urlAnexo } from '../../lib/anexos';
import { STATUS as STATUS_ORC, hojeStr as hojeOrc, somaDias } from '../../lib/orcamento';
import { num as toNum } from '../../constants';

const RX_EXEMPLO = '/exemplo-radiografia-panoramica.svg';

const STATUS_ITEM = [
  { id: 'planejado', label: 'Planejado' },
  { id: 'andamento', label: 'Em andamento' },
  { id: 'concluido', label: 'Concluído' },
];
const MARCAS = [
  { id: '', label: 'Automática (pelo status)' },
  { id: 'ausente', label: 'Dente ausente / extraído' },
  { id: 'implante', label: 'Implante' },
  { id: 'protese', label: 'Coroa / prótese' },
];
// Atalhos que o dentista mais usa — aplicam direto nos dentes selecionados
const ATALHOS = [
  { label: '🦷 Restauração', proc: 'Restauração em Resina', status: 'planejado' },
  { label: '🔧 Canal',        proc: 'Tratamento de Canal (Molar)', status: 'planejado' },
  { label: '👑 Coroa',        proc: 'Coroa em Porcelana', status: 'planejado', marca: 'protese' },
  { label: '❌ Extração',     proc: 'Extração Simples', status: 'concluido', marca: 'ausente' },
  { label: '🔩 Implante',     proc: 'Implante Dentário Unitário', status: 'planejado', marca: 'implante' },
  { label: '✨ Limpeza',      proc: 'Limpeza (Profilaxia)', status: 'concluido' },
];
const TIPOS_RX = ['Panorâmica', 'Periapical', 'Interproximal (bitewing)', 'Tomografia', 'Foto intraoral', 'Documentação ortodôntica'];

const brl = v => (toNum(v)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const hoje = () => { const d = new Date(); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; };
const paraData = s => { const [d, m, a] = String(s || '').split('/'); return a ? new Date(+a, +m - 1, +d) : null; };

/* ─────────────────────── visualizador de radiografia ─────────────────────── */
function VisorRx({ item, onFechar, onUsarNoOdontograma }) {
  const url = useAnexoUrl(item);
  const [zoom, setZoom] = useState(1);
  const [brilho, setBrilho] = useState(100);
  const [contraste, setContraste] = useState(100);
  const [negativo, setNegativo] = useState(false);
  if (!item) return null;
  return (
    <div className="pi-ov" onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="pi-visor">
        <div className="pi-visor-top">
          <div>
            <b>{item.tipo || 'Radiografia'}</b>
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>{item.data || ''} {item.dentista ? '· ' + item.dentista : ''}</span>
          </div>
          <button className="btsv" style={{ background: '#334155' }} onClick={onFechar}>✕ Fechar</button>
        </div>
        <div className="pi-visor-img">
          {url && <img src={url} alt={item.name || 'Radiografia'} style={{
            transform: `scale(${zoom})`,
            filter: `brightness(${brilho}%) contrast(${contraste}%) ${negativo ? 'invert(1)' : ''}`,
          }} />}
        </div>
        <div className="pi-visor-ctrl">
          <label>🔍 Zoom<input type="range" min="1" max="3" step="0.05" value={zoom} onChange={e => setZoom(+e.target.value)} /></label>
          <label>☀️ Brilho<input type="range" min="40" max="200" value={brilho} onChange={e => setBrilho(+e.target.value)} /></label>
          <label>◐ Contraste<input type="range" min="40" max="260" value={contraste} onChange={e => setContraste(+e.target.value)} /></label>
          <button className="btsv" style={{ background: negativo ? 'var(--v1)' : '#475569' }} onClick={() => setNegativo(n => !n)}>⇄ Negativo</button>
          <button className="btsv" onClick={() => { setZoom(1); setBrilho(100); setContraste(100); setNegativo(false); }} style={{ background: '#475569' }}>↺ Padrão</button>
          <button className="btsv" onClick={() => { onUsarNoOdontograma(item); onFechar(); }}>🦷 Sobrepor no odontograma</button>
        </div>
      </div>
    </div>
  );
}

function CardRx({ item, onAbrir, onRemover }) {
  const url = useAnexoUrl(item);
  return (
    <div className="pi-rx-card">
      <div className="pi-rx-thumb" onClick={() => onAbrir(item)}>
        {url ? <img src={url} alt="" /> : <span>carregando…</span>}
        {String(item.url || '').startsWith('/exemplo') && <span className="pi-rx-tag">exemplo ilustrativo</span>}
      </div>
      <div className="pi-rx-info">
        <b>{item.tipo || 'Exame'}</b>
        <span>{item.data || ''}{item.dentista ? ' · ' + item.dentista : ''}</span>
        {item.obs && <em>{item.obs}</em>}
      </div>
      <button className="pi-x" title="Remover" onClick={() => onRemover(item)}>✕</button>
    </div>
  );
}

/* ─────────────────────────────── tela ─────────────────────────────── */
export default function ProntuarioInteligente() {
  const {
    state, dispatch, showToast, usuario, procNames, procPrecos,
    setActivePanel, setProntuarioModal, pacienteFoco, setPacienteFoco,
    loadAgendaMes, pad,
  } = useCRM();

  const [busca, setBusca] = useState('');
  const [pacienteId, setPacienteId] = useState(pacienteFoco || null);
  const [aba, setAba] = useState('odontograma');
  const [sel, setSel] = useState(new Set());
  const [decidua, setDecidua] = useState(false);
  const [rxFundo, setRxFundo] = useState(null);
  const [opacidadeRx, setOpacidadeRx] = useState(0.55);
  const [visor, setVisor] = useState(null);
  const [tipoUpload, setTipoUpload] = useState('Panorâmica');
  const [enviando, setEnviando] = useState(false);
  const fileRef = useRef(null);

  const [novo, setNovo] = useState({ proc: '', faces: [], status: 'planejado', marca: '', valor: '', dentista: '', data: hoje(), obs: '' });

  const paciente = state.clientes.find(c => c.id === pacienteId) || null;
  const pront = paciente?.prontuario || {};
  const dentes = pront.odontograma?.dentes || {};
  const radiografias = pront.radiografias || [];

  // paciente vindo de outra tela (agenda / lista de pacientes)
  useEffect(() => { if (pacienteFoco) { setPacienteId(pacienteFoco); setPacienteFoco(null); } }, [pacienteFoco, setPacienteFoco]);
  // abre já num paciente com odontograma preenchido (a tela nunca nasce vazia)
  useEffect(() => {
    if (pacienteId || !state.clientes.length) return;
    const nDentes = c => Object.keys(c.prontuario?.odontograma?.dentes || {}).length;
    const comPlano = state.clientes.reduce((a, b) => (nDentes(b) > nDentes(a) ? b : a), state.clientes[0]);
    setPacienteId(comPlano.id);
  }, [state.clientes, pacienteId]);
  // a linha do tempo precisa dos meses anteriores (o app só carrega o atual e o próximo)
  useEffect(() => {
    const d = new Date();
    for (let i = 1; i <= 3; i++) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      loadAgendaMes(pad(m.getMonth() + 1), String(m.getFullYear()));
    }
  }, [loadAgendaMes, pad]);
  useEffect(() => { setSel(new Set()); setRxFundo(null); }, [pacienteId]);

  /* ── gravação (sempre lendo-modificando-gravando o prontuário existente) ── */
  function salvarPront(patch) {
    if (!paciente) return;
    dispatch({ type: 'UPDATE_CLIENTE', payload: { id: paciente.id, prontuario: { ...(paciente.prontuario || {}), ...patch } } });
  }
  function setDentes(novosDentes) {
    const patch = {
      odontograma: {
        ...(pront.odontograma || {}), dentes: novosDentes,
        atualizado_em: new Date().toISOString(), atualizado_por: usuario?.nome || usuario?.email || '',
      },
    };
    // ORÇAMENTO AUTOMÁTICO: no momento em que o dentista lança o primeiro
    // procedimento, o plano já vira orçamento na fila da recepção.
    const temPendente = Object.values(novosDentes).some(d => (d.itens || []).some(i => i.status !== 'concluido'));
    if (temPendente && !pront.orcamento) {
      patch.orcamento = {
        status: 'aguardando', criado_em: hojeOrc(), validade: somaDias(hojeOrc(), 30),
        desconto: 0, descontoTipo: '%', parcelas: 1, obs: '',
        historico: [{ quando: new Date().toISOString(), evento: 'Orçamento gerado pelo prontuário', quem: usuario?.nome || '' }],
      };
      showToast('🧾 Orçamento gerado — já está na tela de Orçamentos para a recepção', 'success');
    }
    salvarPront(patch);
  }

  /* ── itens do plano ── */
  const itens = useMemo(() => Object.entries(dentes).flatMap(([d, v]) =>
    (v.itens || []).map(i => ({ ...i, dente: +d }))), [dentes]);

  const totais = useMemo(() => {
    const t = { planejado: 0, andamento: 0, concluido: 0, qtd: itens.length };
    itens.forEach(i => { t[i.status] = (t[i.status] || 0) + toNum(i.valor); });
    t.geral = t.planejado + t.andamento + t.concluido;
    return t;
  }, [itens]);

  function aplicar(base) {
    if (!paciente) return;
    if (!sel.size) { showToast('Selecione ao menos um dente no odontograma', 'warning'); return; }
    if (!base.proc) { showToast('Escolha o procedimento', 'warning'); return; }
    const novos = { ...dentes };
    sel.forEach(d => {
      const item = {
        id: crypto.randomUUID(), proc: base.proc, faces: base.faces || [],
        status: base.status || 'planejado', marca: base.marca || '',
        valor: base.valor === '' || base.valor == null ? (procPrecos[base.proc] || 0) : toNum(base.valor),
        dentista: base.dentista || '', data: base.data || hoje(), obs: base.obs || '',
        criado_por: usuario?.nome || '',
      };
      novos[d] = { itens: [...(novos[d]?.itens || []), item] };
    });
    setDentes(novos);
    showToast(`✔ ${base.proc} lançado em ${sel.size} dente(s)`, 'success');
    setNovo(n => ({ ...n, obs: '' }));
  }

  function removerItem(dente, id) {
    const restantes = (dentes[dente]?.itens || []).filter(i => i.id !== id);
    const novos = { ...dentes };
    if (restantes.length) novos[dente] = { itens: restantes }; else delete novos[dente];
    setDentes(novos);
  }
  function mudarStatus(dente, id, status) {
    const novos = { ...dentes, [dente]: { itens: (dentes[dente]?.itens || []).map(i => i.id === id ? { ...i, status } : i) } };
    setDentes(novos);
  }
  function limparDentes() {
    if (!sel.size) return;
    if (!confirm(`Apagar todos os lançamentos de ${sel.size} dente(s)?`)) return;
    const novos = { ...dentes };
    sel.forEach(d => delete novos[d]);
    setDentes(novos);
  }
  function selecionarTodos() { setSel(new Set([...SUP_PERM, ...INF_PERM])); }

  /* ── radiografias ── */
  async function subirRx(e) {
    const files = Array.from(e.target.files || []); e.target.value = '';
    if (!files.length || !paciente) return;
    setEnviando(true);
    const novas = [...radiografias];
    for (const f of files) {
      const { anexo, error } = await enviarAnexo(f, usuario?.tenant_id);
      if (error) { showToast('Falha no upload: ' + error, 'error'); continue; }
      novas.push({ ...anexo, tipo: tipoUpload, data: hoje(), dentista: state.dentistas[0]?.nome || '' });
    }
    salvarPront({ radiografias: novas });
    setEnviando(false);
    showToast('✔ Exame anexado ao prontuário', 'success');
  }
  function usarExemplo() {
    salvarPront({ radiografias: [...radiografias, { name: 'Panorâmica (exemplo)', url: RX_EXEMPLO, tipo: 'Panorâmica', data: hoje(), obs: 'Imagem ilustrativa para demonstração' }] });
    showToast('Exemplo adicionado — troque pela radiografia real quando quiser', 'success');
  }
  function removerRx(item) {
    if (!confirm('Remover este exame do prontuário?')) return;
    salvarPront({ radiografias: radiografias.filter(r => r !== item) });
    if (rxFundo && (rxFundo.path || rxFundo.url) === (item.path || item.url)) setRxFundo(null);
  }
  async function sobrepor(item) {
    const u = await urlAnexo(item);
    setRxFundo(u ? { ...item, _url: u } : null);
    setAba('odontograma');
  }

  /* ── linha do tempo (espelha a agenda) ── */
  const linhaTempo = useMemo(() => {
    if (!paciente) return [];
    const out = [];
    Object.entries(state.agenda).forEach(([agKey, slots]) => {
      const [dent, data] = agKey.includes('||') ? agKey.split('||') : ['', agKey];
      Object.entries(slots || {}).forEach(([horario, s]) => {
        if (!s || s.nome !== paciente.nome) return;
        out.push({
          agKey, horario, dentista: dent, data,
          hora: horario.replace('-ENCAIXE', ' (encaixe)'),
          status: s.status || '', valor: toNum(s.valor),
          procs: s.areas || s.procedimentos || [],
          realizados: s.procedimentosRealizados || [],
          atualizacoes: s.atualizacoes || [],
          d: paraData(data),
        });
      });
    });
    return out.sort((a, b) => (b.d?.getTime() || 0) - (a.d?.getTime() || 0) || b.hora.localeCompare(a.hora));
  }, [state.agenda, paciente]);

  const agora = new Date(); agora.setHours(0, 0, 0, 0);
  const proxima = [...linhaTempo].reverse().find(e => e.d && e.d >= agora);
  const ultima = linhaTempo.find(e => e.d && e.d < agora);
  const investido = linhaTempo.filter(e => e.status === 'ATENDIDO' || e.status === 'FINALIZADO').reduce((s, e) => s + e.valor, 0);

  /* ── alertas clínicos (vindos do prontuário do cadastro) ── */
  const alertas = useMemo(() => {
    const a = [];
    if (pront.alergias) a.push({ t: '⚠️ Alergia', v: pront.alergias, cor: '#DC2626' });
    if (pront.doencas) a.push({ t: '🩺 Doença sistêmica', v: pront.doencas, cor: '#EA580C' });
    if (pront.medicamentos) a.push({ t: '💊 Medicamento', v: pront.medicamentos, cor: '#0891B2' });
    if (pront.gestante && pront.gestante !== 'Não') a.push({ t: '🤰 Atenção', v: pront.gestante, cor: '#DB2777' });
    if (['Moderado', 'Intenso'].includes(pront.medo)) a.push({ t: '😰 Medo/ansiedade', v: pront.medo, cor: '#7C3AED' });
    if (pront.bruxismo && pront.bruxismo !== 'Não') a.push({ t: '😬 Bruxismo', v: pront.bruxismo, cor: '#B45309' });
    if (String(pront.perio || '').startsWith('Periodontite')) a.push({ t: '🦠 Periodonto', v: pront.perio, cor: '#DC2626' });
    return a;
  }, [pront]);

  const listaPacientes = state.clientes.filter(c => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()));

  function orcamentoWhatsapp() {
    if (!paciente?.wpp) { showToast('Paciente sem WhatsApp cadastrado', 'warning'); return; }
    const linhas = itens.filter(i => i.status !== 'concluido')
      .map(i => `• Dente ${i.dente} — ${i.proc}: ${brl(i.valor)}`).join('\n');
    const total = itens.filter(i => i.status !== 'concluido').reduce((s, i) => s + toNum(i.valor), 0);
    const msg = `Olá, ${paciente.nome}! Segue o seu plano de tratamento:\n\n${linhas}\n\nTotal: ${brl(total)}\n\nQualquer dúvida estamos à disposição.`;
    window.open(`https://wa.me/55${paciente.wpp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  }

  if (!paciente) {
    return <div className="fp"><h3>Prontuário Inteligente</h3><p style={{ fontSize: 13, color: 'var(--cinza)' }}>Cadastre um paciente para começar.</p></div>;
  }

  const selArr = [...sel].sort((a, b) => a - b);
  const itensSelecionados = selArr.flatMap(d => (dentes[d]?.itens || []).map(i => ({ ...i, dente: d })));

  return (
    <div className="pi-wrap">
      {/* ───────── cabeçalho: paciente + resumo ───────── */}
      <div className="pi-topo">
        <div className="pi-paciente">
          <div className="pi-av">{paciente.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{paciente.nome}</h2>
            <div className="pi-meta">
              {paciente.wpp && <span>📱 {paciente.wpp}</span>}
              {paciente.orig && <span>📍 {paciente.orig}</span>}
              <span className={`badge ${paciente.tipo === 'NOVO' ? 'b-rec' : 'b-fin'}`}>{paciente.tipo || '—'}</span>
              {pront.tratamento && <span>🦷 {pront.tratamento}</span>}
            </div>
          </div>
          <div className="pi-troca">
            <input className="isrch" placeholder="Trocar paciente…" value={busca} onChange={e => setBusca(e.target.value)} />
            <select className="inf" value={pacienteId || ''} onChange={e => setPacienteId(e.target.value)}>
              {listaPacientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>

        {alertas.length > 0 && (
          <div className="pi-alertas">
            {alertas.map((a, i) => (
              <span key={i} style={{ borderColor: a.cor, color: a.cor }}><b>{a.t}:</b> {a.v}</span>
            ))}
          </div>
        )}

        <div className="pi-kpis">
          <div className="pi-kpi"><span>Dentes com tratamento</span><b>{Object.keys(dentes).length}</b><i>de 32</i></div>
          <div className="pi-kpi"><span>Procedimentos no plano</span><b>{totais.qtd}</b><i>{itens.filter(i => i.status === 'concluido').length} concluídos</i></div>
          <div className="pi-kpi" style={{ cursor: pront.orcamento ? 'pointer' : 'default' }}
            onClick={() => pront.orcamento && setActivePanel('orcamentos')}
            title={pront.orcamento ? 'Abrir na tela de Orçamentos' : ''}>
            <span>Plano em aberto</span><b>{brl(totais.planejado + totais.andamento)}</b>
            <i>{pront.orcamento
              ? `🧾 orçamento ${STATUS_ORC[pront.orcamento.status]?.label.toLowerCase() || pront.orcamento.status}`
              : `total ${brl(totais.geral)}`}</i>
          </div>
          <div className="pi-kpi"><span>Já investido</span><b>{brl(investido)}</b><i>{linhaTempo.length} consultas</i></div>
          <div className="pi-kpi"><span>Próxima consulta</span><b>{proxima ? proxima.data : '—'}</b><i>{proxima ? `${proxima.hora} · ${proxima.dentista}` : 'sem agendamento'}</i></div>
          <div className="pi-kpi"><span>Última visita</span><b>{ultima ? ultima.data : '—'}</b><i>{ultima ? ultima.status : 'primeira consulta'}</i></div>
        </div>

        <div className="pi-abas">
          {[['odontograma', '🦷 Odontograma'], ['radiografias', '🩻 Radiografias'], ['plano', '📋 Plano de tratamento'],
            ['historico', '🕓 Linha do tempo'], ['ficha', '📑 Ficha do cadastro']].map(([id, lb]) => (
            <button key={id} className={aba === id ? 'pi-on' : ''} onClick={() => setAba(id)}>{lb}</button>
          ))}
          <span style={{ flex: 1 }} />
          <button className="btsv" onClick={() => window.print()}>🖨️ Imprimir</button>
        </div>
      </div>

      {/* ───────── ODONTOGRAMA ───────── */}
      {aba === 'odontograma' && (
        <div className="pi-grid">
          <div className="fp pi-card">
            <div className="pi-card-top">
              <h3 style={{ margin: 0, border: 0, padding: 0 }}>Radiografia panorâmica esquemática</h3>
              <div className="pi-card-acoes">
                <label className="pi-check"><input type="checkbox" checked={decidua} onChange={e => { setDecidua(e.target.checked); setSel(new Set()); }} /> dentição decídua</label>
                {rxFundo && (
                  <label className="pi-check" style={{ gap: 6 }}>
                    RX de fundo
                    <input type="range" min="0" max="1" step="0.05" value={opacidadeRx} onChange={e => setOpacidadeRx(+e.target.value)} style={{ width: 80 }} />
                    <button className="pi-x" onClick={() => setRxFundo(null)}>✕</button>
                  </label>
                )}
                <button className="btsv" style={{ background: '#64748b' }} onClick={selecionarTodos}>Selecionar tudo</button>
                <button className="btsv" style={{ background: '#64748b' }} onClick={() => setSel(new Set())}>Limpar seleção</button>
              </div>
            </div>
            <p className="pi-dica">Clique nos dentes para selecionar (a numeração é o padrão FDI). Depois lance o procedimento ao lado — tudo é gravado no prontuário do paciente.</p>
            <Odontograma
              dentes={dentes} selecionados={sel} decidua={decidua}
              radiografia={rxFundo?._url || null} opacidadeRx={opacidadeRx}
              onToggle={n => setSel(s => { const x = new Set(s); if (x.has(n)) x.delete(n); else x.add(n); return x; })}
            />
            <LegendaOdontograma />
          </div>

          <div className="fp pi-card">
            <h3>Lançar procedimento {selArr.length > 0 && <span className="pi-chipn">{selArr.length} dente(s): {selArr.join(', ')}</span>}</h3>
            <div className="pi-atalhos">
              {ATALHOS.map(a => (
                <button key={a.label} onClick={() => aplicar({ ...a, valor: procPrecos[a.proc] ?? '', dentista: novo.dentista, data: hoje() })}>{a.label}</button>
              ))}
            </div>
            <div className="fgg"><label>Procedimento</label>
              <input className="inf" list="pi-procs" placeholder="Digite para buscar…" value={novo.proc}
                onChange={e => setNovo(n => ({ ...n, proc: e.target.value, valor: procPrecos[e.target.value] ?? n.valor }))} />
              <datalist id="pi-procs">{procNames.map(p => <option key={p} value={p} />)}</datalist>
            </div>
            <div className="fgg"><label>Faces do dente</label>
              <div className="pi-faces">
                {FACES.map(f => (
                  <button key={f} title={FACES_NOME[f]} className={novo.faces.includes(f) ? 'pi-on' : ''}
                    onClick={() => setNovo(n => ({ ...n, faces: n.faces.includes(f) ? n.faces.filter(x => x !== f) : [...n.faces, f] }))}>{f}</button>
                ))}
              </div>
            </div>
            <div className="gg2">
              <div className="fgg"><label>Situação</label>
                <select className="inf" value={novo.status} onChange={e => setNovo(n => ({ ...n, status: e.target.value }))}>
                  {STATUS_ITEM.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div className="fgg"><label>Marcação no desenho</label>
                <select className="inf" value={novo.marca} onChange={e => setNovo(n => ({ ...n, marca: e.target.value }))}>
                  {MARCAS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
              <div className="fgg"><label>Valor (R$)</label>
                <input className="inf" value={novo.valor} onChange={e => setNovo(n => ({ ...n, valor: e.target.value }))} placeholder="automático pela tabela" />
              </div>
              <div className="fgg"><label>Dentista</label>
                <select className="inf" value={novo.dentista} onChange={e => setNovo(n => ({ ...n, dentista: e.target.value }))}>
                  <option value="">—</option>
                  {state.dentistas.map(d => <option key={d.id} value={d.nome}>{d.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="fgg"><label>Observação</label>
              <input className="inf" value={novo.obs} onChange={e => setNovo(n => ({ ...n, obs: e.target.value }))} placeholder="Ex: cárie profunda, avaliar canal" />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="btsv" onClick={() => aplicar(novo)}>➕ Lançar nos dentes selecionados</button>
              <button className="btdl" onClick={limparDentes}>🗑 Limpar dentes selecionados</button>
            </div>

            <h3 style={{ marginTop: 18 }}>Lançamentos dos dentes selecionados</h3>
            {itensSelecionados.length === 0 && <p className="pi-vazio">Selecione um dente para ver o histórico dele.</p>}
            {itensSelecionados.map(i => (
              <div key={i.id} className="pi-item">
                <span className="pi-item-dente" style={{ background: ESTADOS[i.marca || i.status]?.stroke || '#94a3b8' }}>{i.dente}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{i.proc}</b>
                  <span>{i.faces?.length ? `faces ${i.faces.join('')} · ` : ''}{i.data}{i.dentista ? ' · ' + i.dentista : ''}{i.obs ? ' · ' + i.obs : ''}</span>
                </div>
                <b style={{ whiteSpace: 'nowrap' }}>{brl(i.valor)}</b>
                <select className="inf pi-mini" value={i.status} onChange={e => mudarStatus(i.dente, i.id, e.target.value)}>
                  {STATUS_ITEM.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <button className="pi-x" onClick={() => removerItem(i.dente, i.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────── RADIOGRAFIAS ───────── */}
      {aba === 'radiografias' && (
        <div className="fp pi-card">
          <div className="pi-card-top">
            <h3 style={{ margin: 0, border: 0, padding: 0 }}>Exames de imagem do paciente</h3>
            <div className="pi-card-acoes">
              <select className="inf" value={tipoUpload} onChange={e => setTipoUpload(e.target.value)} style={{ width: 210 }}>
                {TIPOS_RX.map(t => <option key={t}>{t}</option>)}
              </select>
              <input ref={fileRef} type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }} onChange={subirRx} />
              <button className="btsv" onClick={() => fileRef.current?.click()} disabled={enviando}>
                {enviando ? '⏳ enviando…' : '📤 Enviar radiografia'}
              </button>
              <button className="btsv" style={{ background: '#64748b' }} onClick={usarExemplo}>🩻 Usar exemplo</button>
            </div>
          </div>
          <p className="pi-dica">Os arquivos ficam no armazenamento privado da clínica (só quem tem acesso a este paciente enxerga). Abra um exame para ajustar brilho/contraste ou sobrepor ao odontograma.</p>
          <div className="pi-rx-grid">
            {radiografias.length === 0 && <p className="pi-vazio">Nenhum exame anexado ainda.</p>}
            {radiografias.map((r, i) => <CardRx key={i} item={r} onAbrir={setVisor} onRemover={removerRx} />)}
          </div>
          {(pront.imagens || []).length > 0 && (
            <>
              <h3 style={{ marginTop: 18 }}>Anexos do cadastro</h3>
              <div className="pi-rx-grid">
                {(pront.imagens || []).map((r, i) => <CardRx key={'a' + i} item={r} onAbrir={setVisor} onRemover={() => showToast('Remova pelo cadastro do paciente', 'warning')} />)}
              </div>
            </>
          )}
        </div>
      )}

      {/* ───────── PLANO ───────── */}
      {aba === 'plano' && (
        <div className="fp pi-card">
          <div className="pi-card-top">
            <h3 style={{ margin: 0, border: 0, padding: 0 }}>Plano de tratamento</h3>
            <div className="pi-card-acoes">
              <button className="btsv" style={{ background: '#16a34a' }} onClick={orcamentoWhatsapp}>💬 Enviar orçamento no WhatsApp</button>
              <button className="btsv" onClick={() => window.print()}>🖨️ Imprimir</button>
            </div>
          </div>
          <div className="pi-kpis" style={{ marginBottom: 12 }}>
            <div className="pi-kpi"><span>Planejado</span><b style={{ color: '#B45309' }}>{brl(totais.planejado)}</b></div>
            <div className="pi-kpi"><span>Em andamento</span><b style={{ color: '#1D4ED8' }}>{brl(totais.andamento)}</b></div>
            <div className="pi-kpi"><span>Concluído</span><b style={{ color: '#15803D' }}>{brl(totais.concluido)}</b></div>
            <div className="pi-kpi"><span>Total do plano</span><b>{brl(totais.geral)}</b></div>
          </div>
          <table className="tbl">
            <thead><tr><th>DENTE</th><th>PROCEDIMENTO</th><th>FACES</th><th>DENTISTA</th><th>DATA</th><th>SITUAÇÃO</th><th>VALOR</th><th></th></tr></thead>
            <tbody>
              {itens.length === 0 && <tr className="er"><td colSpan={8}>Nenhum procedimento lançado. Use o odontograma.</td></tr>}
              {itens.sort((a, b) => a.dente - b.dente).map(i => (
                <tr key={i.id}>
                  <td><b>{i.dente}</b><div style={{ fontSize: 10, color: 'var(--cinza-cl)' }}>{nomeDente(i.dente)}</div></td>
                  <td>{i.proc}{i.obs && <div style={{ fontSize: 11, color: 'var(--cinza)' }}>{i.obs}</div>}</td>
                  <td>{i.faces?.join('') || '—'}</td>
                  <td>{i.dentista || '—'}</td>
                  <td>{i.data || '—'}</td>
                  <td>
                    <select className="inf pi-mini" value={i.status} onChange={e => mudarStatus(i.dente, i.id, e.target.value)}>
                      {STATUS_ITEM.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </td>
                  <td><b>{brl(i.valor)}</b></td>
                  <td><button className="pi-x" onClick={() => removerItem(i.dente, i.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ───────── LINHA DO TEMPO ───────── */}
      {aba === 'historico' && (
        <div className="fp pi-card">
          <div className="pi-card-top">
            <h3 style={{ margin: 0, border: 0, padding: 0 }}>Linha do tempo do paciente</h3>
            <span style={{ fontSize: 11.5, color: 'var(--cinza)' }}>puxado direto da agenda — clique para abrir a consulta</span>
          </div>
          {linhaTempo.length === 0 && <p className="pi-vazio">Este paciente ainda não tem consultas na agenda.</p>}
          <div className="pi-timeline">
            {linhaTempo.map((e, i) => (
              <div key={i} className={`pi-tl ${e.d && e.d >= agora ? 'fut' : ''}`}>
                <div className="pi-tl-dot" />
                <div className="pi-tl-body" onClick={() => setProntuarioModal({ agKey: e.agKey, horario: e.horario })}>
                  <div className="pi-tl-head">
                    <b>{e.data} · {e.hora}</b>
                    {e.status && <span className="badge b-agendado">{e.status}</span>}
                    {e.dentista && <span>👨‍⚕️ {e.dentista}</span>}
                    {e.valor > 0 && <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{brl(e.valor)}</span>}
                  </div>
                  {e.procs.length > 0 && <div className="pi-tl-procs">{e.procs.map((p, j) => <span key={j} className="atag">{p}</span>)}</div>}
                  {e.realizados.length > 0 && (
                    <div style={{ fontSize: 11.5, color: 'var(--cinza)' }}>
                      ✔ {e.realizados.filter(r => r.realizado).length}/{e.realizados.length} procedimentos concluídos na sessão
                    </div>
                  )}
                  {e.atualizacoes.map((a, j) => (
                    <div key={j} className="pi-tl-upd"><b>{a.data}</b> {a.texto}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────── FICHA ───────── */}
      {aba === 'ficha' && (
        <div className="fp pi-card">
          <div className="pi-card-top">
            <h3 style={{ margin: 0, border: 0, padding: 0 }}>Ficha preenchida no cadastro</h3>
            <button className="btsv" onClick={() => setActivePanel('clientes')}>✏️ Editar em Pacientes</button>
          </div>
          <div className="pi-ficha">
            {[['Alergias', pront.alergias], ['Doenças sistêmicas', pront.doencas], ['Medicamentos', pront.medicamentos],
              ['Gestante/Amamentando', pront.gestante], ['Último tratamento', pront.ulttrat], ['Medo/Ansiedade', pront.medo],
              ['Já fez extração', pront.extracao], ['Implante/Ortodontia', pront.implante], ['Queixa principal', pront.queixa],
              ['Condição periodontal', pront.perio], ['Higiene bucal', pront.higiene], ['Bruxismo', pront.bruxismo],
              ['Tratamento em andamento', pront.tratamento], ['Próximo procedimento', pront.proximo], ['Sessões previstas', pront.sessoes],
            ].map(([k, v]) => (
              <div key={k} className="pi-ficha-item"><span>{k}</span><b>{v || '—'}</b></div>
            ))}
          </div>
          {pront.obscli && <><h3 style={{ marginTop: 16 }}>Observações clínicas</h3><p style={{ fontSize: 13 }}>{pront.obscli}</p></>}
          {paciente.obs && <><h3 style={{ marginTop: 16 }}>Observações gerais</h3><p style={{ fontSize: 13 }}>{paciente.obs}</p></>}
          {pront.odontograma?.atualizado_em && (
            <p style={{ fontSize: 11.5, color: 'var(--cinza-cl)', marginTop: 14 }}>
              Odontograma atualizado em {new Date(pront.odontograma.atualizado_em).toLocaleString('pt-BR')} por {pront.odontograma.atualizado_por || '—'}
            </p>
          )}
        </div>
      )}

      {visor && <VisorRx item={visor} onFechar={() => setVisor(null)} onUsarNoOdontograma={sobrepor} />}
    </div>
  );
}
