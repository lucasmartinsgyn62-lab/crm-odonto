import { useState } from 'react';
import { useCRM } from '../../context/CRMContext';

export default function Origens() {
  const { state, dispatch, showToast } = useCRM();
  const [nova, setNova] = useState('');

  function add() {
    if (!nova.trim()) return;
    dispatch({ type: 'ADD_ORIGEM', payload: nova.trim() });
    showToast('✔ Origem adicionada!', 'success');
    setNova('');
  }

  function del(o) {
    if (!confirm(`Excluir origem "${o}"?`)) return;
    dispatch({ type: 'DELETE_ORIGEM', payload: o });
    showToast('Origem excluída', 'warning');
  }

  return (
    <div>
      <div className="fp">
        <h3>Adicionar nova origem</h3>
        <div style={{ display: 'flex', gap: '.7rem' }}>
          <input
            className="inf"
            placeholder="Ex: Parceria Salão X..."
            style={{ flex: 1 }}
            value={nova}
            onChange={e => setNova(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <button className="btsv" onClick={add}>Adicionar</button>
        </div>
      </div>
      <div className="fp">
        <h3>Origens cadastradas</h3>
        <div>
          {state.origens.length === 0 && <p style={{ fontSize: 12, color: '#aaa' }}>Nenhuma origem cadastrada.</p>}
          {state.origens.map((o, i) => (
            <div key={o} className="oi">
              <div className="on">{i + 1}</div>
              <span style={{ flex: 1, fontSize: 13 }}>{o}</span>
              <button className="btdl" onClick={() => del(o)}>Excluir</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
