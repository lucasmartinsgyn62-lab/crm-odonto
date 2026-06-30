import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCRM } from '../context/CRMContext';

const MODULE_LABELS = {
  dashboard:      'Dashboard',
  agenda:         'Agenda',
  clientes:       'Clientes',
  dentistas:      'Dentistas',
  origens:        'Origens',
  relatorio:      'Relatórios',
  caixa:          'Caixa',
  historico_caixa:'Hist. Caixa',
};
const MODULES = Object.keys(MODULE_LABELS);

// ── Formulário de Tenant ──────────────────────────────────────
function TenantForm({ initial, onSave, onClose }) {
  const [nome, setNome]   = useState(initial?.nome || '');
  const [email, setEmail] = useState(initial?.email_contato || '');
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!nome.trim()) return;
    setSaving(true);
    await onSave({ nome: nome.trim(), email_contato: email.trim(), ativo });
    setSaving(false);
  }

  return (
    <div className="modal-ov open" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="mbox" style={{maxWidth:420}}>
        <button className="mclose" onClick={onClose}>✕</button>
        <h3 style={{marginBottom:16}}>{initial ? 'Editar Clínica' : 'Nova Clínica'}</h3>
        <input className="minp" placeholder="Nome da Clínica *" value={nome} onChange={e=>setNome(e.target.value)} />
        <input className="minp" placeholder="E-mail de contato" value={email} onChange={e=>setEmail(e.target.value)} />
        {initial && (
          <label style={{display:'flex',alignItems:'center',gap:8,color:'#ccc',fontSize:14,margin:'8px 0'}}>
            <input type="checkbox" checked={ativo} onChange={e=>setAtivo(e.target.checked)} />
            Clínica ativa
          </label>
        )}
        <button className="mbtn" onClick={handleSave} disabled={saving || !nome.trim()}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

// ── Formulário de Usuário ─────────────────────────────────────
function UserForm({ initial, tenants, fixedTenantId, onSave, onClose, ADMIN_PERMS, RECEPCAO_PERMS }) {
  const [nome,     setNome]     = useState(initial?.nome || '');
  const [email,    setEmail]    = useState(initial?.email || '');
  const [senha,    setSenha]    = useState('');
  const [role,     setRole]     = useState(initial?.role || 'recepcao');
  const [tenantId, setTenantId] = useState(initial?.tenant_id || fixedTenantId || '');
  const [ativo,    setAtivo]    = useState(initial?.ativo ?? true);
  const [perms,    setPerms]    = useState(initial?.permissions || RECEPCAO_PERMS);
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  function applyRoleDefaults(r) {
    setRole(r);
    setPerms(r === 'admin' ? { ...ADMIN_PERMS } : { ...RECEPCAO_PERMS });
  }

  function togglePerm(key) {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    if (!nome.trim() || !email.trim()) { setErr('Nome e e-mail são obrigatórios'); return; }
    if (!initial && !senha.trim()) { setErr('Senha é obrigatória para novo usuário'); return; }
    if (!tenantId) { setErr('Selecione uma clínica'); return; }
    setSaving(true); setErr('');
    const result = await onSave({
      nome: nome.trim(), email: email.trim(), senha,
      role, tenant_id: tenantId, permissions: perms, ativo
    });
    setSaving(false);
    if (result?.error) setErr(result.error);
  }

  return (
    <div className="modal-ov open" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="mbox" style={{maxWidth:520,maxHeight:'90vh',overflowY:'auto'}}>
        <button className="mclose" onClick={onClose}>✕</button>
        <h3 style={{marginBottom:16}}>{initial ? 'Editar Usuário' : 'Novo Usuário'}</h3>
        {err && <div className="merr" style={{marginBottom:12}}>⚠️ {err}</div>}

        <input className="minp" placeholder="Nome completo *" value={nome} onChange={e=>setNome(e.target.value)} />
        <input className="minp" type="email" placeholder="E-mail *" value={email} onChange={e=>setEmail(e.target.value)} disabled={!!initial} />
        {!initial && (
          <input className="minp" type="password" placeholder="Senha *" value={senha} onChange={e=>setSenha(e.target.value)} />
        )}

        <div style={{display:'flex',gap:8,marginBottom:8}}>
          <div style={{flex:1}}>
            <label style={{color:'#aaa',fontSize:12,display:'block',marginBottom:4}}>Perfil</label>
            <select className="minp" style={{margin:0}} value={role} onChange={e=>applyRoleDefaults(e.target.value)}>
              <option value="admin">Administrador</option>
              <option value="recepcao">Recepção</option>
            </select>
          </div>
          {!fixedTenantId && (
            <div style={{flex:1}}>
              <label style={{color:'#aaa',fontSize:12,display:'block',marginBottom:4}}>Clínica</label>
              <select className="minp" style={{margin:0}} value={tenantId} onChange={e=>setTenantId(e.target.value)}>
                <option value="">-- Selecione --</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
          )}
        </div>

        {initial && (
          <label style={{display:'flex',alignItems:'center',gap:8,color:'#ccc',fontSize:14,margin:'8px 0 16px'}}>
            <input type="checkbox" checked={ativo} onChange={e=>setAtivo(e.target.checked)} />
            Usuário ativo
          </label>
        )}

        <div style={{marginBottom:16}}>
          <div style={{color:'#aaa',fontSize:12,marginBottom:8,fontWeight:600,letterSpacing:'0.5px'}}>PERMISSÕES DE ACESSO</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {MODULES.map(key => (
              <label key={key} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',
                background: perms[key] ? 'rgba(124,58,237,.18)' : 'rgba(255,255,255,.05)',
                border: `1px solid ${perms[key] ? 'rgba(124,58,237,.5)' : 'rgba(255,255,255,.1)'}`,
                borderRadius:8,padding:'8px 10px',color: perms[key] ? '#c4b5fd' : '#666',
                fontSize:13,transition:'all .2s'}}>
                <input type="checkbox" checked={!!perms[key]} onChange={()=>togglePerm(key)} style={{accentColor:'#7c3aed'}} />
                {MODULE_LABELS[key]}
              </label>
            ))}
          </div>
        </div>

        <button className="mbtn" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Usuário'}
        </button>
      </div>
    </div>
  );
}

