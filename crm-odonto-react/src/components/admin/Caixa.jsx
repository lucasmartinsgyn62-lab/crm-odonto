import { useState } from 'react';
import { useCRM } from '../../context/CRMContext';

function fmtR(v) { return 'R$ ' + (v || 0).toFixed(2).replace('.', ','); }

function somarFormas(entries) {
  const t = { total: 0, pix: 0, din: 0, deb: 0, cred: 0, conv: 0 };
  entries.forEach(e => {
    const v2 = e.valor2 || 0;
    const v1 = (e.valor || 0) - v2;
    t.total += e.valor || 0;
    const add = (forma, val) => {
      if (forma === 'Pix')           t.pix  += val;
      else if (forma === 'Dinheiro') t.din  += val;
      else if (forma === 'Cartão Débito')  t.deb  += val;
      else if (forma === 'Cartão Crédito') t.cred += val;
      else if (forma === 'Convênio') t.conv += val;
    };
    add(e.forma,  v2 > 0 ? v1 : e.valor || 0);
    if (v2 > 0 && e.forma2) add(e.forma2, v2);
  });
  return t;
}

function FormaCell({ e }) {
  const v2 = e.valor2 || 0;
  if (e.forma2 && v2 > 0) {
    const v1 = (e.valor || 0) - v2;
    return (
      <td>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{e.forma} {fmtR(v1)}</div>
        <div style={{ fontSize: 11, color: 'var(--cinza)' }}>+ {e.forma2} {fmtR(v2)}</div>
      </td>
    );
  }
  return <td>{e.forma || '—'}</td>;
}

const SENHA_FECHAMENTO = '123';

