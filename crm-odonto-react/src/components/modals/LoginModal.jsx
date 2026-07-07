import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCRM } from '../../context/CRMContext';

export default function LoginModal({ onClose }) {
  const { login, verifyMfaLogin } = useCRM();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [err, setErr]     = useState('');
  const [loading, setLoading] = useState(false);
  const [mfa, setMfa]     = useState(null); // { factorId, email }
  const [code, setCode]   = useState('');

  function irPara(profile) {
    onClose();
    if (profile.role === 'super_admin') navigate('/superadmin');
    else navigate('/admin');
  }

  async function doLogin() {
    if (!email.trim() || !pass.trim()) return;
    setLoading(true);
    setErr('');
    const r = await login(email.trim(), pass);
    setLoading(false);
    if (r?.mfaRequired) { setMfa({ factorId: r.factorId, email: r.email }); setCode(''); }
    else if (r?.profile) irPara(r.profile);
    else setErr(r?.error || 'E-mail ou senha incorretos.');
  }

  async function doMfa() {
    if (code.trim().length < 6) return;
    setLoading(true);
    setErr('');
    const r = await verifyMfaLogin(mfa.factorId, code, mfa.email);
    setLoading(false);
    if (r?.profile) irPara(r.profile);
    else setErr(r?.error || 'Código inválido.');
  }

  function handleKey(e) { if (e.key === 'Enter') (mfa ? doMfa() : doLogin()); }

  return (
    <div className="modal-ov open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mbox">
        <button className="mclose" onClick={onClose}>✕</button>
        <div className="mlogo">
          <img src="/logo-avancer.svg" alt="AvancerCRM" style={{ height: 56, width: 'auto', display: 'block', margin: '0 auto 8px' }} />
          <div className="hs">SISTEMA ADMINISTRATIVO</div>
        </div>
        <h3>Área Administrativa</h3>
        <p className="mdesc">{mfa ? 'Verificação em duas etapas' : 'Acesso restrito a administradores'}</p>
        {err && <div className="merr">⚠️ {err}</div>}

        {mfa ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--cinza)', margin: '0 0 .8rem', textAlign: 'center' }}>
              Digite o código de 6 dígitos do seu app autenticador.
            </p>
            <input
              className="minp"
              style={{ fontSize: 20, letterSpacing: 6, textAlign: 'center' }}
              placeholder="000000" inputMode="numeric" maxLength={6} autoFocus
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button className="mbtn" onClick={doMfa} disabled={loading}>
              {loading ? 'Verificando...' : 'Confirmar código'}
            </button>
            <button className="mbtn" style={{ background: '#e0e0e0', color: '#333', marginTop: 8 }}
                    onClick={() => { setMfa(null); setErr(''); }} disabled={loading}>
              Voltar
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
