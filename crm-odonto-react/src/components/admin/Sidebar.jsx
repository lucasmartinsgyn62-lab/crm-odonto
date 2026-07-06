import { useNavigate } from 'react-router-dom';
import { useCRM } from '../../context/CRMContext';

const MENU = [
  { section: 'PRINCIPAL' },
  { id: 'dashboard',      label: 'Dashboard Diária',    icon: 'ti-layout-dashboard', perm: 'dashboard' },
  { id: 'agenda',         label: 'Agenda',              icon: 'ti-calendar',         perm: 'agenda' },
  { section: 'GESTÃO' },
  { id: 'clientes',       label: 'Clientes',            icon: 'ti-users',            perm: 'clientes' },
  { id: 'dentistas',      label: 'Dentistas',           icon: 'ti-stethoscope',      perm: 'dentistas' },
  { id: 'origens',        label: 'Origens',             icon: 'ti-map-pin',          perm: 'origens' },
  { section: 'ANÁLISE' },
  { id: 'relatorio',      label: 'Relatórios',          icon: 'ti-chart-bar',        perm: 'relatorio' },
  { section: 'CAIXA' },
  { id: 'caixa',          label: 'Fechamento de Caixa', icon: 'ti-cash-register',    perm: 'caixa' },
  { id: 'historico-caixa',label: 'Histórico de Caixa', icon: 'ti-history',          perm: 'historico_caixa' },
  { section: 'AUTOMAÇÃO' },
  { id: 'whatsapp',       label: 'WhatsApp & IA',       icon: 'ti-brand-whatsapp',   perm: 'whatsapp' },
  { id: 'pipeline',       label: 'Vendas Pipeline',     icon: 'ti-layout-kanban',    perm: 'pipeline' },
  { id: 'automacao',      label: 'Automação',           icon: 'ti-robot',            perm: 'automacao',
    href: import.meta.env.VITE_AUTOMACAO_URL || 'http://localhost:3006' },
];

export default function Sidebar() {
  const { usuario, logout, activePanel, setActivePanel, permissions } = useCRM();
  const navigate = useNavigate();

  function handleLogout() { logout(); navigate('/'); }

  const initials = (usuario?.nome || 'AD').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
  const isAdmin  = usuario?.role === 'admin';
  const isRec    = usuario?.role === 'recepcao';

  // Filtra seções — mostra seção só se tiver ao menos 1 item visível após ela
  function isVisible(item) {
    if (item.section !== undefined) return true;
    return permissions?.[item.perm] !== false;
  }

  const visibleItems = [];
  let lastSection = null;
  MENU.forEach(item => {
    if (item.section !== undefined) {
      lastSection = item;
    } else if (isVisible(item)) {
      if (lastSection) { visibleItems.push(lastSection); lastSection = null; }
      visibleItems.push(item);
    }
  });

  return (
    <div className="sidebar">
      <div className="sb-logo">
        <img src="/logo-avancer.svg" alt="AvancerCRM" style={{ height: 52, width: 'auto', display: 'block', margin: '0 auto' }} />
      </div>
      <div className="sb-menu">
        {isRec && (
          <div style={{display:'flex',background:'rgba(255,255,255,.18)',color:'#fff',fontSize:9,fontWeight:700,letterSpacing:'1.5px',padding:'.3rem 1rem',borderRadius:20,margin:'.4rem 1rem .8rem',alignItems:'center',gap:'.4rem',justifyContent:'center'}}>
            <i className="ti ti-headset"></i> RECEPÇÃO
          </div>
        )}
        {visibleItems.map((item, i) => {
          if (item.section !== undefined) {
            return <div key={i} className="sb-sec">{item.section}</div>;
          }
          return (
            <div
              key={item.id}
              className={`mi${activePanel === item.id ? ' active' : ''}`}
              onClick={() => item.href ? window.open(item.href, '_blank', 'noopener') : setActivePanel(item.id)}
            >
              <i className={`ti ${item.icon}`}></i>
              {item.label}
              {item.href && <i className="ti ti-external-link" style={{ marginLeft: 'auto', fontSize: 12, opacity: .6 }}></i>}
            </div>
          );
        })}
      </div>
      <div className="sb-foot">
        <div className="sb-user">
          <div className="sb-av">{initials}</div>
          <div>
            <div className="sb-un">{usuario?.nome || 'Usuário'}</div>
            <div className="sb-ur">{isAdmin ? 'Acesso total' : isRec ? 'Recepção' : usuario?.role}</div>
          </div>
        </div>
        <button className="btn-out" onClick={handleLogout}>
          <i className="ti ti-logout" style={{fontSize:13,verticalAlign:-2}}></i> Sair
        </button>
      </div>
    </div>
  );
}
