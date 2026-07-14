import { useEffect, useRef } from 'react';

const WPP = '5562981949053';

function Counter({ target, suffix = '', prefix = '' }) {
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
            if (ref.current) ref.current.textContent = prefix + Math.round(cur) + suffix;
          }, step);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, suffix, prefix]);
  return <span ref={ref}>{prefix}0{suffix}</span>;
}

export default function Hero() {
  function abrirDemo() {
    const texto = 'Olá! Quero uma demonstração gratuita do AvancerCRM para minha clínica.';
    window.open(`https://wa.me/${WPP}?text=${encodeURIComponent(texto)}`, '_blank');
  }
  function verPlanos() {
    document.getElementById('sec-planos')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section id="sec-hero" className="av-hero">
      <video className="av-hero-video" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
        <source src="/landing-hero.mp4" type="video/mp4" />
      </video>
      <div className="av-hero-video-overlay" />

      {/* brilho roxo de fundo */}
      <div className="av-hero-glow" />
      <div className="av-hero-glow av-hero-glow2" />

      <div className="av-hero-grid">
        {/* ESQUERDA — copy agressiva */}
        <div>
          <div className="av-badge av-badge-forte">
            🔥 SUPORTE PRESENCIAL EM BRASÍLIA E GOIÂNIA + TREINAMENTO PRESENCIAL
          </div>

          <h1 className="av-h1">
            Sua clínica ainda perde paciente por causa de{' '}
            <em>agenda bagunçada?</em>
          </h1>

          <p className="av-hero-sub">
            Papel, planilha e WhatsApp não gerenciam clínica — <strong>perdem dinheiro</strong>.
            O AvancerCRM coloca agenda, pacientes, prontuário, caixa e relatórios
            em um só painel. Sua recepção mais rápida, seu faturamento sob controle
            e você enxergando tudo de qualquer lugar.
          </p>

          <div className="av-hero-btns">
            <button className="av-btn-cta" onClick={abrirDemo}>
              💬 Quero uma demonstração grátis
            </button>
            <button className="av-btn-ghost" onClick={verPlanos}>
              Ver planos e preços
            </button>
          </div>

          <div className="av-hero-chips">
            <span>✔ 7 dias de teste grátis</span>
            <span>✔ Implantação em até 48h</span>
            <span>✔ Sem fidelidade</span>
            <span>✔ Treinamento incluído</span>
          </div>

          <div className="av-hero-stats">
            <div>
              <div className="av-stat-num"><Counter target={48} suffix="h" /></div>
              <div className="av-stat-lbl">Para começar a usar</div>
            </div>
            <div>
              <div className="av-stat-num"><Counter target={100} suffix="%" /></div>
              <div className="av-stat-lbl">Na nuvem, sem instalar nada</div>
            </div>
            <div>
              <div className="av-stat-num"><Counter target={2} suffix=" capitais" /></div>
              <div className="av-stat-lbl">Com suporte presencial</div>
            </div>
          </div>
        </div>

        {/* DIREITA — logo em destaque com animação */}
        <div className="av-hero-logo-wrap">
          <div className="av-logo-halo" />
          <img
            src="/logo-avancer.svg"
            alt="AvancerCRM"
            className="av-hero-logo"
          />
          <div className="av-logo-tag">O CRM que faz sua clínica avançar</div>
        </div>
      </div>
    </section>
  );
}
