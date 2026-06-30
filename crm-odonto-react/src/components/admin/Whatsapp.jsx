import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useCRM } from '../../context/CRMContext';

// ─── Constants ───────────────────────────────────────────────
const TABS = [
  { id: 'conexao',  label: '🔗 Conexão WhatsApp' },
  { id: 'ia',       label: '🤖 Configurar IA' },
  { id: 'automacao',label: '⚙️ Automação & Regras' },
  { id: 'disparo',  label: '📣 Disparo em Massa' },
  { id: 'followup', label: '🔄 Follow-up' },
];

const DEF_WP   = { phoneNumberId:'', wabaId:'', accessToken:'', verifyToken:'' };
const DEF_AI   = { openaiKey:'', model:'gpt-4o-mini', systemPrompt:'Você é a assistente virtual da clínica. Responda perguntas sobre agendamentos e tratamentos de forma simpática e profissional.', temperature:0.7, iaAtiva:false };
const DEF_AUTO = { responderForaHorario:false, responder24h:false, responderAusente:false, horarioInicio:'08:00', horarioFim:'18:00', mensagemFallback:'Não entendi sua mensagem. Em breve um atendente irá te ajudar! 😊', mensagemBoasVindas:'Olá! Seja bem-vindo(a)! Como posso te ajudar? 😊' };
const DEF_MSG  = { texto:'', delayDias:0, delayHoras:1 };

