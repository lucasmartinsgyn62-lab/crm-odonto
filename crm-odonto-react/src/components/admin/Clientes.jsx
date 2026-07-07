import { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { NEG_LIST, TIPO_LIST } from '../../constants';

const EMPTY_PRONT = {
  alergias:'',doencas:'',medicamentos:'',gestante:'',
  ulttrat:'',medo:'',extracao:'',implante:'',
  queixa:'',perio:'',higiene:'',bruxismo:'',
  tratamento:'',proximo:'',sessoes:'',obscli:''
};
const EMPTY_CLI = {nome:'',wpp:'',orig:'',tipo:'NOVO',areas:[],neg:'',obs:'',prontuario:{...EMPTY_PRONT}};

export default function Clientes() {
  const { state, dispatch, showToast, setProntuarioModal, procNames } = useCRM();
  const [form, setForm] = useState({...EMPTY_CLI, prontuario:{...EMPTY_PRONT}});
  const [editId, setEditId] = useState(null);
  const [busca, setBusca] = useState('');
  const [prontAberto, setProntAberto] = useState(false);

  function setField(f, v) { setForm(prev => ({...prev, [f]: v})); }
  function setPront(f, v) { setForm(prev => ({...prev, prontuario:{...prev.prontuario, [f]:v}})); }

  function salvar() {
    if (!form.nome.trim()) { showToast('Nome é obrigatório', 'warning'); return; }
    if (editId !== null) {
      dispatch({ type: 'UPDATE_CLIENTE', payload: { ...form, id: editId } });
      showToast('✔ Paciente atualizado!', 'success');
      setEditId(null);
    } else {
      dispatch({ type: 'ADD_CLIENTE', payload: form });
      showToast('✔ Paciente cadastrado!', 'success');
    }
    setForm({...EMPTY_CLI, prontuario:{...EMPTY_PRONT}});
  }

  function editar(c) {
    setEditId(c.id);
    setForm({ ...c, prontuario: { ...EMPTY_PRONT, ...(c.prontuario||{}) } });
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function deletar(id) {
    if (!confirm('Excluir este paciente?')) return;
    dispatch({ type: 'DELETE_CLIENTE', payload: id });
    showToast('Paciente excluído', 'warning');
  }

  function cancelar() {
    setEditId(null);
    setForm({...EMPTY_CLI, prontuario:{...EMPTY_PRONT}});
  }

  const clientes = state.clientes.filter(c =>
    !busca || c.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      <div className="fp">
        <h3>{editId !== null ? 'Editar paciente' : 'Cadastrar novo paciente'}</h3>
        <div className="gg2">
          <div className="fgg"><label>Nome completo *</label>
            <input className="inf" placeholder="Nome..." value={form.nome} onChange={e => setField('nome', e.target.value)}/>
          </div>
          <div className="fgg"><label>WhatsApp</label>
            <input className="inf" placeholder="(62) 9 0000-0000" value={form.wpp} onChange={e => setField('wpp', e.target.value)}/>
          </div>
          <div className="fgg"><label>Origem</label>
            <select className="inf" value={form.orig} onChange={e => setField('orig', e.target.value)}>
              <option value="">Selecione...</option>
              {state.origens.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="fgg"><label>Tipo paciente</label>
            <select className="inf" value={form.tipo} onChange={e => setField('tipo', e.target.value)}>
              {TIPO_LIST.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="gg3">
          <div className="fgg"><label>Negociação padrão</label>
            <select className="inf" value={form.neg} onChange={e => setField('neg', e.target.value)}>
              <option value="">—</option>
              {NEG_LIST.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="fgg"><label>Observações gerais</label>
          <input className="inf" placeholder="Notas sobre o paciente..." value={form.obs} onChange={e => setField('obs', e.target.value)}/>
        </div>

        {/* PRONTUÁRIO — botão de abertura (apresentado como obrigatório) */}
        <div style={{marginTop:'.6rem'}}>
          <button
            type="button"
            className="btsv"
            style={{background:prontAberto?'var(--v1)':'var(--v2)',display:'inline-flex',alignItems:'center',gap:8}}
            onClick={() => setProntAberto(o => !o)}
          >
            🦷 Prontuário Odontológico <span style={{color:'#FFD54F',fontWeight:900}}>*</span>
            <span style={{fontSize:10,opacity:.85}}>{prontAberto ? '(fechar)' : 'obrigatório — clique para preencher'}</span>
          </button>
        </div>
        {prontAberto && (
        <div style={{border:'1.5px solid var(--borda)',borderRadius:'var(--r)',overflow:'hidden',marginTop:'.6rem'}}>
          <div style={{background:'var(--vc)',padding:'.55rem 1rem',fontSize:10,fontWeight:700,color:'var(--v2)',letterSpacing:'1.5px',textTransform:'uppercase',borderBottom:'1px solid var(--borda)'}}>🦷 Prontuário Odontológico <span style={{color:'#E65100'}}>— preenchimento obrigatório</span></div>
          <div style={{padding:'.9rem 1rem',display:'flex',flexDirection:'column',gap:'.7rem'}}>

            <div style={{fontSize:10,fontWeight:700,color:'var(--cinza)',letterSpacing:1,textTransform:'uppercase',paddingBottom:'.3rem',borderBottom:'1px solid #f0f0f0'}}>🩺 Saúde Geral</div>
            <div className="gg2">
              <div className="fgg"><label>Alergias</label><input className="inf" placeholder="Ex: Penicilina..." value={form.prontuario.alergias} onChange={e => setPront('alergias', e.target.value)}/></div>
              <div className="fgg"><label>Doenças sistêmicas</label><input className="inf" placeholder="Ex: Diabetes..." value={form.prontuario.doencas} onChange={e => setPront('doencas', e.target.value)}/></div>
              <div className="fgg"><label>Medicamentos em uso</label><input className="inf" placeholder="Ex: Metformina..." value={form.prontuario.medicamentos} onChange={e => setPront('medicamentos', e.target.value)}/></div>
              <div className="fgg"><label>Gestante / Amamentando</label>
                <select className="inf" value={form.prontuario.gestante} onChange={e => setPront('gestante', e.target.value)}>
                  <option value="">—</option><option>Não</option><option>Gestante</option><option>Amamentando</option>
                </select>
              </div>
            </div>

            <div style={{fontSize:10,fontWeight:700,color:'var(--cinza)',letterSpacing:1,textTransform:'uppercase',paddingBottom:'.3rem',borderBottom:'1px solid #f0f0f0',marginTop:'.3rem'}}>📋 Histórico Odontológico</div>
            <div className="gg2">
              <div className="fgg"><label>Último tratamento e quando</label><input className="inf" placeholder="Ex: Canal — há 2 anos..." value={form.prontuario.ulttrat} onChange={e => setPront('ulttrat', e.target.value)}/></div>
              <div className="fgg"><label>Medo / Ansiedade ao dentista</label>
                <select className="inf" value={form.prontuario.medo} onChange={e => setPront('medo', e.target.value)}>
                  <option value="">—</option><option>Nenhum</option><option>Leve</option><option>Moderado</option><option>Intenso</option>
                </select>
              </div>
              <div className="fgg"><label>Já fez extração?</label>
                <select className="inf" value={form.prontuario.extracao} onChange={e => setPront('extracao', e.target.value)}>
                  <option value="">—</option><option>Não</option><option>Sim</option>
                </select>
              </div>
              <div className="fgg"><label>Implante / Ortodontia anterior</label>
                <select className="inf" value={form.prontuario.implante} onChange={e => setPront('implante', e.target.value)}>
                  <option value="">—</option><option>Nenhum</option><option>Implante</option><option>Ortodontia</option><option>Ambos</option>
                </select>
              </div>
            </div>

            <div style={{fontSize:10,fontWeight:700,color:'var(--cinza)',letterSpacing:1,textTransform:'uppercase',paddingBottom:'.3rem',borderBottom:'1px solid #f0f0f0',marginTop:'.3rem'}}>🦷 Avaliação Clínica</div>
            <div className="gg3">
              <div className="fgg"><label>Queixa principal</label><input className="inf" placeholder="Ex: Dor no molar..." value={form.prontuario.queixa} onChange={e => setPront('queixa', e.target.value)}/></div>
              <div className="fgg"><label>Condição periodontal</label>
                <select className="inf" value={form.prontuario.perio} onChange={e => setPront('perio', e.target.value)}>
                  <option value="">—</option><option>Saudável</option><option>Gengivite</option><option>Periodontite leve</option><option>Periodontite severa</option>
                </select>
              </div>
              <div className="fgg"><label>Higiene bucal</label>
                <select className="inf" value={form.prontuario.higiene} onChange={e => setPront('higiene', e.target.value)}>
                  <option value="">—</option><option>Boa</option><option>Regular</option><option>Ruim</option>
                </select>
              </div>
              <div className="fgg" style={{gridColumn:'span 3'}}><label>Bruxismo / Apertamento</label>
                <select className="inf" value={form.prontuario.bruxismo} onChange={e => setPront('bruxismo', e.target.value)}>
                  <option value="">—</option><option>Não</option><option>Bruxismo noturno</option><option>Apertamento diurno</option><option>Ambos</option>
                </select>
              </div>
            </div>

            <div style={{fontSize:10,fontWeight:700,color:'var(--cinza)',letterSpacing:1,textTransform:'uppercase',paddingBottom:'.3rem',borderBottom:'1px solid #f0f0f0',marginTop:'.3rem'}}>📅 Plano de Tratamento</div>
            <div className="gg3">
              <div className="fgg"><label>Tratamento em andamento</label><input className="inf" placeholder="Ex: Clareamento..." value={form.prontuario.tratamento} onChange={e => setPront('tratamento', e.target.value)}/></div>
              <div className="fgg"><label>Próximo procedimento</label><input className="inf" placeholder="Ex: Restauração..." value={form.prontuario.proximo} onChange={e => setPront('proximo', e.target.value)}/></div>
              <div className="fgg"><label>Nº de sessões previstas</label><input className="inf" type="number" min="0" placeholder="Ex: 4" value={form.prontuario.sessoes} onChange={e => setPront('sessoes', e.target.value)}/></div>
            </div>

            <div className="fgg" style={{marginTop:'.3rem'}}><label>📝 Observações clínicas</label>
              <textarea className="inf" rows="3" placeholder="Anotações livres do dentista..." style={{height:70,resize:'vertical'}} value={form.prontuario.obscli} onChange={e => setPront('obscli', e.target.value)}/>
            </div>
          </div>
        </div>
        )}

        <div style={{display:'flex',gap:'.7rem',alignItems:'center',marginTop:'.7rem'}}>
          <button className="btsv" onClick={salvar}>{editId !== null ? 'Atualizar paciente' : 'Salvar paciente'}</button>
          {editId !== null && <button className="btsv" style={{background:'#e0e0e0',color:'#333'}} onClick={cancelar}>Cancelar edição</button>}
          <span style={{fontSize:11,color:'var(--cinza-cl)'}}>
            {editId !== null ? 'Editando paciente' : 'Dados migram para a agenda ao selecionar o nome'}
          </span>
        </div>
      </div>

      <div className="tc">
        <div className="th">
          <h3>Pacientes ({clientes.length})</h3>
          <input className="isrch" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)}/>
        </div>
        <table className="tbl">
          <thead><tr>
            <th>NOME</th><th>WHATSAPP</th><th>ORIGEM</th><th>PROCEDIMENTOS</th>
            <th>TIPO</th><th>NEGOCIAÇÃO</th><th>PRONTUÁRIO</th><th>AÇÕES</th>
          </tr></thead>
          <tbody>
            {clientes.length === 0 && <tr className="er"><td colSpan={8}>Nenhum paciente encontrado.</td></tr>}
            {clientes.map(c => (
              <tr key={c.id}>
                <td>{c.nome}</td>
                <td>
                  {c.wpp ? (
                    <a href={`https://wa.me/55${c.wpp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{color:'#25D366'}}>
                      <i className="ti ti-brand-whatsapp"></i> {c.wpp}
                    </a>
                  ) : '—'}
                </td>
                <td>{c.orig || '—'}</td>
                <td style={{fontSize:11}}>{(c.areas||[]).map(a => <span key={a} className="atag">{a}</span>)}</td>
                <td><span className={`badge ${c.tipo==='NOVO'?'b-rec':'b-fin'}`}>{c.tipo||'—'}</span></td>
                <td style={{fontSize:11}}>{c.neg||'—'}</td>
                <td>
                  <button className="btn-pront" onClick={() => {
                    // Find a slot for this client to open prontuario
                    let found = null;
                    Object.entries(state.agenda).forEach(([ak, slots]) => {
                      Object.entries(slots || {}).forEach(([h, s]) => {
                        if (s && s.nome === c.nome && !found) found = { agKey: ak, horario: h };
                      });
                    });
                    if (found) setProntuarioModal(found);
                    else showToast('Este paciente não está na agenda ainda', 'warning');
                  }}>
                    <i className="ti ti-file-text"></i> Ver
                  </button>
                </td>
                <td>
                  <button className="btsv" style={{padding:'.25rem .7rem',fontSize:11,marginRight:4}} onClick={() => editar(c)}>Editar</button>
                  <button className="btdl" onClick={() => deletar(c.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
