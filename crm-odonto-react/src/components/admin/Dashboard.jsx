import { useCRM } from '../../context/CRMContext';
import { STATUS_BADGE, isAtendido } from '../../constants';

function fmtR(v) { return 'R$ ' + (v||0).toFixed(2).replace('.', ','); }

export default function Dashboard() {
  const { state, selectedDate, selectedDentista, getAgKey, getDateStr } = useCRM();

  const agKey = getAgKey();
  const ag = state.agenda[agKey] || {};
  const slots = Object.entries(ag).filter(([, s]) => s && s.nome);

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

  const dateStr = getDateStr();

  return (
    <div>
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
        <div className="th"><h3>Últimos atendimentos</h3></div>
        <table className="tbl">
          <thead>
            <tr>
              <th>HORÁRIO</th><th>CLIENTE</th><th>PROCEDIMENTO</th>
              <th>VALOR</th><th>NEGOCIAÇÃO</th><th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {slots.length === 0 && (
              <tr className="er"><td colSpan={6}>Nenhum agendamento nesta data.</td></tr>
            )}
            {slots.sort((a,b) => a[0].localeCompare(b[0])).map(([h, s]) => {
              const badge = STATUS_BADGE[s.status] || 'b-ag';
              const procs = (s.areas || []).join(', ') || '—';
              const val = s.valor ? fmtR(parseFloat(s.valor)) : '—';
              return (
                <tr key={h}>
                  <td>{h}</td>
                  <td>{s.nome || '—'}</td>
                  <td style={{fontSize:11}}>{procs}</td>
                  <td style={{fontWeight:700,color:'var(--v2)'}}>{val}</td>
                  <td>{s.neg || '—'}</td>
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
