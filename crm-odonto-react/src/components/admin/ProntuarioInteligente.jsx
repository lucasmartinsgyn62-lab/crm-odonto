import { useEffect, useMemo, useRef, useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import Odontograma, { ESTADOS, LegendaOdontograma } from './Odontograma';
import { FACES, FACES_NOME, nomeDente, SUP_PERM, INF_PERM } from '../../lib/odontograma';
import { enviarAnexo, useAnexoUrl, urlAnexo } from '../../lib/anexos';
import { STATUS as STATUS_ORC, hojeStr as hojeOrc, somaDias } from '../../lib/orcamento';
import { num as toNum } from '../../constants';

const RX_EXEMPLO = '/exemplo-radiografia-panoramica.svg';

const STATUS_ITEM = [
  { id: 'planejado', label: 'Vai ser feito' },
  { id: 'andamento', label: 'Começou' },
  { id: 'concluido', label: 'Já terminou' },
];
const MARCAS = [
  { id: '', label: 'Deixar o sistema escolher' },
  { id: 'ausente', label: 'Dente ausente / extraído' },
  { id: 'implante', label: 'Implante' },
  { id: 'protese', label: 'Coroa / prótese' },
];
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

/* ─── bloco padrão: título simples + uma linha explicando ─── */
function Bloco({ passo, titulo, explicacao, acoes, children }) {
  return (
    <div className="bl">
      <div className="bl-h">
        <div>
          <h3>{passo && <span className="bl-passo">{passo}</span>}{titulo}</h3>
          {explicacao && <p>{explicacao}</p>}
        </div>
        {acoes && <div className="bl-acoes">{acoes}</div>}
      </div>
      {children}
    </div>
  );
}

/* ─── radiografia em tela cheia ─── */
function VisorCheio({ item, onFechar }) {
  const url = useAnexoUrl(item);
  if (!item) return null;
  return (
    <div className="pi-ov" onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="pi-visor">
        <div className="pi-visor-top">
          <div><b>{item.tipo || 'Radiografia'}</b>
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>{item.data || ''}</span></div>
          <button className="btsv" style={{ background: '#334155' }} onClick={onFechar}>✕ Fechar</button>
        </div>
        <div className="pi-visor-img">{url && <img src={url} alt="" />}</div>
      </div>
    </div>
  );
}

/* ─── miniatura de exame ─── */
function Mini({ item, ativo, onClick }) {
  const url = useAnexoUrl(item);
  return (
    <button className={`rx-mini${ativo ? ' sel' : ''}`} onClick={onClick} title={`${item.tipo || 'Exame'} · ${item.data || ''}`}>
      {url ? <img src={url} alt="" /> : <span>…</span>}
      <i>{item.tipo || 'Exame'}</i>
    </button>
  );
}

/* ───────────────────────────── tela ───────────────────────────── */
export default function ProntuarioInteligente() {
  const {
    state, dispatch, showToast, usuario, procNames, procPrecos,
    setActivePanel, setProntuarioModal, pacienteFoco, setPacienteFoco,
    loadAgendaMes, pad,
  } = useCRM();

  const [busca, setBusca] = useState('');
  const [pacienteId, setPacienteId] = useState(pacienteFoco || null);
  const [aba, setAba] = useState('boca');
  const [sel, setSel] = useState(new Set());
  const [decidua, setDecidua] = useState(false);
  const [rxAtiva, setRxAtiva] = useState(0);
  const [rxCheia, setRxCheia] = useState(null);
  const [brilho, setBrilho] = useState(100);
  const [contraste, setContraste] = useState(100);
  const [negativo, setNegativo] = useState(false);
  const [tipoUpload, setTipoUpload] = useState('Panorâmica');
  const [enviando, setEnviando] = useState(false);
  const [maisOpcoes, setMaisOpcoes] = useState(false);
  const fileRef = useRef(null);

  const [novo, setNovo] = useState({ proc: '', faces: [], status: 'planejado', marca: '', valor: '', dentista: '', data: hoje(), obs: '' });

  const paciente = state.clientes.find(c => c.id === pacienteId) || null;
  const pront = paciente?.prontuario || {};
  const dentes = pront.odontograma?.dentes || {};
  const radiografias = pront.radiografias || [];
  const exame = radiografias[Math.min(rxAtiva, radiografias.length - 1)] || null;
  const urlExame = useAnexoUrl(exame);

  useEffect(() => { if (pacienteFoco) { setPacienteId(pacienteFoco); setPacienteFoco(null); } }, [pacienteFoco, setPacienteFoco]);
  useEffect(() => {
    if (pacienteId || !state.clientes.length) return;
    const nDentes = c => Object.keys(c.prontuario?.odontograma?.dentes || {}).length;
    const comPlano = state.clientes.reduce((a, b) => (nDentes(b) > nDentes(a) ? b : a), state.clientes[0]);
    setPacienteId(comPlano.id);
  }, [state.clientes, pacienteId]);
  useEffect(() => {
    const d = new Date();
    for (let i = 1; i <= 3; i++) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      loadAgendaMes(pad(m.getMonth() + 1), String(m.getFullYear()));
    }
  }, [loadAgendaMes, pad]);
  useEffect(() => { setSel(new Set()); setRxAtiva(0); setBrilho(100); setContraste(100); setNegativo(false); }, [pacienteId]);

  /* ── gravação (lê, modifica e grava o prontuário existente) ── */
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
    // o plano vira orçamento sozinho na tela da recepção
    const temPendente = Object.values(novosDentes).some(d => (d.itens || []).some(i => i.status !== 'concluido'));
    if (temPendente && !pront.orcamento) {
      patch.orcamento = {
        status: 'aguardando', criado_em: hojeOrc(), validade: somaDias(hojeOrc(), 30),
        desconto: 0, descontoTipo: '%', parcelas: 1, obs: '',
        historico: [{ quando: new Date().toISOString(), evento: 'Orçamento gerado pelo prontuário', quem: usuario?.nome || '' }],
      };
      showToast('🧾 Orçamento criado — já está na tela Orçamentos para a recepção', 'success');
    }
    salvarPront(patch);
  }

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
    if (!sel.size) { showToast('Primeiro clique nos dentes no desenho', 'warning'); return; }
    if (!base.proc) { showToast('Escolha o que vai ser feito', 'warning'); return; }
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
    showToast(`✔ ${base.proc} anotado em ${sel.size} dente(s)`, 'success');
    setNovo(n => ({ ...n, obs: '' }));
    setSel(new Set());
  }
  function removerItem(dente, id) {
    const restantes = (dentes[dente]?.itens || []).filter(i => i.id !== id);
    const novos = { ...dentes };
    if (restantes.length) novos[dente] = { itens: restantes }; else delete novos[dente];
    setDentes(novos);
  }
  function mudarStatus(dente, id, status) {
    setDentes({ ...dentes, [dente]: { itens: (dentes[dente]?.itens || []).map(i => i.id === id ? { ...i, status } : i) } });
  }
  function limparDentes() {
    if (!sel.size) return;
    if (!confirm(`Apagar tudo o que está anotado em ${sel.size} dente(s)?`)) return;
    const novos = { ...dentes };
    sel.forEach(d => delete novos[d]);
    setDentes(novos);
    setSel(new Set());
  }

  /* ── radiografias ── */
  async function subirRx(e) {
    const files = Array.from(e.target.files || []); e.target.value = '';
    if (!files.length || !paciente) return;
    setEnviando(true);
    const novas = [...radiografias];
    for (const f of files) {
      const { anexo, error } = await enviarAnexo(f, usuario?.tenant_id);
      if (error) { showToast('Não consegui enviar: ' + error, 'error'); continue; }
      novas.push({ ...anexo, tipo: tipoUpload, data: hoje(), dentista: state.dentistas[0]?.nome || '' });
    }
    salvarPront({ radiografias: novas });
    setRxAtiva(novas.length - 1);
    setEnviando(false);
    showToast('✔ Radiografia guardada no prontuário', 'success');
  }
  function usarExemplo() {
    const novas = [...radiografias, { name: 'Panorâmica (exemplo)', url: RX_EXEMPLO, tipo: 'Panorâmica', data: hoje(), obs: 'Imagem ilustrativa para demonstração' }];
    salvarPront({ radiografias: novas });
    setRxAtiva(novas.length - 1);
  }
  function removerRx() {
    if (!exame || !confirm('Tirar esta radiografia do prontuário?')) return;
    salvarPront({ radiografias: radiografias.filter(r => r !== exame) });
    setRxAtiva(0);
  }

  /* ── histórico do paciente (vem da agenda) ── */
  const linhaTempo = useMemo(() => {
    if (!paciente) return [];
    const out = [];
    Object.entries(state.agenda).forEach(([agKey, slots]) => {
      const [dent, data] = agKey.includes('||') ? agKey.split('||') : ['', agKey];
      Object.entries(slots || {}).forEach(([horario, s]) => {
        if (!s || s.nome !== paciente.nome) return;
        out.push({
          agKey, horario, dentista: dent, data, hora: horario.replace('-ENCAIXE', ' (encaixe)'),
          status: s.status || '', valor: toNum(s.valor),
          procs: s.areas || s.procedimentos || [],
          realizados: s.procedimentosRealizados || [], atualizacoes: s.atualizacoes || [],
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

  const alertas = useMemo(() => {
    const a = [];
    if (pront.alergias) a.push({ t: '⚠️ Alergia', v: pront.alergias, cor: '#DC2626' });
    if (pront.doencas) a.push({ t: '🩺 Doença', v: pront.doencas, cor: '#EA580C' });
    if (pront.medicamentos) a.push({ t: '💊 Remédio', v: pront.medicamentos, cor: '#0891B2' });
    if (pront.gestante && pront.gestante !== 'Não') a.push({ t: '🤰 Atenção', v: pront.gestante, cor: '#DB2777' });
    if (['Moderado', 'Intenso'].includes(pront.medo)) a.push({ t: '😰 Medo', v: pront.medo, cor: '#7C3AED' });
    if (pront.bruxismo && pront.bruxismo !== 'Não') a.push({ t: '😬 Bruxismo', v: pront.bruxismo, cor: '#B45309' });
    if (String(pront.perio || '').startsWith('Periodontite')) a.push({ t: '🦠 Gengiva', v: pront.perio, cor: '#DC2626' });
    return a;
  }, [pront]);

  const listaPacientes = state.clientes.filter(c => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()));

  function orcamentoWhatsapp() {
    if (!paciente?.wpp) { showToast('Este paciente não tem WhatsApp no cadastro', 'warning'); return; }
    const linhas = itens.filter(i => i.status !== 'concluido').map(i => `• Dente ${i.dente} — ${i.proc}: ${brl(i.valor)}`).join('\n');
    const total = itens.filter(i => i.status !== 'concluido').reduce((s, i) => s + toNum(i.valor), 0);
    const msg = `Olá, ${paciente.nome}! Segue o seu plano de tratamento:\n\n${linhas}\n\nTotal: ${brl(total)}\n\nQualquer dúvida estamos à disposição.`;
    window.open(`https://wa.me/55${paciente.wpp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  }

  if (!paciente) {
    return <div className="bl"><h3>Prontuário</h3><p style={{ fontSize: 13, color: 'var(--cinza)' }}>Cadastre um paciente em <b>Pacientes</b> para começar.</p></div>;
  }

  const selArr = [...sel].sort((a, b) => a - b);
  const itensSelecionados = selArr.flatMap(d => (dentes[d]?.itens || []).map(i => ({ ...i, dente: d })));

  return (
    <div className="pi-wrap">
      {/* ─── quem é o paciente ─── */}
      <div className="pi-paciente">
        <div className="pi-av">{paciente.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2>{paciente.nome}</h2>
          <div className="pi-meta">
            {paciente.wpp && <span>📱 {paciente.wpp}</span>}
            <span className={`badge ${paciente.tipo === 'NOVO' ? 'b-rec' : 'b-fin'}`}>{paciente.tipo || '—'}</span>
            {proxima && <span>📅 volta em {proxima.data} às {proxima.hora}</span>}
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
          {alertas.map((a, i) => <span key={i} style={{ borderColor: a.cor, color: a.cor }}><b>{a.t}:</b> {a.v}</span>)}
        </div>
      )}

      {/* ─── 4 números, sem poluir ─── */}
      <div className="pi-kpis">
        <div className="pi-kpi"><span>Dentes em tratamento</span><b>{Object.keys(dentes).length}</b><i>de 32</i></div>
        <div className="pi-kpi" style={{ cursor: pront.orcamento ? 'pointer' : 'default' }}
          onClick={() => pront.orcamento && setActivePanel('orcamentos')}>
          <span>Falta o paciente pagar</span><b>{brl(totais.planejado + totais.andamento)}</b>
          <i>{pront.orcamento ? `🧾 ${STATUS_ORC[pront.orcamento.status]?.label.toLowerCase()}` : 'sem orçamento ainda'}</i>
        </div>
        <div className="pi-kpi"><span>Já pagou até hoje</span><b>{brl(investido)}</b><i>{linhaTempo.length} consultas</i></div>
        <div className="pi-kpi"><span>Última visita</span><b>{ultima ? ultima.data : '—'}</b><i>{ultima ? ultima.status.toLowerCase() : 'primeira vez'}</i></div>
      </div>

      {/* ─── abas ─── */}
      <div className="pi-abas">
        {[['boca', '🦷 Boca do paciente'], ['plano', '📋 Tratamento e valores'],
          ['historico', '🕓 Consultas anteriores'], ['ficha', '📑 Ficha de saúde']].map(([id, lb]) => (
          <button key={id} className={aba === id ? 'pi-on' : ''} onClick={() => setAba(id)}>{lb}</button>
        ))}
        <span style={{ flex: 1 }} />
        <button className="btsv" onClick={() => window.print()}>🖨️ Imprimir</button>
      </div>

      {/* ═══════════ BOCA DO PACIENTE: RX em cima, odontograma embaixo ═══════════ */}
      {aba === 'boca' && (
        <>
        {/* raio-X e odontograma lado a lado (cada um na metade), para o dentista
            ver tudo de uma vez — e o quadro do tratamento logo abaixo */}
        <div className="pi-boca">
          <Bloco passo="1" titulo="Radiografia do paciente"
            explicacao="A imagem que veio do raio-X. Serve para o dentista olhar antes de marcar os dentes aqui embaixo."
            acoes={<>
              {radiografias.length > 0 && <>
                <button className="btsv rx-b" style={{ background: negativo ? 'var(--v1)' : '#64748b' }} onClick={() => setNegativo(n => !n)}>⇄ Inverter</button>
                <button className="btsv rx-b" style={{ background: '#64748b' }} onClick={() => setRxCheia(exame)}>🔍 Ampliar</button>
                <button className="btsv rx-b" style={{ background: '#b91c1c' }} onClick={removerRx}>🗑 Tirar</button>
              </>}
              <select className="inf" style={{ width: 170 }} value={tipoUpload} onChange={e => setTipoUpload(e.target.value)}>
                {TIPOS_RX.map(t => <option key={t}>{t}</option>)}
              </select>
              <input ref={fileRef} type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }} onChange={subirRx} />
              <button className="btsv" onClick={() => fileRef.current?.click()} disabled={enviando}>
                {enviando ? '⏳ enviando…' : '📤 Enviar radiografia'}
              </button>
            </>}>
            {radiografias.length === 0 ? (
              <div className="rx-vazio">
                <div style={{ fontSize: 34 }}>🩻</div>
                <b>Nenhuma radiografia ainda</b>
                <span>Clique em “Enviar radiografia” e escolha a imagem no computador.</span>
                <button className="btsv" style={{ background: '#64748b' }} onClick={usarExemplo}>Ver um exemplo</button>
              </div>
            ) : (
              <>
                <div className="rx-palco">
                  {urlExame && <img src={urlExame} alt="Radiografia"
                    style={{ filter: `brightness(${brilho}%) contrast(${contraste}%) ${negativo ? 'invert(1)' : ''}` }}
                    onClick={() => setRxCheia(exame)} />}
                </div>
                <div className="rx-linha">
                  <label>☀️ Clarear<input type="range" min="50" max="180" value={brilho} onChange={e => setBrilho(+e.target.value)} /></label>
                  <label>◐ Contraste<input type="range" min="50" max="240" value={contraste} onChange={e => setContraste(+e.target.value)} /></label>
                  <span className="rx-info">{exame?.tipo} · {exame?.data}</span>
                </div>
                {radiografias.length > 1 && (
                  <div className="rx-minis">
                    {radiografias.map((r, i) => <Mini key={i} item={r} ativo={i === rxAtiva} onClick={() => setRxAtiva(i)} />)}
                  </div>
                )}
              </>
            )}
          </Bloco>

          <Bloco passo="2" titulo="Odontograma — marque os dentes"
            explicacao="Clique no dente que vai ser tratado (pode clicar em vários). Depois escolha o tratamento no quadro que aparece embaixo."
            acoes={<>
              <label className="pi-check"><input type="checkbox" checked={decidua} onChange={e => { setDecidua(e.target.checked); setSel(new Set()); }} /> dentes de leite</label>
              {sel.size > 0 && <button className="btsv rx-b" style={{ background: '#64748b' }} onClick={() => setSel(new Set())}>Limpar seleção</button>}
            </>}>
            <Odontograma
              dentes={dentes} selecionados={sel} decidua={decidua}
              onToggle={n => setSel(s => { const x = new Set(s); if (x.has(n)) x.delete(n); else x.add(n); return x; })}
            />
            <LegendaOdontograma />
          </Bloco>
        </div>

          {/* quadro do lançamento — sempre visível, para o dentista já ver o que fazer */}
          <Bloco passo="3"
              titulo={sel.size ? `O que vai ser feito no dente ${selArr.join(', ')}?` : 'O que vai ser feito no dente'}
              explicacao={sel.size
                ? 'Escolha pelos botões rápidos ou pela lista. O valor vem da sua tabela de preços e pode ser mudado.'
                : 'Clique em um dente no desenho aí em cima que este quadro libera.'}
              acoes={sel.size > 0 && <button className="btsv" style={{ background: '#b91c1c' }} onClick={limparDentes}>🗑 Apagar deste dente</button>}>
            <div className={sel.size ? '' : 'pi-travado'}>
              <div className="pi-atalhos">
                {ATALHOS.map(a => (
                  <button key={a.label} onClick={() => aplicar({ ...a, valor: procPrecos[a.proc] ?? '', dentista: novo.dentista, data: hoje() })}>{a.label}</button>
                ))}
              </div>
              <div className="gg3">
                <div className="fgg"><label>Tratamento</label>
                  <input className="inf" list="pi-procs" placeholder="Digite para procurar…" value={novo.proc}
                    onChange={e => setNovo(n => ({ ...n, proc: e.target.value, valor: procPrecos[e.target.value] ?? n.valor }))} />
                  <datalist id="pi-procs">{procNames.map(p => <option key={p} value={p} />)}</datalist>
                </div>
                <div className="fgg"><label>Situação</label>
                  <select className="inf" value={novo.status} onChange={e => setNovo(n => ({ ...n, status: e.target.value }))}>
                    {STATUS_ITEM.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="fgg"><label>Valor (R$)</label>
                  <input className="inf" value={novo.valor} onChange={e => setNovo(n => ({ ...n, valor: e.target.value }))} placeholder="vem da tabela" />
                </div>
              </div>

              <button className="pi-mais" onClick={() => setMaisOpcoes(o => !o)}>
                {maisOpcoes ? '▾ esconder' : '▸ mais opções'} (faces do dente, dentista, observação)
              </button>
              {maisOpcoes && (
                <div className="gg3" style={{ marginTop: 8 }}>
                  <div className="fgg"><label>Faces do dente</label>
                    <div className="pi-faces">
                      {FACES.map(f => (
                        <button key={f} title={FACES_NOME[f]} className={novo.faces.includes(f) ? 'pi-on' : ''}
                          onClick={() => setNovo(n => ({ ...n, faces: n.faces.includes(f) ? n.faces.filter(x => x !== f) : [...n.faces, f] }))}>{f}</button>
                      ))}
                    </div>
                  </div>
                  <div className="fgg"><label>Dentista</label>
                    <select className="inf" value={novo.dentista} onChange={e => setNovo(n => ({ ...n, dentista: e.target.value }))}>
                      <option value="">—</option>
                      {state.dentistas.map(d => <option key={d.id} value={d.nome}>{d.nome}</option>)}
                    </select>
                  </div>
                  <div className="fgg"><label>Como marcar no desenho</label>
                    <select className="inf" value={novo.marca} onChange={e => setNovo(n => ({ ...n, marca: e.target.value }))}>
                      {MARCAS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                  </div>
                  <div className="fgg" style={{ gridColumn: 'span 3' }}><label>Observação</label>
                    <input className="inf" value={novo.obs} onChange={e => setNovo(n => ({ ...n, obs: e.target.value }))} placeholder="Ex: cárie profunda, avaliar canal" />
                  </div>
                </div>
              )}

              <button className="btsv" style={{ marginTop: 12, fontSize: 14, padding: '.6rem 1.4rem' }}
                disabled={!sel.size} onClick={() => aplicar(novo)}>
                ✓ Anotar no dente {selArr.join(', ')}
              </button>
            </div>

            {/* o que já está marcado: do dente escolhido ou, sem seleção, o resumo do paciente */}
            <div className="pi-titulinho">
              {sel.size ? 'Já está anotado neste dente' : `Já está marcado na boca deste paciente (${itens.length})`}
            </div>
            {(sel.size ? itensSelecionados : itens).slice(0, sel.size ? 99 : 6).map(i => (
              <div key={i.id} className="pi-item">
                <span className="pi-item-dente" style={{ background: ESTADOS[i.marca || i.status]?.stroke || '#94a3b8' }}>{i.dente}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{i.proc}</b>
                  <span>{i.faces?.length ? `faces ${i.faces.join('')} · ` : ''}{i.data}{i.dentista ? ' · ' + i.dentista : ''}</span>
                </div>
                <b style={{ whiteSpace: 'nowrap' }}>{brl(i.valor)}</b>
                <select className="inf pi-mini" value={i.status} onChange={e => mudarStatus(i.dente, i.id, e.target.value)}>
                  {STATUS_ITEM.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <button className="pi-x" onClick={() => removerItem(i.dente, i.id)}>✕</button>
              </div>
            ))}
            {itens.length === 0 && <p className="pi-vazio">Nada marcado ainda neste paciente.</p>}
            {!sel.size && itens.length > 6 && (
              <button className="pi-mais" onClick={() => setAba('plano')}>▸ ver os {itens.length} tratamentos na aba “Tratamento e valores”</button>
            )}
          </Bloco>
        </>
      )}

      {/* ═══════════ TRATAMENTO E VALORES ═══════════ */}
      {aba === 'plano' && (
        <Bloco titulo="Tratamento e valores"
          explicacao="Tudo o que foi marcado no odontograma, com o preço. É isto que vira o orçamento da recepção."
          acoes={<>
            <button className="btsv" style={{ background: '#16a34a' }} onClick={orcamentoWhatsapp}>💬 Mandar no WhatsApp</button>
            <button className="btsv" style={{ background: '#64748b' }} onClick={() => setActivePanel('orcamentos')}>🧾 Ver na tela Orçamentos</button>
          </>}>
          <div className="pi-kpis" style={{ marginBottom: 12 }}>
            <div className="pi-kpi"><span>Vai ser feito</span><b style={{ color: '#B45309' }}>{brl(totais.planejado)}</b></div>
            <div className="pi-kpi"><span>Começou</span><b style={{ color: '#1D4ED8' }}>{brl(totais.andamento)}</b></div>
            <div className="pi-kpi"><span>Já terminou</span><b style={{ color: '#15803D' }}>{brl(totais.concluido)}</b></div>
            <div className="pi-kpi"><span>Total</span><b>{brl(totais.geral)}</b></div>
          </div>
          <table className="tbl">
            <thead><tr><th>DENTE</th><th>TRATAMENTO</th><th>DENTISTA</th><th>SITUAÇÃO</th><th>VALOR</th><th></th></tr></thead>
            <tbody>
              {itens.length === 0 && <tr className="er"><td colSpan={6}>Nada marcado ainda. Vá em “Boca do paciente” e clique nos dentes.</td></tr>}
              {itens.sort((a, b) => a.dente - b.dente).map(i => (
                <tr key={i.id}>
                  <td><b>{i.dente}</b><div style={{ fontSize: 10, color: 'var(--cinza-cl)' }}>{nomeDente(i.dente)}</div></td>
                  <td>{i.proc}{i.obs && <div style={{ fontSize: 11, color: 'var(--cinza)' }}>{i.obs}</div>}
                    {i.faces?.length > 0 && <div style={{ fontSize: 10.5, color: 'var(--cinza-cl)' }}>faces {i.faces.join('')}</div>}</td>
                  <td>{i.dentista || '—'}</td>
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
        </Bloco>
      )}

      {/* ═══════════ CONSULTAS ANTERIORES ═══════════ */}
      {aba === 'historico' && (
        <Bloco titulo="Consultas anteriores"
          explicacao="Vem direto da agenda. Clique em uma consulta para abrir o que foi feito naquele dia.">
          {linhaTempo.length === 0 && <p className="pi-vazio">Este paciente ainda não tem consultas marcadas.</p>}
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
                  {e.atualizacoes.map((a, j) => <div key={j} className="pi-tl-upd"><b>{a.data}</b> {a.texto}</div>)}
                </div>
              </div>
            ))}
          </div>
        </Bloco>
      )}

      {/* ═══════════ FICHA DE SAÚDE ═══════════ */}
      {aba === 'ficha' && (
        <Bloco titulo="Ficha de saúde"
          explicacao="O que o paciente respondeu no cadastro. Para mudar, é no menu Pacientes."
          acoes={<button className="btsv" onClick={() => setActivePanel('clientes')}>✏️ Editar em Pacientes</button>}>
          <div className="pi-ficha">
            {[['Alergias', pront.alergias], ['Doenças', pront.doencas], ['Remédios que toma', pront.medicamentos],
              ['Gestante/Amamentando', pront.gestante], ['Último tratamento', pront.ulttrat], ['Medo de dentista', pront.medo],
              ['Já fez extração', pront.extracao], ['Implante/Aparelho antes', pront.implante], ['Queixa principal', pront.queixa],
              ['Gengiva', pront.perio], ['Higiene', pront.higiene], ['Range os dentes', pront.bruxismo],
              ['Tratamento em andamento', pront.tratamento], ['Próximo procedimento', pront.proximo], ['Sessões previstas', pront.sessoes],
            ].map(([k, v]) => (
              <div key={k} className="pi-ficha-item"><span>{k}</span><b>{v || '—'}</b></div>
            ))}
          </div>
          {pront.obscli && <><div className="pi-titulinho">Observações do dentista</div><p style={{ fontSize: 13 }}>{pront.obscli}</p></>}
          {(pront.imagens || []).length > 0 && (
            <>
              <div className="pi-titulinho">Anexos do cadastro</div>
              <div className="rx-minis">
                {(pront.imagens || []).map((r, i) => <Mini key={i} item={r} onClick={() => setRxCheia(r)} />)}
              </div>
            </>
          )}
        </Bloco>
      )}

      {rxCheia && <VisorCheio item={rxCheia} onFechar={() => setRxCheia(null)} />}
    </div>
  );
}
