const chips = ['Tecnologia de ponta', 'Equipe especializada', 'Atendimento humanizado', 'Ambiente acolhedor', 'Horários flexíveis', 'Emergências 24h'];

export default function Sobre() {
  return (
    <section className="sec-sobre" id="sec-sobre">
      <div className="container">
        <div className="sobre-grid">
          <div className="sobre-box">
            <div className="sobre-deco">Dr</div>
            <div className="sobre-cnt">
              <h2>Seu Nome</h2>
              <p>CRO-GO 00000</p>
            </div>
            <div className="sobre-float">
              <div className="sf-num">+500</div>
              <div className="sf-txt">Pacientes satisfeitos</div>
            </div>
          </div>
          <div className="sobre-text">
            <span className="stag">Sobre nós</span>
            <h2 className="stitle">Cuidado e excelência<br />em cada sorriso</h2>
            <p>
              Há mais de X anos dedicados à odontologia de qualidade, unindo técnica avançada e atendimento
              personalizado. Nossa missão é proporcionar saúde bucal e autoestima para cada paciente.
            </p>
            <p>
              Trabalhamos com as melhores tecnologias do mercado, desde scanners intraorais até sistemas
              de planejamento digital, garantindo resultados precisos e duradouros.
            </p>
            <div className="chips">
              {chips.map((c, i) => <span className="chip" key={i}>{c}</span>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
