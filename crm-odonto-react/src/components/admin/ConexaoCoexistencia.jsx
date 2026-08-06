import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useCRM } from '../../context/CRMContext';

// CONEXÃO OFICIAL POR COEXISTÊNCIA (05/08) — substitui o formulário manual de
// credenciais. O dentista clica UM botão, faz o login da Meta no pop-up oficial
// (Embedded Signup) e escolhe o número: o WhatsApp Business do CELULAR CONTINUA
// FUNCIONANDO e as conversas passam a aparecer também na Central daqui.
// O `code` + os IDs voltam por postMessage; a troca por token acontece SÓ no
// backend (/api/wa-onboarding) — nenhum segredo passa pelo navegador.
const APP_ID = import.meta.env.VITE_META_APP_ID || '';
const CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID || '';

let sdkPromise = null;
function carregarSdkFacebook() {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (window.FB) return resolve(window.FB);
    window.fbAsyncInit = () => {
      window.FB.init({ appId: APP_ID, autoLogAppEvents: true, xfbml: false, version: 'v24.0' });
      resolve(window.FB);
    };
    const s = document.createElement('script');
    s.src = 'https://connect.facebook.net/pt_BR/sdk.js';
    s.async = true; s.defer = true; s.crossOrigin = 'anonymous';
    s.onerror = () => reject(new Error('não carregou o SDK da Meta'));
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export default function ConexaoCoexistencia() {
  const { usuario, showToast } = useCRM();
  const [conexao, setConexao] = useState(null);      // whatsapp_conexoes tipo oficial
  const [carregando, setCarregando] = useState(true);
  const [conectando, setConectando] = useState(false);
  const [erro, setErro] = useState('');
  // os IDs chegam por postMessage ANTES do callback do FB.login devolver o code
  const idsRef = useRef({ waba_id: null, phone_number_id: null });

  const configurado = !!(APP_ID && CONFIG_ID);
  const isAdmin = usuario?.role === 'admin' || usuario?.role === 'super_admin';

  async function carregarStatus() {
    const { data } = await supabase.from('whatsapp_conexoes')
      .select('id, nome, numero, status, phone_number_id, created_at')
      .eq('tenant_id', usuario?.tenant_id).eq('tipo', 'oficial')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    setConexao(data || null);
    setCarregando(false);
  }
  useEffect(() => { if (usuario?.tenant_id) carregarStatus(); }, [usuario?.tenant_id]); // eslint-disable-line

  // Mensagens do pop-up do Embedded Signup (waba_id/phone_number_id escolhidos)
  useEffect(() => {
    function aoMensagem(e) {
      if (!String(e.origin).endsWith('facebook.com')) return;
      try {
        const dados = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (dados?.type === 'WA_EMBEDDED_SIGNUP' && dados?.event === 'FINISH') {
          idsRef.current = {
            waba_id: dados.data?.waba_id || null,
            phone_number_id: dados.data?.phone_number_id || null,
          };
        }
      } catch { /* mensagens de outros scripts */ }
    }
    window.addEventListener('message', aoMensagem);
    return () => window.removeEventListener('message', aoMensagem);
  }, []);

  async function conectar() {
    if (!configurado) return;
    setErro(''); setConectando(true);
    try {
      const FB = await carregarSdkFacebook();
      FB.login(resp => {
        (async () => {
          const code = resp?.authResponse?.code;
          if (!code) { setErro('Conexão cancelada no pop-up da Meta.'); setConectando(false); return; }
          // pequena espera: o postMessage com os IDs pode chegar logo após o callback
          for (let i = 0; i < 10 && !idsRef.current.phone_number_id; i++) {
            await new Promise(r => setTimeout(r, 300));
          }
          const { waba_id, phone_number_id } = idsRef.current;
          if (!waba_id || !phone_number_id) {
            setErro('A Meta não devolveu o número escolhido. Tente de novo.');
            setConectando(false); return;
          }
          const { data: sess } = await supabase.auth.getSession();
          const r = await fetch('/api/wa-onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess?.session?.access_token || ''}` },
            body: JSON.stringify({ code, waba_id, phone_number_id }),
          });
          const j = await r.json().catch(() => null);
          if (!r.ok) {
            setErro(j?.detalhe || j?.error || 'Não consegui concluir a conexão.');
          } else {
            showToast(`✔ WhatsApp ${j.numero || ''} conectado por Coexistência!`, 'success');
            await carregarStatus();
          }
          setConectando(false);
        })();
      }, {
        config_id: CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: 'whatsapp_business_app_onboarding', // COEXISTÊNCIA: número continua no app do celular
          sessionInfoVersion: '3',
        },
      });
    } catch (e) {
      setErro(String(e?.message || e));
      setConectando(false);
    }
  }

  const box = { background: '#fff', border: '1px solid var(--borda)', borderRadius: 'var(--rl)', padding: '1.2rem 1.4rem', maxWidth: 680 };

  return (
    <div className="fp" style={{ maxWidth: 720 }}>
      <h3 style={{ margin: 0, border: 'none', padding: 0 }}>Conectar o WhatsApp da clínica (oficial)</h3>
      <p className="bl-h-sub" style={{ margin: '4px 0 14px' }}>
        Conexão oficial da Meta por <b>Coexistência</b>: o WhatsApp Business <b>continua funcionando
        no celular</b> e as conversas passam a aparecer também aqui na Central — sem QR code de
        sistema paralelo, sem risco de bloqueio.
      </p>

      {/* como funciona, em 3 passos de gente */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          ['1', 'Clique em Conectar', 'Abre o pop-up oficial da Meta (o mesmo do Facebook).'],
          ['2', 'Escolha o número', 'Entre com a conta da clínica e aponte o WhatsApp de vocês.'],
          ['3', 'Pronto', 'O celular segue normal e a Central recebe tudo em tempo real.'],
        ].map(([n, t, d]) => (
          <div key={n} style={{ background: 'var(--b1)', border: '1px solid var(--borda)', borderRadius: 12, padding: '.7rem .9rem' }}>
            <span className="bl-passo">{n}</span><b style={{ fontSize: 13 }}>{t}</b>
            <p style={{ fontSize: 11.5, color: 'var(--cinza)', marginTop: 3 }}>{d}</p>
          </div>
        ))}
      </div>

      {carregando ? <p className="pi-vazio">Verificando a conexão…</p> : conexao?.status === 'conectado' ? (
        <div style={{ ...box, borderColor: '#16a34a', background: '#F0FDF4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26 }}>✅</span>
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 15 }}>{conexao.numero || 'WhatsApp conectado'}</b>
              <div style={{ fontSize: 12, color: 'var(--cinza)' }}>
                Coexistência ativa — o celular da clínica continua funcionando normalmente.
              </div>
            </div>
            <span className="badge b-fin">CONECTADO</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--cinza)', marginTop: 10 }}>
            As conversas chegam na <b>Central WhatsApp</b>. Para trocar o número, conecte de novo abaixo.
          </div>
          {isAdmin && configurado && (
            <button className="btsv" style={{ marginTop: 10, background: '#64748b' }} disabled={conectando} onClick={conectar}>
              {conectando ? '⏳ conectando…' : '🔄 Reconectar / trocar o número'}
            </button>
          )}
        </div>
      ) : configurado ? (
        <div style={box}>
          {isAdmin ? (
            <>
              <button className="btsv" style={{ fontSize: 14.5, padding: '.7rem 1.6rem', background: 'linear-gradient(135deg,#00b3ff,#00e0ff)' }}
                disabled={conectando} onClick={conectar} data-guia="wpp.conectar">
                {conectando ? '⏳ aguardando a Meta…' : '🔗 Conectar com a Meta (Coexistência)'}
              </button>
              <p style={{ fontSize: 11.5, color: 'var(--cinza-cl)', marginTop: 8 }}>
                🔒 Tokens guardados só no servidor · webhook verificado e assinado · nada de WhatsApp Web
              </p>
            </>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--cinza)' }}>Peça ao administrador da clínica para fazer a conexão.</p>
          )}
        </div>
      ) : (
        <div style={{ ...box, borderColor: '#F0C36D', background: '#FFF9EB' }}>
          <b style={{ fontSize: 13.5 }}>🔧 Ativação com o suporte</b>
          <p style={{ fontSize: 12.5, color: 'var(--cinza)', marginTop: 4 }}>
            A conexão oficial está sendo habilitada junto à Meta. Assim que liberar, o botão
            "Conectar" aparece aqui — clique no ✨ do Cauê e peça para abrir um chamado que a
            equipe avisa você.
          </p>
        </div>
      )}

      {erro && <div className="badge b-flt" style={{ display: 'inline-block', marginTop: 10 }}>{erro}</div>}
    </div>
  );
}
