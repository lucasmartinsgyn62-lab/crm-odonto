import { useState, useRef } from 'react';
import { useCRM } from '../../context/CRMContext';
import { AREAS_LIST, AREAS_PRECOS } from '../../constants';

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function nowStr() {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function PVal({ val, destaque }) {
  const vazio = !val || val === '—';
  return (
    <div className={`pval${vazio ? ' vazio' : ''}${destaque ? ' destaque' : ''}`}>
      {vazio ? '—' : val}
    </div>
  );
}

export default function ProntuarioModal() {
  const { prontuarioModal, setProntuarioModal, state, dispatch, showToast } = useCRM();
  const [novaAtualiz, setNovaAtualiz] = useState('');
  const [imgPreview, setImgPreview] = useState(null);
  const fileRef = useRef(null);

  if (!prontuarioModal) return null;
  const { agKey, horario } = prontuarioModal;

  const slot = state.agenda[agKey]?.[horario] || {};
  const nome = slot.nome || '';
  const wpp = slot.wpp || '';
  const tipo = slot.tipo || '';
  const orig = slot.orig || '';
  const atualizacoes = slot.atualizacoes || [];
  const procs = slot.procedimentosRealizados || [];
  const imagens = slot.imagens || [];

  // Find client prontuario
  const cliente = state.clientes.find(c => c.nome === nome) || {};
  const p = cliente.prontuario || {};

  function fechar() {
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
    const newProcs = [...procs, { nome: val, preco: AREAS_PRECOS[val] || 0, realizado: false }];
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
          {/* SAÚDE GERAL */}
          <div className="mpront-sec">
            <div className="mpront-sec-title">🩺 Saúde Geral</div>
            <div className="mpront-sec-body mpront-g2">
              <div className="mpront-item"><label>Alergias</label><PVal val={p.alergias}/></div>
              <div className="mpront-item"><label>Doenças sistêmicas</label><PVal val={p.doencas}/></div>
              <div className="mpront-item"><label>Medicamentos em uso</label><PVal val={p.medicamentos}/></div>
              <div className="mpront-item"><label>Gestante / Amamentando</label><PVal val={p.gestante}/></div>
            </div>
          </div>

          {/* HISTÓRICO */}
          <div className="mpront-sec">
            <div className="mpront-sec-title">📋 Histórico Odontológico</div>
            <div className="mpront-sec-body mpront-g2">
              <div className="mpront-item"><label>Último tratamento</label><PVal val={p.ulttrat}/></div>
              <div className="mpront-item"><label>Medo / Ansiedade</label><PVal val={p.medo}/></div>
              <div className="mpront-item"><label>Já fez extração?</label><PVal val={p.extracao}/></div>
              <div className="mpront-item"><label>Implante / Ortodontia anterior</label><PVal val={p.implante}/></div>
            </div>
          </div>

          {/* AVALIAÇÃO CLÍNICA */}
          <div className="mpront-sec">
            <div className="mpront-sec-title">🦷 Avaliação Clínica</div>
            <div className="mpront-sec-body mpront-g3">
              <div className="mpront-item"><label>Queixa principal</label><PVal val={p.queixa}/></div>
              <div className="mpront-item"><label>Condição periodontal</label><PVal val={p.perio}/></div>
              <div className="mpront-item"><label>Higiene bucal</label><PVal val={p.higiene}/></div>
              <div className="mpront-item" style={{gridColumn:'span 3'}}><label>Bruxismo / Apertamento</label><PVal val={p.bruxismo}/></div>
            </div>
          </div>

          {/* PLANO */}
          <div className="mpront-sec">
            <div className="mpront-sec-title">📅 Plano de Tratamento</div>
            <div className="mpront-sec-body mpront-g3">
              <div className="mpront-item"><label>Tratamento em andamento</label><PVal val={p.tratamento}/></div>
              <div className="mpront-item"><label>Próximo procedimento</label><PVal val={p.proximo}/></div>
              <div className="mpront-item"><label>Nº de sessões previstas</label><PVal val={p.sessoes}/></div>
            </div>
          </div>

          {/* OBS CLÍNICAS */}
          {p.obscli && (
            <div className="mpront-sec">
              <div className="mpront-sec-title">📝 Observações Clínicas</div>
              <div className="mpront-sec-body">
                <div className="mpront-item">
                  <div className="pval" style={{whiteSpace:'pre-wrap',lineHeight:1.7,minHeight:36}}>{p.obscli}</div>
                </div>
              </div>
            </div>
          )}

          {/* PROCEDIMENTOS DO DIA */}
          <div className="mpront-sec">
            <div className="mpront-sec-title"><i className="ti ti-clipboard-list"></i> PROCEDIMENTOS DO DIA</div>
            <div style={{padding:'1rem 1.1rem'}}>
              {procs.length === 0 && <p style={{fontSize:12,color:'#999',margin:'.3rem 0'}}>Nenhum procedimento adicionado.</p>}
              {procs.map((pr, i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:'.5rem',padding:'.35rem 0',borderBottom:'1px solid #f0f0f0'}}>
                  <input type="checkbox" checked={pr.realizado || false} onChange={e => toggleProc(i, e.target.checked)} style={{accentColor:'var(--v2)'}}/>
                  <span style={{flex:1,fontSize:13,textDecoration:pr.realizado?'line-through':'none',color:pr.realizado?'#aaa':'inherit'}}>{pr.nome}</span>
                  <span style={{fontSize:12,color:'var(--v2)',fontWeight:700}}>R$ {(pr.preco||0).toFixed(2)}</span>
                  <button onClick={() => remProc(i)} style={{background:'none',border:'none',color:'#e57373',cursor:'pointer',fontSize:15}}>✕</button>
                </div>
              ))}
              <div className="fgg" style={{marginTop:'.7rem'}}>
                <label>Adicionar Procedimento</label>
                <select className="inf" onChange={addProc} defaultValue="">
                  <option value="">Selecione...</option>
                  {AREAS_LIST.map(a => <option key={a} value={a}>{a}</option>)}
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