// ── Página Principal SuperAdmin ───────────────────────────────
export default function SuperAdmin() {
  const { usuario, logout, superAdmin, ADMIN_PERMS, RECEPCAO_PERMS } = useCRM();
  const navigate = useNavigate();

  const [tab,           setTab]           = useState('clinicas');
  const [tenants,       setTenants]       = useState([]);
  const [selectedTenant,setSelectedTenant]= useState(null);
  const [users,         setUsers]         = useState([]);
  const [loading,       setLoading]       = useState(false);

  const [showTenantForm, setShowTenantForm] = useState(false);
  const [editTenant,     setEditTenant]     = useState(null);
  const [showUserForm,   setShowUserForm]   = useState(false);
  const [editUser,       setEditUser]       = useState(null);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    const data = await superAdmin.listTenants();
    setTenants(data);
    setLoading(false);
  }, []);

  const loadUsers = useCallback(async (tenantId = null) => {
    setLoading(true);
    const data = await superAdmin.listUsers(tenantId);
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadTenants(); }, []);
  useEffect(() => {
    if (tab === 'usuarios') loadUsers(selectedTenant?.id || null);
  }, [tab, selectedTenant]);

  async function handleSaveTenant(fields) {
    if (editTenant) {
      await superAdmin.updateTenant(editTenant.id, fields);
    } else {
      await superAdmin.createTenant(fields);
    }
    setShowTenantForm(false); setEditTenant(null);
    loadTenants();
  }

  async function handleSaveUser(fields) {
    let result;
    if (editUser) {
      const { senha: _s, email: _e, ...updateFields } = fields;
      result = await superAdmin.updateUser(editUser.id, updateFields);
    } else {
      result = await superAdmin.createUser(fields);
    }
    if (!result?.error) {
      setShowUserForm(false); setEditUser(null);
      loadUsers(selectedTenant?.id || null);
    }
    return result;
  }

  function handleLogout() { logout(); navigate('/'); }

  const tenantName = name => tenants.find(t => t.id === name)?.nome || name;

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',color:'#fff'}}>
      {/* Header */}
      <div style={{background:'#111',borderBottom:'1px solid rgba(255,255,255,.08)',padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <div style={{fontWeight:700,fontSize:18,background:'linear-gradient(135deg,#7c3aed,#a78bfa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
            ⚡ Super Admin
          </div>
          <span style={{background:'rgba(124,58,237,.2)',border:'1px solid rgba(124,58,237,.4)',color:'#a78bfa',fontSize:11,padding:'2px 8px',borderRadius:20}}>
            {usuario?.nome}
          </span>
        </div>
        <button onClick={handleLogout} style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',color:'#aaa',padding:'6px 14px',borderRadius:8,cursor:'pointer',fontSize:13}}>
          <i className="ti ti-logout"></i> Sair
        </button>
      </div>

      {/* Tabs */}
      <div style={{padding:'0 24px',borderBottom:'1px solid rgba(255,255,255,.08)',display:'flex',gap:0}}>
        {[{id:'clinicas',label:'🏥 Clínicas'},{id:'usuarios',label:'👥 Usuários'}].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelectedTenant(null); }}
            style={{padding:'14px 20px',background:'transparent',border:'none',color: tab===t.id ? '#a78bfa' : '#666',
              borderBottom: tab===t.id ? '2px solid #7c3aed' : '2px solid transparent',
              cursor:'pointer',fontSize:14,fontWeight: tab===t.id ? 600 : 400}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:24,maxWidth:1100,margin:'0 auto'}}>
        {/* ── ABA CLÍNICAS ── */}
        {tab === 'clinicas' && (
          <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h2 style={{margin:0,fontSize:20}}>Clínicas Cadastradas</h2>
              <button className="mbtn" style={{margin:0,padding:'8px 18px',fontSize:13}} onClick={() => { setEditTenant(null); setShowTenantForm(true); }}>
                + Nova Clínica
              </button>
            </div>
            {loading ? (
              <div style={{textAlign:'center',padding:40,color:'#666'}}>Carregando...</div>
            ) : tenants.length === 0 ? (
              <div style={{textAlign:'center',padding:60,color:'#444',border:'1px dashed rgba(255,255,255,.1)',borderRadius:12}}>
                Nenhuma clínica cadastrada ainda.
              </div>
            ) : (
              <div style={{display:'grid',gap:12}}>
                {tenants.map(t => (
                  <div key={t.id} style={{background:'#111',border:'1px solid rgba(255,255,255,.08)',borderRadius:12,padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{display:'flex',alignItems:'center',gap:14}}>
                      <div style={{width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#7c3aed,#a78bfa)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>
                        🏥
                      </div>
                      <div>
                        <div style={{fontWeight:600,fontSize:15}}>{t.nome}</div>
                        <div style={{color:'#666',fontSize:12,marginTop:2}}>{t.email_contato || 'Sem e-mail'}</div>
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{background: t.ativo ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
                        color: t.ativo ? '#4ade80' : '#f87171',border:`1px solid ${t.ativo ? 'rgba(74,222,128,.3)' : 'rgba(248,113,113,.3)'}`,
                        fontSize:11,padding:'3px 10px',borderRadius:20}}>
                        {t.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                      <button onClick={() => { setTab('usuarios'); setSelectedTenant(t); }}
                        style={{background:'rgba(124,58,237,.15)',border:'1px solid rgba(124,58,237,.3)',color:'#a78bfa',padding:'6px 12px',borderRadius:8,cursor:'pointer',fontSize:12}}>
                        Usuários
                      </button>
                      <button onClick={() => { setEditTenant(t); setShowTenantForm(true); }}
                        style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',color:'#ccc',padding:'6px 12px',borderRadius:8,cursor:'pointer',fontSize:12}}>
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── ABA USUÁRIOS ── */}
        {tab === 'usuarios' && (
          <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:12}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <h2 style={{margin:0,fontSize:20}}>Usuários</h2>
                {selectedTenant && (
                  <span style={{background:'rgba(124,58,237,.2)',border:'1px solid rgba(124,58,237,.4)',color:'#c4b5fd',fontSize:12,padding:'4px 12px',borderRadius:20}}>
                    {selectedTenant.nome}
                  </span>
                )}
              </div>
              <div style={{display:'flex',gap:8}}>
                {selectedTenant && (
                  <button onClick={() => setSelectedTenant(null)}
                    style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',color:'#aaa',padding:'8px 14px',borderRadius:8,cursor:'pointer',fontSize:12}}>
                    Ver todos
                  </button>
                )}
                <button className="mbtn" style={{margin:0,padding:'8px 18px',fontSize:13}}
                  onClick={() => { setEditUser(null); setShowUserForm(true); }}>
                  + Novo Usuário
                </button>
              </div>
            </div>

            {/* Filtro por clínica */}
            {!selectedTenant && (
              <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
                {tenants.map(t => (
                  <button key={t.id} onClick={() => setSelectedTenant(t)}
                    style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',color:'#aaa',padding:'6px 14px',borderRadius:20,cursor:'pointer',fontSize:12}}>
                    {t.nome}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div style={{textAlign:'center',padding:40,color:'#666'}}>Carregando...</div>
            ) : users.length === 0 ? (
              <div style={{textAlign:'center',padding:60,color:'#444',border:'1px dashed rgba(255,255,255,.1)',borderRadius:12}}>
                Nenhum usuário encontrado.
              </div>
            ) : (
              <div style={{display:'grid',gap:10}}>
                {users.map(u => {
                  const permsAtivas = MODULES.filter(k => u.permissions?.[k]).map(k => MODULE_LABELS[k]);
                  return (
                    <div key={u.id} style={{background:'#111',border:'1px solid rgba(255,255,255,.08)',borderRadius:12,padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                      <div style={{display:'flex',alignItems:'center',gap:14}}>
                        <div style={{width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,#1e1b4b,#312e81)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,color:'#a78bfa'}}>
                          {(u.nome||'U').split(' ').map(w=>w[0]).slice(0,2).join('')}
                        </div>
                        <div>
                          <div style={{fontWeight:600,fontSize:14}}>{u.nome}</div>
                          <div style={{color:'#666',fontSize:12}}>{u.email}</div>
                          <div style={{color:'#888',fontSize:11,marginTop:2}}>{tenantName(u.tenant_id)}</div>
                        </div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                        <span style={{background:'rgba(124,58,237,.15)',border:'1px solid rgba(124,58,237,.3)',color:'#c4b5fd',fontSize:11,padding:'2px 8px',borderRadius:20}}>
                          {u.role === 'admin' ? 'Admin' : 'Recepção'}
                        </span>
                        <span style={{background: u.ativo ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
                          color: u.ativo ? '#4ade80' : '#f87171',border:`1px solid ${u.ativo ? 'rgba(74,222,128,.3)':'rgba(248,113,113,.3)'}`,
                          fontSize:11,padding:'2px 8px',borderRadius:20}}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                        <div style={{color:'#555',fontSize:11,maxWidth:200,lineHeight:1.4}}>
                          {permsAtivas.length > 0 ? permsAtivas.join(' · ') : 'Sem permissões'}
                        </div>
                        <button onClick={() => { setEditUser(u); setShowUserForm(true); }}
                          style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',color:'#ccc',padding:'6px 12px',borderRadius:8,cursor:'pointer',fontSize:12}}>
                          Editar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modais */}
      {showTenantForm && (
        <TenantForm
          initial={editTenant}
          onSave={handleSaveTenant}
          onClose={() => { setShowTenantForm(false); setEditTenant(null); }}
        />
      )}
      {showUserForm && (
        <UserForm
          initial={editUser}
          tenants={tenants}
          fixedTenantId={selectedTenant?.id || null}
          onSave={handleSaveUser}
          onClose={() => { setShowUserForm(false); setEditUser(null); }}
          ADMIN_PERMS={ADMIN_PERMS}
          RECEPCAO_PERMS={RECEPCAO_PERMS}
        />
      )}
    </div>
  );
}
