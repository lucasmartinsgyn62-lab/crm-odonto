import { useState, useMemo, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import { STATUS_LIST, isAtendido } from '../../constants';

function fmtR(v) { return 'R$ ' + (v||0).toFixed(2).replace('.', ','); }
function ticket(receita, count) { return count > 0 ? fmtR(receita / count) : '—'; }
function pct(a, b) { return b > 0 ? ((a/b)*100).toFixed(1) + '%' : '—'; }
function delta(atual, anterior) {
  if (!anterior) return null;
  const d = ((atual - anterior) / anterior) * 100;
  return { pos: d >= 0, txt: `${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(0)}% vs mês anterior` };
}

function loadXLSX() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) { resolve(window.XLSX); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js';
    s.onload = () => resolve(window.XLSX);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// coleta agendamentos de um mês/ano
function coletar(agenda, mes, ano) {
  const result = [];
  Object.entries(agenda).forEach(([agKey, slots]) => {
    const parteDent = agKey.includes('||') ? agKey.split('||')[0] : '';
    const parteData = agKey.includes('||') ? agKey.split('||')[1] : agKey;
    const parts = parteData.split('/');
    if (parts.length !== 3) return;
    if (parts[1] !== mes || parts[2] !== ano) return;
    Object.entries(slots || {}).forEach(([h, s]) => {
      if (!s || !s.nome) return;
      result.push({ dentista: parteDent, dia: parseInt(parts[0]), h, ...s });
    });
  });
  return result;
}

const CORES_GRAF = ['#7C3AED','#9333EA','#A78BFA','#C4B5FD','#4C1D95','#D8B4FE','#6D28D9','#8B5CF6','#E9D5FF','#5B21B6'];

export default function Relatorio() {
  const { state, procPrecos, loadAgendaMes } = useCRM();
  const now = new Date();
  const [mes, setMes] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [ano, setAno] = useState(String(now.getFullYear()));

  // garante que o mês escolhido e o anterior estejam carregados (lazy-load)
  useEffect(() => {
    loadAgendaMes(mes, ano);
    let m = parseInt(mes) - 1, a = parseInt(ano);
    if (m === 0) { m = 12; a -= 1; }
    loadAgendaMes(String(m).padStart(2, '0'), String(a));
  }, [mes, ano, loadAgendaMes]);

  const entries = useMemo(() => coletar(state.agenda, mes, ano), [state.agenda, mes, ano]);

  // mês anterior (para comparativo)
  const entriesPrev = useMemo(() => {
    let m = parseInt(mes) - 1, a = parseInt(ano);
    if (m === 0) { m = 12; a -= 1; }
    return coletar(state.agenda, String(m).padStart(2, '0'), String(a));
  }, [state.agenda, mes, ano]);

  const valorReal = e => parseFloat(e.valor || 0);

  // Totais
  const totalGeral = entries.length;
  const totalFin = entries.filter(e => isAtendido(e.status)).length;
  const totalReceita = entries.filter(e => isAtendido(e.status)).reduce((s, e) => s + valorReal(e), 0);
  const totalFaltas = entries.filter(e => e.status?.startsWith('FALTOU')).length;

  const prevReceita = entriesPrev.filter(e => isAtendido(e.status)).reduce((s, e) => s + valorReal(e), 0);
  const prevTotal = entriesPrev.length;
  const prevFin = entriesPrev.filter(e => isAtendido(e.status)).length;

  const dReceita = delta(totalReceita, prevReceita);
  const dTotal = delta(totalGeral, prevTotal);
  const dFin = delta(totalFin, prevFin);

  // Por dentista
  const byDent = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const d = e.dentista || 'Sem dentista';
      if (!map[d]) map[d] = { total: 0, finalizados: 0, faltas: 0, receita: 0 };
      map[d].total++;
      if (isAtendido(e.status)) { map[d].finalizados++; map[d].receita += valorReal(e); }
      if (e.status?.startsWith('FALTOU')) map[d].faltas++;
    });
    return map;
  }, [entries]);

  // Status (unidades)
  const byStatus = useMemo(() => {
    const map = {};
    STATUS_LIST.forEach(s => { map[s] = { count: 0 }; });
    entries.forEach(e => {
      const st = e.status || 'AGUARDANDO';
      if (!map[st]) map[st] = { count: 0 };
      map[st].count++;
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
      if (isAtendido(e.status)) { map[o].fin++; map[o].receita += valorReal(e); }
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
      if (isAtendido(e.status)) { map[t].fin++; map[t].receita += valorReal(e); }
    });
    return map;
  }, [entries]);

  // Procedimentos — receita REAL rateada pelo peso de tabela de cada procedimento do agendamento
  const byProc = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const areas = e.areas || [];
      if (!areas.length) return;
      const tabelaTotal = areas.reduce((s, a) => s + (procPrecos[a] || 0), 0);
      const real = isAtendido(e.status) ? valorReal(e) : 0;
      areas.forEach(a => {
        if (!map[a]) map[a] = { count: 0, receita: 0 };
        map[a].count++;
        if (real > 0) {
          const peso = tabelaTotal > 0 ? (procPrecos[a] || 0) / tabelaTotal : 1 / areas.length;
          map[a].receita += real * peso;
        }
      });
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count).slice(0, 15);
  }, [entries, procPrecos]);

  // Particular vs Convênio (pela classificação dos procedimentos)
  const byConv = useMemo(() => {
    const convDe = {};
    (state.procedimentos || []).forEach(p => { convDe[p.nome] = p.convenio || null; });
    const map = {};
    entries.forEach(e => {
      const areas = e.areas || [];
      const tabelaTotal = areas.reduce((s, a) => s + (procPrecos[a] || 0), 0);
      const real = isAtendido(e.status) ? valorReal(e) : 0;
      if (!areas.length) {
        const k = 'Particular';
        if (!map[k]) map[k] = { count: 0, receita: 0 };
        map[k].count++; map[k].receita += real;
        return;
      }
      areas.forEach(a => {
        const k = convDe[a] || 'Particular';
        if (!map[k]) map[k] = { count: 0, receita: 0 };
        map[k].count++;
        if (real > 0) {
          const peso = tabelaTotal > 0 ? (procPrecos[a] || 0) / tabelaTotal : 1 / areas.length;
          map[k].receita += real * peso;
        }
      });
    });
    return Object.entries(map).sort((a, b) => b[1].receita - a[1].receita);
  }, [entries, state.procedimentos, procPrecos]);

  // Receita por dia (gráfico)
  const porDia = useMemo(() => {
    const dias = {};
    entries.filter(e => isAtendido(e.status)).forEach(e => {
      dias[e.dia] = (dias[e.dia] || 0) + valorReal(e);
    });
    const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
    return Array.from({ length: ultimoDia }, (_, i) => ({ dia: i + 1, v: dias[i + 1] || 0 }));
  }, [entries, mes, ano]);
  const maxDia = Math.max(1, ...porDia.map(d => d.v));

  // Ocupação da agenda por dentista (capacidade: dias seg-sáb × 22 horários)
  const ocupacao = useMemo(() => {
    const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
    let diasUteis = 0;
    for (let d = 1; d <= ultimoDia; d++) {
      if (new Date(parseInt(ano), parseInt(mes) - 1, d).getDay() !== 0) diasUteis++;
    }
    const capacidade = diasUteis * 22;
    return state.dentistas.map(dent => {
      const qtd = entries.filter(e => e.dentista === dent.nome).length;
      return { nome: dent.nome, qtd, capacidade, p: capacidade > 0 ? Math.min(100, (qtd / capacidade) * 100) : 0 };
    });
  }, [entries, state.dentistas, mes, ano]);

  async function exportarExcel() {
    const XLSX = await loadXLSX();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Indicador: 'Total de atendimentos', Valor: totalGeral },
      { Indicador: 'Atendidos', Valor: totalFin },
      { Indicador: 'Faltas', Valor: totalFaltas },
      { Indicador: 'Receita (R$)', Valor: totalReceita.toFixed(2) },
      { Indicador: 'Ticket médio (R$)', Valor: totalFin > 0 ? (totalReceita/totalFin).toFixed(2) : '0' },
    ]), 'Resumo');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      Object.entries(byDent).map(([d, v]) => ({ Dentista: d, Agendados: v.total, Atendidos: v.finalizados, Faltas: v.faltas, 'Receita (R$)': v.receita.toFixed(2) }))
    ), 'Dentistas');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      byStatus.map(([st, v]) => ({ Status: st, Quantidade: v.count }))
    ), 'Status');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      byOrigem.map(([o, v]) => ({ Origem: o, Qtd: v.count, Atendidos: v.fin, Faltas: v.faltas, 'Receita (R$)': v.receita.toFixed(2) }))
    ), 'Origens');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      byProc.map(([p, v]) => ({ Procedimento: p, Qtd: v.count, 'Receita (R$)': v.receita.toFixed(2) }))
    ), 'Procedimentos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      byConv.map(([c, v]) => ({ Categoria: c, Qtd: v.count, 'Receita (R$)': v.receita.toFixed(2) }))
    ), 'Convenios');
    XLSX.writeFile(wb, `relatorio_${mes}-${ano}.xlsx`);
  }

  const MESES_NOME = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  // dados do gráfico pizza (origens)
  const totalOrig = byOrigem.reduce((s, [, v]) => s + v.count, 0);
  let acc = 0;
  const pieStops = byOrigem.map(([o, v], i) => {
    const ini = acc; acc += totalOrig > 0 ? (v.count / totalOrig) * 360 : 0;
    return `${CORES_GRAF[i % CORES_GRAF.length]} ${ini}deg ${acc}deg`;
  }).join(', ');

  const maxDentReceita = Math.max(1, ...Object.values(byDent).map(v => v.receita));

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'1rem',marginBottom:'1.4rem'}}>
        <div>
          <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:22,fontWeight:800,color:'var(--v1)',marginBottom:2}}>Relatório Gerencial</h2>
          <p style={{fontSize:12,color:'var(--cinza)'}}>Visão consolidada de todos os profissionais</p>
        </div>
        <div style={{display:'flex',gap:'.5rem',alignItems:'center',flexWrap:'wrap'}}>
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
          <button className="btsv" onClick={exportarExcel}>📊 Exportar Excel</button>
          <button className="btsv" style={{background:'var(--v1)'}} onClick={() => window.print()}>🖨️ Imprimir / PDF</button>
        </div>
      </div>

      {/* KPIs com comparativo */}
      <div className="kr kr4">
        <div className="kc verde">
          <div className="kl">Total Atendimentos</div><div className="kv">{totalGeral}</div>
          {dTotal && <div className="ks" style={{color:dTotal.pos?'#1B5E20':'#c62828',fontWeight:700}}>{dTotal.txt}</div>}
        </div>
        <div className="kc verde">
          <div className="kl">Atendidos</div><div className="kv">{totalFin}</div>
          {dFin && <div className="ks" style={{color:dFin.pos?'#1B5E20':'#c62828',fontWeight:700}}>{dFin.txt}</div>}
        </div>
        <div className="kc gold"><div className="kl">Faltas</div><div className="kv">{totalFaltas}</div><div className="ks">{pct(totalFaltas, totalGeral)} dos agendados</div></div>
        <div className="kc"><div className="kl">Ticket Médio</div><div className="kv" style={{fontSize:18}}>{ticket(totalReceita, totalFin)}</div></div>
      </div>
      <div className="kr kr3">
        <div className="kc verde" style={{gridColumn:'span 2'}}>
          <div className="kl">Receita do Período</div>
          <div className="kv" style={{color:'var(--v2)'}}>{fmtR(totalReceita)}</div>
          {dReceita && <div className="ks" style={{color:dReceita.pos?'#1B5E20':'#c62828',fontWeight:700}}>{dReceita.txt}</div>}
        </div>
        <div className="kc">
          <div className="kl">Taxa de Comparecimento</div>
          <div className="kv">{pct(totalFin, totalGeral)}</div>
        </div>
      </div>

      {/* GRÁFICO: receita por dia */}
      <div className="tc" style={{marginBottom:'1.2rem'}}>
        <div className="th"><h3>📈 Receita por Dia do Mês</h3></div>
        <div style={{padding:'1rem 1.2rem',overflowX:'auto'}}>
          <div style={{display:'flex',alignItems:'flex-end',gap:3,height:140,minWidth:600}}>
            {porDia.map(d => (
              <div key={d.dia} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,minWidth:12}} title={`Dia ${d.dia}: ${fmtR(d.v)}`}>
                <div style={{
                  width:'100%',borderRadius:'4px 4px 0 0',
                  height:`${(d.v/maxDia)*110}px`,
                  background: d.v>0 ? 'linear-gradient(180deg,var(--v2),var(--v4))' : '#eee',
                  minHeight: d.v>0 ? 4 : 2,
                }}/>
                <span style={{fontSize:8,color:'var(--cinza-cl)'}}>{d.dia}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GRÁFICOS: pizza origem + barras dentista */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.2rem',marginBottom:'1.2rem'}} className="rel-graf-2col">
        <div className="tc" style={{marginBottom:0}}>
          <div className="th"><h3>🥧 Agendamentos por Origem</h3></div>
          <div style={{padding:'1rem 1.2rem',display:'flex',gap:'1.2rem',alignItems:'center',flexWrap:'wrap'}}>
            <div style={{width:140,height:140,borderRadius:'50%',flexShrink:0,background: totalOrig>0 ? `conic-gradient(${pieStops})` : '#eee'}}/>
            <div style={{display:'flex',flexDirection:'column',gap:4,fontSize:12}}>
              {byOrigem.map(([o, v], i) => (
                <div key={o} style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{width:11,height:11,borderRadius:3,background:CORES_GRAF[i%CORES_GRAF.length]}}/>
                  <span>{o}</span>
                  <strong style={{marginLeft:'auto'}}>{v.count}</strong>
                  <span style={{color:'var(--cinza-cl)'}}>({pct(v.count,totalOrig)})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="tc" style={{marginBottom:0}}>
          <div className="th"><h3>📊 Receita por Dentista</h3></div>
          <div style={{padding:'1.1rem 1.2rem',display:'flex',flexDirection:'column',gap:10}}>
            {Object.entries(byDent).map(([d, v]) => (
              <div key={d}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
                  <strong>{d}</strong><span style={{color:'var(--v2)',fontWeight:700}}>{fmtR(v.receita)}</span>
                </div>
                <div style={{height:14,background:'var(--b2)',borderRadius:7,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${(v.receita/maxDentReceita)*100}%`,background:'linear-gradient(90deg,var(--v2),var(--v4))',borderRadius:7}}/>
                </div>
              </div>
            ))}
            {Object.keys(byDent).length === 0 && <span style={{fontSize:12,color:'#bbb'}}>Sem dados</span>}
          </div>
        </div>
      </div>

      {/* OCUPAÇÃO DA AGENDA */}
      <div className="tc" style={{marginBottom:'1.2rem'}}>
        <div className="th"><h3>🗓️ Taxa de Ocupação da Agenda</h3></div>
        <div style={{padding:'1.1rem 1.2rem',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'1rem'}}>
          {ocupacao.map(o => (
            <div key={o.nome}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
                <strong>{o.nome}</strong>
                <span>{o.qtd} / {o.capacidade} horários ({o.p.toFixed(0)}%)</span>
              </div>
              <div style={{height:14,background:'var(--b2)',borderRadius:7,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${o.p}%`,background:o.p>75?'#E53935':o.p>50?'#FB8C00':'var(--v2)',borderRadius:7}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PARTICULAR VS CONVÊNIO */}
      <div className="tc" style={{marginBottom:'1.2rem'}}>
        <div className="th"><h3>🏥 Particular vs Convênio</h3></div>
        <table className="tbl">
          <thead><tr><th>CATEGORIA</th><th>PROCEDIMENTOS</th><th>RECEITA</th><th>% DA RECEITA</th><th>TICKET MÉDIO</th></tr></thead>
          <tbody>
            {byConv.map(([c, v]) => (
              <tr key={c}>
                <td><span className="badge" style={{background:c==='Particular'?'#f0f0f0':'var(--v2)',color:c==='Particular'?'#333':'#fff'}}>{c}</span></td>
                <td>{v.count}</td>
                <td style={{fontWeight:700,color:'var(--v2)'}}>{fmtR(v.receita)}</td>
                <td>{pct(v.receita, totalReceita)}</td>
                <td>{ticket(v.receita, v.count)}</td>
              </tr>
            ))}
            {byConv.length === 0 && <tr className="er"><td colSpan={5}>Sem dados</td></tr>}
          </tbody>
        </table>
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

      {/* Novo vs Retorno */}
      <div className="tc" style={{marginBottom:'1.2rem'}}>
        <div className="th"><h3>Novo vs Retorno</h3></div>
        <table className="tbl">
          <thead><tr><th>TIPO</th><th>QTD TOTAL</th><th>ATENDIDOS</th><th>RECEITA</th><th>% DO TOTAL</th><th>TICKET MÉDIO</th></tr></thead>
          <tbody>
            {['NOVO','RETORNO'].map(t => (
              <tr key={t}>
                <td><span className={`badge ${t==='NOVO'?'b-rec':'b-fin'}`}>{t}</span></td>
                <td>{byTipo[t].count}</td>
                <td>{byTipo[t].fin}</td>
                <td style={{fontWeight:700,color:'var(--v2)'}}>{fmtR(byTipo[t].receita)}</td>
                <td>{pct(byTipo[t].count, totalGeral)}</td>
                <td>{ticket(byTipo[t].receita, byTipo[t].fin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detalhamento por Status */}
      <div className="tc" style={{marginBottom:'1.2rem'}}>
        <div className="th"><h3>Detalhamento por Status</h3></div>
        <table className="tbl">
          <thead><tr><th>STATUS</th><th>QTD</th></tr></thead>
          <tbody>
            {byStatus.map(([st, v]) => (
              <tr key={st}>
                <td><span className="badge b-agu" style={{background:'#f0f0f0',color:'#333'}}>{st}</span></td>
                <td style={{fontWeight:700}}>{v.count}</td>
              </tr>
            ))}
            {byStatus.length === 0 && <tr className="er"><td colSpan={2}>Sem dados</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Análise por Origem */}
      <div className="tc" style={{marginBottom:'1.2rem'}}>
        <div className="th"><h3>Análise por Origem</h3></div>
        <table className="tbl">
          <thead><tr><th>ORIGEM</th><th>QTD</th><th>FINALIZ.</th><th>FALTAS</th><th>RECEITA</th><th>CONV.</th></tr></thead>
          <tbody>
            {byOrigem.map(([o, v]) => (
              <tr key={o}>
                <td>{o}</td><td>{v.count}</td><td>{v.fin}</td><td>{v.faltas}</td>
                <td style={{fontWeight:700,color:'var(--v2)'}}>{fmtR(v.receita)}</td>
                <td>{pct(v.fin, v.count)}</td>
              </tr>
            ))}
            {byOrigem.length === 0 && <tr className="er"><td colSpan={6}>Sem dados</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Procedimentos Mais Realizados */}
      <div className="tc" style={{marginBottom:'1.2rem'}}>
        <div className="th"><h3>Procedimentos Mais Realizados</h3><span style={{fontSize:10,color:'var(--cinza-cl)'}}>receita real rateada por procedimento</span></div>
        <table className="tbl">
          <thead><tr><th>PROCEDIMENTO</th><th>QTD AGEND.</th><th>RECEITA GERADA</th><th>% PARTICIPAÇÃO</th></tr></thead>
          <tbody>
            {byProc.map(([p, v]) => (
              <tr key={p}>
                <td>{p}</td><td>{v.count}</td>
                <td style={{fontWeight:700,color:'var(--v2)'}}>{fmtR(v.receita)}</td>
                <td>{pct(v.receita, totalReceita)}</td>
              </tr>
            ))}
            {byProc.length === 0 && <tr className="er"><td colSpan={4}>Sem dados</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
