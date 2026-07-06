import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCRM } from '../../context/CRMContext';

export default function LoginModal({ onClose }) {
  const { login } = useCRM();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [err, setErr]     = useState('');
  const [loading, setLoading] = useState(false);

  async function doLogin() {
    if (!email.trim() || !pass.trim()) return;
    setLoading(true);
    setErr('');
    const profile = await login(email.trim(), pass);
    setLoading(false);
    if (profile) {
      onClose();
      if (profile.role === 'super_admin') navigate('/superadmin');
      else navigate('/admin');
    } else {
      setErr('E-mail ou senha incorretos.');
    }
  }

  function handleKey(e) { if (e.key === 'Enter') doLogin(); }

  return (
    <div className="modal-ov open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mbox">
        <button className="mclose" onClick={onClose}>✕</button>
        <div className="mlogo">
          <img src="/logo-avancer.svg" alt="AvancerCRM" style={{ height: 56, width: 'auto', display: 'block', margin: '0 auto 8px' }} />
          <div className="hs">SISTEMA ADMINISTRATIVO</div>
        </div>
        <h3>Área Administrativa</h3>
        <p className="mdesc">Acesso restrito a administradores</p>
        {err && <div className="merr">⚠️ {err}</div>}
        <input
          className="minp"
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={handleKey}
          autoComplete="email"
          disabled={loading}
        />
        <input
          className="minp"
          type="password"
          placeholder="Senha"
          value={pass}
          onChange={e => setPass(e.target.value)}
          onKeyDown={handleKey}
          autoComplete="current-password"
          disabled={loading}
        />
        <button className="mbtn" onClick={doLogin} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar no Sistema'}
        </button>
      </div>
    </div>
  );
}
