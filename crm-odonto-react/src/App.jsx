import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CRMProvider, useCRM } from './context/CRMContext';
import Landing from './pages/Landing';
import Admin from './pages/Admin';
import SuperAdmin from './pages/SuperAdmin';
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

function AppRoutes() {
  return (
    <>
      <Toast />
      <Routes>
        <Route path="/" element={<Landing />} />
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
