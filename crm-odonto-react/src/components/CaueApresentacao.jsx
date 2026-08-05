import { useState } from 'react';
import caueVideo3 from '../assets/caue3.webm';

// POP-UP DE APRESENTAÇÃO DO CAUÊ (04/08, CRM Odontológico) — mesma lógica do pop-up da Cloe:
// aparece TODA VEZ que o usuário entra no sistema ou atualiza a página (sem
// trava por sessão — pedido do dono), mostrando o assistente da cintura pra
// cima (o corte é suavizado com máscara CSS, sem linha dura) e o balão.
export default function CaueApresentacao({ usuario }) {
  const [visivel, setVisivel] = useState(true);
  function fechar() { setVisivel(false); }
  if (!visivel) return null;

  const pn = (usuario?.nome || '').split(' ')[0];
  const primeiroNome = pn.toLowerCase() === 'caue' ? '' : pn; // não repete o nome se o usuário também é Cauê

  return (
    <div onClick={e => e.target === e.currentTarget && fechar()}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(8,40,70,.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{`
        @keyframes caueBalao { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: none; } }
        @keyframes caueEntra { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* vidro fosco (glassmorphism): translúcido + blur, no azul neon do AvancerCRM */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 900, maxHeight: '92vh',
        background: 'rgba(255,255,255,.74)', backdropFilter: 'blur(22px) saturate(1.5)', WebkitBackdropFilter: 'blur(22px) saturate(1.5)',
        border: '1px solid rgba(255,255,255,.65)', borderRadius: 22,
        boxShadow: '0 30px 90px rgba(0,144,221,.35)', display: 'flex', flexWrap: 'wrap', overflow: 'hidden', animation: 'caueEntra .35s ease' }}>

        <button onClick={fechar} title="Fechar"
          style={{ position: 'absolute', top: 14, right: 14, zIndex: 5, width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(255,255,255,.7)', background: 'rgba(255,255,255,.6)', backdropFilter: 'blur(8px)', color: '#334155', fontSize: 17, cursor: 'pointer', boxShadow: '0 4px 14px rgba(15,23,42,.15)' }}>
          <i className="ti ti-x"></i>
        </button>

        {/* Cauê da cintura pra cima, com balão acima e fade suave no corte */}
        <div style={{ flex: '0 0 340px', minWidth: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', background: 'linear-gradient(180deg, rgba(219,238,254,.4) 0%, rgba(191,225,252,.6) 100%)', paddingTop: 18 }}>
          <div style={{ position: 'relative', maxWidth: 280, background: 'rgba(255,255,255,.88)', backdropFilter: 'blur(6px)', border: '2px solid #0090dd', borderRadius: 16, padding: '11px 15px', fontSize: 13.5, fontWeight: 700, color: '#0a3555', lineHeight: 1.45, boxShadow: '0 8px 24px rgba(0,144,221,.2)', marginBottom: 10, opacity: 0, animation: 'caueBalao .45s ease forwards', animationDelay: '.15s' }}>
            Oi{primeiroNome ? `, ${primeiroNome}` : ''}! Sou o Cauê, seu novo assistente 👋
            <span style={{ position: 'absolute', bottom: -12, left: 60, width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '12px solid #0090dd' }}></span>
            <span style={{ position: 'absolute', bottom: -8, left: 62, width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '10px solid rgba(255,255,255,.95)' }}></span>
          </div>
          <video src={caueVideo3} autoPlay loop muted playsInline
            style={{ width: 340, height: 'auto', display: 'block',
              WebkitMaskImage: 'linear-gradient(180deg, #000 80%, transparent 99%)',
              maskImage: 'linear-gradient(180deg, #000 80%, transparent 99%)' }} />
        </div>

        {/* texto da apresentação */}
        <div style={{ flex: 1, minWidth: 300, padding: '34px 34px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
          <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.15, color: '#0a3555' }}>
            Oi, sou o <span style={{ background: 'linear-gradient(135deg,#00b3ff,#00e0ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Cauê</span>,<br />seu novo assistente!
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.6, color: '#1e3a52' }}>
            Fico ali no <b>canto direito, no ícone azul</b> 👉 Qualquer dúvida que tiver no sistema é só me perguntar
            que eu <b>te mostro um passo a passo guiado</b>.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
            {[
              ['ti-calendar', 'Como marcar consulta, encaixar urgência e confirmar'],
              ['ti-dental', 'Como marcar o tratamento no dente e mandar o orçamento'],
              ['ti-cash-register', 'Como receber o pagamento e fechar o caixa do dia'],
              ['ti-lifebuoy', 'E o que você não achar na tela, é só me perguntar'],
            ].map(([ic, t]) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: '#0a3555' }}>
                <i className={`ti ${ic}`} style={{ fontSize: 18, color: '#0090dd' }}></i> {t}
              </div>
            ))}
          </div>
          <button onClick={fechar}
            style={{ marginTop: 8, alignSelf: 'flex-start', background: 'linear-gradient(135deg,#00b3ff,#00e0ff)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 26px', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 0 22px rgba(0,179,255,.45)' }}>
            Vamos lá! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