export default function Caixa() {
  const { state, dispatch, showToast, usuario } = useCRM();
  const [filtroData, setFiltroData] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [senha, setSenha] = useState('');

  const entries = filtroData
    ? state.caixaDia.filter(e => {
        if (!e.dt) return true;
        const d  = new Date(e.dt);
        const dl = d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0');
        return dl === filtroData;
      })
    : state.caixaDia;

  const { total, pix, din, deb, cred, conv } = somarFormas(entries);

  function abrirSenhaFechamento() {
    if (usuario?.role !== 'admin' && usuario?.role !== 'super_admin') {
      showToast('Apenas o Administrador pode fechar o caixa.', 'warning'); return;
    }
    if (!state.caixaDia.length) { showToast('Caixa vazio, nada a fechar', 'warning'); return; }
    setSenha('');
    setShowSenha(true);
  }

  function confirmarSenhaFechamento() {
    if (senha !== SENHA_FECHAMENTO) {
      showToast('Senha incorreta', 'error');
      return;
    }
    setShowSenha(false);
    fecharCaixa();
  }

  function fecharCaixa() {
    const dt = new Date();
    const { total: tot, pix: px, din: dn, deb: db, cred: cr, conv: cv } = somarFormas(state.caixaDia);
    const recepcs = [...new Set(state.caixaDia.map(e => e.recepcionista || '').filter(Boolean))];

    const fechamento = {
      data: dt.toLocaleDateString('pt-BR'),
      hora: dt.toLocaleTimeString('pt-BR'),
      atendimentos: state.caixaDia.length,
      total: tot, pix: px, dinheiro: dn, debito: db, credito: cr, convenio: cv,
      fechadoPor: usuario?.nome || 'Administrador',
      recepcionistas: recepcs.join(', ') || '—',
      itens: JSON.parse(JSON.stringify(state.caixaDia)),
    };
    dispatch({ type: 'FECHAR_CAIXA', payload: { fechamento } });
    showToast('Caixa fechado com sucesso! Gestor: ' + (usuario?.nome || 'Administrador'), 'success');
  }

  return (
    <div>
      {/* KPIs */}
      <div className="kr" style={{ gridTemplateColumns: 'repeat(6,1fr)', gap: '.9rem', marginBottom: '1.2rem' }}>
        <div className="kc">
          <div className="kl">Atendimentos</div>
          <div className="kv">{entries.length}</div>
        </div>
        <div className="kc verde">
          <div className="kl">Total</div>
          <div className="kv" style={{ color: 'var(--v2)' }}>{fmtR(total)}</div>
        </div>
        <div className="kc">
          <div className="kl">Pix</div>
          <div className="kv">{fmtR(pix)}</div>
        </div>
        <div className="kc">
          <div className="kl">Dinheiro</div>
          <div className="kv">{fmtR(din)}</div>
        </div>
        <div className="kc">
          <div className="kl">Cartão Déb.</div>
          <div className="kv">{fmtR(deb)}</div>
        </div>
        <div className="kc">
          <div className="kl">Cartão Créd.</div>
          <div className="kv">{fmtR(cred)}</div>
        </div>
      </div>

      <div className="tc">
        <div className="th">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h3><i className="ti ti-cash-register"></i> Atendimentos Finalizados</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--cinza)' }}>Data:</label>
              <input
                type="date" className="sel"
                value={filtroData}
                onChange={e => setFiltroData(e.target.value)}
                style={{ fontSize: 12, padding: '.3rem .6rem', borderRadius: 7, border: '1.5px solid var(--borda)' }}
              />
            </div>
          </div>
          <div className="th-r">
            {(usuario?.role === 'admin' || usuario?.role === 'super_admin') && (
              <button className="btsv btn-fechar-caixa" onClick={abrirSenhaFechamento}>
                <i className="ti ti-lock"></i> Fechar Caixa do Dia
              </button>
            )}
          </div>
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Dentista</th>
              <th>Procedimentos</th>
              <th>Forma de Pagamento</th>
              <th>Valor</th>
              <th>Observação</th>
              <th>Recepcionista</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr className="er">
                <td colSpan={7}>Nenhum atendimento finalizado{filtroData ? ' nesta data' : ''}.</td>
              </tr>
            )}
            {entries.map((e, i) => {
              const procs = e.procedimentosRealizados?.length
                ? e.procedimentosRealizados.map(p => p.nome || p).join(', ')
                : e.areas?.length ? e.areas.join(', ') : '—';
              return (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{e.nome || '—'}</td>
                  <td>{e.dentista || '—'}</td>
                  <td style={{ fontSize: 11 }}>{procs}</td>
                  <FormaCell e={e} />
                  <td style={{ fontWeight: 700, color: 'var(--v2)' }}>{fmtR(e.valor)}</td>
                  <td style={{ fontSize: 11, color: '#666', fontStyle: e.obs ? 'normal' : 'italic' }}>
                    {e.obs || '—'}
                  </td>
                  <td style={{ fontSize: 12, color: '#888' }}>{e.recepcionista || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showSenha && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',borderRadius:'var(--r)',padding:'1.5rem',width:320,maxWidth:'90%'}}>
            <h3 style={{margin:'0 0 .3rem'}}><i className="ti ti-lock"></i> Confirmar Fechamento</h3>
            <p style={{fontSize:12,color:'var(--cinza)',margin:'0 0 1rem'}}>
              Digite a senha de administrador para encerrar o caixa do dia ({state.caixaDia.length} atendimento{state.caixaDia.length===1?'':'s'}).
            </p>
            <input
              type="password" className="inf" autoFocus value={senha} placeholder="Senha"
              onChange={e=>setSenha(e.target.value)}
              onKeyDown={e=>{ if (e.key==='Enter') confirmarSenhaFechamento(); }}
              style={{width:'100%',marginBottom:'1rem'}}
            />
            <div style={{display:'flex',gap:'.5rem',justifyContent:'flex-end'}}>
              <button className="btn-pront" onClick={()=>setShowSenha(false)}>Cancelar</button>
              <button className="btsv btn-fechar-caixa" onClick={confirmarSenhaFechamento}>Confirmar Fechamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
