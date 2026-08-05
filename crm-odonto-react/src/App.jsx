import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CRMProvider, useCRM } from './context/CRMContext';
import Admin from './pages/Admin';
import SuperAdmin from './pages/SuperAdmin';
import ApiDocs from './pages/ApiDocs';
import Toast from './components/shared/Toast';

function AuthGate({ children, allowRoles }) {
  const { usuario, authLoading } = useCRM();
  if (authLoading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0a0a0a',color:'#fff',flexDirection:'column',gap:16}}>
      <div style={{width:40,height:40,border:'3px solid rgba(255,255,255,.2)',borderTopColor:'var(--v2,#7c3aed)',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}></div>
      <span style={{opacity:.6,fontSize:14}}>Carregando...</span>
    </div>
  );
  if (!usuario) return <Navigate to="/" replace />;
  if (allowRoles && !allowRoles.includes(usuario.role)) {
    return <Navigate to={usuario.role === 'super_admin' ? '/superadmin' : '/admin'} replace />;
  }
  return children;
}

function PortaDeEntrada() {
  const { usuario, authLoading } = useCRM();
  if (authLoading) return null;
  if (usuario) return <Navigate to={usuario.role === 'super_admin' ? '/superadmin' : '/admin'} replace />;
  // Guarda anti-pingue-pongue (05/08): se o sistema nos mandou de volta DESLOGADOS
  // duas vezes seguidas, a sessão de lá está velha e o SSO não gruda — devolvemos
  // com ?relogin=1 para o app-mãe DERRUBAR a sessão e mostrar o login (sem isso a
  // tela fica piscando num loop infinito entre os dois apps).
  const ultimaVolta = +sessionStorage.getItem('odonto_bounce') || 0;
  const repetiu = Date.now() - ultimaVolta < 60000;
  sessionStorage.setItem('odonto_bounce', String(Date.now()));
  window.location.replace('https://sistema.avancercrm.com.br' + (repetiu ? '/?relogin=1' : ''));
  return null;
}

function AppRoutes() {
  return (
    <>
      <Toast />
      <Routes>
        {/* AVANCERCRM (02/08): o site institucional do odonto foi ELIMINADO deste
            nicho — logado cai no backend; deslogado volta pro login do AvancerCRM. */}
        <Route path="/" element={<PortaDeEntrada />} />
        <Route path="/api-docs" element={<ApiDocs />} />
        <Route path="/admin" element={
          <AuthGate allowRoles={['admin','recepcao']}>
            <Admin />
          </AuthGate>
        } />
        <Route path="/superadmin" element={
          <AuthGate allowRoles={['super_admin']}>
            <SuperAdmin />
          </AuthGate>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CRMProvider>
        <AppRoutes />
      </CRMProvider>
    </BrowserRouter>
  );
}
