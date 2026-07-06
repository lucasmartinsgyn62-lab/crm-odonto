export default function Footer() {
  function sid(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }

  return (
    <footer>
      <div className="fi">
        <div className="fb">
          <h2>Seu Consultório</h2>
          <span className="fsub">ODONTOLOGIA DE EXCELÊNCIA</span>
          <p>Cuidando do seu sorriso com tecnologia e humanidade. Agende sua avaliação gratuita e transforme sua vida.</p>
        </div>
        <div className="fc">
          <h4>Navegação</h4>
          <a onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Início</a>
          <a onClick={() => sid('sec-sobre')}>Sobre</a>
          <a onClick={() => sid('sec-serv')}>Serviços</a>
          <a onClick={() => sid('sec-cont')}>Contato</a>
        </div>
        <div className="fc">
          <h4>Contato</h4>
          <a>(62) 9 0000-0000</a>
          <a>@seuconsultorio</a>
          <a>contato@seuconsultorio.com.br</a>
          <a>Rua Exemplo, 123 — Goiânia/GO</a>
        </div>
      </div>
      <div className="fbot">
        <p>© {new Date().getFullYear()} Seu Consultório Odontológico. Todos os direitos reservados.</p>
        <p>CRM Odontológico v19 — Sistema de Gestão</p>
      </div>
    </footer>
  );
}
