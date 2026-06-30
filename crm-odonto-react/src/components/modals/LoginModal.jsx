import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCRM } from '../../context/CRMContext';

export default function LoginModal({ onClose }) {
  const { login } = useCRM();
  const navigate = useNavigate();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState(false);

  function doLogin() {
    if (login(user, pass)) {
      onClose();
      navigate('/admin');
    } else {
      setErr(true);
      setTimeout(() => setErr(false), 3000);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') doLogin();
  }

  return (
    <div className="modal-ov open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mbox">
        <button className="mclose" onClick={onClose}>✕</button>
        <div className="mlogo">
          <div className="ht" style={{fontSize:16,color:'var(--v2)'}}>SUA LOGO AQUI</div>
          <div className="hs">SISTEMA ADMINISTRATIVO</div>
        </div>
        <h3>Área Administrativa</h3>
        <p className="mdesc">Acesso restrito a administradores</p>
        {err && <div className="merr">⚠️ Usuário ou senha incorretos.</div>}
        <input
          className="minp"
          type="text"
          placeholder="Usuário"
          value={user}
          onChange={e => setUser(e.target.value)}
          onKeyDown={handleKey}
          autoComplete="username"
        />
        <input
          className="minp"
          type="password"
          placeholder="Senha"
          value={pass}
          onChange={e => setPass(e.target.value)}
          onKeyDown={handleKey}
          autoComplete="current-password"
        />
        <button className="mbtn" onClick={doLogin}>Entrar no Sistema</button>
      </div>
    </div>
  );
}
