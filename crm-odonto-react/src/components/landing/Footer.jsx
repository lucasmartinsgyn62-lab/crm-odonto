export default function Footer() {
  function sid(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }

  return (
    <footer className="av-footer">
      <div className="fi">
        <div className="fb">
          <img src="/logo-avancer.svg" alt="AvancerCRM" style={{ height: 90, width: 'auto', marginBottom: '.8rem', filter: 'drop-shadow(0 0 10px rgba(124,58,237,.35))' }} />
          <span className="fsub">SOLUÇÕES DIGITAIS PARA CLÍNICAS</span>
          <p>
            O CRM odontológico com suporte presencial em Brasília e Goiânia.
            Agenda, pacientes, caixa e relatórios personalizados — tudo em um só sistema.
          </p>
        </div>
        <div className="fc">
          <h4>Navegação</h4>
          <a onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Início</a>
          <a onClick={() => sid('sec-recursos')}>Recursos</a>
          <a onClick={() => sid('sec-planos')}>Planos</a>
          <a onClick={() => sid('sec-cont')}>Contato</a>
        </div>
        <div className="fc">
          <h4>Contato</h4>
          <a href="https://wa.me/5562981949053" target="_blank" rel="noreferrer">(62) 98194-9053</a>
          <a href="https://wa.me/5562920056261" target="_blank" rel="noreferrer">(62) 92005-6261</a>
          <a>@avancercrm</a>
          <a>contato@avancercrm.com.br</a>
          <a>Brasília — DF | Goiânia — GO</a>
        </div>
      </div>
      <div className="fbot">
        <p>© {new Date().getFullYear()} AvancerCRM Soluções Digitais. Todos os direitos reservados.</p>
        <p>AvancerCRM — Sistema de Gestão para Clínicas Odontológicas</p>
        <p>LUCAS MARTINS GOMES DE MORAES — CNPJ 61.844.108/0001-55</p>
      </div>
    </footer>
  );
}
