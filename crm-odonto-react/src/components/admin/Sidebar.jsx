import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCRM } from '../../context/CRMContext';
import { supabase } from '../../lib/supabase.js';

const MENU = [
  { section: 'PRINCIPAL' },
  { id: 'dashboard',      label: 'Dashboard Diária',    icon: 'ti-layout-dashboard', perm: 'dashboard' , cor: '#0ea5e9' },
  { id: 'agenda',         label: 'Agenda',              icon: 'ti-calendar',         perm: 'agenda' , cor: '#0891b2' },
  { section: 'GESTÃO' },
  { id: 'clientes',       label: 'Pacientes',            icon: 'ti-users',            perm: 'clientes' , cor: '#0d9488' },
  { id: 'prontuario',     label: 'Prontuário Inteligente', icon: 'ti-dental-broken',  perm: 'prontuario' , cor: '#00b3ff' },
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

// ENQUADRADOR (02/08): simula o quadro do menu — arrasta a imagem, dá zoom e
// salva exatamente o recorte que vai aparecer.
const QUADRO = 220, SAIDA = 360;
function EnquadradorLogo({ imgSrc, onSalvar, onCancelar }) {
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const arrasto = useRef(null);
  useEffect(() => {
    const i = new Image();
    i.onload = () => { setImg(i); setZoom(1); setPos({ x: 0, y: 0 }); };
    i.src = imgSrc;
  }, [imgSrc]);
  if (!img) return null;
  const s0 = Math.min(QUADRO / img.width, QUADRO / img.height);
  const w = img.width * s0 * zoom, h = img.height * s0 * zoom;
  const baixar = e => { arrasto.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const mover = e => { if (arrasto.current) setPos({ x: e.clientX - arrasto.current.x, y: e.clientY - arrasto.current.y }); };
  const soltar = () => { arrasto.current = null; };
  function salvar() {
    const k = SAIDA / QUADRO;
    const cv = document.createElement('canvas');
    cv.width = SAIDA; cv.height = SAIDA;
    cv.getContext('2d').drawImage(img, ((QUADRO - w) / 2 + pos.x) * k, ((QUADRO - h) / 2 + pos.y) * k, w * k, h * k);
    onSalvar(cv.toDataURL('image/png'));
  }
  return (
    <div onClick={e => e.target === e.currentTarget && onCancelar()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 22, width: '100%', maxWidth: 420, color: '#0f172a' }}>
        <h3 style={{ margin: '0 0 4px', border: 'none', padding: 0 }}>🖼️ Enquadrar a logomarca</h3>
        <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 12 }}>Este é o <b>quadro exato do menu</b>. Arraste para posicionar e use o zoom — o que você vê é o que fica.</div>
        <div style={{ background: '#0aa2e0', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div onPointerDown={baixar} onPointerMove={mover} onPointerUp={soltar} onPointerLeave={soltar}
            style={{ width: QUADRO, height: QUADRO, border: '2px dashed rgba(255,255,255,.7)', borderRadius: 16, overflow: 'hidden', position: 'relative', cursor: 'grab', background: 'rgba(255,255,255,.08)', touchAction: 'none' }}>
            <img src={imgSrc} alt="" draggable={false}
              style={{ position: 'absolute', left: (QUADRO - w) / 2 + pos.x, top: (QUADRO - h) / 2 + pos.y, width: w, height: h, maxWidth: 'none', pointerEvents: 'none', userSelect: 'none' }} />
          </div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.85)' }}>⬆ assim vai ficar no topo do menu</div>
        </div>
        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>🔍 Zoom ({Math.round(zoom * 100)}%)</label>
        <input type="range" min="0.4" max="3" step="0.02" value={zoom} onChange={e => setZoom(+e.target.value)} style={{ width: '100%' }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 12 }}>
          <button onClick={() => { setZoom(1); setPos({ x: 0, y: 0 }); }} style={btnGhost}>↺ Recentralizar</button>
          <span style={{ display: 'inline-flex', gap: 8 }}>
            <button onClick={onCancelar} style={btnGhost}>Cancelar</button>
            <button onClick={salvar} style={btnCheia}>✓ Usar este enquadramento</button>
          </span>
        </div>
      </div>
    </div>
  );
}
const btnGhost = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 9, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#475569' };
const btnCheia = { background: '#0aa2e0', border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#fff' };

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
  const [enquadrando, setEnquadrando] = useState(null); // dataURL → abre o enquadrador
  function subirLogo(f) {
    if (!f || !usuario?.tenant_id) return;
    const r = new FileReader();
    r.onload = () => setEnquadrando(r.result);
    r.readAsDataURL(f);
    if (logoRef.current) logoRef.current.value = '';
  }
  async function salvarEnquadramento(dataUrl) {
    setEnquadrando(null); setEnviandoLogo(true);
    try {
      await supabase.from('tenants').update({ logo_url: dataUrl }).eq('id', usuario.tenant_id);
      setLogo(l => ({ ...l, logo_url: dataUrl }));
    } catch { /* mantém a moldura */ }
    setEnviandoLogo(false);
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
          <>
            <input type="range" min="36" max="120" value={logo.logo_altura || 72}
              onChange={e => ajustarLogo(+e.target.value)} title="Ajustar o tamanho da logo no menu"
              style={{ width: '70%', display: 'block', margin: '6px auto 0', accentColor: '#fff' }} />
            <button onClick={() => setEnquadrando(logo.logo_url)} title="Reposicionar/zoom no quadro"
              style={{ display: 'block', margin: '4px auto 0', background: 'rgba(255,255,255,.18)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 10, fontWeight: 700, padding: '3px 10px', cursor: 'pointer' }}>
              🖼️ Enquadrar
            </button>
          </>
        )}
        {enquadrando && <EnquadradorLogo imgSrc={enquadrando} onSalvar={salvarEnquadramento} onCancelar={() => setEnquadrando(null)} />}
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
