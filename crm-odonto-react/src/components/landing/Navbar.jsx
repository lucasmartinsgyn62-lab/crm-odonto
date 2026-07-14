import { useEffect, useState } from 'react';

const WPP = '5562981949053';

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

  function abrirDemo() {
    const texto = 'Olá! Quero uma demonstração gratuita do AvancerCRM.';
    window.open(`https://wa.me/${WPP}?text=${encodeURIComponent(texto)}`, '_blank');
  }

  return (
    <nav
      id="main-nav"
      className={`av-nav ${scrolled ? 'scrolled' : ''}`}
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
        <img src="/logo-avancer.svg" alt="AvancerCRM" style={{ height: 60, width: 'auto', display: 'block', filter: 'drop-shadow(0 0 10px rgba(124,58,237,.5))' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <a onClick={() => sid('sec-recursos')} className="av-nav-link">Recursos</a>
        <a onClick={() => sid('sec-planos')} className="av-nav-link">Planos</a>
        <a onClick={() => sid('sec-cont')} className="av-nav-link">Contato</a>
        <button className="av-btn-cta av-btn-sm" onClick={abrirDemo}>
          Demonstração Grátis
        </button>
        <button className="av-btn-ghost av-btn-sm" onClick={onLoginClick}>
          🔐 Login
        </button>
      </div>
    </nav>
  );
}
