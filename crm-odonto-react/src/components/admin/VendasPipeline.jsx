import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useCRM } from '../../context/CRMContext';

const DEFAULT_COLS = [
  { nome:'🎯 LEADS',           cor:'#1565C0', ordem:0 },
  { nome:'📞 CONTATO FEITO',   cor:'#0288D1', ordem:1 },
  { nome:'🦷 CONSULTA AGENDADA',cor:'#7B1FA2', ordem:2 },
  { nome:'💰 PROPOSTA ENVIADA', cor:'#E65100', ordem:3 },
  { nome:'✅ FECHADO',          cor:'#2E7D32', ordem:4 },
  { nome:'❌ PERDIDO',          cor:'#C62828', ordem:5 },
];

const DEF_CARD = { nome:'', telefone:'', email:'', valor:'', responsavel:'', origem:'Instagram', anotacoes:'' };
const ORIGENS = ['Instagram','Indicação','WhatsApp','Google','Outro'];

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

function fmtR(v) { return v ? 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 }) : '—'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('pt-BR') : '—'; }

export default function VendasPipeline() {
  const { usuario, showToast } = useCRM();
  const tenantId = usuario?.tenant_id;

  const [cols, setCols]           = useState([]);
  const [cards, setCards]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [initError, setInitError] = useState('');

  // Drag
  const dragId = useRef(null);
  const [dragOver, setDragOver]   = useState(null);

  // Modals
  const [modal, setModal]         = useState(null);   // null | card object (view/edit)
  const [addCol, setAddCol]       = useState(false);  // add column input visible
  const [newColName, setNewColName] = useState('');
  const [editColId, setEditColId] = useState(null);   // inline rename
  const [editColName, setEditColName] = useState('');
  const [addCardCol, setAddCardCol] = useState(null); // coluna_id for new card modal
  const [cardForm, setCardForm]   = useState(DEF_CARD);
  const [cardSaving, setCardSaving] = useState(false);

  // Import leads
  const fileRef     = useRef(null);
  const [rawLeads, setRawLeads]   = useState(null);

  // ── Load data ──────────────────────────────────────────────
  useEffect(() => { if (tenantId) init(); }, [tenantId]);

  async function init() {
    setLoading(true);
    const { data:dbCols, error } = await supabase.from('pipeline_colunas').select('*').order('ordem');
    if (error) {
      setInitError(`${error.code || ''} — ${error.message}`);
      setSetupNeeded(true);
      setLoading(false);
      return;
    }
    if (dbCols?.length) {
      setCols(dbCols);
    } else {
      const toInsert = DEFAULT_COLS.map(c => ({ ...c, tenant_id:tenantId }));
      const { data:created } = await supabase.from('pipeline_colunas').insert(toInsert).select();
      setCols((created||[]).sort((a,b)=>a.ordem-b.ordem));
    }
    const { data:dbCards } = await supabase.from('pipeline_cards').select('*').order('created_at');
    setCards(dbCards||[]);
    setLoading(false);
  }

  // ── Computed metrics ──────────────────────────────────────
  const total      = cards.length;
  const valorTotal = cards.reduce((s,c) => s + (Number(c.valor)||0), 0);
  const fechados   = cards.filter(c => {
    const col = cols.find(x=>x.id===c.coluna_id);
    return col?.nome?.includes('FECHADO');
  }).length;
  const taxa       = total ? Math.round((fechados/total)*100) : 0;
  const agora      = Date.now();
  const novos7d    = cards.filter(c => agora - new Date(c.created_at).getTime() < 7*86400*1000).length;

  // ── Drag & Drop ───────────────────────────────────────────
  function onDragStart(e, cardId) {
    dragId.current = cardId;
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e, colId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(colId);
  }

  async function onDrop(e, colId) {
    e.preventDefault();
    setDragOver(null);
    const id = dragId.current;
    if (!id || cards.find(c=>c.id===id)?.coluna_id === colId) return;
    setCards(p => p.map(c => c.id===id ? {...c, coluna_id:colId} : c));
    await supabase.from('pipeline_cards').update({ coluna_id:colId, updated_at:new Date().toISOString() }).eq('id', id);
    dragId.current = null;
  }

  // ── Column CRUD ───────────────────────────────────────────
  async function addColumn() {
    if (!newColName.trim()) return;
    const ordem = cols.length;
    const { data, error } = await supabase.from('pipeline_colunas').insert({ tenant_id:tenantId, nome:newColName.trim(), cor:'#7C3AED', ordem }).select().single();
    if (error) { showToast('Erro: '+error.message,'error'); return; }
    setCols(p=>[...p,data]);
    setNewColName(''); setAddCol(false);
  }

  async function renameCol(id) {
    if (!editColName.trim()) return;
    await supabase.from('pipeline_colunas').update({ nome:editColName.trim() }).eq('id',id);
    setCols(p=>p.map(c=>c.id===id?{...c,nome:editColName.trim()}:c));
    setEditColId(null);
  }

  async function deleteCol(id) {
    const qty = cards.filter(c=>c.coluna_id===id).length;
    if (!confirm(`Excluir coluna? ${qty>0?`(${qty} card(s) serão perdidos)`:''}`.trim())) return;
    await supabase.from('pipeline_cards').delete().eq('coluna_id',id);
    await supabase.from('pipeline_colunas').delete().eq('id',id);
    setCols(p=>p.filter(c=>c.id!==id));
    setCards(p=>p.filter(c=>c.coluna_id!==id));
  }

  // ── Card CRUD ─────────────────────────────────────────────
  async function salvarCard() {
    if (!cardForm.nome.trim()) { showToast('Nome obrigatório','warning'); return; }
    setCardSaving(true);
    const payload = { ...cardForm, valor: cardForm.valor === '' ? null : Number(cardForm.valor) };
    if (modal?.id) {
      // Editar
      const { error } = await supabase.from('pipeline_cards').update({ ...payload, updated_at:new Date().toISOString() }).eq('id',modal.id);
      if (!error) { setCards(p=>p.map(c=>c.id===modal.id?{...c,...payload}:c)); showToast('✔ Card atualizado!','success'); setModal(null); }
      else showToast('Erro: '+error.message,'error');
    } else {
      // Criar
      const { data, error } = await supabase.from('pipeline_cards').insert({ ...payload, tenant_id:tenantId, coluna_id:addCardCol, created_at:new Date().toISOString(), updated_at:new Date().toISOString() }).select().single();
      if (!error) { setCards(p=>[...p,data]); showToast('✔ Card adicionado!','success'); setAddCardCol(null); setCardForm(DEF_CARD); }
      else showToast('Erro: '+error.message,'error');
    }
    setCardSaving(false);
  }

  async function deletarCard(id) {
    if (!confirm('Excluir este card?')) return;
    await supabase.from('pipeline_cards').delete().eq('id',id);
    setCards(p=>p.filter(c=>c.id!==id));
    setModal(null);
  }

  // ── Import Leads XLS ─────────────────────────────────────
  async function handleImportLeads(e) {
    const file = e.target.files[0]; if (!file) return;
    try {
      const XLSX = await loadXLSX();
      const wb   = XLSX.read(await file.arrayBuffer(), {type:'array'});
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:''});
      const parsed = rows.map(r => {
        const keys = Object.keys(r);
        const find = re => String(r[keys.find(k=>re.test(k))??'']??'').trim();
        return {
          nome:       find(/nome/i),
          telefone:   find(/tel|fone|whats|phone/i).replace(/\D/g,''),
          email:      find(/email/i),
          valor:      find(/valor|price/i).replace(/[^\d.,]/g,'').replace(',','.') || '',
          origem:     find(/origem|source/i) || 'Instagram',
          responsavel:find(/respons|agent/i),
        };
      }).filter(r=>r.nome&&r.telefone);
      setRawLeads(parsed);
    } catch { showToast('Erro ao ler arquivo XLS','error'); }
    e.target.value='';
  }

  async function confirmarLeads() {
    // Verificar duplicatas por telefone
    const existing = new Set(cards.map(c=>c.telefone));
    const dupes    = rawLeads.filter(r=>existing.has(r.telefone));
    if (dupes.length && !confirm(`${dupes.length} contato(s) já existem no funil (mesmo telefone). Importar mesmo assim?`)) return;
    const leadsCol = cols.find(c=>/LEADS/i.test(c.nome)) || cols[0];
    const toInsert = rawLeads.map(r=>({ ...DEF_CARD, ...r, tenant_id:tenantId, coluna_id:leadsCol.id, created_at:new Date().toISOString(), updated_at:new Date().toISOString() }));
    const { data, error } = await supabase.from('pipeline_cards').insert(toInsert).select();
    if (error) { showToast('Erro: '+error.message,'error'); return; }
    setCards(p=>[...p,...(data||[])]);
    showToast(`✔ ${data.length} lead(s) importado(s)!`,'success');
    setRawLeads(null);
  }

  // ── Render ────────────────────────────────────────────────
  if (loading) return <div style={{padding:'3rem',textAlign:'center',color:'var(--cinza)'}}>Carregando pipeline…</div>;

  if (setupNeeded) return (
    <div className="fp" style={{maxWidth:700}}>
      <h3 style={{color:'#c62828'}}>⚠️ Erro ao carregar o Pipeline</h3>

      {initError && (
        <div style={{background:'#fff3cd',border:'1px solid #ffc107',borderRadius:'var(--r)',padding:'.85rem 1rem',marginBottom:'1rem',fontSize:12,fontFamily:'monospace',wordBreak:'break-all'}}>
          <strong>Erro Supabase:</strong> {initError}
        </div>
      )}

      <div style={{background:'var(--b2)',borderRadius:'var(--r)',padding:'1rem',marginBottom:'1.2rem',fontSize:13,lineHeight:1.8}}>
        <div style={{fontWeight:700,marginBottom:'.5rem'}}>Verifique as causas abaixo em ordem:</div>
        <ol style={{paddingLeft:'1.2rem',color:'var(--cinza)',margin:0}}>
          <li><strong>Tabelas não criadas</strong> — rode o SQL abaixo no Supabase SQL Editor</li>
          <li><strong>Schema cache desatualizado</strong> — após criar as tabelas, vá em <strong>Supabase → Settings → API → Reload schema cache</strong></li>
          <li><strong>RLS bloqueando</strong> — certifique-se de estar logado com um usuário que tenha <code>tenant_id</code> válido</li>
        </ol>
      </div>

      <p style={{fontSize:12,color:'var(--cinza)',marginBottom:'.75rem',fontWeight:700}}>SQL para executar no Supabase → SQL Editor:</p>
      <div style={{background:'#1e1e2e',borderRadius:'var(--r)',padding:'1.2rem',fontSize:11,fontFamily:'monospace',color:'#cdd6f4',lineHeight:1.8,overflowX:'auto',marginBottom:'1rem',whiteSpace:'pre'}}>
{`create table if not exists pipeline_colunas (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid references tenants(id) on delete cascade,
  nome       text,
  cor        text,
  ordem      int,
  created_at timestamptz default now()
);
alter table pipeline_colunas enable row level security;
create policy "pc_tenant" on pipeline_colunas
  for all using (tenant_id = get_my_tenant());

create table if not exists pipeline_cards (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references tenants(id) on delete cascade,
  coluna_id   uuid references pipeline_colunas(id) on delete cascade,
  nome        text,
  telefone    text,
  email       text,
  valor       numeric,
  responsavel text,
  origem      text,
  anotacoes   text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table pipeline_cards enable row level security;
create policy "pca_tenant" on pipeline_cards
  for all using (tenant_id = get_my_tenant());`}
      </div>
      <button className="btn-salvar-atualiz" onClick={()=>{setSetupNeeded(false);setLoading(true);init();}}>
        🔄 Tentar novamente
      </button>
    </div>
  );

  const leadsColId = (cols.find(c=>/LEADS/i.test(c.nome))||cols[0])?.id;

  return (
    <div>
      {/* Métricas */}
      <div className="kr kr4" style={{marginBottom:'1.5rem'}}>
        <div className="kc">
          <div className="kl">Leads no Funil</div>
          <div className="kv" style={{color:'var(--v2)'}}>{total}</div>
          <div className="ks">total de cards</div>
        </div>
        <div className="kc">
          <div className="kl">Valor em Negociação</div>
          <div className="kv" style={{color:'var(--v2)',fontSize:18}}>{fmtR(valorTotal)}</div>
          <div className="ks">soma de todos os cards</div>
        </div>
        <div className="kc verde">
          <div className="kl">Taxa de Conversão</div>
          <div className="kv">{taxa}%</div>
          <div className="ks">fechados / total</div>
        </div>
        <div className="kc">
          <div className="kl">Últimos 7 Dias</div>
          <div className="kv">{novos7d}</div>
          <div className="ks">leads adicionados</div>
        </div>
      </div>

      {/* Preview importação */}
      {rawLeads && (
        <div className="fp" style={{marginBottom:'1rem'}}>
          <h3 style={{color:'var(--v2)'}}>Preview — {rawLeads.length} lead(s) encontrado(s)</h3>
          <div style={{maxHeight:200,overflowY:'auto',border:'1px solid var(--borda)',borderRadius:'var(--r)',marginBottom:'1rem'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:'var(--b2)'}}>
                {['Nome','Telefone','E-mail','Valor','Origem'].map(h=><th key={h} style={{padding:'.4rem .7rem',textAlign:'left',fontWeight:700,borderBottom:'1px solid var(--borda)'}}>{h}</th>)}
              </tr></thead>
              <tbody>{rawLeads.slice(0,20).map((r,i)=>(
                <tr key={i} style={{borderBottom:'1px solid var(--borda)'}}>
                  <td style={{padding:'.35rem .7rem',fontWeight:600}}>{r.nome}</td>
                  <td style={{padding:'.35rem .7rem'}}>{r.telefone}</td>
                  <td style={{padding:'.35rem .7rem',color:'var(--cinza)'}}>{r.email||'—'}</td>
                  <td style={{padding:'.35rem .7rem'}}>{r.valor?fmtR(r.valor):'—'}</td>
                  <td style={{padding:'.35rem .7rem'}}>{r.origem}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{display:'flex',gap:'.75rem'}}>
            <button className="btn-salvar-atualiz" onClick={confirmarLeads}>✔ Importar para LEADS</button>
            <button className="btn-pront" onClick={()=>setRawLeads(null)}>✕ Cancelar</button>
          </div>
        </div>
      )}

      {/* Kanban */}
      <div style={{display:'flex',gap:'1rem',overflowX:'auto',paddingBottom:'1rem',alignItems:'flex-start'}}>
        {cols.map(col => {
          const colCards = cards.filter(c=>c.coluna_id===col.id);
          const colValor = colCards.reduce((s,c)=>s+(Number(c.valor)||0),0);
          const isOver   = dragOver===col.id;

          return (
            <div key={col.id}
              onDragOver={e=>onDragOver(e,col.id)}
              onDrop={e=>onDrop(e,col.id)}
              onDragLeave={()=>setDragOver(null)}
              style={{
                minWidth:240,maxWidth:260,flexShrink:0,
                background:isOver?'#e3f2fd':'var(--b2)',
                border:`2px solid ${isOver?'var(--v2)':'var(--borda)'}`,
                borderRadius:'var(--r)',padding:'.75rem',
                transition:'border-color .15s, background .15s',
              }}>
              {/* Cabeçalho da coluna */}
              <div style={{marginBottom:'.6rem'}}>
                <div style={{display:'flex',alignItems:'center',gap:'.4rem',marginBottom:'.25rem'}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:col.cor,flexShrink:0}} />
                  {editColId===col.id
                    ? <input autoFocus className="inf" value={editColName} style={{flex:1,padding:'.25rem .4rem',fontSize:12}}
                        onChange={e=>setEditColName(e.target.value)}
                        onBlur={()=>renameCol(col.id)}
                        onKeyDown={e=>{if(e.key==='Enter')renameCol(col.id);if(e.key==='Escape')setEditColId(null);}} />
                    : <div style={{flex:1,fontWeight:700,fontSize:12,cursor:'pointer'}} onClick={()=>{setEditColId(col.id);setEditColName(col.nome);}} title="Clique para renomear">{col.nome}</div>
                  }
                  <button style={{background:'none',border:'none',cursor:'pointer',color:'#c62828',fontSize:12,flexShrink:0,padding:'0 2px'}} onClick={()=>deleteCol(col.id)} title="Excluir coluna">✕</button>
                </div>
                <div style={{display:'flex',gap:'.5rem',fontSize:11,color:'var(--cinza)'}}>
                  <span style={{background:'#fff',border:'1px solid var(--borda)',borderRadius:10,padding:'0 .5rem',fontWeight:700}}>{colCards.length}</span>
                  {colValor>0&&<span style={{color:'var(--v2)',fontWeight:600}}>{fmtR(colValor)}</span>}
                </div>
              </div>

              {/* Importar leads (só na coluna LEADS) */}
              {col.id===leadsColId && (
                <div style={{marginBottom:'.5rem'}}>
                  <input ref={fileRef} type="file" accept=".xls,.xlsx" style={{display:'none'}} onChange={handleImportLeads} />
                  <button className="btn-pront" style={{width:'100%',justifyContent:'center',fontSize:11}} onClick={()=>fileRef.current?.click()}>
                    📂 Importar Leads XLS
                  </button>
                </div>
              )}

              {/* Cards */}
              <div style={{display:'grid',gap:'.4rem',minHeight:80}}>
                {colCards.map(card=>(
                  <div key={card.id}
                    draggable
                    onDragStart={e=>onDragStart(e,card.id)}
                    onClick={()=>{setModal(card);setCardForm({nome:card.nome,telefone:card.telefone,email:card.email||'',valor:card.valor||'',responsavel:card.responsavel||'',origem:card.origem||'Instagram',anotacoes:card.anotacoes||''});}}
                    style={{background:'#fff',border:'1px solid var(--borda)',borderRadius:8,padding:'.65rem .75rem',cursor:'grab',fontSize:12,boxShadow:'0 1px 4px rgba(0,0,0,.07)',transition:'box-shadow .15s'}}
                    onMouseEnter={e=>e.currentTarget.style.boxShadow='0 3px 10px rgba(0,0,0,.12)'}
                    onMouseLeave={e=>e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.07)'}
                  >
                    <div style={{fontWeight:700,marginBottom:'.2rem',color:'var(--preto)'}}>{card.nome}</div>
                    <div style={{color:'var(--cinza)',marginBottom:'.3rem'}}>{card.telefone}</div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'.3rem'}}>
                      {card.valor>0 && <span style={{fontWeight:700,color:'var(--v2)',fontSize:11}}>{fmtR(card.valor)}</span>}
                      {card.origem && <span style={{background:'var(--vc)',color:'var(--v2)',fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:10}}>{card.origem}</span>}
                    </div>
                    {card.responsavel && <div style={{fontSize:10,color:'var(--cinza-cl)',marginTop:'.2rem'}}>👤 {card.responsavel}</div>}
                  </div>
                ))}
              </div>

              {/* Botão adicionar card */}
              <button
                onClick={()=>{setAddCardCol(col.id);setCardForm(DEF_CARD);}}
                style={{width:'100%',marginTop:'.5rem',background:'none',border:'1.5px dashed var(--borda)',borderRadius:8,padding:'.5rem',fontSize:12,color:'var(--cinza)',cursor:'pointer',transition:'.15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.borderColor='var(--v3)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.borderColor='var(--borda)';}}
              >＋ Adicionar card</button>
            </div>
          );
        })}

        {/* Adicionar coluna */}
        <div style={{minWidth:200,flexShrink:0}}>
          {addCol
            ? (
              <div style={{background:'var(--b2)',border:'1px solid var(--borda)',borderRadius:'var(--r)',padding:'.75rem'}}>
                <input autoFocus className="inf" value={newColName} placeholder="Nome da coluna" style={{marginBottom:'.5rem'}}
                  onChange={e=>setNewColName(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter')addColumn();if(e.key==='Escape'){setAddCol(false);setNewColName('');}}} />
                <div style={{display:'flex',gap:'.4rem'}}>
                  <button className="btn-salvar-atualiz" style={{flex:1,fontSize:11}} onClick={addColumn}>✔ Criar</button>
                  <button className="btn-pront" style={{fontSize:11}} onClick={()=>{setAddCol(false);setNewColName('');}}>✕</button>
                </div>
              </div>
            ) : (
              <button
                onClick={()=>setAddCol(true)}
                style={{width:'100%',background:'rgba(0,0,0,.04)',border:'2px dashed var(--borda)',borderRadius:'var(--r)',padding:'1rem',fontSize:13,fontWeight:600,color:'var(--cinza)',cursor:'pointer',transition:'.15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='var(--b2)';e.currentTarget.style.borderColor='var(--v3)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,0,0,.04)';e.currentTarget.style.borderColor='var(--borda)';}}
              >＋ Adicionar Coluna</button>
            )
          }
        </div>
      </div>

      {/* ── Modal: Adicionar card ── */}
      {addCardCol && (
        <Overlay onClose={()=>setAddCardCol(null)}>
          <ModalBox title={`Novo card — ${cols.find(c=>c.id===addCardCol)?.nome}`} onClose={()=>setAddCardCol(null)}>
            <CardForm form={cardForm} setForm={setCardForm} />
            <div style={{display:'flex',gap:'.75rem',marginTop:'1rem'}}>
              <button className="btn-salvar-atualiz" onClick={salvarCard} disabled={cardSaving}>{cardSaving?'Salvando…':'➕ Adicionar'}</button>
              <button className="btn-pront" onClick={()=>setAddCardCol(null)}>Cancelar</button>
            </div>
          </ModalBox>
        </Overlay>
      )}

      {/* ── Modal: Ver / editar card ── */}
      {modal && !addCardCol && (
        <Overlay onClose={()=>setModal(null)}>
          <ModalBox title="Detalhes do Lead" onClose={()=>setModal(null)} wide>
            <CardForm form={cardForm} setForm={setCardForm} />
            <div style={{marginTop:'.75rem',padding:'.75rem',background:'var(--b2)',borderRadius:'var(--r)',fontSize:11,color:'var(--cinza)'}}>
              Criado em {fmtDate(modal.created_at)} · Atualizado em {fmtDate(modal.updated_at)}
            </div>
            <div style={{display:'flex',gap:'.75rem',marginTop:'1rem',flexWrap:'wrap'}}>
              <button className="btn-salvar-atualiz" onClick={salvarCard} disabled={cardSaving}>{cardSaving?'Salvando…':'💾 Salvar'}</button>
              <button className="btn-pront" onClick={()=>window.open('https://wa.me/'+modal.telefone,'_blank')}>📲 Enviar WhatsApp</button>
              <button className="btn-pront" style={{color:'#c62828',marginLeft:'auto'}} onClick={()=>deletarCard(modal.id)}>🗑 Excluir</button>
            </div>
          </ModalBox>
        </Overlay>
      )}
    </div>
  );
}

// ─── Helper components ─────────────────────────────────────────

function CardForm({ form, setForm }) {
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  return (
    <div style={{display:'grid',gap:'.6rem'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.6rem'}}>
        <div className="fgg"><label>Nome completo *</label><input className="inf" value={form.nome} placeholder="Nome" onChange={e=>set('nome',e.target.value)} /></div>
        <div className="fgg"><label>Telefone (com DDI)</label><input className="inf" value={form.telefone} placeholder="5562999990000" onChange={e=>set('telefone',e.target.value.replace(/\D/g,''))} /></div>
        <div className="fgg"><label>E-mail</label><input className="inf" type="email" value={form.email} placeholder="email@exemplo.com" onChange={e=>set('email',e.target.value)} /></div>
        <div className="fgg"><label>Valor do negócio (R$)</label><input className="inf" type="number" step="0.01" min="0" value={form.valor} placeholder="0,00" onChange={e=>set('valor',e.target.value)} /></div>
        <div className="fgg"><label>Responsável</label><input className="inf" value={form.responsavel} placeholder="Nome do dentista/atendente" onChange={e=>set('responsavel',e.target.value)} /></div>
        <div className="fgg"><label>Origem</label>
          <select className="inf" value={form.origem} onChange={e=>set('origem',e.target.value)}>
            {ORIGENS.map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div className="fgg"><label>Anotações / Histórico</label>
        <textarea className="inf" rows={4} value={form.anotacoes} style={{resize:'vertical',lineHeight:1.6}} placeholder="Observações, histórico de contato…" onChange={e=>set('anotacoes',e.target.value)} />
      </div>
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:800,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      {children}
    </div>
  );
}

function ModalBox({ title, onClose, children, wide }) {
  return (
    <div style={{background:'#fff',borderRadius:'var(--r)',boxShadow:'0 24px 60px rgba(0,0,0,.25)',width:'100%',maxWidth:wide?680:520,maxHeight:'90vh',overflowY:'auto',padding:'1.5rem',position:'relative'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.2rem'}}>
        <div style={{fontWeight:800,fontSize:15,color:'var(--v2)'}}>{title}</div>
        <button onClick={onClose} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'var(--cinza)',lineHeight:1}}>✕</button>
      </div>
      {children}
    </div>
  );
}
