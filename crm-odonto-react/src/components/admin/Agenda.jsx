import { useState, useMemo, useRef, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import { HORARIOS, STATUS_LIST, STATUS_BADGE, TIPO_LIST, DURACOES, isAtendido, num } from '../../constants';

const STATUS_ROW_CLASS = {
  'AGENDADO':              'row-agendado',
  'AGENDADO AVALIAÇÃO':    'row-agendado-av',
  'CONFIRMADO':            'row-confirmado',
  'CONFIRMADO AVALIAÇÃO':  'row-confirmado-av',
  'ATENDIDO':              'row-atendido',
  'FINALIZADO':            'row-atendido',
  'FALTOU SEM AVISO':      'row-falta-grave',
  'FALTOU COM AVISO':      'row-falta-leve',
  'EM ATENDIMENTO':        'row-em-atend',
  'RECEPÇÃO':              'row-recepcao',
  'AGUARDANDO':            'row-aguardando',
  'AVALIAÇÃO':             'row-avaliacao',
  'REAGENDOU':             'row-reagendou',
};

export const ENCAIXE_SUFFIX = '-ENCAIXE';

function ClienteCombo({ value, options, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setQuery(''); }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = terms.length
    ? options.filter(n => { const ln = n.toLowerCase(); return terms.every(t => ln.includes(t)); })
    : options;

  function choose(n) {
    onSelect(n);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', maxWidth: 160 }}>
      {!open && (<button
        type="button"
        className="ssel"
        style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', background: '#fff' }}
        onClick={() => { setQuery(''); setOpen(o => !o); }}
        title="Clique para pesquisar paciente"
      >
        <i className="ti ti-search" style={{ fontSize: 12, color: 'var(--v2)', flexShrink: 0 }}></i>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: value ? 'inherit' : '#999' }}>
          {value || '— vazio —'}
        </span>
      </button>)}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 60, marginTop: 2,
          background: '#fff', border: '1px solid var(--borda)', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,40,120,.18)', width: 230, maxHeight: 260, overflowY: 'auto',
        }}>
          <div style={{
            position: 'sticky', top: 0, background: '#fff', padding: 6,
            borderBottom: '1px solid var(--borda)', display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <i className="ti ti-search" style={{ fontSize: 13, color: 'var(--cinza-cl)', flexShrink: 0 }}></i>
            <input
              autoFocus
              className="ssel"
              style={{ width: '100%' }}
              placeholder="Pesquisar paciente..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && filtered.length === 1) choose(filtered[0]); if (e.key === 'Escape') { setOpen(false); setQuery(''); } }}
            />
          </div>
          <div style={{ padding: '4px 0' }}>
            <div
              style={{ padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#999' }}
              onClick={() => choose('')}
            >
              — vazio —
            </div>
            {filtered.map(n => (
              <div
                key={n}
                style={{ padding: '5px 10px', cursor: 'pointer', fontSize: 12, background: n === value ? 'var(--b1)' : 'transparent', color: '#111' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--b1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = n === value ? 'var(--b1)' : 'transparent'; }}
                onClick={() => choose(n)}
              >
                {n}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '8px 10px', fontSize: 12, color: '#bbb' }}>Nenhum paciente encontrado</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProcCombo({ options, cores, precos, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setQuery(''); }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = terms.length
    ? options.filter(n => { const ln = n.toLowerCase(); return terms.every(t => ln.includes(t)); })
    : options;

  function choose(n) {
    onSelect(n);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', maxWidth: 150, marginTop: 2 }}>
      {!open && (<button
        type="button"
        className="ssel"
        style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', background: '#fff' }}
        onClick={() => { setQuery(''); setOpen(o => !o); }}
        title="Clique para pesquisar procedimento"
      >
        <i className="ti ti-search" style={{ fontSize: 12, color: 'var(--v2)', flexShrink: 0 }}></i>
        <span style={{ color: '#999' }}>+ procedimento</span>
      </button>)}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 60, marginTop: 2,
          background: '#fff', border: '1px solid var(--borda)', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,40,120,.18)', width: 280, maxHeight: 280, overflowY: 'auto',
        }}>
          <div style={{
            position: 'sticky', top: 0, background: '#fff', padding: 6,
            borderBottom: '1px solid var(--borda)', display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <i className="ti ti-search" style={{ fontSize: 13, color: 'var(--cinza-cl)', flexShrink: 0 }}></i>
            <input
              autoFocus
              className="ssel"
              style={{ width: '100%' }}
              placeholder="Pesquisar procedimento..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && filtered.length === 1) choose(filtered[0]); if (e.key === 'Escape') { setOpen(false); setQuery(''); } }}
            />
          </div>
          <div style={{ padding: '4px 0' }}>
            {filtered.map(n => (
              <div
                key={n}
                style={{ padding: '5px 10px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#111' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--b1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                onClick={() => choose(n)}
              >
                <span style={{
                  width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                  background: cores[n] || '#e0e0e0', border: '1px solid rgba(0,0,0,.1)',
                }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span>
                <span style={{ color: 'var(--v2)', fontWeight: 600, flexShrink: 0 }}>
                  R$ {(precos[n] || 0).toFixed(0)}
                </span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '8px 10px', fontSize: 12, color: '#bbb' }}>Nenhum procedimento encontrado</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ValorInput({ value, onCommit }) {
  const [buf, setBuf] = useState(String(value ?? ''));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setBuf(String(value ?? ''));
  }, [value, focused]);

  function commit() {
    setFocused(false);
    // sanitiza: só número válido e não-negativo; senão volta ao valor anterior
    const n = parseFloat(buf.replace(',', '.').replace(/[^\d.-]/g, ''));
    const v = (isNaN(n) || n < 0) ? '' : String(Math.round(n * 100) / 100);
    setBuf(v);
    if (v !== String(value ?? '')) onCommit(v);
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      className="ssel"
      style={{ width: 72, fontWeight: 700, color: 'var(--v2)' }}
      value={buf}
      onFocus={() => setFocused(true)}
      onChange={e => setBuf(e.target.value.replace(/[^\d.,]/g, ''))}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      title="Calculado pelos procedimentos — edite se precisar"
    />
  );
}

export default function Agenda() {
  const { state, dispatch, selectedDentista, setSelectedDentista, getAgKey, getDateStr, setProntuarioModal, setCaixaModal, showToast, procNames, procPrecos, procCores } = useCRM();
  const [filtroStatus, setFiltroStatus] = useState('');

  // A agenda é sempre de um dentista real — sem "— Selecione —" (agenda fantasma).
  useEffect(() => {
    if (!selectedDentista && state.dentistas.length > 0) {
      setSelectedDentista(state.dentistas[0].nome);
    }
  }, [selectedDentista, state.dentistas, setSelectedDentista]);

  const agKey = getAgKey();
  const ag = state.agenda[agKey] || {};

  function updateSlot(h, field, value) {
    const slot = { ...(ag[h] || {}), [field]: value };
    dispatch({ type: 'SET_AGENDA_SLOT', payload: { agKey, horario: h, slot } });
  }

  function handleStatusChange(h, novoStatus) {
    if (novoStatus === 'ATENDIDO') {
      if (!ag[h]?.nome) { showToast('Selecione um paciente primeiro', 'warning'); return; }
      setCaixaModal({ agKey, horario: h });
      return; // não salva — modal confirma e salva com status ATENDIDO
    }
    updateSlot(h, 'status', novoStatus);
  }

  function mudarDuracao(h, novaDuracao) {
    const idx = HORARIOS.indexOf(h);
    const extraSlots = novaDuracao / 30 - 1;
    // horários que seriam cobertos/bloqueados pela nova duração
    const conflitos = [];
    for (let i = 1; i <= extraSlots; i++) {
      const hb = HORARIOS[idx + i];
      if (hb && ag[hb]?.nome) conflitos.push({ hora: hb, nome: ag[hb].nome });
    }
    if (conflitos.length > 0) {
      const lista = conflitos.map(c => `• ${c.hora} — ${c.nome}`).join('\n');
      const ok = window.confirm(
        `Aumentar a duração para ${novaDuracao / 60 >= 1 ? (novaDuracao / 60) + 'h' : novaDuracao + 'min'} vai ocupar os horários seguintes, que JÁ têm agendamento:\n\n${lista}\n\nSe continuar, esses agendamentos ficarão ocultos sob o bloqueio (não serão apagados, mas some da grade). Recomendado: reagende-os antes.\n\nContinuar mesmo assim?`
      );
      if (!ok) return; // cancela — o select volta ao valor anterior por causa do estado controlado
    }
    updateSlot(h, 'duracao', novaDuracao);
  }

  function updateAreas(h, area) {
    const slot = ag[h] || {};
    const areas = slot.areas || [];
    const newAreas = areas.includes(area) ? areas.filter(a => a !== area) : [...areas, area];
    const valor = newAreas.reduce((s, a) => s + (procPrecos[a] || 0), 0);
    dispatch({ type: 'SET_AGENDA_SLOT', payload: { agKey, horario: h, slot: { ...slot, areas: newAreas, valor } } });
  }

  function openPront(h) {
    if (!ag[h]?.nome) { showToast('Selecione um paciente primeiro', 'warning'); return; }
    setProntuarioModal({ agKey, horario: h });
  }

  function openCaixa(h) {
    if (!ag[h]?.nome) { showToast('Selecione um paciente primeiro', 'warning'); return; }
    setCaixaModal({ agKey, horario: h });
  }

  function getWppUrl(h) {
    const wpp = (ag[h]?.wpp || '').replace(/\D/g, '');
    if (!wpp) return null;
    return `https://wa.me/55${wpp}?text=Olá ${ag[h]?.nome || ''}`;
  }

  function criarEncaixe(h) {
    dispatch({ type: 'SET_AGENDA_SLOT', payload: { agKey, horario: `${h}${ENCAIXE_SUFFIX}`, slot: { encaixe: true } } });
  }

  function removerEncaixe(h) {
    if (ag[`${h}${ENCAIXE_SUFFIX}`]?.nome && !window.confirm('Remover este encaixe?')) return;
    dispatch({ type: 'CLEAR_AGENDA_SLOT', payload: { agKey, horario: `${h}${ENCAIXE_SUFFIX}` } });
  }

  const bloqueadoMap = useMemo(() => {
    const map = {};
    HORARIOS.forEach((h, idx) => {
      const duracao = ag[h]?.duracao || 30;
      if (duracao > 30) {
        const extraSlots = duracao / 30 - 1;
        for (let i = 1; i <= extraSlots; i++) {
          if (HORARIOS[idx + i]) map[HORARIOS[idx + i]] = h;
        }
      }
    });
    return map;
  }, [ag]);

  const preenchidos = Object.entries(ag).filter(([, s]) => s?.nome).length;
  const clienteNomes = state.clientes.map(c => c.nome);

  const horariosVisiveis = HORARIOS.filter(h => {
    if (filtroStatus) {
      if (bloqueadoMap[h]) return false;
      const st = ag[h]?.status;
      const stEnc = ag[`${h}${ENCAIXE_SUFFIX}`]?.status;
      if (filtroStatus === 'ATENDIDO') return isAtendido(st) || isAtendido(stEnc);
      return st === filtroStatus || stEnc === filtroStatus;
    }
    return true;
  });

  // ── Linha de agendamento (normal ou encaixe) ──
  function renderRow(h, slotKey, isEnc) {
    const s = ag[slotKey] || {};
    const badge = STATUS_BADGE[s.status] || '';
    const wppUrl = getWppUrl(slotKey);
    const duracao = s.duracao || 30;
    const totalVal = s.valor
      ? num(s.valor).toFixed(2)
      : (s.areas || []).reduce((sum, a) => sum + (procPrecos[a] || 0), 0).toFixed(2);

    const [hh, mm] = h.split(':').map(Number);
    const minFim = hh * 60 + mm + duracao;
    const fimStr = !isEnc && duracao > 30
      ? `→ ${String(Math.floor(minFim / 60)).padStart(2, '0')}:${String(minFim % 60).padStart(2, '0')}`
      : '';

    const rowClass = isEnc ? 'row-encaixe' : (STATUS_ROW_CLASS[s.status] || '');
    const temEncaixe = ag[`${h}${ENCAIXE_SUFFIX}`] !== undefined;

    return (
      <tr key={slotKey} className={`ag-row ${rowClass}`} style={{ verticalAlign: 'top' }}>
        {/* HORÁRIO + DURAÇÃO / ENCAIXE */}
        <td style={{
          fontWeight: 700, color: isEnc ? '#f0f0f0' : 'var(--v2)', whiteSpace: 'nowrap',
          verticalAlign: 'middle', borderRight: '2px solid var(--borda)',
        }}>
          <div style={{ fontSize: 14 }}>{h}</div>
          {isEnc ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <span style={{ fontSize: 9, background: '#111', color: '#fff', borderRadius: 4, padding: '2px 6px', letterSpacing: 1.5, fontWeight: 800 }}>
                ENCAIXE
              </span>
              <button
                onClick={() => removerEncaixe(h)}
                title="Remover encaixe"
                style={{ background: 'none', border: 'none', color: '#f0f0f0', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}
              >✕</button>
            </div>
          ) : (
            <>
              {fimStr && <div style={{ fontSize: 10, color: 'var(--cinza-cl)', marginTop: 2 }}>{fimStr}</div>}
              <select
                className="ssel"
                style={{ marginTop: 4, fontSize: 10, padding: '2px 4px' }}
                value={duracao}
                onChange={e => mudarDuracao(h, parseInt(e.target.value))}
                title="Duração do atendimento"
              >
                {DURACOES.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              {!temEncaixe && (
                <button
                  className="btn-pront"
                  style={{ display: 'block', marginTop: 4, fontSize: 9, padding: '2px 6px', background: '#3A3A3A', color: '#fff', borderColor: '#3A3A3A', letterSpacing: 1 }}
                  onClick={() => criarEncaixe(h)}
                  title="Adicionar um encaixe neste horário"
                >
                  + ENCAIXE
                </button>
              )}
            </>
          )}
        </td>

        {/* PACIENTE */}
        <td>
          <ClienteCombo
            value={s.nome || ''}
            options={clienteNomes}
            onSelect={nome => {
              const cli = state.clientes.find(c => c.nome === nome) || {};
              dispatch({
                type: 'SET_AGENDA_SLOT',
                payload: {
                  agKey, horario: slotKey,
                  slot: {
                    ...s, nome,
                    wpp: cli.wpp || s.wpp || '',
                    tipo: cli.tipo || s.tipo || '',
                    orig: cli.orig || s.orig || '',
                    areas: cli.areas || s.areas || [],
                  }
                }
              });
            }}
          />
        </td>

        {/* STATUS */}
        <td>
          {s.nome ? (
            <>
              <select
                className="ssel"
                value={s.status || ''}
                onChange={e => handleStatusChange(slotKey, e.target.value)}
              >
                <option value="">—</option>
                {STATUS_LIST.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
              {s.status && (
                <span className={`badge ${badge}`} style={{ marginLeft: 4, display: 'block', marginTop: 3 }}>
                  {s.status}
                </span>
              )}
            </>
          ) : <span style={{ color: isEnc ? '#bbb' : '#ccc', fontSize: 11 }}>—</span>}
        </td>

        {/* PROCEDIMENTOS */}
        <td>
          {s.nome ? (
            <div>
              {(s.areas || []).map(a => (
                <span
                  key={a}
                  className="atag"
                  style={{
                    cursor: 'pointer',
                    ...(procCores[a] ? { background: procCores[a], color: '#fff', borderColor: procCores[a] } : {}),
                  }}
                  title="Clique para remover"
                  onClick={() => updateAreas(slotKey, a)}
                >
                  {a} ✕
                </span>
              ))}
              <ProcCombo
                options={procNames}
                cores={procCores}
                precos={procPrecos}
                onSelect={a => updateAreas(slotKey, a)}
              />
            </div>
          ) : <span style={{ color: isEnc ? '#bbb' : '#ccc', fontSize: 11 }}>—</span>}
        </td>

        {/* TIPO */}
        <td>
          {s.nome ? (
            <select className="ssel" value={s.tipo || ''} onChange={e => updateSlot(slotKey, 'tipo', e.target.value)}>
              <option value="">—</option>
              {TIPO_LIST.map(t => <option key={t}>{t}</option>)}
            </select>
          ) : '—'}
        </td>

        {/* ORIGEM */}
        <td>
          {s.nome ? (
            <select className="ssel" value={s.orig || ''} onChange={e => updateSlot(slotKey, 'orig', e.target.value)}>
              <option value="">—</option>
              {state.origens.map(o => <option key={o}>{o}</option>)}
            </select>
          ) : '—'}
        </td>

        {/* VALOR (auto-calculado, editável) */}
        <td style={{ fontWeight: 700, color: isEnc ? '#f0f0f0' : 'var(--v2)', whiteSpace: 'nowrap' }}>
          {s.nome ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              R$
              <ValorInput
                value={s.valor !== undefined && s.valor !== '' ? s.valor : totalVal}
                onCommit={v => updateSlot(slotKey, 'valor', v)}
              />
            </span>
          ) : '—'}
        </td>

        {/* PRONTUÁRIO / CAIXA */}
        <td>
          {s.nome && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <button className="btn-pront" onClick={() => openPront(slotKey)}>
                <i className="ti ti-file-text"></i> Ver
              </button>
              {(isAtendido(s.status) || s.status === 'EM ATENDIMENTO') && (
                <button
                  className="btn-pront"
                  style={{ background: 'var(--v2)', color: '#fff', borderColor: 'var(--v2)' }}
                  onClick={() => openCaixa(slotKey)}
                >
                  <i className="ti ti-cash-register"></i> Pagar
                </button>
              )}
            </div>
          )}
        </td>

        {/* WHATSAPP */}
        <td>
          {wppUrl ? (
            <a href={wppUrl} target="_blank" rel="noreferrer" style={{ color: '#25D366', fontSize: 18 }} title={s.wpp}>
              <i className="ti ti-brand-whatsapp"></i>
            </a>
          ) : s.nome ? (
            <input
              type="text"
              className="ssel"
              placeholder="(62) 9..."
              value={s.wpp || ''}
              onChange={e => updateSlot(slotKey, 'wpp', e.target.value)}
              style={{ maxWidth: 110 }}
            />
          ) : '—'}
        </td>
      </tr>
    );
  }

  return (
    <div>
      <div className="tc ag-tc">
        <div className="th">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h3>Agenda — {getDateStr()}</h3>
            <div className="dent-sel-wrap">
              <i className="ti ti-stethoscope" style={{ color: 'var(--v2)', fontSize: 14 }}></i>
              <label>Dentista:</label>
              <select className="dent-sel" value={selectedDentista} onChange={e => setSelectedDentista(e.target.value)}>
                {state.dentistas.map(d => <option key={d.id} value={d.nome}>{d.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="th-r">
            <select className="sel" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="">Todos os status</option>
              {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
            </select>
            <span style={{ fontSize: 11, color: 'var(--cinza-cl)' }}>{preenchidos} agendados</span>
          </div>
        </div>

        <div style={{ overflowX: 'auto', position: 'relative' }}>
          <table className="tbl" style={{ minWidth: 1200 }}>
            <thead className="ag-thead">
              <tr>
                <th style={{ width: 110 }}>HORÁRIO</th>
                <th>PACIENTE</th>
                <th>STATUS</th>
                <th>PROCEDIMENTOS</th>
                <th>TIPO</th>
                <th>ORIGEM</th>
                <th>VALOR</th>
                <th>PRONTUÁRIO</th>
                <th>WHATSAPP</th>
              </tr>
            </thead>
            <tbody>
              {horariosVisiveis.map(h => {
                const paiH = bloqueadoMap[h];

                // ── LINHA BLOQUEADA (continuação) ──
                if (paiH) {
                  const paiSlot = ag[paiH] || {};
                  const ocultoSlot = ag[h] || {};
                  const temOculto = !!ocultoSlot.nome; // havia agendamento neste horário coberto
                  return (
                    <tr key={h} style={{ background: temOculto ? '#FFF3E0' : '#f4f4f4', opacity: temOculto ? 1 : 0.7 }}>
                      <td style={{
                        fontWeight: 600, color: temOculto ? '#E65100' : '#aaa', whiteSpace: 'nowrap',
                        fontSize: 13, borderRight: '2px solid #e0e0e0',
                      }}>
                        {h}
                      </td>
                      <td colSpan={8} style={{
                        background: temOculto ? '#FFF3E0' : '#f0f0f0', color: temOculto ? '#5D4037' : '#999', fontSize: 12,
                        fontStyle: 'italic', paddingLeft: '1rem', borderLeft: `3px solid ${temOculto ? '#FB8C00' : '#d0d0d0'}`,
                      }}>
                        <span style={{ marginRight: 8, fontSize: 14 }}>{temOculto ? '⚠️' : '⏳'}</span>
                        continuação de{' '}
                        <strong style={{ color: temOculto ? '#5D4037' : '#777' }}>{paiSlot.nome || '—'}</strong>
                        {temOculto ? (
                          <>
                            <span style={{ marginLeft: 12, fontStyle: 'normal', fontWeight: 700, color: '#E65100' }}>
                              CONFLITO: este horário tinha <strong>{ocultoSlot.nome}</strong>
                              {ocultoSlot.areas?.length > 0 && <> ({ocultoSlot.areas.join(', ')})</>}
                            </span>
                            <button
                              className="btn-pront"
                              style={{ marginLeft: 12, background: '#E65100', color: '#fff', borderColor: '#E65100' }}
                              title="Reduzir o horário de cima para 30min e liberar este agendamento"
                              onClick={() => updateSlot(paiH, 'duracao', 30)}
                            >
                              ↩ Liberar (voltar de cima p/ 30min)
                            </button>
                          </>
                        ) : (
                          <span style={{
                            marginLeft: 16, fontSize: 10, background: '#e0e0e0',
                            color: '#888', borderRadius: 4, padding: '2px 6px', letterSpacing: 1,
                          }}>
                            BLOQUEADO
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                }

                // ── LINHA NORMAL + ENCAIXE (se existir) ──
                const rows = [renderRow(h, h, false)];
                if (ag[`${h}${ENCAIXE_SUFFIX}`] !== undefined) {
                  rows.push(renderRow(h, `${h}${ENCAIXE_SUFFIX}`, true));
                }
                return rows;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
