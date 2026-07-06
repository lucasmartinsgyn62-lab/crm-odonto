import { useState, useEffect, useRef } from 'react';
import Ticker from '../components/landing/Ticker';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Sobre from '../components/landing/Sobre';
import Depoimentos from '../components/landing/Depoimentos';
import Contato from '../components/landing/Contato';
import Footer from '../components/landing/Footer';
import LoginModal from '../components/modals/LoginModal';

export default function Landing() {
  const [showLogin, setShowLogin] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles = [], animId;
    const mouse = { x: -999, y: -999 };

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function Particle() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.vx = (Math.random() - .5) * .4;
      this.vy = (Math.random() - .5) * .4;
      this.r = Math.random() * 2 + .5;
      this.alpha = Math.random() * .5 + .1;
    }
    Particle.prototype.update = function () {
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > W) this.vx *= -1;
      if (this.y < 0 || this.y > H) this.vy *= -1;
      const dx = this.x - mouse.x, dy = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 80) { this.x += dx / dist * 1.5; this.y += dy / dist * 1.5; }
    };
    for (let i = 0; i < 80; i++) particles.push(new Particle());

    function onMouseMove(e) { mouse.x = e.clientX; mouse.y = e.clientY; }
    document.addEventListener('mousemove', onMouseMove);

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(100,160,255,${(1 - d / 120) * .15})`;
            ctx.lineWidth = .6;
            ctx.stroke();
          }
        }
      }
      particles.forEach(p => {
        p.update();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(144,202,249,${p.alpha})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    }
    canvas.style.opacity = '.6';
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  function scrollToContato() {
    document.getElementById('sec-cont')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: 0, opacity: 0, transition: 'opacity 1s'
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Ticker />
        <Navbar onLoginClick={() => setShowLogin(true)} />
        <Hero onAgendarClick={scrollToContato} />

        {/* Wave connector */}
        <div style={{ marginTop: -2, lineHeight: 0, background: 'transparent' }}>
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 80 }}>
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#f8faff" />
          </svg>
        </div>

        <Sobre />
        <Depoimentos />
        <Contato />
        <Footer />
      </div>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
