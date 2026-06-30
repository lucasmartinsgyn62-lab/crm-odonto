import { useNavigate } from 'react-router-dom';
import { useCRM } from '../../context/CRMContext';

const MENU_ITEMS = [
  { section: 'PRINCIPAL' },
  { id: 'dashboard', label: 'Dashboard Diária', icon: 'ti-layout-dashboard', adminOnly: true },
  { id: 'agenda', label: 'Agenda', icon: 'ti-calendar' },
  { section: 'GESTÃO' },
  { id: 'clientes', label: 'Clientes', icon: 'ti-users' },
  { id: 'dentistas', label: 'Dentistas', icon: 'ti-stethoscope' },
  { id: 'origens', label: 'Origens', icon: 'ti-map-pin', adminOnly: true },
  { section: 'ANÁLISE', adminOnly: true },
  { id: 'relatorio', label: 'Relatórios', icon: 'ti-chart-bar', adminOnly: true },
  { section: 'CAIXA' },
  { id: 'caixa', label: 'Fechamento de Caixa', icon: 'ti-cash-register' },
  { id: 'historico-caixa', label: 'Histórico de Caixa', icon: 'ti-history' },
];

export default function Sidebar() {
  const { usuario, logout, activePanel, setActivePanel } = useCRM();
  const navigate = useNavigate();
  const isAdmin = usuario?.perfil === 'administrador';

  function handleLogout() {
    logout();
    navigate('/');
  }

  const initials = (usuario?.nome || 'AD').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();

  return (
    <div className="sidebar">
      <div className="sb-logo">
        <h2>SUA LOGO AQUI</h2>
        <p>CRM ODONTOLÓGICO</p>
      </div>
      <div className="sb-menu">
        {!isAdmin && (
          <div style={{display:'flex',background:'rgba(255,255,255,.18)',color:'#fff',fontSize:9,fontWeight:700,letterSpacing:'1.5px',padding:'.3rem 1rem',borderRadius:20,margin:'.4rem 1rem .8rem',alignItems:'center',gap:'.4rem',justifyContent:'center'}}>
            <i className="ti ti-headset"></i> RECEPÇÃO
          </div>
        )}
        {MENU_ITEMS.map((item, i) => {
          if (item.section !== undefined) {
            if (item.adminOnly && !isAdmin) return null;
            return <div key={i} className="sb-sec">{item.section}</div>;
          }
          if (item.adminOnly && !isAdmin) return null;
          return (
            <div
              key={item.id}
              className={`mi${activePanel === item.id ? ' active' : ''}`}
              onClick={() => setActivePanel(item.id)}
            >
              <i className={`ti ${item.icon}`}></i>
              {item.label}
            </div>
          );
        })}
      </div>
      <div className="sb-foot">
        <div className="sb-user">
          <div className="sb-av">{initials}</div>
          <div>
            <div className="sb-un">{usuario?.nome || 'Usuário'}</div>
            <div className="sb-ur">{isAdmin ? 'Acesso total' : 'Recepção'}</div>
          </div>
        </div>
        <button className="btn-out" onClick={handleLogout}>
          <i className="ti ti-logout" style={{fontSize:13,verticalAlign:-2}}></i> Sair
        </button>
      </div>
    </div>
  );
}
