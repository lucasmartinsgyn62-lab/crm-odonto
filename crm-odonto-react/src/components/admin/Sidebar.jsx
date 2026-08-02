import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCRM } from '../../context/CRMContext';
import { supabase } from '../../lib/supabase.js';

const MENU = [
  { section: 'PRINCIPAL' },
  { id: 'dashboard',      label: 'Dashboard Diária',    icon: 'ti-layout-dashboard', perm: 'dashboard' },
  { id: 'agenda',         label: 'Agenda',              icon: 'ti-calendar',         perm: 'agenda' },
  { section: 'GESTÃO' },
  { id: 'clientes',       label: 'Pacientes',            icon: 'ti-users',            perm: 'clientes' },
  { id: 'dentistas',      label: 'Dentistas',           icon: 'ti-stethoscope',      perm: 'dentistas' },
  { id: 'origens',        label: 'Origens',             icon: 'ti-map-pin',          perm: 'origens' },
  { id: 'procedimentos',  label: 'Procedimentos',       icon: 'ti-dental',           perm: 'procedimentos' },
  { section: 'ANÁLISE' },
  { id: 'relatorio',      label: 'Relatórios',          icon: 'ti-chart-bar',        perm: 'relatorio' },
  { id: 'auditoria',      label: 'Auditoria',           icon: 'ti-history-toggle',   perm: 'auditoria' },
  { section: 'CAIXA' },
  { id: 'caixa',          label: 'Fechamento de Caixa', icon: 'ti-cash-register',    perm: 'caixa' },
  { id: 'historico-caixa',label: 'Histórico de Caixa', icon: 'ti-history',          perm: 'historico_caixa' },
  { section: 'AUTOMAÇÃO' },
  { id: 'central',        label: 'Central WhatsApp',    icon: 'ti-messages',         perm: 'central' },
  { id: 'whatsapp',       label: 'WhatsApp & IA',       icon: 'ti-brand-whatsapp',   perm: 'whatsapp' },
  { id: 'pipeline',       label: 'Vendas Pipeline',     icon: 'ti-layout-kanban',    perm: 'pipeline' },
  { id: 'api',            label: 'API & Integrações',   icon: 'ti-plug-connected',   perm: 'api', adminOnly: true },
];

export default function Sidebar() {
  const { usuario, logout, activePanel, setActivePanel, permissions } = useCRM();
  const navigate = useNavigate();

  // Sair volta pro LOGIN DO AVANCERCRM (o site antigo do odonto foi eliminado)
  function handleLogout() { logout(); window.location.href = 'https://avancercrm.vercel.app'; }

  const initials = (usuario?.nome || 'AD').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
  const isAdmin  = usuario?.role === 'admin';
  const isRec    = usuario?.role === 'recepcao';

  // LOGOMARCA DA CLÍNICA (02/08): moldura quadrada — o admin clica, escolhe a
  // imagem e ela substitui o logotipo; salva em base64 na própria clínica (tenant).
  const [logo, setLogo] = useState(null);       // { logo_url, logo_altura }
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const logoRef = useRef(null);
  useEffect(() => {
    if (!usuario?.tenant_id) return;
    supabase.from('tenants').select('logo_url, logo_altura').eq('id', usuario.tenant_id).single()
      .then(({ data }) => setLogo(data || {}));
  }, [usuario?.tenant_id]);
  function lerLogoComprimida(f) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(f);
      img.onload = () => {
        const alvo = Math.min(360, img.height);
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * (alvo / img.height)); cv.height = alvo;
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagem inválida')); };
      img.src = url;
    });
  }
  async function subirLogo(f) {
    if (!f || !usuario?.tenant_id) return;
    setEnviandoLogo(true);
    try {
      const dataUrl = await lerLogoComprimida(f);
      await supabase.from('tenants').update({ logo_url: dataUrl }).eq('id', usuario.tenant_id);
      setLogo(l => ({ ...l, logo_url: dataUrl }));
    } catch { /* mantém a moldura */ }
    setEnviandoLogo(false);
    if (logoRef.current) logoRef.current.value = '';
  }
  async function ajustarLogo(altura) {
    setLogo(l => ({ ...l, logo_altura: altura }));
    await supabase.from('tenants').update({ logo_altura: altura }).eq('id', usuario.tenant_id);
  }

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
        <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => subirLogo(e.target.files?.[0])} />
        {logo?.logo_url ? (
          <img src={logo.logo_url} alt="Logomarca da clínica" title={isAdmin ? 'Clique para trocar a logomarca' : ''}
            onClick={() => isAdmin && logoRef.current?.click()}
            style={{ height: logo.logo_altura || 72, maxWidth: '86%', objectFit: 'contain', display: 'block', margin: '0 auto', cursor: isAdmin ? 'pointer' : 'default' }} />
        ) : (
          <div onClick={() => isAdmin && logoRef.current?.click()} title={isAdmin ? 'Clique para enviar a logomarca da clínica' : ''}
            style={{ width: 84, height: 84, margin: '0 auto', border: '2px dashed rgba(255,255,255,.45)', borderRadius: 16,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              cursor: isAdmin ? 'pointer' : 'default', color: '#fff' }}>
            <i className={`ti ${enviandoLogo ? 'ti-loader-2' : 'ti-photo-plus'}`} style={{ fontSize: 24, opacity: .9 }}></i>
            <span style={{ fontSize: 9, fontWeight: 700, opacity: .85, textAlign: 'center', lineHeight: 1.2 }}>SUA LOGO<br />AQUI</span>
          </div>
        )}
        {isAdmin && logo?.logo_url && (
          <input type="range" min="36" max="120" value={logo.logo_altura || 72}
            onChange={e => ajustarLogo(+e.target.value)} title="Ajustar a proporção da logo"
            style={{ width: '70%', display: 'block', margin: '6px auto 0', accentColor: '#fff' }} />
        )}
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
