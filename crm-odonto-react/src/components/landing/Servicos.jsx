const servicos = [
  { icon: '🦷', nome: 'Clareamento', preco: 'R$ 600', sub: 'caseiro/consultório' },
  { icon: '✨', nome: 'Facetas', preco: 'R$ 500', sub: 'resina/porcelana' },
  { icon: '🔬', nome: 'Implantes', preco: 'R$ 2.000', sub: 'unitário' },
  { icon: '🦴', nome: 'Ortodontia', preco: 'R$ 2.000', sub: 'aparelho metálico' },
  { icon: '🩺', nome: 'Limpeza', preco: 'R$ 150', sub: 'profilaxia' },
  { icon: '💉', nome: 'Canal', preco: 'R$ 800', sub: 'tratamento completo' },
  { icon: '🌟', nome: 'Harmonização', preco: 'R$ 800', sub: 'botox / preenchimento' },
  { icon: '🪥', nome: 'Restauração', preco: 'R$ 150', sub: 'resina composta' },
];

export default function Servicos() {
  return (
    <section className="sec-serv" id="sec-serv">
      <div className="container">
        <span className="stag">Nossos Serviços</span>
        <h2 className="stitle">Tratamentos para o seu<br />sorriso perfeito</h2>
        <p className="ssub">Oferecemos uma gama completa de tratamentos odontológicos com tecnologia de ponta e atendimento humanizado.</p>
        <div className="srv-grid">
          {servicos.map((s, i) => (
            <div className="srv-card" key={i}>
              <div className="sicon" style={{ fontSize: 22 }}>{s.icon}</div>
              <div className="sname">{s.nome}</div>
              <div className="sprice">{s.preco}</div>
              <div className="ssub2">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
