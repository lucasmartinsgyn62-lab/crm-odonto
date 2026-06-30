import { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { STATUS_LIST, AREAS_LIST, AREAS_PRECOS, NEG_LIST, isAtendido } from '../../constants';

function fmtR(v) { return 'R$ ' + (v||0).toFixed(2).replace('.', ','); }
function ticket(receita, count) { return count > 0 ? fmtR(receita / count) : '—'; }

export default function Relatorio() {
  const { state } = useCRM();
  const now = new Date();
  const [mes, setMes] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [ano, setAno] = useState(String(now.getFullYear()));

  const entries = useMemo(() => {
    const result = [];
    Object.entries(state.agenda).forEach(([agKey, slots]) => {
      const parteDent = agKey.includes('||') ? agKey.split('||')[0] : '';
      const parteData = agKey.includes('||') ? agKey.split('||')[1] : agKey;
      const parts = parteData.split('/');
      if (parts.length !== 3) return;
      const m = parts[1], a = parts[2];
      if (m !== mes || a !== ano) return;
      Object.entries(slots || {}).forEach(([h, s]) => {
        if (!s || !s.nome) return;
        result.push({ dentista: parteDent, h, ...s });
      });
    });
    return result;
  }, [state.agenda, mes, ano]);

  // Por dentista
  const byDent = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const d = e.dentista || 'Sem dentista';
      if (!map[d]) map[d] = { total: 0, finalizados: 0, faltas: 0, receita: 0 };
      map[d].total++;
      if (isAtendido(e.status)) { map[d].finalizados++; map[d].receita += parseFloat(e.valor || 0); }
      if (e.status?.startsWith('FALTOU')) map[d].faltas++;
    });
    return map;
  }, [entries]);

  const totalGeral = entries.length;
  const totalFin = entries.filter(e => isAtendido(e.status)).length;
  const totalReceita = entries.filter(e => isAtendido(e.status)).reduce((s, e) => s + parseFloat(e.valor || 0), 0);
  const totalFaltas = entries.filter(e => e.status?.startsWith('FALTOU')).length;

  // Status
  const byStatus = useMemo(() => {
    const map = {};
    STATUS_LIST.forEach(s => { map[s] = { count: 0, receita: 0 }; });
    entries.forEach(e => {
      const st = e.status || 'AGUARDANDO';
      if (!map[st]) map[st] = { count: 0, receita: 0 };
      map[st].count++;
      if (isAtendido(e.status)) map[st].receita += parseFloat(e.valor || 0);
    });
    return Object.entries(map).filter(([, v]) => v.count > 0);
  }, [entries]);

  // Origem
  const byOrigem = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const o = e.orig || 'Sem origem';
      if (!map[o]) map[o] = { count: 0, fin: 0, faltas: 0, receita: 0 };
      map[o].count++;
      if (isAtendido(e.status)) { map[o].fin++; map[o].receita += parseFloat(e.valor || 0); }
      if (e.status?.startsWith('FALTOU')) map[o].faltas++;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [entries]);

  // Novo vs Retorno
  const byTipo = useMemo(() => {
    const map = { NOVO: { count:0, fin:0, receita:0 }, RETORNO: { count:0, fin:0, receita:0 } };
    entries.forEach(e => {
      const t = e.tipo === 'RETORNO' ? 'RETORNO' : 'NOVO';
      map[t].count++;
      if (isAtendido(e.status)) { map[t].fin++; map[t].receita += parseFloat(e.valor || 0); }
    });
    return map;
  }, [entries]);

  // Procedimentos
  const byProc = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      (e.areas || []).forEach(a => {
        if (!map[a]) map[a] = { count: 0, receita: 0 };
        map[a].count++;
        if (isAtendido(e.status)) map[a].receita += AREAS_PRECOS[a] || 0;
      });
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count).slice(0, 15);
  }, [entries]);

  // Negociações
  const byNeg = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const n = e.neg || 'SEM DESCONTO';
      if (!map[n]) map[n] = { count: 0, receita: 0 };
      map[n].count++;
      map[n].receita += parseFloat(e.valor || 0);
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [entries]);

  const MESES_NOME = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  return (
    <div style={{overflowY:'auto',maxHeight:'calc(100vh - 120px)'}}>
      {/* Cabeçalho */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'1rem',marginBottom:'1.4rem'}}>
        <div>
          <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:22,fontWeight:800,color:'var(--v1)',marginBottom:2}}>Relatório Gerencial</h2>
          <p style={{fontSize:12,color:'var(--cinza)'}}>Visão consolidada de todos os profissionais</p>
        </div>
        <div className="rel-mes-wrap">
          <label>📅 Período:</label>
          <select className="rel-sel-mes" value={mes} onChange={e => setMes(e.target.value)}>
            {MESES_NOME.map((m, i) => (
              <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>
            ))}
          </select>
          <select className="rel-sel-mes" value={ano} onChange={e => setAno(e.target.value)} style={{marginLeft:'.3rem'}}>
            {['2024','2025','2026','2027'].map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Cards dentistas */}
      <div className="dent-rel-grid">
        {state.dentistas.map(d => {
          const stats = byDent[d.nome] || { total:0, finalizados:0, faltas:0, receita:0 };
          return (
            <div key={d.id} className="dent-rel-card">
              <div className="dent-rel-av">{(d.nome||'D')[0]}</div>
              <div className="dent-rel-nome">{d.nome}</div>
              <div className="dent-rel-esp">{d.esp || '—'}</div>
              <div className="dent-rel-sub">RECEITA DO PERÍODO</div>
              <div className="dent-rel-val">{fmtR(stats.receita)}</div>
              <div className="dent-rel-stats">
                <div className="dent-rel-stat"><div className="dent-rel-stat-v">{stats.total}</div><div className="dent-rel-stat-l">Agendados</div></div>
                <div className="dent-rel-stat"><div className="dent-rel-stat-v">{stats.finalizados}</div><div className="dent-rel-stat-l">Atendidos</div></div>
              </div>
            </div>
          );
        })}
        <div className="dent-rel-card dent-rel-total">
          <div className="dent-rel-av">∑</div>
          <div className="dent-rel-nome">TOTAL GERAL</div>
          <div className="dent-rel-esp">Todos os dentistas</div>
          <div className="dent-rel-sub">RECEITA TOTAL</div>
          <div className="dent-rel-val">{fmtR(totalReceita)}</div>
          <div className="dent-rel-stats">
            <div className="dent-rel-stat"><div className="dent-rel-stat-v">{totalGeral}</div><div className="dent-rel-stat-l">Agendados</div></div>
            <div className="dent-rel-stat"><div className="dent-rel-stat-v">{totalFin}</div><div className="dent-rel-stat-l">Atendidos</div></div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kr kr4">
        <div className="kc verde"><div className="kl">Total Atendimentos</div><div className="kv">{totalGeral}</div></div>
        <div className="kc verde"><div className="kl">Atendidos</div><div className="kv">{totalFin}</div></div>
        <div className="kc gold"><div className="kl">Faltas</div><div className="kv">{totalFaltas}</div></div>
        <div className="kc"><div className="kl">Ticket Médio</div><div className="kv" style={{fontSize:18}}>{ticket(totalReceita, totalFin)}</div></div>
      </div>

      {/* Novo vs Retorno */}
      <div className="tc" style={{marginBottom:'1.2rem'}}>
        <div className="th"><h3>Novo vs Retorno</h3></div>
        <table className="tbl">
          <thead><tr><th>TIPO</th><th>QTD TOTAL</th><th>ATENDIDOS</th><th>RECEITA</th><th>% DO TOTAL</th><th>TICKET MÉDIO</th></tr></thead>
          <tbody>
            {['NOVO','RETORNO'].map(t => {
              const v = byTipo[t];
              const pct = totalGeral > 0 ? ((v.count/totalGeral)*100).toFixed(1) : '0.0';
              return (
                <tr key={t}>
                  <td><span className={`badge ${t==='NOVO'?'b-rec':'b-fin'}`}>{t}</span></td>
                  <td>{v.count}</td><td>{v.fin}</td>
                  <td style={{fontWeight:700,color:'var(--v2)'}}>{fmtR(v.receita)}</td>
                  <td>{pct}%</td><td>{ticket(v.receita, v.fin)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Status + Origem */}
      <div className="rg2">
        <div className="tc">
          <div className="th"><h3>Detalhamento por Status</h3></div>
          <table className="tbl">
            <thead><tr><th>STATUS</th><th>QTD</th><th>VALOR TOTAL</th><th>% ATEND.</th><th>TICKET MÉDIO</th></tr></thead>
            <tbody>
              {byStatus.map(([st, v]) => (
                <tr key={st}>
                  <td><span className="badge b-agu" style={{background:'#f0f0f0',color:'#333'}}>{st}</span></td>
                  <td>{v.count}</td>
                  <td style={{fontWeight:700,color:'var(--v2)'}}>{fmtR(v.receita)}</td>
                  <td>{totalGeral>0?((v.count/totalGeral)*100).toFixed(1):0}%</td>
                  <td>{ticket(v.receita, v.count)}</td>
                </tr>
              ))}
              {byStatus.length === 0 && <tr className="er"><td colSpan={5}>Sem dados</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="tc">
          <div className="th"><h3>Análise por Origem</h3></div>
          <table className="tbl">
            <thead><tr><th>ORIGEM</th><th>QTD</th><th>FINALIZ.</th><th>FALTAS</th><th>RECEITA</th><th>CONV.</th></tr></thead>
            <tbody>
              {byOrigem.map(([o, v]) => (
                <tr key={o}>
                  <td>{o}</td><td>{v.count}</td><td>{v.fin}</td><td>{v.faltas}</td>
                  <td style={{fontWeight:700,color:'var(--v2)'}}>{fmtR(v.receita)}</td>
                  <td>{v.count>0?((v.fin/v.count)*100).toFixed(0):0}%</td>
                </tr>
              ))}
              {byOrigem.length === 0 && <tr className="er"><td colSpan={6}>Sem dados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Procedimentos */}
      <div className="tc" style={{marginBottom:'1.2rem'}}>
        <div className="th"><h3>Procedimentos Mais Realizados</h3></div>
        <table className="tbl">
          <thead><tr><th>PROCEDIMENTO</th><th>QTD ATEND.</th><th>RECEITA GERADA</th><th>% PARTICIPAÇÃO</th><th>TICKET MÉDIO</th></tr></thead>
          <tbody>
            {byProc.map(([pr, v]) => {
              const pct = totalGeral>0?((v.count/totalGeral)*100).toFixed(1):0;
              return (
                <tr key={pr}>
                  <td>{pr}</td><td>{v.count}</td>
                  <td style={{fontWeight:700,color:'var(--v2)'}}>{fmtR(v.receita)}</td>
                  <td>{pct}%</td><td>{ticket(v.receita, v.count)}</td>
                </tr>
              );
            })}
            {byProc.length === 0 && <tr className="er"><td colSpan={5}>Sem dados</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Negociações */}
      <div className="tc">
        <div className="th"><h3>Análise de Negociações</h3></div>
        <table className="tbl">
          <thead><tr><th>TIPO NEGOCIAÇÃO</th><th>QTD</th><th>VALOR ENVOLVIDO</th><th>% DOS ATEND.</th><th>TICKET MÉDIO</th></tr></thead>
          <tbody>
            {byNeg.map(([n, v]) => (
              <tr key={n}>
                <td>{n}</td><td>{v.count}</td>
                <td style={{fontWeight:700,color:'var(--v2)'}}>{fmtR(v.receita)}</td>
                <td>{totalGeral>0?((v.count/totalGeral)*100).toFixed(1):0}%</td>
                <td>{ticket(v.receita, v.count)}</td>
              </tr>
            ))}
            {byNeg.length === 0 && <tr className="er"><td colSpan={5}>Sem dados</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
