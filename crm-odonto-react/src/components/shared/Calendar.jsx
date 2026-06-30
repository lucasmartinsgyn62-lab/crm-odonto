import { useState, useEffect, useRef } from 'react';
import { useCRM } from '../../context/CRMContext';

const MESES_NOME = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function fmtBtn(d) {
  const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${dias[d.getDay()]}, ${pad(d.getDate())} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

export default function Calendar() {
  const { selectedDate, setSelectedDate, state, selectedDentista, getDateStr } = useCRM();
  const [open, setOpen] = useState(false);
  const [calAno, setCalAno] = useState(selectedDate.getFullYear());
  const [calMes, setCalMes] = useState(selectedDate.getMonth());
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function diasComDados() {
    const result = {};
    Object.keys(state.agenda).forEach(chave => {
      const parteDent = chave.includes('||') ? chave.split('||')[0] : '';
      const parteData = chave.includes('||') ? chave.split('||')[1] : chave;
      if (selectedDentista && parteDent !== selectedDentista) return;
      if (!selectedDentista && parteDent) return;
      const parts = parteData.split('/');
      if (parts.length === 3) {
        const dia = parseInt(parts[0]), mes = parseInt(parts[1]) - 1, ano = parseInt(parts[2]);
        if (mes === calMes && ano === calAno) {
          const temDados = Object.values(state.agenda[chave]).some(r => r && r.nome);
          if (temDados) result[dia] = true;
        }
      }
    });
    return result;
  }

  function navMes(dir) {
    let m = calMes + dir, a = calAno;
    if (m > 11) { m = 0; a++; }
    if (m < 0) { m = 11; a--; }
    setCalMes(m); setCalAno(a);
  }

  function selDia(a, m, d) {
    const newDate = new Date(a, m, d);
    setSelectedDate(newDate);
    setCalAno(a); setCalMes(m);
    setOpen(false);
  }

  function irHoje() {
    const h = new Date();
    setSelectedDate(h);
    setCalAno(h.getFullYear());
    setCalMes(h.getMonth());
    setOpen(false);
  }

  const hoje = new Date();
  const primeiroDia = new Date(calAno, calMes, 1);
  const ultimoDia = new Date(calAno, calMes + 1, 0);
  const inicioSem = primeiroDia.getDay();
  const dadosMap = diasComDados();

  const cells = [];
  // dias mês anterior
  const mesPrev = new Date(calAno, calMes, 0);
  for (let i = inicioSem - 1; i >= 0; i--) {
    const d = mesPrev.getDate() - i;
    const prevM = calMes - 1 < 0 ? 11 : calMes - 1;
    const prevA = calMes - 1 < 0 ? calAno - 1 : calAno;
    cells.push({ d, m: prevM, a: prevA, outro: true });
  }
  for (let d = 1; d <= ultimoDia.getDate(); d++) {
    cells.push({ d, m: calMes, a: calAno, outro: false });
  }
  const total = Math.ceil((inicioSem + ultimoDia.getDate()) / 7) * 7;
  const diasProx = total - inicioSem - ultimoDia.getDate();
  for (let p = 1; p <= diasProx; p++) {
    const nextM = (calMes + 1) % 12;
    const nextA = calMes + 1 > 11 ? calAno + 1 : calAno;
    cells.push({ d: p, m: nextM, a: nextA, outro: true });
  }

  return (
    <div className="cal-wrap" ref={ref}>
      <button className="cal-btn" onClick={() => setOpen(v => !v)}>
        <span className="cal-icon">📅</span>
        <span>{fmtBtn(selectedDate)}</span>
      </button>
      {open && (
        <div className="cal-popup">
          <div className="cal-head">
            <button className="cal-nav" onClick={() => navMes(-1)}>‹</button>
            <div className="cal-head-lbl">{MESES_NOME[calMes]} {calAno}</div>
            <button className="cal-nav" onClick={() => navMes(1)}>›</button>
          </div>
          <div className="cal-dias-head">
            {DIAS_SHORT.map(d => <span key={d}>{d}</span>)}
          </div>
          <div className="cal-dias">
            {cells.map((c, i) => {
              let cls = 'cal-dia';
              if (c.outro) cls += ' outro-mes';
              if (!c.outro && c.d === hoje.getDate() && calMes === hoje.getMonth() && calAno === hoje.getFullYear()) cls += ' hoje';
              if (!c.outro && c.d === selectedDate.getDate() && c.m === selectedDate.getMonth() && c.a === selectedDate.getFullYear()) cls += ' selecionado';
              if (!c.outro && dadosMap[c.d]) cls += ' tem-dados';
              return (
                <button key={i} className={cls} onClick={() => selDia(c.a, c.m, c.d)}>{c.d}</button>
              );
            })}
          </div>
          <div className="cal-rodape">
            <span style={{fontSize:11,color:'var(--cinza)'}}>{fmtBtn(selectedDate)}</span>
            <button className="cal-btn-hoje" onClick={irHoje}>Hoje</button>
          </div>
        </div>
      )}
    </div>
  );
}
