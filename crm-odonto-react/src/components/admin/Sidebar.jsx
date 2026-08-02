import { useCRM } from '../../context/CRMContext';
import logoAvancer from '../../assets/logo-avancercrm.png';

const MENU = [
  { section: 'PRINCIPAL' },
  { id: 'dashboard',      label: 'Dashboard Diária',    icon: 'ti-layout-dashboard', perm: 'dashboard' , cor: '#0ea5e9' },
  { id: 'agenda',         label: 'Agenda',              icon: 'ti-calendar',         perm: 'agenda' , cor: '#0891b2' },
  { section: 'GESTÃO' },
  { id: 'clientes',       label: 'Pacientes',            icon: 'ti-users',            perm: 'clientes' , cor: '#0d9488' },
  { id: 'prontuario',     label: 'Prontuário Inteligente', icon: 'ti-dental-broken',  perm: 'prontuario' , cor: '#00b3ff' },
  { id: 'orcamentos',   label: 'Orçamentos',          icon: 'ti-file-invoice',     perm: 'orcamentos' , cor: '#16a34a' },
  { id: 'dentistas',      label: 'Dentistas',           icon: 'ti-stethoscope',      perm: 'dentistas' , cor: '#4f46e5' },
  { id: 'origens',        label: 'Origens',             icon: 'ti-map-pin',          perm: 'origens' , cor: '#0d9488' },
  { id: 'procedimentos',  label: 'Procedimentos',       icon: 'ti-dental',           perm: 'procedimentos' , cor: '#7c3aed' },
  { section: 'ANÁLISE' },
  { id: 'relatorio',      label: 'Relatórios',          icon: 'ti-chart-bar',        perm: 'relatorio' , cor: '#0ea5e9' },
  { id: 'auditoria',      label: 'Auditoria',           icon: 'ti-history-toggle',   perm: 'auditoria' , cor: '#0891b2' },
  { section: 'CAIXA' },
  { id: 'caixa',          label: 'Fechamento de Caixa', icon: 'ti-cash-register',    perm: 'caixa' , cor: '#ea580c' },
  { id: 'historico-caixa',label: 'Histórico de Caixa', icon: 'ti-history',          perm: 'historico_caixa' , cor: '#b45309' },
  { section: 'AUTOMAÇÃO' },
  { id: 'central',        label: 'Central WhatsApp',    icon: 'ti-messages',         perm: 'central' , cor: '#16a34a' },
  { id: 'whatsapp',       label: 'WhatsApp & IA',       icon: 'ti-brand-whatsapp',   perm: 'whatsapp' , cor: '#7c3aed' },
  { id: 'pipeline',       label: 'Vendas Pipeline',     icon: 'ti-layout-kanban',    perm: 'pipeline' , cor: '#4f46e5' },
  { id: 'api',            label: 'API & Integrações',   icon: 'ti-plug-connected',   perm: 'api', adminOnly: true , cor: '#0d9488' },
];

export default function Sidebar() {
  const { usuario, logout, activePanel, setActivePanel, permissions } = useCRM();

  // Sair volta pro LOGIN DO AVANCERCRM (o site antigo do odonto foi eliminado)
  function handleLogout() { logout(); window.location.href = 'https://avancercrm.vercel.app'; }

  const initials = (usuario?.nome || 'AD').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
  const isAdmin  = usuario?.role === 'admin';
  const isRec    = usuario?.role === 'recepcao';

  // Filtra seções — mostra seção só se tiver ao menos 1 item visível após ela
  function isVisible(item) {
    if (item.section !== undefined) return true;
    if (item.adminOnly && !isAdmin) return false;
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
        {/* LOGO FIXA DO AVANCERCRM (02/08, decisão do Lucas): a marca é a nossa,
            igual à do CRM de loja. O upload de logomarca da clínica foi removido. */}
        <img src={logoAvancer} alt="AvancerCRM"
          style={{ width: '92%', maxWidth: 210, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
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
              <i className={`ti ${item.icon}`} style={{ color: activePanel === item.id ? '#fff' : item.cor }}></i>
              {item.label}
              {item.href && <i className="ti ti-external-link" style={{ marginLeft: 'auto', fontSize: 12, opacity: .6 }}></i>}
            </div>
          );
        })}
      </div>
      <div className="sb-foot">
        <div className="sb-user" onClick={() => setActivePanel('seguranca')} style={{ cursor: 'pointer' }} title="Segurança da conta (2FA)">
          <div className="sb-av">{initials}</div>
          <div>
            <div className="sb-un">{usuario?.nome || 'Usuário'}</div>
            <div className="sb-ur">{isAdmin ? 'Acesso total' : isRec ? 'Recepção' : usuario?.role}</div>
          </div>
          <i className="ti ti-shield-lock" style={{ marginLeft: 'auto', fontSize: 15, opacity: .7 }}></i>
        </div>
        <button className="btn-out" onClick={handleLogout}>
          <i className="ti ti-logout" style={{fontSize:13,verticalAlign:-2}}></i> Sair
        </button>
      </div>
    </div>
  );
}