function loadXLSX() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) { resolve(window.XLSX); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js';
    s.onload  = () => resolve(window.XLSX);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function parseXLS(rows) {
  return rows.map(r => {
    const keys = Object.keys(r);
    const find = re => r[keys.find(k => re.test(k)) ?? ''] ?? '';
    const nome     = String(find(/nome/i)).trim();
    const telefone = String(find(/tel|fone|whats|phone/i)).replace(/\D/g,'');
    const email    = String(find(/email/i)).trim();
    const obs      = String(find(/obs|nota/i)).trim();
    return { nome, telefone, email, obs };
  }).filter(r => r.nome && r.telefone);
}

let _uid = 0;
function uid() { return ++_uid; }

// ─── Component ───────────────────────────────────────────────
export default function Whatsapp() {
  const { usuario, showToast } = useCRM();
  const tenantId = usuario?.tenant_id;
  const [tab, setTab]     = useState('conexao');
  const [saving, setSaving] = useState(false);

  // ── Tab 1 state
  const [wp, setWp]               = useState(DEF_WP);
  const [showToken, setShowToken] = useState(false);
  const [wpStatus, setWpStatus]   = useState(null);
  const [wpTesting, setWpTesting] = useState(false);

  // ── Tab 2 state
  const [ai, setAi]               = useState(DEF_AI);
  const [showKey, setShowKey]     = useState(false);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiResult, setAiResult]   = useState('');

  // ── Tab 3 state
  const [auto, setAuto]               = useState(DEF_AUTO);
  const [logs, setLogs]               = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // ── Tab 4 state (Disparo em Massa)
  const [contacts, setContacts]       = useState([]);
  const [rawImport4, setRawImport4]   = useState(null);
  const [selIds, setSelIds]           = useState(new Set());
  const [campaign, setCampaign]       = useState({ nome:'', mensagem:'' });
  const [sending, setSending]         = useState(false);
  const [sendProg, setSendProg]       = useState({ done:0, total:0, failed:0 });
  const [sendDone, setSendDone]       = useState(false);
  const [showAddC, setShowAddC]       = useState(false);
  const [newC, setNewC]               = useState({ nome:'', telefone:'', email:'' });

  // ── Tab 5 state (Follow-up)
  const [sequences, setSequences]     = useState([]);
  const [seqContacts, setSeqContacts] = useState([]);
  const [rawImport5, setRawImport5]   = useState(null);
  const [newSeq, setNewSeq]           = useState({ nome:'', stopOnReply:true, mensagens:[{...DEF_MSG}] });
  const [seqSaving, setSeqSaving]     = useState(false);
  const [seqEnvios, setSeqEnvios]     = useState({});
  const [showAddSeqC, setShowAddSeqC] = useState(false);
  const [newSeqC, setNewSeqC]         = useState({ nome:'', telefone:'' });

  const file4Ref = useRef(null);
  const file5Ref = useRef(null);

  // ── Load configs ──────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return;
    supabase.from('configuracoes').select('chave,valor')
      .in('chave', ['whatsapp_config','openai_config','automacao_config'])
      .then(({ data }) => {
        if (!data) return;
        data.forEach(r => {
          if (r.chave === 'whatsapp_config')  setWp(v  => ({...v, ...r.valor}));
          if (r.chave === 'openai_config')    setAi(v  => ({...v, ...r.valor}));
          if (r.chave === 'automacao_config') setAuto(v => ({...v, ...r.valor}));
        });
      });
  }, [tenantId]);

  useEffect(() => { if (tab === 'automacao' && tenantId) carregarLogs(); }, [tab, tenantId]);
  useEffect(() => { if (tab === 'followup'  && tenantId) loadSequences(); }, [tab, tenantId]);

  // ── Core functions ────────────────────────────────────────
  async function salvar(chave, valor) {
    setSaving(true);
    const { error } = await supabase.from('configuracoes').upsert(
      { tenant_id:tenantId, chave, valor, updated_at:new Date().toISOString() },
      { onConflict:'tenant_id,chave' }
    );
    setSaving(false);
    if (error) showToast('Erro: ' + error.message, 'error');
    else       showToast('✔ Salvo!', 'success');
  }

  async function testarWp() {
    if (!wp.phoneNumberId || !wp.accessToken) { showToast('Preencha Phone Number ID e Access Token','warning'); return; }
    setWpTesting(true); setWpStatus(null);
    try {
      const r = await fetch(`https://graph.facebook.com/v19.0/${wp.phoneNumberId}?access_token=${wp.accessToken}`);
      const j = await r.json();
      if (j.error) { setWpStatus('err'); showToast('Erro: '+j.error.message,'error'); }
      else          { setWpStatus('ok');  showToast('✔ Conexão bem-sucedida!','success'); }
    } catch { setWpStatus('err'); showToast('Erro de rede','error'); }
    setWpTesting(false);
  }

  async function testarAi() {
    if (!ai.openaiKey) { showToast('Informe a OpenAI API Key','warning'); return; }
    setAiTesting(true); setAiResult('');
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${ai.openaiKey}`},
        body:JSON.stringify({ model:ai.model, messages:[{role:'system',content:ai.systemPrompt},{role:'user',content:'Olá'}], temperature:parseFloat(ai.temperature), max_tokens:120 }),
      });
      const j = await r.json();
      if (j.error) showToast('Erro: '+j.error.message,'error');
      else { setAiResult(j.choices?.[0]?.message?.content||''); showToast('✔ IA respondeu!','success'); }
    } catch { showToast('Erro de rede','error'); }
    setAiTesting(false);
  }

  async function carregarLogs() {
    setLogsLoading(true);
    const { data } = await supabase.from('whatsapp_logs').select('*').order('created_at',{ascending:false}).limit(10);
    setLogs(data||[]);
    setLogsLoading(false);
  }

  function gerarVerifyToken() {
    const ch='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let t=''; for(let i=0;i<32;i++) t+=ch[Math.floor(Math.random()*ch.length)];
    setWp(p => ({...p, verifyToken:t}));
  }

  // ── Tab 4: Disparo em Massa ───────────────────────────────
  async function handleImport4(e) {
    const file = e.target.files[0]; if (!file) return;
    try {
      const XLSX = await loadXLSX();
      const wb   = XLSX.read(await file.arrayBuffer(), {type:'array'});
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:''});
      setRawImport4(parseXLS(rows));
    } catch { showToast('Erro ao ler arquivo','error'); }
    e.target.value='';
  }

  function confirmarImport4() {
    const novos = rawImport4.map(r => ({...r, _id:uid()}));
    setContacts(p => [...p, ...novos]);
    setSelIds(p => new Set([...p, ...novos.map(c=>c._id)]));
    setRawImport4(null);
  }

  function toggleSel(id) {
    setSelIds(p => { const s=new Set(p); s.has(id)?s.delete(id):s.add(id); return s; });
  }

  function adicionarManual() {
    if (!newC.nome.trim()||!newC.telefone.trim()) { showToast('Nome e Telefone obrigatórios','warning'); return; }
    const c = {...newC, _id:uid()};
    setContacts(p=>[...p,c]);
    setSelIds(p=>new Set([...p,c._id]));
    setNewC({nome:'',telefone:'',email:''});
    setShowAddC(false);
  }

  async function dispararCampanha() {
    const sel = contacts.filter(c=>selIds.has(c._id));
    if (!sel.length)              { showToast('Selecione contatos','warning'); return; }
    if (!campaign.mensagem.trim()){ showToast('Escreva a mensagem','warning'); return; }
    if (!wp.phoneNumberId||!wp.accessToken) { showToast('Configure credenciais WhatsApp primeiro','warning'); return; }
    setSending(true); setSendDone(false);
    setSendProg({done:0,total:sel.length,failed:0});
    for (const c of sel) {
      const msg = campaign.mensagem.replaceAll('{{nome}}',c.nome).replaceAll('{{telefone}}',c.telefone);
      let status='falhou', erro=null;
      try {
        const r = await fetch(`https://graph.facebook.com/v19.0/${wp.phoneNumberId}/messages`,{
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':`Bearer ${wp.accessToken}`},
          body:JSON.stringify({messaging_product:'whatsapp',to:c.telefone,type:'text',text:{body:msg}}),
        });
        const j = await r.json();
        if (j.error) erro=j.error.message; else status='enviado';
      } catch(err) { erro=String(err); }
      await supabase.from('disparos_massa').insert({
        tenant_id:tenantId, campanha:campaign.nome||'Sem nome',
        contato:c.nome, telefone:c.telefone, status,
        enviado_em:new Date().toISOString(), erro,
      });
      setSendProg(p=>({...p,done:p.done+1,failed:status==='falhou'?p.failed+1:p.failed}));
      await new Promise(r=>setTimeout(r,2000));
    }
    setSending(false); setSendDone(true);
  }

  const previewMsg = () => {
    const c = contacts.find(c=>selIds.has(c._id)) || {nome:'João',telefone:'5562999990000'};
    return campaign.mensagem.replaceAll('{{nome}}',c.nome).replaceAll('{{telefone}}',c.telefone);
  };

  // ── Tab 5: Follow-up ─────────────────────────────────────
  async function loadSequences() {
    const { data:seqs } = await supabase.from('followup_sequencias').select('*').order('created_at',{ascending:false});
    setSequences(seqs||[]);
    if (seqs?.length) {
      const { data:envs } = await supabase.from('followup_envios').select('sequencia_id,status').in('sequencia_id',seqs.map(s=>s.id));
      const grouped = {};
      (envs||[]).forEach(e => { (grouped[e.sequencia_id]??=[]).push(e); });
      setSeqEnvios(grouped);
    }
  }

  async function handleImport5(e) {
    const file = e.target.files[0]; if (!file) return;
    try {
      const XLSX = await loadXLSX();
      const wb   = XLSX.read(await file.arrayBuffer(), {type:'array'});
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:''});
      setRawImport5(parseXLS(rows));
    } catch { showToast('Erro ao ler arquivo','error'); }
    e.target.value='';
  }

  function confirmarImport5() {
    setSeqContacts(p=>[...p,...rawImport5.map(r=>({...r,_id:uid()}))]);
    setRawImport5(null);
  }

  function adicionarSeqContato() {
    if (!newSeqC.nome.trim()||!newSeqC.telefone.trim()) { showToast('Nome e Telefone obrigatórios','warning'); return; }
    setSeqContacts(p=>[...p,{...newSeqC,_id:uid()}]);
    setNewSeqC({nome:'',telefone:''});
    setShowAddSeqC(false);
  }

  function setMsgField(idx,field,val) {
    setNewSeq(s=>{ const m=[...s.mensagens]; m[idx]={...m[idx],[field]:val}; return {...s,mensagens:m}; });
  }

  async function ativarSequencia() {
    if (!newSeq.nome.trim())              { showToast('Dê um nome à sequência','warning'); return; }
    if (!seqContacts.length)             { showToast('Adicione contatos','warning'); return; }
    if (!newSeq.mensagens[0].texto.trim()){ showToast('Escreva ao menos a 1ª mensagem','warning'); return; }
    setSeqSaving(true);
    const { data:seq, error } = await supabase.from('followup_sequencias').insert({
      tenant_id:tenantId, nome:newSeq.nome, ativo:true,
      config:{ stopOnReply:newSeq.stopOnReply, mensagens:newSeq.mensagens },
    }).select().single();
    if (error) { showToast('Erro: '+error.message,'error'); setSeqSaving(false); return; }
    let delay = 0;
    const envios = [];
    newSeq.mensagens.filter(m=>m.texto.trim()).forEach((m,idx) => {
      delay += m.delayDias*24 + m.delayHoras;
      const agendado = new Date(Date.now()+delay*3600*1000).toISOString();
      seqContacts.forEach(c => envios.push({
        tenant_id:tenantId, sequencia_id:seq.id,
        contato:c.nome, telefone:c.telefone,
        etapa:idx+1, status:'agendado', agendado_para:agendado,
      }));
    });
    await supabase.from('followup_envios').insert(envios);
    showToast('✔ Sequência ativada!','success');
    setNewSeq({nome:'',stopOnReply:true,mensagens:[{...DEF_MSG}]});
    setSeqContacts([]);
    setSeqSaving(false);
    loadSequences();
  }

  async function pausarSeq(id, pause) {
    await supabase.from('followup_sequencias').update({ativo:!pause}).eq('id',id);
    showToast(pause?'Sequência pausada':'Sequência retomada','success');
    loadSequences();
  }

  async function encerrarSeq(id) {
    if (!confirm('Encerrar e cancelar todos os envios pendentes?')) return;
    await supabase.from('followup_sequencias').update({ativo:false}).eq('id',id);
    await supabase.from('followup_envios').update({status:'cancelado'}).eq('sequencia_id',id).eq('status','agendado');
    showToast('Sequência encerrada','warning');
    loadSequences();
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div>
      {/* Tab bar */}
      <div style={{display:'flex',gap:0,marginBottom:'1.5rem',borderBottom:'2px solid var(--borda)',flexWrap:'wrap'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            background:'none',border:'none',padding:'.6rem 1rem',fontSize:12.5,fontWeight:600,
            cursor:'pointer',marginBottom:'-2px',whiteSpace:'nowrap',
            borderBottom:tab===t.id?'2px solid var(--v2)':'2px solid transparent',
            color:tab===t.id?'var(--v2)':'var(--cinza)',transition:'color .15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══ ABA 1: Conexão ══════════════════════════════════ */}
      {tab==='conexao' && (
        <div className="fp" style={{maxWidth:680}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.3rem'}}>
            <h3 style={{margin:0,border:'none',padding:0}}>WhatsApp Business Cloud API</h3>
            {wpStatus==='ok'  && <span style={S.ok}>🟢 Conectado</span>}
            {wpStatus==='err' && <span style={S.err}>🔴 Falha</span>}
          </div>
          <p style={{fontSize:12,color:'var(--cinza)',marginBottom:'1.2rem'}}>Credenciais do Meta Developer Portal</p>
          <div className="gg2">
            <Fgg label="Phone Number ID">
              <input className="inf" value={wp.phoneNumberId} placeholder="123456789012345"
                onChange={e=>setWp(p=>({...p,phoneNumberId:e.target.value}))} />
            </Fgg>
            <Fgg label="WABA ID">
              <input className="inf" value={wp.wabaId} placeholder="987654321098765"
                onChange={e=>setWp(p=>({...p,wabaId:e.target.value}))} />
            </Fgg>
          </div>
          <Fgg label="Access Token (permanente)">
            <div style={{display:'flex',gap:'.5rem'}}>
              <input className="inf" type={showToken?'text':'password'} value={wp.accessToken} placeholder="EAAxxxxx…" style={{flex:1}}
                onChange={e=>setWp(p=>({...p,accessToken:e.target.value}))} />
              <button className="btn-pront" onClick={()=>setShowToken(!showToken)}>{showToken?'🙈 Ocultar':'👁 Ver'}</button>
            </div>
          </Fgg>
          <Fgg label="Webhook Verify Token">
            <div style={{display:'flex',gap:'.5rem'}}>
              <input className="inf" value={wp.verifyToken} placeholder="Token para webhook" style={{flex:1}}
                onChange={e=>setWp(p=>({...p,verifyToken:e.target.value}))} />
              <button className="btn-pront" onClick={gerarVerifyToken}>⚡ Gerar</button>
            </div>
            <span style={{fontSize:11,color:'var(--cinza-cl)'}}>Use ao configurar o webhook no Meta Developer Portal.</span>
          </Fgg>
          <div style={{display:'flex',gap:'.75rem',marginTop:'1.2rem'}}>
            <button className="btn-salvar-atualiz" onClick={testarWp} disabled={wpTesting}>{wpTesting?'Testando…':'🔌 Testar Conexão'}</button>
            <button className="btn-salvar-atualiz" onClick={()=>salvar('whatsapp_config',wp)} disabled={saving}>{saving?'Salvando…':'💾 Salvar'}</button>
          </div>
        </div>
      )}

      {/* ══ ABA 2: IA ═══════════════════════════════════════ */}
      {tab==='ia' && (
        <div className="fp" style={{maxWidth:680}}>
          <h3>Integração OpenAI</h3>
          <Fgg label="OpenAI API Key">
            <div style={{display:'flex',gap:'.5rem'}}>
              <input className="inf" type={showKey?'text':'password'} value={ai.openaiKey} placeholder="sk-…" style={{flex:1}}
                onChange={e=>setAi(p=>({...p,openaiKey:e.target.value}))} />
              <button className="btn-pront" onClick={()=>setShowKey(!showKey)}>{showKey?'🙈 Ocultar':'👁 Ver'}</button>
            </div>
          </Fgg>
          <div className="gg2">
            <Fgg label="Modelo">
              <select className="inf" value={ai.model} onChange={e=>setAi(p=>({...p,model:e.target.value}))}>
                <option value="gpt-4o">GPT-4o — Mais inteligente</option>
                <option value="gpt-4o-mini">GPT-4o Mini — Rápido e econômico</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo — Básico</option>
              </select>
            </Fgg>
            <Fgg label={`Temperatura: ${parseFloat(ai.temperature).toFixed(1)}`}>
              <input type="range" min="0" max="1" step="0.1" value={ai.temperature} style={{width:'100%',accentColor:'var(--v2)',marginTop:'.55rem'}}
                onChange={e=>setAi(p=>({...p,temperature:e.target.value}))} />
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--cinza-cl)'}}>
                <span>0.0 Preciso</span><span>1.0 Criativo</span>
              </div>
            </Fgg>
          </div>
          <Fgg label="Prompt do Sistema">
            <textarea className="inf" rows={5} value={ai.systemPrompt} style={{resize:'vertical',lineHeight:1.6}}
              placeholder="Como a IA deve se comportar ao responder pacientes…"
              onChange={e=>setAi(p=>({...p,systemPrompt:e.target.value}))} />
          </Fgg>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'.9rem 1rem',background:'var(--b2)',borderRadius:'var(--r)',marginBottom:'1rem'}}>
            <div>
              <div style={{fontWeight:700,fontSize:13}}>Automação de IA Ativa</div>
              <div style={{fontSize:11,color:'var(--cinza)'}}>Responder automaticamente no WhatsApp</div>
            </div>
            <Toggle value={ai.iaAtiva} onChange={v=>setAi(p=>({...p,iaAtiva:v}))} />
          </div>
          {aiResult && (
            <div style={{padding:'1rem',background:'var(--b2)',borderRadius:'var(--r)',borderLeft:'3px solid var(--v2)',marginBottom:'1rem'}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--v2)',marginBottom:'.4rem',textTransform:'uppercase',letterSpacing:.5}}>Resposta da IA (teste):</div>
              <div style={{fontSize:13,lineHeight:1.7}}>{aiResult}</div>
            </div>
          )}
          <div style={{display:'flex',gap:'.75rem'}}>
            <button className="btn-salvar-atualiz" onClick={testarAi} disabled={aiTesting}>{aiTesting?'Testando…':'🤖 Testar IA'}</button>
            <button className="btn-salvar-atualiz" onClick={()=>salvar('openai_config',ai)} disabled={saving}>{saving?'Salvando…':'💾 Salvar'}</button>
          </div>
        </div>
      )}

      {/* ══ ABA 3: Automação ════════════════════════════════ */}
      {tab==='automacao' && (
        <div style={{display:'grid',gap:'1.2rem',maxWidth:680}}>
          <div className="fp">
            <h3>Regras de Resposta Automática</h3>
            <div style={{display:'grid',gap:'.5rem',marginBottom:'1rem'}}>
              <ToggleRow label="Responder fora do horário comercial" value={auto.responderForaHorario} onChange={v=>setAuto(p=>({...p,responderForaHorario:v}))} />
              <ToggleRow label="Responder sempre (24 horas)" value={auto.responder24h} onChange={v=>setAuto(p=>({...p,responder24h:v}))} />
              <ToggleRow label="Responder apenas quando marcado como ausente" value={auto.responderAusente} onChange={v=>setAuto(p=>({...p,responderAusente:v}))} />
            </div>
            <div style={{padding:'1rem',background:'var(--b2)',borderRadius:'var(--r)',marginBottom:'1rem'}}>
              <div style={{fontWeight:700,fontSize:11,color:'var(--cinza)',textTransform:'uppercase',letterSpacing:.5,marginBottom:'.75rem'}}>Horário Comercial</div>
              <div className="gg2">
                <Fgg label="Das"><input type="time" className="inf" value={auto.horarioInicio} onChange={e=>setAuto(p=>({...p,horarioInicio:e.target.value}))} /></Fgg>
                <Fgg label="Até"><input type="time" className="inf" value={auto.horarioFim} onChange={e=>setAuto(p=>({...p,horarioFim:e.target.value}))} /></Fgg>
              </div>
            </div>
            <Fgg label="Mensagem de Boas-Vindas (1º contato)">
              <textarea className="inf" rows={3} value={auto.mensagemBoasVindas} style={{resize:'vertical',lineHeight:1.6}} onChange={e=>setAuto(p=>({...p,mensagemBoasVindas:e.target.value}))} />
            </Fgg>
            <Fgg label="Mensagem de Fallback (IA não sabe responder)">
              <textarea className="inf" rows={3} value={auto.mensagemFallback} style={{resize:'vertical',lineHeight:1.6}} onChange={e=>setAuto(p=>({...p,mensagemFallback:e.target.value}))} />
            </Fgg>
            <button className="btn-salvar-atualiz" onClick={()=>salvar('automacao_config',auto)} disabled={saving}>{saving?'Salvando…':'💾 Salvar Regras'}</button>
          </div>

          <div className="fp">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
              <h3 style={{margin:0,border:'none',padding:0}}>Últimas 10 Mensagens Processadas</h3>
              <button className="btn-pront" onClick={carregarLogs} disabled={logsLoading}>{logsLoading?'…':'🔄 Atualizar'}</button>
            </div>
            {logs.length===0
              ? <div style={{textAlign:'center',padding:'2rem',color:'var(--cinza-cl)',fontSize:13}}>📭 Nenhuma mensagem registrada ainda</div>
              : logs.map(l=>(
                <div key={l.id} style={{display:'grid',gridTemplateColumns:'auto 1fr auto',gap:'.75rem',alignItems:'center',padding:'.7rem .85rem',background:'var(--b1)',borderRadius:8,border:'1px solid var(--borda)',marginBottom:'.4rem',fontSize:12}}>
                  <span style={{padding:'.2rem .6rem',borderRadius:12,fontWeight:700,fontSize:11,whiteSpace:'nowrap',background:l.direcao==='recebida'?'var(--vc)':'#e8f5e9',color:l.direcao==='recebida'?'var(--v2)':'#2e7d32'}}>
                    {l.direcao==='recebida'?'↙ Recebida':'↗ Enviada'}
                  </span>
                  <div>
                    <div style={{fontWeight:700,marginBottom:'.2rem'}}>{l.contato}</div>
                    <div style={{color:'var(--cinza)',lineHeight:1.4}}>{l.mensagem}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{color:'var(--cinza-cl)',fontSize:11,marginBottom:'.2rem'}}>{new Date(l.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
                    <span style={{fontSize:10,fontWeight:700,padding:'.15rem .5rem',borderRadius:10,background:l.respondido_por==='ia'?'#f3e5f5':'#fff8e1',color:l.respondido_por==='ia'?'#6a1b9a':'#e65100'}}>
                      {l.respondido_por==='ia'?'🤖 IA':'👤 Humano'}
                    </span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ══ ABA 4: Disparo em Massa ══════════════════════════ */}
      {tab==='disparo' && (
        <div style={{display:'grid',gap:'1.2rem',maxWidth:780}}>

          {/* Importar / Adicionar contatos */}
          <div className="fp">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem',flexWrap:'wrap',gap:'.5rem'}}>
              <h3 style={{margin:0,border:'none',padding:0}}>Base de Contatos</h3>
              <div style={{display:'flex',gap:'.5rem'}}>
                <input ref={file4Ref} type="file" accept=".xls,.xlsx" style={{display:'none'}} onChange={handleImport4} />
                <button className="btn-pront" onClick={()=>file4Ref.current?.click()}>📂 Importar XLS/XLSX</button>
                <button className="btn-pront" onClick={()=>setShowAddC(true)}>➕ Adicionar</button>
              </div>
            </div>

            {/* Preview importação */}
            {rawImport4 && (
              <div style={{marginBottom:'1rem'}}>
                <div style={{fontWeight:700,fontSize:12,color:'var(--v2)',marginBottom:'.5rem'}}>Preview — {rawImport4.length} contato(s) encontrado(s):</div>
                <div style={{maxHeight:200,overflowY:'auto',border:'1px solid var(--borda)',borderRadius:'var(--r)'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                    <thead><tr style={{background:'var(--b2)'}}>
                      {['Nome','Telefone','E-mail'].map(h=><th key={h} style={{padding:'.4rem .7rem',textAlign:'left',fontWeight:700,borderBottom:'1px solid var(--borda)'}}>{h}</th>)}
                    </tr></thead>
                    <tbody>{rawImport4.slice(0,20).map((r,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid var(--borda)'}}>
                        <td style={{padding:'.35rem .7rem'}}>{r.nome}</td>
                        <td style={{padding:'.35rem .7rem'}}>{r.telefone}</td>
                        <td style={{padding:'.35rem .7rem',color:'var(--cinza)'}}>{r.email||'—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <div style={{display:'flex',gap:'.5rem',marginTop:'.75rem'}}>
                  <button className="btn-salvar-atualiz" onClick={confirmarImport4}>✔ Confirmar Importação</button>
                  <button className="btn-pront" onClick={()=>setRawImport4(null)}>✕ Cancelar</button>
                </div>
              </div>
            )}

            {/* Modal adicionar manual */}
            {showAddC && (
              <div style={{background:'var(--b2)',borderRadius:'var(--r)',padding:'1rem',marginBottom:'1rem',border:'1px solid var(--borda)'}}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:'.75rem'}}>Adicionar Contato</div>
                <div className="gg3">
                  <Fgg label="Nome *"><input className="inf" value={newC.nome} placeholder="Nome" onChange={e=>setNewC(p=>({...p,nome:e.target.value}))} /></Fgg>
                  <Fgg label="Telefone * (com DDI)"><input className="inf" value={newC.telefone} placeholder="5562999990000" onChange={e=>setNewC(p=>({...p,telefone:e.target.value.replace(/\D/g,'')}))} /></Fgg>
                  <Fgg label="E-mail (opcional)"><input className="inf" value={newC.email} placeholder="email@exemplo.com" onChange={e=>setNewC(p=>({...p,email:e.target.value}))} /></Fgg>
                </div>
                <div style={{display:'flex',gap:'.5rem',marginTop:'.5rem'}}>
                  <button className="btn-salvar-atualiz" onClick={adicionarManual}>➕ Adicionar</button>
                  <button className="btn-pront" onClick={()=>setShowAddC(false)}>Cancelar</button>
                </div>
              </div>
            )}

            {/* Lista de contatos */}
            {contacts.length===0
              ? <div style={{textAlign:'center',padding:'1.5rem',color:'var(--cinza-cl)',fontSize:13}}>Importe um XLS ou adicione contatos manualmente</div>
              : (
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'.5rem',fontSize:12}}>
                    <label style={{display:'flex',alignItems:'center',gap:'.4rem',cursor:'pointer',fontWeight:600}}>
                      <input type="checkbox" checked={selIds.size===contacts.length} onChange={()=>setSelIds(selIds.size===contacts.length?new Set():new Set(contacts.map(c=>c._id)))} />
                      Selecionar todos ({selIds.size}/{contacts.length})
                    </label>
                    {selIds.size>0&&<button className="btn-pront" onClick={()=>{const sel=contacts.filter(c=>selIds.has(c._id));if(confirm(`Remover ${sel.length} contato(s)?`)){setContacts(p=>p.filter(c=>!selIds.has(c._id)));setSelIds(new Set());}}}>🗑 Remover selecionados</button>}
                  </div>
                  <div style={{maxHeight:220,overflowY:'auto',border:'1px solid var(--borda)',borderRadius:'var(--r)'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                      <tbody>{contacts.map(c=>(
                        <tr key={c._id} style={{borderBottom:'1px solid var(--borda)',background:selIds.has(c._id)?'#e3f2fd':'transparent'}}>
                          <td style={{padding:'.35rem .7rem',width:36}}><input type="checkbox" checked={selIds.has(c._id)} onChange={()=>toggleSel(c._id)} /></td>
                          <td style={{padding:'.35rem .7rem',fontWeight:600}}>{c.nome}</td>
                          <td style={{padding:'.35rem .7rem',color:'var(--cinza)'}}>{c.telefone}</td>
                          <td style={{padding:'.35rem .7rem',color:'var(--cinza-cl)'}}>{c.email||'—'}</td>
                          <td style={{padding:'.35rem .7rem'}}><button style={{background:'none',border:'none',cursor:'pointer',color:'#c62828',fontSize:14}} onClick={()=>{setContacts(p=>p.filter(x=>x._id!==c._id));setSelIds(p=>{const s=new Set(p);s.delete(c._id);return s;})}}>✕</button></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )
            }
          </div>

          {/* Criação da campanha */}
          <div className="fp">
            <h3>Criar Campanha</h3>
            <Fgg label="Nome da Campanha">
              <input className="inf" value={campaign.nome} placeholder="Ex: Promoção Julho" onChange={e=>setCampaign(p=>({...p,nome:e.target.value}))} />
            </Fgg>
            <Fgg label="Mensagem (use {{nome}} e {{telefone}})">
              <textarea className="inf" rows={5} value={campaign.mensagem} style={{resize:'vertical',lineHeight:1.6,fontFamily:'monospace'}}
                placeholder="Olá {{nome}}, temos uma promoção especial para você! 🦷" onChange={e=>setCampaign(p=>({...p,mensagem:e.target.value}))} />
            </Fgg>
            {campaign.mensagem && selIds.size>0 && (
              <div style={{padding:'.85rem 1rem',background:'var(--b2)',borderRadius:'var(--r)',borderLeft:'3px solid var(--v3)',marginBottom:'1rem',fontSize:12}}>
                <div style={{fontWeight:700,color:'var(--v2)',marginBottom:'.3rem',fontSize:11,textTransform:'uppercase',letterSpacing:.5}}>Preview com 1º contato selecionado:</div>
                <div style={{lineHeight:1.7,whiteSpace:'pre-wrap'}}>{previewMsg()}</div>
              </div>
            )}

            {/* Barra de progresso */}
            {(sending||sendDone) && (
              <div style={{marginBottom:'1rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:600,marginBottom:'.4rem'}}>
                  <span>{sendProg.done}/{sendProg.total} enviados</span>
                  <span style={{color:'#c62828'}}>{sendProg.failed} falha(s)</span>
                </div>
                <div style={{background:'var(--b2)',borderRadius:8,height:10,overflow:'hidden'}}>
                  <div style={{height:'100%',background:'var(--v2)',borderRadius:8,transition:'width .4s',width:`${sendProg.total?Math.round((sendProg.done/sendProg.total)*100):0}%`}} />
                </div>
                {sendDone && (
                  <div style={{marginTop:'.75rem',padding:'.75rem 1rem',background:sendProg.failed===0?'#e8f5e9':'#fff8e1',borderRadius:'var(--r)',fontSize:12,fontWeight:700}}>
                    {sendProg.failed===0?'✅':'⚠️'} Relatório: {sendProg.done-sendProg.failed} enviados com sucesso, {sendProg.failed} falhou
                  </div>
                )}
              </div>
            )}

            <button className="btn-salvar-atualiz" onClick={dispararCampanha} disabled={sending||!selIds.size}>
              {sending?`⏳ Enviando… (aguarde 2s por envio)`:'🚀 Disparar Agora'}
            </button>
          </div>
        </div>
      )}

      {/* ══ ABA 5: Follow-up ════════════════════════════════ */}
      {tab==='followup' && (
        <div style={{display:'grid',gap:'1.2rem',maxWidth:780}}>

          {/* Criação de sequência */}
          <div className="fp">
            <h3>Nova Sequência de Follow-up</h3>
            <div className="gg2" style={{marginBottom:'.5rem'}}>
              <Fgg label="Nome da Sequência">
                <input className="inf" value={newSeq.nome} placeholder="Ex: Promoção Clareamento" onChange={e=>setNewSeq(p=>({...p,nome:e.target.value}))} />
              </Fgg>
              <Fgg label="&nbsp;">
                <div style={{display:'flex',alignItems:'center',gap:'.75rem',height:36,marginTop:'1.2rem'}}>
                  <Toggle value={newSeq.stopOnReply} onChange={v=>setNewSeq(p=>({...p,stopOnReply:v}))} />
                  <span style={{fontSize:12,fontWeight:500}}>Parar se cliente responder</span>
                </div>
              </Fgg>
            </div>

            {/* Contatos da sequência */}
            <div style={{padding:'1rem',background:'var(--b2)',borderRadius:'var(--r)',marginBottom:'1rem'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.6rem'}}>
                <div style={{fontWeight:700,fontSize:12,color:'var(--cinza)',textTransform:'uppercase',letterSpacing:.5}}>
                  Contatos ({seqContacts.length})
                </div>
                <div style={{display:'flex',gap:'.5rem'}}>
                  <input ref={file5Ref} type="file" accept=".xls,.xlsx" style={{display:'none'}} onChange={handleImport5} />
                  <button className="btn-pront" onClick={()=>file5Ref.current?.click()}>📂 XLS</button>
                  <button className="btn-pront" onClick={()=>setShowAddSeqC(true)}>➕</button>
                </div>
              </div>
              {showAddSeqC && (
                <div style={{background:'#fff',borderRadius:'var(--r)',padding:'1rem',marginBottom:'.75rem',border:'1px solid var(--borda)'}}>
                  <div className="gg2">
                    <Fgg label="Nome *"><input className="inf" value={newSeqC.nome} placeholder="Nome" onChange={e=>setNewSeqC(p=>({...p,nome:e.target.value}))} /></Fgg>
                    <Fgg label="Telefone * (com DDI)"><input className="inf" value={newSeqC.telefone} placeholder="5562999990000" onChange={e=>setNewSeqC(p=>({...p,telefone:e.target.value.replace(/\D/g,'')}))} /></Fgg>
                  </div>
                  <div style={{display:'flex',gap:'.5rem',marginTop:'.5rem'}}>
                    <button className="btn-salvar-atualiz" style={{fontSize:11,padding:'.35rem .75rem'}} onClick={adicionarSeqContato}>➕ Adicionar</button>
                    <button className="btn-pront" onClick={()=>setShowAddSeqC(false)}>Cancelar</button>
                  </div>
                </div>
              )}
              {rawImport5 && (
                <div style={{marginBottom:'.75rem'}}>
                  <div style={{fontSize:12,fontWeight:600,color:'var(--v2)',marginBottom:'.4rem'}}>{rawImport5.length} contato(s) para importar</div>
                  <div style={{display:'flex',gap:'.5rem'}}>
                    <button className="btn-salvar-atualiz" style={{fontSize:11,padding:'.35rem .75rem'}} onClick={confirmarImport5}>✔ Confirmar</button>
                    <button className="btn-pront" onClick={()=>setRawImport5(null)}>✕</button>
                  </div>
                </div>
              )}
              {seqContacts.length>0&&(
                <div style={{display:'flex',flexWrap:'wrap',gap:'.4rem'}}>
                  {seqContacts.map(c=>(
                    <span key={c._id} style={{background:'#fff',border:'1px solid var(--borda)',borderRadius:20,padding:'.25rem .7rem',fontSize:11,fontWeight:600,display:'flex',alignItems:'center',gap:'.4rem'}}>
                      {c.nome}
                      <button style={{background:'none',border:'none',cursor:'pointer',color:'#c62828',fontSize:12,padding:0}} onClick={()=>setSeqContacts(p=>p.filter(x=>x._id!==c._id))}>✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Mensagens da sequência */}
            <div style={{fontWeight:700,fontSize:12,color:'var(--cinza)',textTransform:'uppercase',letterSpacing:.5,marginBottom:'.6rem'}}>Mensagens da Sequência</div>
            {newSeq.mensagens.map((m,i)=>(
              <div key={i} style={{background:'var(--b2)',borderRadius:'var(--r)',padding:'1rem',marginBottom:'.6rem',border:'1px solid var(--borda)'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.6rem'}}>
                  <div style={{fontWeight:700,fontSize:13,color:'var(--v2)'}}>Mensagem {i+1}</div>
                  {i>0&&<button style={{background:'none',border:'none',cursor:'pointer',color:'#c62828',fontSize:12}} onClick={()=>setNewSeq(s=>({...s,mensagens:s.mensagens.filter((_,x)=>x!==i)}))}>Remover</button>}
                </div>
                <Fgg label="Texto da Mensagem">
                  <textarea className="inf" rows={3} value={m.texto} style={{resize:'vertical',lineHeight:1.6}} placeholder={`Texto da mensagem ${i+1}…`} onChange={e=>setMsgField(i,'texto',e.target.value)} />
                </Fgg>
                <div className="gg2">
                  <Fgg label={i===0?'Enviar após (horas)':'Delay depois da msg anterior (dias)'}><input type="number" className="inf" min="0" value={m.delayDias} onChange={e=>setMsgField(i,'delayDias',+e.target.value)} /></Fgg>
                  <Fgg label="+ Horas"><input type="number" className="inf" min="0" max="23" value={m.delayHoras} onChange={e=>setMsgField(i,'delayHoras',+e.target.value)} /></Fgg>
                </div>
              </div>
            ))}
            {newSeq.mensagens.length<5&&(
              <button className="btn-pront" style={{marginBottom:'1rem'}} onClick={()=>setNewSeq(s=>({...s,mensagens:[...s.mensagens,{...DEF_MSG}]}))}>➕ Adicionar Mensagem {newSeq.mensagens.length+1}</button>
            )}
            <button className="btn-salvar-atualiz" onClick={ativarSequencia} disabled={seqSaving}>{seqSaving?'Ativando…':'▶️ Ativar Sequência'}</button>
          </div>

          {/* Sequências ativas */}
          <div className="fp">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
              <h3 style={{margin:0,border:'none',padding:0}}>Sequências Ativas</h3>
              <button className="btn-pront" onClick={loadSequences}>🔄 Atualizar</button>
            </div>
            {sequences.length===0
              ? <div style={{textAlign:'center',padding:'2rem',color:'var(--cinza-cl)',fontSize:13}}>Nenhuma sequência criada ainda</div>
              : sequences.map(seq=>{
                const envs  = seqEnvios[seq.id]||[];
                const total = envs.length;
                const env   = envs.filter(e=>e.status==='enviado').length;
                const resp  = envs.filter(e=>e.status==='respondeu').length;
                const conc  = envs.filter(e=>e.status==='concluido').length;
                return (
                  <div key={seq.id} style={{border:'1px solid var(--borda)',borderRadius:'var(--r)',padding:'1rem',marginBottom:'.75rem',background:seq.ativo?'#fff':'#f9f9f9'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'.5rem'}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:14,marginBottom:'.25rem'}}>
                          {seq.ativo?<span style={{color:'#2e7d32',fontSize:11,fontWeight:700,marginRight:'.5rem'}}>● ATIVA</span>:<span style={{color:'#999',fontSize:11,fontWeight:700,marginRight:'.5rem'}}>● PAUSADA</span>}
                          {seq.nome}
                        </div>
                        <div style={{fontSize:11,color:'var(--cinza)'}}>
                          {new Date(seq.created_at).toLocaleDateString('pt-BR')} · {seq.config?.mensagens?.length||0} mensagens
                        </div>
                      </div>
                      <div style={{display:'flex',gap:'.4rem'}}>
                        <button className="btn-pront" onClick={()=>pausarSeq(seq.id,seq.ativo)}>{seq.ativo?'⏸ Pausar':'▶️ Retomar'}</button>
                        <button className="btn-pront" style={{color:'#c62828'}} onClick={()=>encerrarSeq(seq.id)}>⏹ Encerrar</button>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:'1.5rem',marginTop:'.75rem',paddingTop:'.75rem',borderTop:'1px solid var(--borda)'}}>
                      {[['Total',total,'var(--v2)'],['Entregues',env,'#2e7d32'],['Responderam',resp,'#e65100'],['Concluídos',conc,'#6a1b9a']].map(([l,v,c])=>(
                        <div key={l} style={{textAlign:'center'}}>
                          <div style={{fontSize:20,fontWeight:800,color:c,lineHeight:1}}>{v}</div>
                          <div style={{fontSize:10,color:'var(--cinza)',marginTop:2}}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline style objects ────────────────────────────────────
const S = {
  ok:  { background:'#e8f5e9', color:'#1b5e20', fontSize:12, fontWeight:700, padding:'.3rem .8rem', borderRadius:20 },
  err: { background:'#ffebee', color:'#b71c1c', fontSize:12, fontWeight:700, padding:'.3rem .8rem', borderRadius:20 },
};

// ─── Helper components ───────────────────────────────────────
function Fgg({ label, children }) {
  return (
    <div className="fgg">
      <label>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={()=>onChange(!value)} style={{width:44,height:24,borderRadius:12,cursor:'pointer',flexShrink:0,background:value?'var(--v2)':'#ccc',position:'relative',transition:'background .2s'}}>
      <div style={{position:'absolute',top:2,left:value?22:2,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,.25)'}} />
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'.8rem 1rem',background:'var(--b2)',borderRadius:'var(--r)'}}>
      <span style={{fontSize:13,fontWeight:500}}>{label}</span>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}
