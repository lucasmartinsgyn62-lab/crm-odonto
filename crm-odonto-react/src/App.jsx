import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CRMProvider, useCRM } from './context/CRMContext';
import Landing from './pages/Landing';
import Admin from './pages/Admin';
import Toast from './components/shared/Toast';

function ProtectedAdmin() {
  const { usuario } = useCRM();
  if (!usuario) return <Navigate to="/" replace />;
  return <Admin />;
}

function AppRoutes() {
  return (
    <>
      <Toast />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin" element={<ProtectedAdmin />} />
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
