import { useState, useEffect, useCallback } from 'react';
import { useCRM } from '../../context/CRMContext';
import { supabase } from '../../lib/supabase';

export default function Seguranca() {
  const { usuario, showToast } = useCRM();
  const [fatores, setFatores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enroll, setEnroll] = useState(null); // { factorId, qr, secret }
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    setFatores(data?.totp || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const ativo = fatores.some(f => f.status === 'verified');

  async function iniciar() {
    // remove fatores não verificados antes de criar um novo (evita acúmulo)
    for (const f of fatores.filter(f => f.status !== 'verified')) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `AvancerCRM ${Date.now()}` });
    if (error) { showToast('Erro ao iniciar 2FA: ' + error.message, 'error'); return; }
    setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    setCodigo('');
  }

  async function confirmar() {
    if (codigo.trim().length < 6) { showToast('Digite o código de 6 dígitos', 'warning'); return; }
    setVerificando(true);
    const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
    if (e1) { showToast('Erro: ' + e1.message, 'error'); setVerificando(false); return; }
    const { error: e2 } = await supabase.auth.mfa.verify({ factorId: enroll.factorId, challengeId: ch.id, code: codigo.trim() });
    setVerificando(false);
    if (e2) { showToast('Código inválido. Tente de novo.', 'error'); return; }
    showToast('✔ 2FA ativado! Agora o login vai pedir o código.', 'success');
    setEnroll(null); setCodigo('');
    carregar();
  }

  async function desativar() {
    if (!window.confirm('Desativar a verificação em duas etapas desta conta?')) return;
    for (const f of fatores) await supabase.auth.mfa.unenroll({ factorId: f.id });
    showToast('2FA desativado.', 'warning');
    carregar();
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--v1)', marginBottom: 2 }}>Segurança da Conta</h2>
        <p style={{ fontSize: 12, color: 'var(--cinza)' }}>Conta: <strong>{usuario?.email}</strong> ({usuario?.role})</p>
      </div>

      <div className="tc">
        <div className="th"><h3>🔐 Verificação em duas etapas (2FA)</h3></div>
        <div style={{ padding: '1.2rem 1.3rem' }}>
          <p style={{ fontSize: 13, color: 'var(--cinza)', marginBottom: '1rem', lineHeight: 1.6 }}>
            Adicione uma camada extra de proteção: além da senha, o login vai pedir um código gerado por um app
            autenticador (Google Authenticator, Authy, Microsoft Authenticator) no seu celular. Recomendado
            principalmente para a conta de <strong>administrador</strong>, que enxerga todos os dados.
          </p>

          {loading ? (
            <p style={{ fontSize: 13, color: 'var(--cinza-cl)' }}>Carregando…</p>
          ) : ativo ? (
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#E8F5E9', color: '#1B5E20', padding: '.6rem 1rem', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
                <i className="ti ti-shield-check" style={{ fontSize: 18 }}></i> 2FA está ATIVO nesta conta
              </div>
              <div style={{ marginTop: '1rem' }}>
                <button className="btdl" onClick={desativar}>Desativar 2FA</button>
              </div>
            </div>
          ) : enroll ? (
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ background: '#fff', border: '1px solid var(--borda)', borderRadius: 12, padding: 12 }}>
                <img src={enroll.qr} alt="QR Code 2FA" style={{ width: 200, height: 200, display: 'block' }} />
              </div>
              <div style={{ flex: 1, minWidth: 260 }}>
                <ol style={{ fontSize: 13, color: 'var(--cinza)', lineHeight: 1.9, paddingLeft: '1.1rem', margin: 0 }}>
                  <li>Abra seu app autenticador no celular.</li>
                  <li>Escaneie o QR Code ao lado (ou digite a chave abaixo).</li>
                  <li>Digite o código de 6 dígitos que aparecer no app.</li>
                </ol>
                <div style={{ margin: '.8rem 0', fontSize: 11, color: 'var(--cinza-cl)' }}>
                  Chave manual: <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4, userSelect: 'all' }}>{enroll.secret}</code>
                </div>
                <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    className="inf" style={{ width: 140, fontSize: 18, letterSpacing: 4, textAlign: 'center' }}
                    placeholder="000000" inputMode="numeric" maxLength={6}
                    value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => { if (e.key === 'Enter') confirmar(); }}
                  />
                  <button className="btsv" onClick={confirmar} disabled={verificando}>
                    {verificando ? 'Verificando…' : 'Confirmar e ativar'}
                  </button>
                  <button className="btn-pront" onClick={() => setEnroll(null)}>Cancelar</button>
                </div>
              </div>
            </div>
          ) : (
            <button className="btsv" onClick={iniciar}>
              <i className="ti ti-shield-lock"></i> Ativar verificação em duas etapas
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
