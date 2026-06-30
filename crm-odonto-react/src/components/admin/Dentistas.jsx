import { useState } from 'react';
import { useCRM } from '../../context/CRMContext';

const EMPTY = { nome: '', esp: '', cro: '', tel: '' };

export default function Dentistas() {
  const { state, dispatch, showToast } = useCRM();
  const [form, setForm] = useState({ ...EMPTY });
  const [editId, setEditId] = useState(null);

  function setF(f, v) { setForm(p => ({ ...p, [f]: v })); }

  function salvar() {
    if (!form.nome.trim()) { showToast('Nome é obrigatório', 'warning'); return; }
    if (editId !== null) {
      dispatch({ type: 'UPDATE_DENTISTA', payload: { ...form, id: editId } });
      showToast('✔ Dentista atualizado!', 'success');
      setEditId(null);
    } else {
      dispatch({ type: 'ADD_DENTISTA', payload: form });
      showToast('✔ Dentista cadastrado!', 'success');
    }
    setForm({ ...EMPTY });
  }

  function editar(d) {
    setEditId(d.id);
    setForm({ nome: d.nome, esp: d.esp || '', cro: d.cro || '', tel: d.tel || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelar() {
    setEditId(null);
    setForm({ ...EMPTY });
  }

  function deletar(id) {
    if (!confirm('Excluir este dentista?')) return;
    dispatch({ type: 'DELETE_DENTISTA', payload: id });
    showToast('Dentista excluído', 'warning');
  }

  return (
    <div>
      <div className="fp">
        <h3>{editId !== null ? 'Editar dentista' : 'Cadastrar dentista'}</h3>
        <div className="gg2">
          <div className="fgg"><label>Nome completo *</label>
            <input className="inf" placeholder="Dr. Nome Sobrenome" value={form.nome} onChange={e => setF('nome', e.target.value)}/>
          </div>
          <div className="fgg"><label>Especialidade</label>
            <input className="inf" placeholder="Ex: Ortodontia, Implantodontia..." value={form.esp} onChange={e => setF('esp', e.target.value)}/>
          </div>
          <div className="fgg"><label>CRO</label>
            <input className="inf" placeholder="Ex: CRO-GO 12345" value={form.cro} onChange={e => setF('cro', e.target.value)}/>
          </div>
          <div className="fgg"><label>Telefone / WhatsApp</label>
            <input className="inf" placeholder="(00) 9 0000-0000" value={form.tel} onChange={e => setF('tel', e.target.value)}/>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.7rem', alignItems: 'center', marginTop: '.7rem' }}>
          <button className="btsv" id="dent-btn-salvar" onClick={salvar}>
            {editId !== null ? 'Atualizar dentista' : 'Cadastrar dentista'}
          </button>
          {editId !== null && (
            <button className="btsv" style={{ background: '#e0e0e0', color: '#333' }} onClick={cancelar}>Cancelar</button>
          )}
        </div>
      </div>

      <div className="tc">
        <div className="th"><h3>Dentistas cadastrados ({state.dentistas.length})</h3></div>
        <div style={{ padding: '1rem' }}>
          {state.dentistas.length === 0 && (
            <p style={{ textAlign: 'center', color: '#aaa', padding: '2rem', fontSize: 12 }}>Nenhum dentista cadastrado.</p>
          )}
          {state.dentistas.map(d => (
            <div key={d.id} className="dent-card">
              <div className="dent-av">{(d.nome || 'D')[0].toUpperCase()}</div>
              <div className="dent-info">
                <div className="dent-nome">{d.nome}</div>
                <div className="dent-sub">{d.esp || '—'} {d.cro ? `· ${d.cro}` : ''}</div>
                {d.tel && <div style={{ fontSize: 11, color: 'var(--cinza)', marginTop: 2 }}>{d.tel}</div>}
              </div>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button className="btsv" style={{ padding: '.25rem .7rem', fontSize: 11 }} onClick={() => editar(d)}>Editar</button>
                <button className="btdl" onClick={() => deletar(d.id)}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
