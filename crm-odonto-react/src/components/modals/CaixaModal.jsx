import { useState, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';

const FORMAS = ['Pix', 'Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'Convênio'];

export default function CaixaModal() {
  const { caixaModal, setCaixaModal, state, dispatch, showToast, usuario } = useCRM();

  const [procsLocais, setProcsLocais] = useState([]);
  const [valor,       setValor]       = useState('');
  const [forma,       setForma]       = useState('');
  const [usarSplit,   setUsarSplit]   = useState(false);
  const [forma2,      setForma2]      = useState('');
  const [valor2,      setValor2]      = useState('');
  const [obs,         setObs]         = useState('');

  // Reinicializa tudo sempre que um novo modal é aberto
  useEffect(() => {
    if (!caixaModal) return;
    const { agKey, horario } = caixaModal;
    const slot = state.agenda[agKey]?.[horario] || {};
    setProcsLocais([...(slot.procedimentosRealizados || [])]);
    setValor('');
    setForma('');
    setUsarSplit(false);
    setForma2('');
    setValor2('');
    setObs('');
  }, [caixaModal]);

  if (!caixaModal) return null;

  const { agKey, horario } = caixaModal;
  const slot = state.agenda[agKey]?.[horario] || {};

  const subtotalProcs = procsLocais.reduce((s, p) => s + (p.preco || 0), 0);
  const valorTotal    = parseFloat(valor) || subtotalProcs;
  const v2            = parseFloat(valor2) || 0;
  const v1            = Math.max(0, valorTotal - v2);

  function removerProc(idx) {
    setProcsLocais(prev => prev.filter((_, i) => i !== idx));
  }

  function fechar() {
    setCaixaModal(null);
  }

  function confirmar() {
    if (!forma) {
      showToast('Selecione a forma de pagamento', 'warning'); return;
    }
    if (usarSplit && !forma2) {
      showToast('Selecione a 2ª forma de pagamento', 'warning'); return;
    }
    if (usarSplit && v2 <= 0) {
      showToast('Informe o valor da 2ª forma de pagamento', 'warning'); return;
    }
    if (usarSplit && v2 >= valorTotal) {
      showToast('Valor da 2ª forma deve ser menor que o total', 'warning'); return;
    }

    const parts   = agKey.split('||');
    const dentista = parts.length > 1 ? parts[0] : '';
    const mes      = parts.length > 1 ? parts[1] : agKey;

    const entry = {
      mes, h: horario,
      nome:      slot.nome || '',
      dentista,
      valor:     valorTotal,
      forma,
      valor2:    usarSplit ? v2 : 0,
      forma2:    usarSplit ? forma2 : '',
      obs:       obs.trim(),
      areas:     slot.areas || [],
      procedimentosRealizados: procsLocais,
      recepcionista: usuario?.nome || '—',
      dt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_CAIXA_ENTRY', payload: entry });
    dispatch({ type: 'SET_AGENDA_SLOT', payload: { agKey, horario, slot: { ...slot, status: 'ATENDIDO', valor: valorTotal } } });
    fechar();

    const label = usarSplit
      ? `${forma} R$${v1.toFixed(2).replace('.', ',')} + ${forma2} R$${v2.toFixed(2).replace('.', ',')}`
      : `${forma}${valorTotal > 0 ? ' — R$ ' + valorTotal.toFixed(2).replace('.', ',') : ''}`;
    showToast(`✔ Pagamento confirmado — ${label}`, 'success');
  }

  return (
    <div className="modal-ov open" style={{ zIndex: 700 }} onClick={e => e.target === e.currentTarget && fechar()}>
      <div className="mbox" style={{ maxWidth: 500 }}>
        <button className="mclose" onClick={fechar}>✕</button>

        <h3 style={{ color: 'var(--v2)', marginBottom: '.3rem' }}>
          <i className="ti ti-currency-dollar"></i> Confirmar Pagamento
        </h3>
        <p style={{ fontWeight: 600, color: 'var(--v1)', fontSize: 15, margin: '.2rem 0 .8rem' }}>
          {slot.nome || '—'}
          {slot.dentista && (
            <span style={{ fontWeight: 400, color: 'var(--cinza)', fontSize: 13 }}> · {slot.dentista}</span>
          )}
        </p>

        {/* ── Procedimentos com botão ✕ ── */}
        {procsLocais.length > 0 && (
          <div style={{
            marginBottom: '.9rem', background: '#f8f9fa', borderRadius: 8,
            padding: '.6rem .8rem', fontSize: 12, maxHeight: 180, overflowY: 'auto',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: .5, marginBottom: 6 }}>
              PROCEDIMENTOS
            </div>
            {procsLocais.map((pr, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 0', borderBottom: '1px solid #eee',
              }}>
                <span style={{ flex: 1, color: '#333' }}>{pr.nome}</span>
                <span style={{ fontWeight: 700, color: 'var(--v2)', marginRight: 8 }}>
                  R$ {(pr.preco || 0).toFixed(2)}
                </span>
                <button
                  onClick={() => removerProc(i)}
                  title="Remover procedimento"
                  style={{
                    background: '#ffebee', border: 'none', color: '#c62828',
                    borderRadius: 4, width: 22, height: 22, cursor: 'pointer',
                    fontSize: 11, fontWeight: 700, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0,
                  }}
                >✕</button>
              </div>
            ))}
            <div style={{
              borderTop: '1px solid #ddd', marginTop: 6, paddingTop: 6,
              fontWeight: 700, display: 'flex', justifyContent: 'space-between',
            }}>
              <span>Subtotal procedimentos:</span>
              <span style={{ color: 'var(--v2)' }}>R$ {subtotalProcs.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* ── Valor total ── */}
        <div className="fgg">
          <label>Valor Total (R$)</label>
          <input
            type="number" className="minp" step="0.01" min="0"
            placeholder={subtotalProcs > 0 ? subtotalProcs.toFixed(2) : '0,00'}
            value={valor}
            onChange={e => setValor(e.target.value)}
          />
        </div>

        {/* ── 1ª Forma de pagamento ── */}
        <div className="fgg">
          <label>
            {usarSplit
              ? `1ª Forma de Pagamento — R$ ${v1.toFixed(2).replace('.', ',')}`
              : 'Forma de Pagamento'}
          </label>
          <select className="minp" value={forma} onChange={e => setForma(e.target.value)}>
            <option value="">Selecione...</option>
            {FORMAS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {/* ── Toggle 2ª forma ── */}
        <button
          type="button"
          onClick={() => { setUsarSplit(v => !v); setForma2(''); setValor2(''); }}
          style={{
            background: usarSplit ? '#ffebee' : '#e8f5e9',
            color:      usarSplit ? '#c62828' : '#2e7d32',
            border: 'none', borderRadius: 6, padding: '.35rem 1rem',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', marginBottom: '.9rem',
          }}
        >
          {usarSplit ? '✕ Remover 2ª forma' : '+ Adicionar 2ª forma de pagamento'}
        </button>

        {/* ── 2ª Forma (split) ── */}
        {usarSplit && (
          <div style={{
            background: '#f0f4ff', borderRadius: 8, padding: '.8rem',
            marginBottom: '.9rem', border: '1px solid #c5cae9',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#3949ab', letterSpacing: .5, marginBottom: 8 }}>
              2ª FORMA DE PAGAMENTO
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
              <div className="fgg" style={{ marginBottom: 0 }}>
                <label>Forma</label>
                <select className="minp" value={forma2} onChange={e => setForma2(e.target.value)}>
                  <option value="">Selecione...</option>
                  {FORMAS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="fgg" style={{ marginBottom: 0 }}>
                <label>Valor (R$)</label>
                <input
                  type="number" className="minp" step="0.01" min="0"
                  placeholder="0,00"
                  value={valor2}
                  onChange={e => setValor2(e.target.value)}
                />
              </div>
            </div>
            {v2 > 0 && valorTotal > 0 && (
              <div style={{ fontSize: 11, color: '#3949ab', marginTop: 8, fontWeight: 600 }}>
                1ª forma: R$ {v1.toFixed(2).replace('.', ',')} &nbsp;·&nbsp;
                2ª forma: R$ {v2.toFixed(2).replace('.', ',')}
              </div>
            )}
          </div>
        )}

        {/* ── Observação ── */}
        <div className="fgg">
          <label>Observação (parcelamento, condição especial...)</label>
          <input
            type="text" className="minp"
            placeholder="Ex: 3x no crédito, entrada + parcela..."
            value={obs}
            onChange={e => setObs(e.target.value)}
          />
        </div>

        <button className="mbtn" onClick={confirmar}>Confirmar Pagamento</button>
        <button
          className="mbtn"
          style={{ background: '#f5f5f5', color: '#666', marginTop: '.5rem' }}
          onClick={fechar}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
