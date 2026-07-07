import { useState, Fragment } from 'react';
import { useCRM } from '../../context/CRMContext';

function fmtR(v) { return 'R$ ' + (v || 0).toFixed(2).replace('.', ','); }

export default function HistoricoCaixa() {
  const { state } = useCRM();
  const [expanded, setExpanded] = useState({});

  function toggle(idx) {
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
  }

  const hist = state.historicoFechamentos || [];

  return (
    <div className="tc">
      <div className="th">
        <h3><i className="ti ti-history"></i> Histórico de Fechamentos</h3>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>Data</th><th>Hora Fech.</th><th>Atendimentos</th>
            <th>Pix</th><th>Dinheiro</th><th>Cartão Déb.</th>
            <th>Cartão Créd.</th><th>Convênio</th><th>Total</th><th>Fechado por</th>
          </tr>
        </thead>
        <tbody>
          {hist.length === 0 && (
            <tr className="er"><td colSpan={10}>Nenhum fechamento registrado.</td></tr>
          )}
          {hist.map((f, idx) => (
            <Fragment key={idx}>
              <tr
                style={{ cursor: 'pointer' }}
                onClick={() => toggle(idx)}
                title="Clique para ver detalhes"
              >
                <td>{f.data}</td>
                <td>{f.hora}</td>
                <td style={{ textAlign: 'center' }}>{f.atendimentos}</td>
                <td>{fmtR(f.pix)}</td>
                <td>{fmtR(f.dinheiro)}</td>
                <td>{fmtR(f.debito)}</td>
                <td>{fmtR(f.credito)}</td>
                <td>{fmtR(f.convenio)}</td>
                <td style={{ fontWeight: 700, color: 'var(--v2)' }}>{fmtR(f.total)}</td>
                <td style={{ fontSize: 12 }}>
                  <b>{f.fechadoPor || '—'}</b>
                  {f.recepcionistas && f.recepcionistas !== '—' && (
                    <><br /><span style={{ color: '#aaa', fontSize: 11 }}>{f.recepcionistas}</span></>
                  )}
                </td>
              </tr>
              {expanded[idx] && (
                <tr key={`det-${idx}`}>
                  <td colSpan={10} style={{ padding: 0 }}>
                    <div style={{ padding: '.5rem 1rem 1rem' }}>
                      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'rgba(44,109,95,.15)' }}>
                            <th style={{ padding: '.3rem .5rem', textAlign: 'left' }}>Paciente</th>
                            <th style={{ padding: '.3rem .5rem', textAlign: 'left' }}>Dentista</th>
                            <th style={{ padding: '.3rem .5rem', textAlign: 'left' }}>Procedimentos</th>
                            <th style={{ padding: '.3rem .5rem', textAlign: 'left' }}>Forma</th>
                            <th style={{ padding: '.3rem .5rem', textAlign: 'left' }}>Valor</th>
                            <th style={{ padding: '.3rem .5rem', textAlign: 'left' }}>Recepcionista</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(f.itens || []).length === 0 && (
                            <tr style={{ background: 'rgba(0,0,0,.04)' }}>
                              <td colSpan={6} style={{ textAlign: 'center', color: '#aaa', fontSize: 12, padding: '.5rem' }}>
                                Sem itens detalhados
                              </td>
                            </tr>
                          )}
                          {(f.itens || []).map((e, ei) => {
                            const procs = e.procedimentosRealizados?.length
                              ? e.procedimentosRealizados.map(p => p.nome || p).join(', ')
                              : e.areas?.length ? e.areas.join(', ') : '—';
                            return (
                              <tr key={ei} style={{ background: 'rgba(0,0,0,.04)' }}>
                                <td style={{ padding: '.3rem .5rem' }}>{e.nome || '—'}</td>
                                <td style={{ padding: '.3rem .5rem' }}>{e.dentista || '—'}</td>
                                <td style={{ padding: '.3rem .5rem', fontSize: 11 }}>{procs}</td>
                                <td style={{ padding: '.3rem .5rem' }}>{e.forma || '—'}</td>
                                <td style={{ padding: '.3rem .5rem', fontWeight: 700, color: 'var(--v2)' }}>{fmtR(e.valor)}</td>
                                <td style={{ padding: '.3rem .5rem' }}>{e.recepcionista || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
