import { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { HORARIOS, STATUS_LIST, STATUS_BADGE, NEG_LIST, TIPO_LIST, AREAS_LIST, AREAS_PRECOS, DURACOES, isAtendido } from '../../constants';

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

export default function Agenda() {
  const { state, dispatch, selectedDentista, setSelectedDentista, getAgKey, getDateStr, setProntuarioModal, setCaixaModal, showToast } = useCRM();
  const [filtroStatus, setFiltroStatus] = useState('');

  const agKey = getAgKey();
  const ag = state.agenda[agKey] || {};

  function updateSlot(h, field, value) {
    const slot = { ...(ag[h] || {}), [field]: value };
    dispatch({ type: 'SET_AGENDA_SLOT', payload: { agKey, horario: h, slot } });
  }

  function handleStatusChange(h, novoStatus) {
    if (novoStatus === 'ATENDIDO') {
      if (!ag[h]?.nome) { showToast('Selecione um cliente primeiro', 'warning'); return; }
      setCaixaModal({ agKey, horario: h });
      return; // não salva — modal confirma e salva com status ATENDIDO
    }
    updateSlot(h, 'status', novoStatus);
  }

  function updateAreas(h, area) {
    const slot = ag[h] || {};
    const areas = slot.areas || [];
    const newAreas = areas.includes(area) ? areas.filter(a => a !== area) : [...areas, area];
    const valor = newAreas.reduce((s, a) => s + (AREAS_PRECOS[a] || 0), 0);
    dispatch({ type: 'SET_AGENDA_SLOT', payload: { agKey, horario: h, slot: { ...slot, areas: newAreas, valor } } });
  }

  function openPront(h) {
    if (!ag[h]?.nome) { showToast('Selecione um cliente primeiro', 'warning'); return; }
    setProntuarioModal({ agKey, horario: h });
  }

  function openCaixa(h) {
    if (!ag[h]?.nome) { showToast('Selecione um cliente primeiro', 'warning'); return; }
    setCaixaModal({ agKey, horario: h });
  }

  function getWppUrl(h) {
    const wpp = (ag[h]?.wpp || '').replace(/\D/g, '');
    if (!wpp) return null;
    return `https://wa.me/55${wpp}?text=Olá ${ag[h]?.nome || ''}`;
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

  const preenchidos = HORARIOS.filter(h => ag[h]?.nome).length;
  const clienteNomes = state.clientes.map(c => c.nome);

  const horariosVisiveis = HORARIOS.filter(h => {
    if (filtroStatus) {
      if (bloqueadoMap[h]) return false;
      const st = ag[h]?.status;
      if (filtroStatus === 'ATENDIDO') return isAtendido(st);
      return st === filtroStatus;
    }
    return true;
  });

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
                <option value="">— Selecione —</option>
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

        <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto', position: 'relative' }}>
          <table className="tbl" style={{ minWidth: 1200 }}>
            <thead className="ag-thead">
              <tr>
                <th style={{ width: 110 }}>HORÁRIO</th>
                <th>CLIENTE</th>
                <th>STATUS</th>
                <th>PROCEDIMENTOS</th>
                <th>TIPO</th>
                <th>ORIGEM</th>
                <th>VALOR</th>
                <th>NEGOCIAÇÃO</th>
                <th>PRONTUÁRIO</th>
                <th>OBSERVAÇÕES</th>
                <th>WHATSAPP</th>
              </tr>
            </thead>
            <tbody>
              {horariosVisiveis.map(h => {
                const paiH = bloqueadoMap[h];

                // ── LINHA BLOQUEADA (continuação) ──
                if (paiH) {
                  const paiSlot = ag[paiH] || {};
                  return (
                    <tr key={h} style={{ background: '#f4f4f4', opacity: 0.7 }}>
                      <td style={{
                        fontWeight: 600, color: '#aaa', whiteSpace: 'nowrap',
                        fontSize: 13, borderRight: '2px solid #e0e0e0',
                      }}>
                        {h}
                      </td>
                      <td colSpan={10} style={{
                        background: '#f0f0f0', color: '#999', fontSize: 12,
                        fontStyle: 'italic', paddingLeft: '1rem', borderLeft: '3px solid #d0d0d0',
                      }}>
                        <span style={{ marginRight: 8, fontSize: 14 }}>⏳</span>
                        continuação —{' '}
                        <strong style={{ color: '#777' }}>{paiSlot.nome || '—'}</strong>
                        {paiSlot.areas?.length > 0 && (
                          <span style={{ marginLeft: 8, color: '#bbb' }}>
                            ({paiSlot.areas.join(', ')})
                          </span>
                        )}
                        <span style={{
                          marginLeft: 16, fontSize: 10, background: '#e0e0e0',
                          color: '#888', borderRadius: 4, padding: '2px 6px', letterSpacing: 1,
                        }}>
                          BLOQUEADO
                        </span>
                      </td>
                    </tr>
                  );
                }

                // ── LINHA NORMAL (editável) ──
                const s = ag[h] || {};
                const badge = STATUS_BADGE[s.status] || '';
                const wppUrl = getWppUrl(h);
                const duracao = s.duracao || 30;
                const totalVal = s.valor
                  ? parseFloat(s.valor).toFixed(2)
                  : (s.areas || []).reduce((sum, a) => sum + (AREAS_PRECOS[a] || 0), 0).toFixed(2);

                const [hh, mm] = h.split(':').map(Number);
                const minFim = hh * 60 + mm + duracao;
                const fimStr = duracao > 30
                  ? `→ ${String(Math.floor(minFim / 60)).padStart(2, '0')}:${String(minFim % 60).padStart(2, '0')}`
                  : '';

                const rowClass = STATUS_ROW_CLASS[s.status] || '';

                return (
                  <tr key={h} className={`ag-row ${rowClass}`} style={{ verticalAlign: 'top' }}>
                    {/* HORÁRIO + DURAÇÃO */}
                    <td style={{
                      fontWeight: 700, color: 'var(--v2)', whiteSpace: 'nowrap',
                      verticalAlign: 'middle', borderRight: '2px solid var(--borda)',
                    }}>
                      <div style={{ fontSize: 14 }}>{h}</div>
                      {fimStr && <div style={{ fontSize: 10, color: 'var(--cinza-cl)', marginTop: 2 }}>{fimStr}</div>}
                      <select
                        className="ssel"
                        style={{ marginTop: 4, fontSize: 10, padding: '2px 4px' }}
                        value={duracao}
                        onChange={e => updateSlot(h, 'duracao', parseInt(e.target.value))}
                        title="Duração do atendimento"
                      >
                        {DURACOES.map(d => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </td>

                    {/* CLIENTE */}
                    <td>
                      <select
                        className="ssel"
                        style={{ maxWidth: 160 }}
                        value={s.nome || ''}
                        onChange={e => {
                          const nome = e.target.value;
                          const cli = state.clientes.find(c => c.nome === nome) || {};
                          dispatch({
                            type: 'SET_AGENDA_SLOT',
                            payload: {
                              agKey, horario: h,
                              slot: {
                                ...s, nome,
                                wpp: cli.wpp || s.wpp || '',
                                tipo: cli.tipo || s.tipo || '',
                                orig: cli.orig || s.orig || '',
                                areas: cli.areas || s.areas || [],
                                neg: cli.neg || s.neg || '',
                              }
                            }
                          });
                        }}
                      >
                        <option value="">— vazio —</option>
                        {clienteNomes.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </td>

                    {/* STATUS */}
                    <td>
                      {s.nome ? (
                        <>
                          <select
                            className="ssel"
                            value={s.status || ''}
                            onChange={e => handleStatusChange(h, e.target.value)}
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
                      ) : <span style={{ color: '#ccc', fontSize: 11 }}>—</span>}
                    </td>

                    {/* PROCEDIMENTOS */}
                    <td>
                      {s.nome ? (
                        <div>
                          {(s.areas || []).map(a => (
                            <span
                              key={a}
                              className="atag"
                              style={{ cursor: 'pointer' }}
                              title="Clique para remover"
                              onClick={() => updateAreas(h, a)}
                            >
                              {a} ✕
                            </span>
                          ))}
                          <select
                            className="ssel"
                            style={{ marginTop: 2, maxWidth: 150 }}
                            onChange={e => { if (e.target.value) updateAreas(h, e.target.value); e.target.value = ''; }}
                            value=""
                          >
                            <option value="">+ área</option>
                            {AREAS_LIST.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>
                      ) : <span style={{ color: '#ccc', fontSize: 11 }}>—</span>}
                    </td>

                    {/* TIPO */}
                    <td>
                      {s.nome ? (
                        <select className="ssel" value={s.tipo || ''} onChange={e => updateSlot(h, 'tipo', e.target.value)}>
                          <option value="">—</option>
                          {TIPO_LIST.map(t => <option key={t}>{t}</option>)}
                        </select>
                      ) : '—'}
                    </td>

                    {/* ORIGEM */}
                    <td>
                      {s.nome ? (
                        <select className="ssel" value={s.orig || ''} onChange={e => updateSlot(h, 'orig', e.target.value)}>
                          <option value="">—</option>
                          {state.origens.map(o => <option key={o}>{o}</option>)}
                        </select>
                      ) : '—'}
                    </td>

                    {/* VALOR */}
                    <td style={{ fontWeight: 700, color: 'var(--v2)', whiteSpace: 'nowrap' }}>
                      {s.nome ? `R$ ${totalVal}` : '—'}
                    </td>

                    {/* NEGOCIAÇÃO */}
                    <td>
                      {s.nome ? (
                        <select className="ssel" value={s.neg || ''} onChange={e => updateSlot(h, 'neg', e.target.value)}>
                          <option value="">—</option>
                          {NEG_LIST.map(n => <option key={n}>{n}</option>)}
                        </select>
                      ) : '—'}
                    </td>

                    {/* PRONTUÁRIO / CAIXA */}
                    <td>
                      {s.nome && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button className="btn-pront" onClick={() => openPront(h)}>
                            <i className="ti ti-file-text"></i> Ver
                          </button>
                          {(isAtendido(s.status) || s.status === 'EM ATENDIMENTO') && (
                            <button
                              className="btn-pront"
                              style={{ background: 'var(--v2)', color: '#fff', borderColor: 'var(--v2)' }}
                              onClick={() => openCaixa(h)}
                            >
                              <i className="ti ti-cash-register"></i> Pagar
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* OBSERVAÇÕES */}
                    <td>
                      {s.nome ? (
                        <input
                          type="text"
                          className="ssel"
                          style={{ maxWidth: 120 }}
                          placeholder="observações..."
                          value={s.obs || ''}
                          onChange={e => updateSlot(h, 'obs', e.target.value)}
                        />
                      ) : '—'}
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
                          onChange={e => updateSlot(h, 'wpp', e.target.value)}
                          style={{ maxWidth: 110 }}
                        />
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
