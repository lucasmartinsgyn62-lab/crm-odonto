import { useEffect, useRef, useState } from 'react';

const SCRIPT = [
  { from: 'patient', text: 'Oi! Queria marcar uma limpeza 🦷', time: '14:32' },
  { from: 'ia', text: 'Olá, Maria! 😊 Sou a assistente da clínica. Tenho estes horários para limpeza:\n\n1️⃣ Terça · 10:30\n2️⃣ Quarta · 15:00\n3️⃣ Quinta · 09:00\n\nQual prefere?', time: '14:32' },
  { from: 'patient', text: 'Pode ser quarta às 15h', time: '14:33' },
  { from: 'ia', text: 'Perfeito! ✅ Consulta confirmada:\n\n🦷 Limpeza\n📅 Quarta · 15:00\n👩‍⚕️ Dra. Ana\n\nJá está na agenda! Te lembro um dia antes 😉', time: '14:33' },
  { from: 'day', text: 'TERÇA · 09:00' },
  { from: 'ia', text: 'Bom dia, Maria! Lembrete: sua limpeza é amanhã às 15:00 com a Dra. Ana. Posso confirmar sua presença?', time: '09:00' },
  { from: 'patient', text: 'Confirmado! 👍', time: '09:12' },
  { from: 'sys', text: '✓ Status atualizado para CONFIRMADO na agenda do AvancerCRM' },
];

export default function BrandReveal() {
  const [count, setCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(false);
  const chatRef = useRef(null);
  const secRef = useRef(null);

  // só roda a simulação quando a seção está visível
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => setActive(e.isIntersecting),
      { threshold: 0.25 }
    );
    if (secRef.current) obs.observe(secRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    const timers = [];
    function step(i) {
      if (!alive) return;
      if (i >= SCRIPT.length) {
        timers.push(setTimeout(() => { if (alive) { setCount(0); step(0); } }, 4200));
        return;
      }
      const msg = SCRIPT[i];
      if (msg.from === 'ia') {
        setTyping(true);
        timers.push(setTimeout(() => {
          if (!alive) return;
          setTyping(false);
          setCount(i + 1);
          step(i + 1);
        }, 1400));
      } else {
        timers.push(setTimeout(() => {
          if (!alive) return;
          setCount(i + 1);
          step(i + 1);
        }, msg.from === 'patient' ? 1200 : 900));
      }
    }
    setCount(0);
    setTyping(false);
    step(0);
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, [active]);

  useEffect(() => {
    const c = chatRef.current;
    if (c) c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
  }, [count, typing]);

  const visiveis = SCRIPT.slice(0, count);

  return (
    <section className="av-wa-sec" ref={secRef}>
      <video className="av-wa-bg-video" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
        <source src="/landing-section-2.mp4" type="video/mp4" />
      </video>
      <div className="av-wa-video-overlay" />
      <div className="av-brand-glow" />
      <div className="av-wa-grid">

        {/* Texto vendedor */}
        <div className="av-wa-copy">
          <span className="av-tag">Inteligência artificial no WhatsApp</span>
          <h2 className="av-h2">Sua clínica atendendo sozinha,<br />24 horas por dia</h2>
          <p>
            Isto ao lado não é um vídeo gravado — é a nossa IA em ação. Ela responde,
            oferece horários, <strong>agenda e confirma consultas</strong> direto no
            WhatsApp da clínica, e a agenda do AvancerCRM atualiza sozinha.
          </p>
          <ul className="av-wa-bullets">
            <li>✔ Atende na hora, mesmo de madrugada e fim de semana</li>
            <li>✔ Confirma presença um dia antes — menos faltas</li>
            <li>✔ Recepção livre para cuidar de quem está na clínica</li>
          </ul>
          <div className="av-wa-selo">🤖 EXCLUSIVO DO PLANO EXPERT</div>
        </div>

        {/* Celular com a simulação */}
        <div className="av-wa-phone-wrap">
          <div className="av-wa-phone">
            <div className="av-wa-header">
              <div className="av-wa-avatar">
                <img src="/logo-avancer-branca.png" alt="IA" />
              </div>
              <div className="av-wa-header-info">
                <strong>Clínica · Assistente IA</strong>
                <span>online</span>
              </div>
              <div className="av-wa-header-icons">📞 ⋮</div>
            </div>
            <div className="av-wa-chat" ref={chatRef}>
              <div className="av-wa-day">HOJE</div>
              {visiveis.map((m, i) => {
                if (m.from === 'day') return <div className="av-wa-day" key={i}>{m.text}</div>;
                if (m.from === 'sys') return <div className="av-wa-sys" key={i}>{m.text}</div>;
                return (
                  <div className={`av-wa-msg ${m.from === 'ia' ? 'out' : 'in'}`} key={i}>
                    <span className="av-wa-text">{m.text}</span>
                    <span className="av-wa-time">{m.time}{m.from === 'ia' && <span className="av-wa-check"> ✓✓</span>}</span>
                  </div>
                );
              })}
              {typing && (
                <div className="av-wa-msg out av-wa-typing">
                  <span className="av-wa-dot" /><span className="av-wa-dot" /><span className="av-wa-dot" />
                </div>
              )}
            </div>
            <div className="av-wa-inputbar">
              <span>😊&nbsp; Mensagem</span>
              <div className="av-wa-mic">🎤</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
