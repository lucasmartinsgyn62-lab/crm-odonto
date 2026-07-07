import { useCRM } from '../../context/CRMContext';
import { STATUS_BADGE, isAtendido } from '../../constants';

function fmtR(v) { return 'R$ ' + (v||0).toFixed(2).replace('.', ','); }

export default function Dashboard() {
  const { state, selectedDentista, setSelectedDentista, getDateStr } = useCRM();

  const dateStr = getDateStr();

  // Consolidado: sem dentista selecionado soma TODOS; com seleção filtra
  const slots = [];
  Object.entries(state.agenda).forEach(([agKey, dia]) => {
    const dent = agKey.includes('||') ? agKey.split('||')[0] : '';
    const data = agKey.includes('||') ? agKey.split('||')[1] : agKey;
    if (data !== dateStr) return;
    if (selectedDentista && dent !== selectedDentista) return;
    Object.entries(dia || {}).forEach(([h, s]) => {
      if (s && s.nome) slots.push([h, s, dent]);
    });
  });

  const total = slots.length;
  const atendidos = slots.filter(([, s]) => isAtendido(s.status)).length;
  const aguardando = slots.filter(([, s]) => s.status === 'AGUARDANDO').length;
  const receita = slots
    .filter(([, s]) => isAtendido(s.status))
    .reduce((sum, [, s]) => {
      if (s.valor) return sum + parseFloat(s.valor);
      const procs = s.procedimentosRealizados || [];
      return sum + procs.reduce((a, p) => a + (p.preco || 0), 0);
    }, 0);

  const faltaram = slots.filter(([, s]) => s.status && s.status.startsWith('FALTOU')).length;

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:'.6rem',marginBottom:'1rem'}}>
        <i className="ti ti-stethoscope" style={{color:'var(--v2)',fontSize:15}}></i>
        <label style={{fontSize:12,fontWeight:700,color:'var(--cinza)'}}>Dentista:</label>
        <select className="sel" value={selectedDentista} onChange={e => setSelectedDentista(e.target.value)}>
          <option value="">Todos os dentistas</option>
          {state.dentistas.map(d => <option key={d.id} value={d.nome}>{d.nome}</option>)}
        </select>
      </div>

      <div className="kr kr4">
        <div className="kc verde">
          <div className="kl">Total Agendados</div>
          <div className="kv">{total}</div>
          <div className="ks">{dateStr}</div>
        </div>
        <div className="kc verde">
          <div className="kl">Atendidos</div>
          <div className="kv">{atendidos}</div>
          <div className="ks">atendimentos concluídos</div>
        </div>
        <div className="kc gold">
          <div className="kl">Aguardando</div>
          <div className="kv">{aguardando}</div>
          <div className="ks">na fila</div>
        </div>
        <div className="kc red">
          <div className="kl">Faltas</div>
          <div className="kv">{faltaram}</div>
          <div className="ks">sem/com aviso</div>
        </div>
      </div>
      <div className="kr kr3">
        <div className="kc verde" style={{gridColumn:'span 2'}}>
          <div className="kl">Receita do Dia</div>
          <div className="kv" style={{color:'var(--v2)'}}>{fmtR(receita)}</div>
          <div className="ks">apenas atendidos</div>
        </div>
        <div className="kc">
          <div className="kl">Taxa de Comparecimento</div>
          <div className="kv">{total > 0 ? Math.round((atendidos/total)*100) : 0}%</div>
          <div className="ks">atendidos / agendados</div>
        </div>
      </div>

      <div className="tc">
        <div className="th"><h3>Últimos atendimentos {selectedDentista ? `— ${selectedDentista}` : '— todos os dentistas'}</h3></div>
        <table className="tbl">
          <thead>
            <tr>
              <th>HORÁRIO</th><th>PACIENTE</th><th>DENTISTA</th><th>PROCEDIMENTO</th>
              <th>VALOR</th><th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {slots.length === 0 && (
              <tr className="er"><td colSpan={6}>Nenhum agendamento nesta data.</td></tr>
            )}
            {slots.sort((a,b) => a[0].localeCompare(b[0])).map(([h, s, dent]) => {
              const badge = STATUS_BADGE[s.status] || 'b-ag';
              const procs = (s.areas || []).join(', ') || '—';
              const val = s.valor ? fmtR(parseFloat(s.valor)) : '—';
              return (
                <tr key={`${dent}|${h}`}>
                  <td>{h.replace('-ENCAIXE',' (encaixe)')}</td>
                  <td>{s.nome || '—'}</td>
                  <td style={{fontSize:11}}>{dent || '—'}</td>
                  <td style={{fontSize:11}}>{procs}</td>
                  <td style={{fontWeight:700,color:'var(--v2)'}}>{val}</td>
                  <td><span className={`badge ${badge}`}>{s.status || '—'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
