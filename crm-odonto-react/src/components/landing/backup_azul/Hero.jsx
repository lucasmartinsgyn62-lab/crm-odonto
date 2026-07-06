import { useEffect, useRef } from 'react';

function Counter({ target, suffix = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    let started = false;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !started) {
          started = true;
          let cur = 0;
          const dur = 1600, step = 16;
          const timer = setInterval(() => {
            cur += target / (dur / step);
            if (cur >= target) { cur = target; clearInterval(timer); }
            if (ref.current) ref.current.textContent = Math.round(cur) + suffix;
          }, step);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

export default function Hero({ onAgendarClick }) {
  return (
    <section
      id="sec-hero"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: `
          linear-gradient(135deg, rgba(0,33,100,0.95) 0%, rgba(0,87,184,0.88) 55%, rgba(25,118,210,0.75) 100%),
          url('https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1920&q=85') center/cover no-repeat
        `,
        paddingTop: 108,
      }}
    >
      {/* Anéis decorativos */}
      <div style={{
        position: 'absolute', width: 700, height: 700, borderRadius: '50%',
        border: '1px solid rgba(255,255,255,.05)', top: -200, right: -150, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        border: '1px solid rgba(255,255,255,.07)', top: 50, right: 80, pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '4rem 3rem',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '4rem', alignItems: 'center', width: '100%',
      }}>

        {/* ESQUERDA — copy */}
        <div>
          <div className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', marginBottom: '1.6rem' }}>
            ✦ &nbsp;ODONTOLOGIA DE EXCELÊNCIA
          </div>

          <h1 style={{
            fontFamily: '"Cormorant Garamond", serif',
            color: '#fff', fontSize: 58, fontWeight: 700,
            lineHeight: 1.08, marginBottom: '1.2rem',
          }}>
            Seu Sorriso<br />
            <em style={{ color: '#90CAF9', fontStyle: 'normal' }}>Merece</em> o Melhor
          </h1>

          <p style={{
            color: 'rgba(255,255,255,.72)', fontSize: 15,
            lineHeight: 1.8, marginBottom: '2rem', maxWidth: 460,
          }}>
            Tratamentos odontológicos de alto padrão com tecnologia avançada e
            atendimento humanizado. Agende sua avaliação gratuita hoje.
          </p>

          {/* BOTÕES */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <button
              className="btn-bege"
              onClick={onAgendarClick}
              style={{ padding: '.85rem 2rem', fontSize: 14, fontWeight: 700, borderRadius: 10 }}
            >
              🦷 Avaliação Gratuita
            </button>
            <button
              className="btn-ghost"
              onClick={onAgendarClick}
              style={{ padding: '.85rem 1.8rem', fontSize: 14 }}
            >
              Ver Tratamentos
            </button>
          </div>

          {/* CARD PROMO */}
          <div
            className="promo-hero-card"
            onClick={onAgendarClick}
            style={{ maxWidth: 420, marginBottom: '2rem' }}
          >
            <div className="phc-icon">🎁</div>
            <div className="phc-text">
              <strong>Primeira Consulta Grátis</strong>
              <span>Vagas limitadas — garanta a sua agora</span>
            </div>
            <i className="ti ti-arrow-right phc-arrow"></i>
          </div>

          {/* STATS */}
          <div style={{
            display: 'flex', gap: '2.5rem', flexWrap: 'wrap',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255,255,255,.15)',
          }}>
            {[
              { target: 500, suffix: '+', label: 'Pacientes' },
              { target: 12, suffix: '', label: 'Especialidades' },
              { target: 98, suffix: '%', label: 'Satisfação' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{
                  color: '#90CAF9', fontFamily: '"Cormorant Garamond", serif',
                  fontSize: 36, fontWeight: 700, lineHeight: 1,
                }}>
                  <Counter target={s.target} suffix={s.suffix} />
                </div>
                <div style={{
                  color: 'rgba(255,255,255,.45)', fontSize: 10,
                  letterSpacing: '1.5px', marginTop: 4, textTransform: 'uppercase',
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DIREITA — imagem de sorriso em moldura oval */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{
            width: 400, height: 460,
            borderRadius: '50% 50% 50% 50% / 58% 58% 42% 42%',
            overflow: 'hidden',
            border: '4px solid rgba(255,255,255,.18)',
            boxShadow: '0 32px 80px rgba(0,0,0,.45), 0 0 0 12px rgba(255,255,255,.05)',
            animation: 'float 5s ease-in-out infinite',
          }}>
            <img
              src="https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=900&q=85"
              alt="Sorriso saudável"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
            />
          </div>

          {/* Badges de confiança */}
          <div style={{ display: 'flex', gap: '.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { icon: '✔', text: '+500 pacientes atendidos' },
              { icon: '⭐', text: '98% de satisfação' },
              { icon: '🏅', text: 'CRO certificado' },
            ].map((b, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,.09)',
                border: '1px solid rgba(255,255,255,.18)',
                borderRadius: 20, padding: '.35rem 1rem',
                fontSize: 11, color: '#fff', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '.4rem',
                backdropFilter: 'blur(8px)',
              }}>
                <span>{b.icon}</span> {b.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
