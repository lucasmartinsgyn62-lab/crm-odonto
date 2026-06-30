import { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import { STORAGE_KEY, USERS_KEY, DEFAULT_USERS, DEFAULT_DENTISTAS, ORIGENS_DEF } from '../constants';

export const CRMContext = createContext(null);

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function todayStr() {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        clientes: p.clientes || [],
        agenda: p.agenda || {},
        origens: p.origens || [...ORIGENS_DEF],
        dentistas: p.dentistas || [...DEFAULT_DENTISTAS],
        caixaDia: p.caixaDia || [],
        historicoFechamentos: p.historicoFechamentos || [],
      };
    }
  } catch {}
  return {
    clientes: [],
    agenda: {},
    origens: [...ORIGENS_DEF],
    dentistas: [...DEFAULT_DENTISTAS],
    caixaDia: [],
    historicoFechamentos: [],
  };
}

function saveStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function reducer(state, action) {
  let next;
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, ...action.payload };

    case 'ADD_CLIENTE': {
      const c = { ...action.payload, id: Date.now() };
      next = { ...state, clientes: [...state.clientes, c] };
      break;
    }
    case 'UPDATE_CLIENTE': {
      next = {
        ...state,
        clientes: state.clientes.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c)
      };
      break;
    }
    case 'DELETE_CLIENTE': {
      next = { ...state, clientes: state.clientes.filter(c => c.id !== action.payload) };
      break;
    }

    case 'SET_AGENDA_SLOT': {
      const { agKey, horario, slot } = action.payload;
      next = {
        ...state,
        agenda: {
          ...state.agenda,
          [agKey]: {
            ...(state.agenda[agKey] || {}),
            [horario]: slot
          }
        }
      };
      break;
    }
    case 'CLEAR_AGENDA_SLOT': {
      const { agKey, horario } = action.payload;
      const dayAgenda = { ...(state.agenda[agKey] || {}) };
      delete dayAgenda[horario];
      next = { ...state, agenda: { ...state.agenda, [agKey]: dayAgenda } };
      break;
    }

    case 'ADD_DENTISTA': {
      const d = { ...action.payload, id: Date.now() };
      next = { ...state, dentistas: [...state.dentistas, d] };
      break;
    }
    case 'UPDATE_DENTISTA': {
      next = {
        ...state,
        dentistas: state.dentistas.map(d => d.id === action.payload.id ? { ...d, ...action.payload } : d)
      };
      break;
    }
    case 'DELETE_DENTISTA': {
      next = { ...state, dentistas: state.dentistas.filter(d => d.id !== action.payload) };
      break;
    }

    case 'ADD_ORIGEM': {
      if (state.origens.includes(action.payload)) return state;
      next = { ...state, origens: [...state.origens, action.payload] };
      break;
    }
    case 'DELETE_ORIGEM': {
      next = { ...state, origens: state.origens.filter(o => o !== action.payload) };
      break;
    }

    case 'ADD_CAIXA_ENTRY': {
      const existing = state.caixaDia.findIndex(x => x.mes === action.payload.mes && x.h === action.payload.h);
      const newCaixa = [...state.caixaDia];
      if (existing >= 0) newCaixa[existing] = action.payload;
      else newCaixa.push(action.payload);
      next = { ...state, caixaDia: newCaixa };
      break;
    }
    case 'FECHAR_CAIXA': {
      const { fechamento } = action.payload;
      next = {
        ...state,
        historicoFechamentos: [fechamento, ...state.historicoFechamentos],
        caixaDia: []
      };
      break;
    }

    case 'SAVE_ATUALIZACAO': {
      const { agKey, horario, atualizacoes } = action.payload;
      const slot = state.agenda[agKey]?.[horario] || {};
      next = {
        ...state,
        agenda: {
          ...state.agenda,
          [agKey]: {
            ...(state.agenda[agKey] || {}),
            [horario]: { ...slot, atualizacoes }
          }
        }
      };
      break;
    }

    case 'UPDATE_PROCS_SLOT': {
      const { agKey, horario, procedimentosRealizados } = action.payload;
      const s = state.agenda[agKey]?.[horario] || {};
      next = {
        ...state,
        agenda: {
          ...state.agenda,
          [agKey]: {
            ...(state.agenda[agKey] || {}),
            [horario]: { ...s, procedimentosRealizados }
          }
        }
      };
      break;
    }

    case 'UPDATE_IMGS_SLOT': {
      const { agKey, horario, imagens } = action.payload;
      const sl = state.agenda[agKey]?.[horario] || {};
      next = {
        ...state,
        agenda: {
          ...state.agenda,
          [agKey]: {
            ...(state.agenda[agKey] || {}),
            [horario]: { ...sl, imagens }
          }
        }
      };
      break;
    }

    default:
      return state;
  }
  saveStorage(next);
  return next;
}

export function CRMProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadStorage);
  const [usuario, setUsuario] = useState(null);
  const [toast, setToast] = useState(null);
  const [activePanel, setActivePanel] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDentista, setSelectedDentista] = useState('');
  const [prontuarioModal, setProntuarioModal] = useState(null);
  const [caixaModal, setCaixaModal] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('crm_session');
    if (stored) {
      try { setUsuario(JSON.parse(stored)); } catch {}
    }
  }, []);

  const getUsers = useCallback(() => {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [...DEFAULT_USERS];
  }, []);

  const login = useCallback((user, senha) => {
    const users = getUsers();
    const found = users.find(u => u.usuario === user && u.senha === senha);
    if (found) {
      setUsuario(found);
      localStorage.setItem('crm_session', JSON.stringify(found));
      return true;
    }
    return false;
  }, [getUsers]);

  const logout = useCallback(() => {
    setUsuario(null);
    localStorage.removeItem('crm_session');
  }, []);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const getAgKey = useCallback((dent, date) => {
    const d = date || selectedDate;
    const dentStr = dent !== undefined ? dent : selectedDentista;
    const dateStr = `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
    return dentStr ? `${dentStr}||${dateStr}` : dateStr;
  }, [selectedDate, selectedDentista]);

  const getDateStr = useCallback((date) => {
    const d = date || selectedDate;
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
  }, [selectedDate]);

  return (
    <CRMContext.Provider value={{
      state, dispatch,
      usuario, login, logout,
      toast, showToast,
      activePanel, setActivePanel,
      selectedDate, setSelectedDate,
      selectedDentista, setSelectedDentista,
      prontuarioModal, setProntuarioModal,
      caixaModal, setCaixaModal,
      getAgKey, getDateStr,
      todayStr, pad
    }}>
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  return useContext(CRMContext);
}
