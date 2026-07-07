import { useState, useRef, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function nowStr() {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EMPTY_PRONT = {
  alergias:'',doencas:'',medicamentos:'',gestante:'',
  ulttrat:'',medo:'',extracao:'',implante:'',
  queixa:'',perio:'',higiene:'',bruxismo:'',
  tratamento:'',proximo:'',sessoes:'',obscli:''
};

function PInput({ label, value, onChange, placeholder }) {
  return (
    <div className="mpront-item">
      <label>{label}</label>
      <input className="inf" style={{width:'100%'}} placeholder={placeholder||'—'} value={value||''} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function PSelect({ label, value, onChange, options, span }) {
  return (
    <div className="mpront-item" style={span ? {gridColumn:`span ${span}`} : undefined}>
      <label>{label}</label>
      <select className="inf" style={{width:'100%'}} value={value||''} onChange={e => onChange(e.target.value)}>
        <option value="">—</option>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function ProntuarioModal() {
  const { prontuarioModal, setProntuarioModal, state, dispatch, showToast, procNames } = useCRM();
  const [novaAtualiz, setNovaAtualiz] = useState('');
  const [imgPreview, setImgPreview] = useState(null);
  const [pront, setPront] = useState({ ...EMPTY_PRONT });
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef(null);

  const agKey   = prontuarioModal?.agKey;
  const horario = prontuarioModal?.horario;
  const slot = (agKey && state.agenda[agKey]?.[horario]) || {};
  const nome = slot.nome || '';
  const cliente = state.clientes.find(c => c.nome === nome) || {};

  useEffect(() => {
    if (prontuarioModal) {
      setPront({ ...EMPTY_PRONT, ...(cliente.prontuario || {}) });
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prontuarioModal, cliente.id]);

  if (!prontuarioModal) return null;

  const wpp = slot.wpp || '';
  const tipo = slot.tipo || '';
  const orig = slot.orig || '';
  const atualizacoes = slot.atualizacoes || [];
  const procs = slot.procedimentosRealizados || [];
  const imagens = slot.imagens || [];

  function setP(f, v) { setPront(prev => ({ ...prev, [f]: v })); setDirty(true); }

  function salvarProntuario() {
    if (!cliente.id) { showToast('Paciente não cadastrado — cadastre-o em Pacientes para salvar o prontuário', 'warning'); return; }
    dispatch({ type: 'UPDATE_CLIENTE', payload: { id: cliente.id, prontuario: pront } });
    setDirty(false);
    showToast('✔ Prontuário salvo!', 'success');
  }

  function fechar() {
    if (dirty && !window.confirm('Há alterações não salvas no prontuário. Fechar mesmo assim?')) return;
    setProntuarioModal(null);
    setNovaAtualiz('');
  }

  function salvarAtualiz() {
    if (!novaAtualiz.trim()) return;
    const entry = { data: nowStr(), texto: novaAtualiz.trim() };
    const newList = [entry, ...atualizacoes];
    dispatch({ type: 'SAVE_ATUALIZACAO', payload: { agKey, horario, atualizacoes: newList } });
    setNovaAtualiz('');
    showToast('✔ Atualização registrada!', 'success');
  }

  function delAtualiz(idx) {
    const newList = atualizacoes.filter((_, i) => i !== idx);
    dispatch({ type: 'SAVE_ATUALIZACAO', payload: { agKey, horario, atualizacoes: newList } });
  }

  function addProc(e) {
    const val = e.target.value;
    if (!val) return;
    const newProcs = [...procs, { nome: val, realizado: false }];
    dispatch({ type: 'UPDATE_PROCS_SLOT', payload: { agKey, horario, procedimentosRealizados: newProcs } });
    e.target.value = '';
  }

  function toggleProc(idx, checked) {
    const newProcs = procs.map((pr, i) => i === idx ? { ...pr, realizado: checked } : pr);
    dispatch({ type: 'UPDATE_PROCS_SLOT', payload: { agKey, horario, procedimentosRealizados: newProcs } });
  }

  function remProc(idx) {
    const newProcs = procs.filter((_, i) => i !== idx);
    dispatch({ type: 'UPDATE_PROCS_SLOT', payload: { agKey, horario, procedimentosRealizados: newProcs } });
  }

  function handleImgs(e) {
    const files = Array.from(e.target.files);
    let done = 0;
    const newImgs = [...imagens];
    files.forEach(f => {
      const rd = new FileReader();
      rd.onload = ev => {
        newImgs.push({ name: f.name, data: ev.target.result, dt: new Date().toISOString() });
        done++;
        if (done === files.length) {
          dispatch({ type: 'UPDATE_IMGS_SLOT', payload: { agKey, horario, imagens: newImgs } });
        }
      };
      rd.readAsDataURL(f);
    });
    e.target.value = '';
  }

  function remImg(idx) {
    const newImgs = imagens.filter((_, i) => i !== idx);
    dispatch({ type: 'UPDATE_IMGS_SLOT', payload: { agKey, horario, imagens: newImgs } });
  }

  return (
    <div className="mpront-ov open" onClick={e => e.target === e.currentTarget && fechar()}>
      <div className="mpront-box">
        <div className="mpront-head">
          <div className="mpront-head-info">
            <h2>{nome || 'Prontuário'}</h2>
            <div className="mpront-head-meta">
              {wpp && <span>📱 {wpp}</span>}
              {tipo && <span>🏷️ {tipo}</span>}
              {orig && <span>📍 {orig}</span>}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'.7rem'}}>
            <span className="mpront-badge">PRONTUÁRIO</span>
            <button className="mpront-close" onClick={fechar}>✕</button>
          </div>
        </div>

        <div className="mpront-body">
          {/* BARRA DE SALVAR */}
          <div style={{display:'flex',alignItems:'center',gap:'.8rem',padding:'.2rem 0 .6rem'}}>
            <button className="btsv" onClick={salvarProntuario} style={{opacity:cliente.id?1:.55}}>
              💾 Salvar prontuário
            </button>
            {dirty && <span style={{fontSize:11,color:'#E65100',fontWeight:700}}>alterações não salvas</span>}
            {!cliente.id && <span style={{fontSize:11,color:'var(--cinza-cl)'}}>paciente não cadastrado — salve-o em Pacientes primeiro</span>}
          </div>

          {/* SAÚDE GERAL */}
          <div className="mpront-sec">
            <div className="mpront-sec-title">🩺 Saúde Geral</div>
            <div className="mpront-sec-body mpront-g2">
              <PInput label="Alergias" value={pront.alergias} onChange={v => setP('alergias', v)} placeholder="Ex: Penicilina..." />
              <PInput label="Doenças sistêmicas" value={pront.doencas} onChange={v => setP('doencas', v)} placeholder="Ex: Diabetes..." />
              <PInput label="Medicamentos em uso" value={pront.medicamentos} onChange={v => setP('medicamentos', v)} placeholder="Ex: Metformina..." />
              <PSelect label="Gestante / Amamentando" value={pront.gestante} onChange={v => setP('gestante', v)} options={['Não','Gestante','Amamentando']} />
            </div>
          </div>

          {/* HISTÓRICO */}
          <div className="mpront-sec">
            <div className="mpront-sec-title">📋 Histórico Odontológico</div>
            <div className="mpront-sec-body mpront-g2">
              <PInput label="Último tratamento" value={pront.ulttrat} onChange={v => setP('ulttrat', v)} placeholder="Ex: Canal — há 2 anos..." />
              <PSelect label="Medo / Ansiedade" value={pront.medo} onChange={v => setP('medo', v)} options={['Nenhum','Leve','Moderado','Intenso']} />
              <PSelect label="Já fez extração?" value={pront.extracao} onChange={v => setP('extracao', v)} options={['Não','Sim']} />
              <PSelect label="Implante / Ortodontia anterior" value={pront.implante} onChange={v => setP('implante', v)} options={['Nenhum','Implante','Ortodontia','Ambos']} />
            </div>
          </div>

          {/* AVALIAÇÃO CLÍNICA */}
          <div className="mpront-sec">
            <div className="mpront-sec-title">🦷 Avaliação Clínica</div>
            <div className="mpront-sec-body mpront-g3">
              <PInput label="Queixa principal" value={pront.queixa} onChange={v => setP('queixa', v)} placeholder="Ex: Dor no molar..." />
              <PSelect label="Condição periodontal" value={pront.perio} onChange={v => setP('perio', v)} options={['Saudável','Gengivite','Periodontite leve','Periodontite severa']} />
              <PSelect label="Higiene bucal" value={pront.higiene} onChange={v => setP('higiene', v)} options={['Boa','Regular','Ruim']} />
              <PSelect label="Bruxismo / Apertamento" value={pront.bruxismo} onChange={v => setP('bruxismo', v)} options={['Não','Bruxismo noturno','Apertamento diurno','Ambos']} span={3} />
            </div>
          </div>

          {/* PLANO */}
          <div className="mpront-sec">
            <div className="mpront-sec-title">📅 Plano de Tratamento</div>
            <div className="mpront-sec-body mpront-g3">
              <PInput label="Tratamento em andamento" value={pront.tratamento} onChange={v => setP('tratamento', v)} placeholder="Ex: Clareamento..." />
              <PInput label="Próximo procedimento" value={pront.proximo} onChange={v => setP('proximo', v)} placeholder="Ex: Restauração..." />
              <PInput label="Nº de sessões previstas" value={pront.sessoes} onChange={v => setP('sessoes', v)} placeholder="Ex: 4" />
            </div>
          </div>

          {/* OBS CLÍNICAS */}
          <div className="mpront-sec">
            <div className="mpront-sec-title">📝 Observações Clínicas</div>
            <div className="mpront-sec-body">
              <div className="mpront-item">
                <textarea
                  className="inf"
                  rows="3"
                  style={{width:'100%',height:70,resize:'vertical'}}
                  placeholder="Anotações livres do dentista..."
                  value={pront.obscli || ''}
                  onChange={e => setP('obscli', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* PROCEDIMENTOS NECESSÁRIOS */}
          <div className="mpront-sec">
            <div className="mpront-sec-title"><i className="ti ti-clipboard-list"></i> Procedimentos necessários</div>
            <div style={{padding:'1rem 1.1rem'}}>
              {procs.length === 0 && <p style={{fontSize:12,color:'#999',margin:'.3rem 0'}}>Nenhum procedimento adicionado.</p>}
              {procs.map((pr, i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:'.5rem',padding:'.35rem 0',borderBottom:'1px solid #f0f0f0'}}>
                  <input type="checkbox" checked={pr.realizado || false} onChange={e => toggleProc(i, e.target.checked)} style={{accentColor:'var(--v2)'}}/>
                  <span style={{flex:1,fontSize:13,textDecoration:pr.realizado?'line-through':'none',color:pr.realizado?'#aaa':'inherit'}}>{pr.nome}</span>
                  <button onClick={() => remProc(i)} style={{background:'none',border:'none',color:'#e57373',cursor:'pointer',fontSize:15}}>✕</button>
                </div>
              ))}
              <div className="fgg" style={{marginTop:'.7rem'}}>
                <label>Adicionar Procedimento</label>
                <select className="inf" onChange={addProc} defaultValue="">
                  <option value="">Selecione...</option>
                  {procNames.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* IMAGENS */}
          <div className="mpront-sec">
            <div className="mpront-sec-title"><i className="ti ti-photo"></i> IMAGENS E ANEXOS</div>
            <div style={{padding:'1rem 1.1rem'}}>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={handleImgs}/>
              <button className="btsv" onClick={() => fileRef.current.click()}><i className="ti ti-upload"></i> Anexar Imagem</button>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:'.7rem',marginTop:'.9rem'}}>
                {imagens.map((img, i) => (
                  <div key={i} style={{position:'relative',borderRadius:8,overflow:'hidden',cursor:'pointer',aspectRatio:'1',background:'#f5f5f5'}}>
                    <img src={img.data} style={{width:'100%',height:'100%',objectFit:'cover'}} onClick={() => setImgPreview(img.data)} alt=""/>
                    <button onClick={() => remImg(i)} style={{position:'absolute',top:2,right:2,background:'rgba(0,0,0,.6)',color:'#fff',border:'none',borderRadius:'50%',width:18,height:18,fontSize:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ATUALIZAÇÕES */}
          <div className="mpront-atualiz">
            <div className="mpront-atualiz-title">
              ✏️ Atualizações do Tratamento
              <span>Registre aqui a evolução de cada consulta</span>
            </div>
            <div className="mpront-atualiz-body">
              {atualizacoes.length > 0 && (
                <div className="atualiz-hist">
                  {atualizacoes.map((a, i) => (
                    <div key={i} className="atualiz-entry">
                      <button className="atualiz-entry-del" onClick={() => delAtualiz(i)}>✕</button>
                      <div className="atualiz-entry-date">{a.data}</div>
                      <div className="atualiz-entry-text">{a.texto}</div>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                className="atualiz-textarea"
                placeholder="Digite aqui uma atualização do tratamento..."
                value={novaAtualiz}
                onChange={e => setNovaAtualiz(e.target.value)}
              />
              <div style={{display:'flex',alignItems:'center',gap:'.8rem'}}>
                <button className="btn-salvar-atualiz" onClick={salvarAtualiz}>💾 Registrar atualização</button>
                <span style={{fontSize:10,color:'var(--cinza-cl)'}}>A data é inserida automaticamente</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {imgPreview && (
        <div className="img-modal-ov" onClick={() => setImgPreview(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:800,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{position:'relative',maxWidth:'90vw',maxHeight:'90vh'}}>
            <img src={imgPreview} style={{maxWidth:'90vw',maxHeight:'85vh',borderRadius:12,display:'block'}} alt=""/>
            <button onClick={() => setImgPreview(null)} style={{position:'absolute',top:-14,right:-14,background:'#fff',border:'none',width:32,height:32,borderRadius:'50%',cursor:'pointer',fontSize:16,boxShadow:'0 2px 8px rgba(0,0,0,.3)'}}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
