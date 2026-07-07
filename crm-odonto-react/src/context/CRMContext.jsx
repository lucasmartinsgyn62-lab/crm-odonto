import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, supabaseSignup } from '../lib/supabase';
import { ORIGENS_DEF, DEFAULT_DENTISTAS, AREAS_LIST, AREAS_PRECOS } from '../constants';

export const CRMContext = createContext(null);

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function todayStr() {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}

const ADMIN_PERMS = {
  dashboard:true, agenda:true, clientes:true, dentistas:true,
  origens:true, procedimentos:true, relatorio:true, caixa:true, historico_caixa:true, auditoria:true
};
const RECEPCAO_PERMS = {
  dashboard:false, agenda:true, clientes:true, dentistas:false,
  origens:false, procedimentos:false, relatorio:false, caixa:false, historico_caixa:false, auditoria:false
};

export function CRMProvider({ children }) {
  const [usuario, setUsuario]   = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [clientes,              setClientes]             = useState([]);
  const [agenda,                setAgenda]               = useState({});
  const [origens,               setOrigens]              = useState([]);
  const [dentistas,             setDentistas]            = useState([]);
  const [caixaDia,              setCaixaDia]             = useState([]);
  const [historicoFechamentos,  setHistoricoFechamentos] = useState([]);
  const [procedimentos,         setProcedimentos]        = useState([]);
  const [caixaSenha,            setCaixaSenha]           = useState('123');
  const loadedMonthsRef = useRef(new Map());
  const [dataLoading,           setDataLoading]          = useState(false);

  const [toast,             setToast]           = useState(null);
  const [activePanel,       setActivePanel]     = useState('dashboard');
  const [selectedDate,      setSelectedDate]    = useState(new Date());
  const [selectedDentista,  setSelectedDentista]= useState('');
  const [prontuarioModal,   setProntuarioModal] = useState(null);
  const [caixaModal,        setCaixaModal]      = useState(null);

  // refs para evitar closures obsoletos no dispatch
  const agendaRef   = useRef(agenda);
  const origensRef  = useRef(origens);
  const clientesRef = useRef(clientes);
  useEffect(() => { agendaRef.current  = agenda; }, [agenda]);
  useEffect(() => { origensRef.current = origens; }, [origens]);
  useEffect(() => { clientesRef.current = clientes; }, [clientes]);

  const tenantId    = usuario?.tenant_id;
  const permissions = usuario?.permissions || ADMIN_PERMS;

  // ── Auth: verificar sessão ao montar ─────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) await loadProfile(session.user.id);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setUsuario(null);
        clearData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Carrega a agenda de UM mês (lazy) e mescla no estado — evita baixar o histórico inteiro no login.
  // loadedMonthsRef = Map de chamadas EM VOO (dedup contra corridas: StrictMode/efeitos duplicados).
  // Ao terminar, a chave é removida — então cada navegação revalida (dados sempre frescos), mas
  // chamadas simultâneas do mesmo mês compartilham a mesma requisição.
  const loadAgendaMes = useCallback((mm, yyyy, tid) => {
    const t = tid || tenantId;
    if (!t) return Promise.resolve();
    const chave = `${t}|${mm}/${yyyy}`;
    if (loadedMonthsRef.current.has(chave)) return loadedMonthsRef.current.get(chave);
    const p = (async () => {
      try {
        const { data, error } = await supabase.from('agenda_slots')
          .select('*').eq('tenant_id', t).like('ag_key', `%/${mm}/${yyyy}`);
        if (error) return;
        setAgenda(prev => {
          const map = { ...prev };
          (data || []).forEach(row => {
            map[row.ag_key] = { ...(map[row.ag_key] || {}), [row.horario]: row.slot_data };
          });
          return map;
        });
      } finally {
        loadedMonthsRef.current.delete(chave);
      }
    })();
    loadedMonthsRef.current.set(chave, p);
    return p;
  }, [tenantId]);

  // ── Carregar dados quando tenant muda ────────────────────────
  useEffect(() => {
    if (tenantId) loadAllData(tenantId);
  }, [tenantId]);

  // ── Lazy-load do mês visível na agenda ────────────────────────
  useEffect(() => {
    if (!tenantId || !selectedDate) return;
    loadAgendaMes(pad(selectedDate.getMonth() + 1), String(selectedDate.getFullYear()));
  }, [tenantId, selectedDate, loadAgendaMes]);

  // ── Realtime: mudanças de outras recepções aparecem sem recarregar ──
  useEffect(() => {
    if (!tenantId) return;
    const ch = supabase.channel(`rt-${tenantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_slots', filter: `tenant_id=eq.${tenantId}` }, payload => {
        if (payload.eventType === 'DELETE') {
          const row = payload.old;
          if (!row?.ag_key) return;
          setAgenda(prev => {
            const dia = { ...(prev[row.ag_key] || {}) };
            delete dia[row.horario];
            return { ...prev, [row.ag_key]: dia };
          });
        } else {
          const row = payload.new;
          setAgenda(prev => ({ ...prev, [row.ag_key]: { ...(prev[row.ag_key] || {}), [row.horario]: row.slot_data } }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes', filter: `tenant_id=eq.${tenantId}` }, payload => {
        if (payload.eventType === 'INSERT') setClientes(prev => prev.some(c => c.id === payload.new.id) ? prev : [...prev, payload.new]);
        if (payload.eventType === 'UPDATE') setClientes(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
        if (payload.eventType === 'DELETE') setClientes(prev => prev.filter(c => c.id !== payload.old?.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tenantId]);

  async function loadProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setUsuario(data);
    return data;
  }

  function clearData() {
    loadedMonthsRef.current = new Map();
    setClientes([]); setAgenda({}); setOrigens([]);
    setDentistas([]); setCaixaDia([]); setHistoricoFechamentos([]);
    setProcedimentos([]);
  }

  // Carrega procedimentos; semeia a partir das constantes na primeira vez.
  // Se a tabela ainda não existir no Supabase, usa as constantes em memória.
  async function loadProcedimentos(tid) {
    const { data, error } = await supabase.from('procedimentos')
      .select('*').eq('tenant_id', tid).order('nome');
    if (error) {
      setProcedimentos(AREAS_LIST.map(nome => ({
        id: nome, nome, valor: AREAS_PRECOS[nome] || 0, cor: null, convenio: null, _local: true,
      })));
      return;
    }
    if (data.length === 0) {
      const seed = AREAS_LIST.map(nome => ({
        tenant_id: tid, nome, valor: AREAS_PRECOS[nome] || 0, cor: null, convenio: null,
      }));
      const { data: inserted } = await supabase.from('procedimentos').insert(seed).select();
      setProcedimentos(inserted || []);
      return;
    }
    setProcedimentos(data);
  }

  async function loadAllData(tid) {
    setDataLoading(true);
    const hoje = new Date();
    const prox = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    const [c, d, o, cx, hx, cfg] = await Promise.all([
      supabase.from('clientes').select('*').eq('tenant_id', tid).order('created_at'),
      supabase.from('dentistas').select('*').eq('tenant_id', tid).order('created_at'),
      supabase.from('origens').select('*').eq('tenant_id', tid),
      supabase.from('caixa_dia').select('*').eq('tenant_id', tid),
      supabase.from('historico_fechamentos').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
      supabase.from('configuracoes').select('valor').eq('tenant_id', tid).eq('chave', 'caixa_config').maybeSingle(),
    ]);
    if (c.data)  setClientes(c.data);
    if (d.data)  setDentistas(d.data);
    if (o.data)  setOrigens(o.data.map(x => x.nome));
    if (cx.data) setCaixaDia(cx.data.map(r => r.data));
    if (hx.data) setHistoricoFechamentos(hx.data.map(r => r.fechamento));
    if (cfg.data?.valor?.senhaFechamento) setCaixaSenha(String(cfg.data.valor.senhaFechamento));
    setAgenda({});
    await Promise.all([
      loadAgendaMes(pad(hoje.getMonth() + 1), String(hoje.getFullYear()), tid),
      loadAgendaMes(pad(prox.getMonth() + 1), String(prox.getFullYear()), tid),
      loadProcedimentos(tid),
    ]);
    setDataLoading(false);
  }

  // ── Auth ──────────────────────────────────────────────────────
  async function registrarLogin(profile, email) {
    if (profile?.tenant_id) {
      supabase.from('audit_log').insert({
        tenant_id: profile.tenant_id, usuario: profile.nome || email, usuario_id: profile.id,
        acao: 'login', entidade: 'sessão', descricao: `Entrou no sistema (${profile.role || ''})`,
      }).then(() => {}, () => {});
    }
  }

  const login = useCallback(async (email, senha) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error || !data.user) return { error: 'E-mail ou senha incorretos.' };

    // 2FA: se a conta tem fator verificado, o login só completa após o código
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
      const { data: fatores } = await supabase.auth.mfa.listFactors();
      const totp = (fatores?.totp || []).find(f => f.status === 'verified');
      if (totp) return { mfaRequired: true, factorId: totp.id, email };
    }

    const profile = await loadProfile(data.user.id);
    registrarLogin(profile, email);
    return { profile };
  }, []);

  // Verifica o código 2FA e finaliza o login
  const verifyMfaLogin = useCallback(async (factorId, code, email) => {
    const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId });
    if (e1) return { error: e1.message };
    const { error: e2 } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: String(code).trim() });
    if (e2) return { error: 'Código inválido.' };
    const { data: sess } = await supabase.auth.getUser();
    const profile = await loadProfile(sess.user.id);
    registrarLogin(profile, email);
    return { profile };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUsuario(null);
    clearData();
  }, []);

  // ── Toast ─────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Helpers agenda ────────────────────────────────────────────
  const getAgKey = useCallback((dent, date) => {
    const d = date || selectedDate;
    const dentStr  = dent !== undefined ? dent : selectedDentista;
    const dateStr  = `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
    return dentStr ? `${dentStr}||${dateStr}` : dateStr;
  }, [selectedDate, selectedDentista]);

  const getDateStr = useCallback((date) => {
    const d = date || selectedDate;
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
  }, [selectedDate]);

  // Registra um evento na trilha de auditoria (best-effort, não bloqueia a ação)
  const logAudit = useCallback((acao, entidade, descricao) => {
    if (!tenantId) return;
    supabase.from('audit_log').insert({
      tenant_id: tenantId,
      usuario: usuario?.nome || usuario?.email || '—',
      usuario_id: usuario?.id || null,
      acao, entidade, descricao,
    }).then(() => {}, () => {});
  }, [tenantId, usuario]);

  // ── Dispatch shim — mantém compatibilidade com componentes existentes ──
  const dispatch = useCallback(async (action) => {
    const tid = tenantId;
    const editor = usuario?.nome || usuario?.email || null;
    switch (action.type) {

      case 'ADD_CLIENTE': {
        const { data, error } = await supabase.from('clientes')
          .insert({ ...action.payload, tenant_id: tid })
          .select().single();
        if (!error && data) setClientes(prev => [...prev, data]);
        logAudit('criou', 'paciente', `Cadastrou o paciente ${action.payload?.nome || ''}`);
        break;
      }
      case 'UPDATE_CLIENTE': {
        const { id, ...rest } = action.payload;
        await supabase.from('clientes').update(rest).eq('id', id);
        setClientes(prev => prev.map(c => c.id === id ? { ...c, ...action.payload } : c));
        logAudit('editou', 'paciente', `Editou o paciente ${action.payload?.nome || clientesRef.current.find(c => c.id === id)?.nome || ''}`);
        break;
      }
      case 'DELETE_CLIENTE': {
        const nome = clientesRef.current.find(c => c.id === action.payload)?.nome || '';
        await supabase.from('clientes').delete().eq('id', action.payload);
        setClientes(prev => prev.filter(c => c.id !== action.payload));
        logAudit('excluiu', 'paciente', `Excluiu o paciente ${nome}`);
        break;
      }

      case 'SET_AGENDA_SLOT': {
        const { agKey, horario, slot } = action.payload;
        await supabase.from('agenda_slots').upsert(
          { tenant_id: tid, ag_key: agKey, horario, slot_data: slot, updated_by: editor },
          { onConflict: 'tenant_id,ag_key,horario' }
        );
        setAgenda(prev => ({ ...prev, [agKey]: { ...(prev[agKey]||{}), [horario]: slot } }));
        if (slot?.nome) {
          const [dent, data] = agKey.includes('||') ? agKey.split('||') : ['', agKey];
          logAudit('editou', 'agenda', `${slot.nome} — ${horario.replace('-ENCAIXE',' (encaixe)')} de ${data}${dent ? ' com ' + dent : ''}${slot.status ? ' [' + slot.status + ']' : ''}`);
        }
        break;
      }
      case 'CLEAR_AGENDA_SLOT': {
        const { agKey, horario } = action.payload;
        const nomeAnt = agendaRef.current[agKey]?.[horario]?.nome || '';
        await supabase.from('agenda_slots').delete()
          .eq('tenant_id', tid).eq('ag_key', agKey).eq('horario', horario);
        setAgenda(prev => {
          const day = { ...(prev[agKey]||{}) };
          delete day[horario];
          return { ...prev, [agKey]: day };
        });
        logAudit('excluiu', 'agenda', `Removeu o horário ${horario.replace('-ENCAIXE',' (encaixe)')}${nomeAnt ? ' de ' + nomeAnt : ''}`);
        break;
      }

      case 'ADD_DENTISTA': {
        const { data, error } = await supabase.from('dentistas')
          .insert({ ...action.payload, tenant_id: tid })
          .select().single();
        if (!error && data) setDentistas(prev => [...prev, data]);
        logAudit('criou', 'dentista', `Cadastrou o dentista ${action.payload?.nome || ''}`);
        break;
      }
      case 'UPDATE_DENTISTA': {
        const { id, ...rest } = action.payload;
        await supabase.from('dentistas').update(rest).eq('id', id);
        setDentistas(prev => prev.map(d => d.id === id ? { ...d, ...action.payload } : d));
        logAudit('editou', 'dentista', `Editou o dentista ${action.payload?.nome || ''}`);
        break;
      }
      case 'DELETE_DENTISTA': {
        await supabase.from('dentistas').delete().eq('id', action.payload);
        setDentistas(prev => prev.filter(d => d.id !== action.payload));
        logAudit('excluiu', 'dentista', `Excluiu um dentista`);
        break;
      }

      case 'ADD_ORIGEM': {
        if (origensRef.current.includes(action.payload)) break;
        await supabase.from('origens').insert({ tenant_id: tid, nome: action.payload });
        setOrigens(prev => [...prev, action.payload]);
        break;
      }
      case 'DELETE_ORIGEM': {
        await supabase.from('origens').delete()
          .eq('tenant_id', tid).eq('nome', action.payload);
        setOrigens(prev => prev.filter(o => o !== action.payload));
        break;
      }

      case 'SET_CAIXA_SENHA': {
        const senha = String(action.payload || '').trim();
        if (!senha) break;
        await supabase.from('configuracoes').upsert(
          { tenant_id: tid, chave: 'caixa_config', valor: { senhaFechamento: senha } },
          { onConflict: 'tenant_id,chave' }
        );
        setCaixaSenha(senha);
        logAudit('editou', 'configuração', 'Alterou a senha de fechamento de caixa');
        break;
      }

      case 'ADD_PROCEDIMENTO': {
        const { data, error } = await supabase.from('procedimentos')
          .insert({ ...action.payload, tenant_id: tid })
          .select().single();
        if (!error && data) {
          setProcedimentos(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
        }
        logAudit('criou', 'procedimento', `Cadastrou "${action.payload?.nome}" (R$ ${action.payload?.valor})`);
        return { data, error };
      }
      case 'UPDATE_PROCEDIMENTO': {
        const { id, ...rest } = action.payload;
        await supabase.from('procedimentos').update(rest).eq('id', id);
        setProcedimentos(prev => prev.map(p => p.id === id ? { ...p, ...rest } : p));
        logAudit('editou', 'procedimento', `Editou "${rest.nome}" (R$ ${rest.valor})`);
        break;
      }
      case 'DELETE_PROCEDIMENTO': {
        await supabase.from('procedimentos').delete().eq('id', action.payload);
        setProcedimentos(prev => prev.filter(p => p.id !== action.payload));
        logAudit('excluiu', 'procedimento', 'Excluiu um procedimento');
        break;
      }
      case 'IMPORT_PROCEDIMENTOS': {
        // payload: array de { nome, valor, cor, convenio }
        const rows = action.payload.map(p => ({ ...p, tenant_id: tid }));
        const { data, error } = await supabase.from('procedimentos')
          .upsert(rows, { onConflict: 'tenant_id,nome' })
          .select();
        if (!error && data) {
          setProcedimentos(prev => {
            const byNome = new Map(prev.map(p => [p.nome, p]));
            data.forEach(p => byNome.set(p.nome, p));
            return [...byNome.values()].sort((a, b) => a.nome.localeCompare(b.nome));
          });
        }
        logAudit('criou', 'procedimento', `Importou ${action.payload?.length || 0} procedimentos${action.payload?.[0]?.convenio ? ' do convênio ' + action.payload[0].convenio : ''}`);
        return { data, error };
      }

      case 'ADD_CAIXA_ENTRY': {
        const entry = action.payload;
        await supabase.from('caixa_dia').upsert(
          { tenant_id: tid, mes: entry.mes, h: entry.h, data: entry },
          { onConflict: 'tenant_id,mes,h' }
        );
        setCaixaDia(prev => {
          const idx = prev.findIndex(x => x.mes === entry.mes && x.h === entry.h);
          const next = [...prev];
          if (idx >= 0) next[idx] = entry; else next.push(entry);
          return next;
        });
        break;
      }
      case 'FECHAR_CAIXA': {
        const { fechamento } = action.payload;
        await supabase.from('historico_fechamentos').insert({ tenant_id: tid, fechamento });
        await supabase.from('caixa_dia').delete().eq('tenant_id', tid);
        setHistoricoFechamentos(prev => [fechamento, ...prev]);
        setCaixaDia([]);
        logAudit('fechou_caixa', 'caixa', `Fechou o caixa: ${fechamento?.atendimentos || 0} atendimentos, total R$ ${(fechamento?.total || 0).toFixed(2)}`);
        break;
      }

      case 'SAVE_ATUALIZACAO': {
        const { agKey, horario, atualizacoes } = action.payload;
        const slot = { ...(agendaRef.current[agKey]?.[horario]||{}), atualizacoes };
        await supabase.from('agenda_slots').upsert(
          { tenant_id: tid, ag_key: agKey, horario, slot_data: slot, updated_by: editor },
          { onConflict: 'tenant_id,ag_key,horario' }
        );
        setAgenda(prev => ({ ...prev, [agKey]: { ...(prev[agKey]||{}), [horario]: slot } }));
        break;
      }
      case 'UPDATE_PROCS_SLOT': {
        const { agKey, horario, procedimentosRealizados } = action.payload;
        const slot = { ...(agendaRef.current[agKey]?.[horario]||{}), procedimentosRealizados };
        await supabase.from('agenda_slots').upsert(
          { tenant_id: tid, ag_key: agKey, horario, slot_data: slot, updated_by: editor },
          { onConflict: 'tenant_id,ag_key,horario' }
        );
        setAgenda(prev => ({ ...prev, [agKey]: { ...(prev[agKey]||{}), [horario]: slot } }));
        break;
      }
      case 'UPDATE_IMGS_SLOT': {
        const { agKey, horario, imagens } = action.payload;
        const slot = { ...(agendaRef.current[agKey]?.[horario]||{}), imagens };
        await supabase.from('agenda_slots').upsert(
          { tenant_id: tid, ag_key: agKey, horario, slot_data: slot, updated_by: editor },
          { onConflict: 'tenant_id,ag_key,horario' }
        );
        setAgenda(prev => ({ ...prev, [agKey]: { ...(prev[agKey]||{}), [horario]: slot } }));
        break;
      }

      default: break;
    }
  }, [tenantId, usuario, logAudit]);

  // ── Funções Super Admin ───────────────────────────────────────
  const superAdmin = {
    // Listar todos os tenants
    listTenants: async () => {
      const { data } = await supabase.from('tenants').select('*').order('nome');
      return data || [];
    },
    // Criar tenant + semear dados padrão
    createTenant: async ({ nome, email_contato }) => {
      const { data: tenant, error } = await supabase.from('tenants')
        .insert({ nome, email_contato }).select().single();
      if (error || !tenant) return { error };
      // Semear origens padrão
      await supabase.from('origens').insert(
        ORIGENS_DEF.map(nome => ({ tenant_id: tenant.id, nome }))
      );
      // Semear dentistas padrão
      await supabase.from('dentistas').insert(
        DEFAULT_DENTISTAS.map(({ id: _id, ...d }) => ({ ...d, tenant_id: tenant.id }))
      );
      return { tenant };
    },
    // Atualizar tenant
    updateTenant: async (id, fields) => {
      const { error } = await supabase.from('tenants').update(fields).eq('id', id);
      return { error };
    },
    // Listar usuários de um tenant
    listUsers: async (tenant_id) => {
      const query = tenant_id
        ? supabase.from('profiles').select('*').eq('tenant_id', tenant_id).order('nome')
        : supabase.from('profiles').select('*').neq('role','super_admin').order('nome');
      const { data } = await query;
      return data || [];
    },
    // Criar usuário (usa cliente sem sessão para não logar como novo user)
    createUser: async ({ email, password, senha, nome, role, tenant_id, permissions: perms }) => {
      const pw = password || senha;
      const { data: signupData, error: signupErr } = await supabaseSignup.auth.signUp({
        email, password: pw
      });
      if (signupErr) return { error: signupErr.message };
      await supabaseSignup.auth.signOut();

      const userId = signupData?.user?.id;
      if (!userId) return { error: 'Falha ao criar conta' };

      const { error: profileErr } = await supabase.from('profiles').insert({
        id: userId, email, nome, role, tenant_id,
        permissions: perms
      });
      if (profileErr) return { error: profileErr.message };
      return { userId };
    },
    // Atualizar usuário / permissões
    updateUser: async (id, fields) => {
      const { error } = await supabase.from('profiles').update(fields).eq('id', id);
      return { error };
    },
  };

  const state = { clientes, agenda, origens, dentistas, caixaDia, historicoFechamentos, procedimentos };

  // Derivados de procedimentos (nomes e mapa de preços) para os componentes
  const procNames  = procedimentos.map(p => p.nome);
  const procPrecos = Object.fromEntries(procedimentos.map(p => [p.nome, parseFloat(p.valor) || 0]));
  const procCores  = Object.fromEntries(procedimentos.filter(p => p.cor).map(p => [p.nome, p.cor]));

  return (
    <CRMContext.Provider value={{
      state, dispatch,
      usuario, login, logout,
      authLoading, dataLoading,
      permissions, ADMIN_PERMS, RECEPCAO_PERMS,
      toast, showToast,
      activePanel, setActivePanel,
      selectedDate, setSelectedDate,
      selectedDentista, setSelectedDentista,
      prontuarioModal, setProntuarioModal,
      caixaModal, setCaixaModal,
      getAgKey, getDateStr,
      todayStr, pad,
      superAdmin,
      procNames, procPrecos, procCores,
      caixaSenha, loadAgendaMes, logAudit, verifyMfaLogin,
      caixaSenha, loadAgendaMes,
    }}>
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  return useContext(CRMContext);
}
