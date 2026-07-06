import { useEffect, useState } from 'react';

export default function Navbar({ onLoginClick }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 60); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function sid(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <nav
      id="main-nav"
      className={scrolled ? 'scrolled' : ''}
      style={{
        position: 'fixed', top: 40, left: 0, right: 0, zIndex: 300,
        transition: 'all .4s', height: 68,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 3rem',
      }}
    >
      <div
        className="nav-logo"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{ cursor: 'pointer', lineHeight: 1 }}
      >
        <h2 style={{ fontFamily: '"Cormorant Garamond", serif', color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>
          SUA LOGO AQUI
        </h2>
        <span style={{ color: 'rgba(144,202,249,.8)', fontSize: 9, letterSpacing: 3, fontWeight: 500, display: 'block', marginTop: 2 }}>
          SEU CONSULTÓRIO
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <a onClick={() => sid('sec-sobre')} style={{ cursor: 'pointer', color: 'rgba(255,255,255,.82)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
          Sobre
        </a>
        <a onClick={() => sid('sec-cont')} style={{ cursor: 'pointer', color: 'rgba(255,255,255,.82)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
          Contato
        </a>
        <button className="btn-nav-promo" onClick={() => sid('sec-cont')}>
          🦷 Avaliação Grátis
        </button>
        <button className="btn-nav" onClick={onLoginClick}>
          🔐 Login Admin
        </button>
      </div>
    </nav>
  );
}
