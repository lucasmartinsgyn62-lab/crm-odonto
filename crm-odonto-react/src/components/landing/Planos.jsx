const WPP = '5562981949053';

const planos = [
  {
    nome: 'Essencial',
    preco: '297',
    desc: 'Para a clínica que quer sair do papel e organizar a operação hoje.',
    destaque: false,
    itens: [
      'Agenda inteligente com status por consulta',
      'Cadastro e prontuário digital de pacientes',
      'Caixa diário com fechamento e histórico',
      'Relatórios de produção e faturamento',
      'Até 2 usuários',
      'Backup automático diário',
      'Suporte por WhatsApp',
    ],
    cta: 'Começar com o Essencial',
  },
  {
    nome: 'Expert',
    preco: '497',
    desc: 'Para a clínica que quer crescer no automático: IA atendendo no WhatsApp e dados na mão.',
    destaque: true,
    selo: '⭐ MAIS ESCOLHIDO',
    ia: true,
    itens: [
      'TUDO do plano Essencial',
      'Usuários ilimitados (recepção + dentistas)',
      'Relatórios PERSONALIZADOS para sua necessidade',
      'Suporte presencial em Brasília e Goiânia',
      'Implantação e treinamento prioritários',
      'Atendimento VIP direto com nosso time',
    ],
    cta: 'Quero o Expert',
  },
];

export default function Planos() {
  function assinar(plano) {
    const texto = `Olá! Quero contratar o plano ${plano} do AvancerCRM.`;
    window.open(`https://wa.me/${WPP}?text=${encodeURIComponent(texto)}`, '_blank');
  }

  return (
    <section className="av-sec av-sec-planos" id="sec-planos">
      <div className="av-container" style={{ textAlign: 'center' }}>
        <span className="av-tag">Planos e preços</span>
        <h2 className="av-h2">Menos que uma restauração por mês.<br />Pela gestão da clínica inteira.</h2>
        <p className="av-planos-sub">
          <strong style={{ color: '#A78BFA' }}>7 dias de teste grátis</strong> em qualquer plano.
          Taxa de adesão. Sem fidelidade. Cancele quando quiser.
        </p>

        <div className="av-planos-grid">
          {planos.map((p, i) => (
            <div className={`av-plano-card av-anim ${i === 0 ? 'av-a-left' : 'av-a-right'} ${p.destaque ? 'destaque' : ''}`} key={i}>
              {p.selo && <div className="av-plano-selo">{p.selo}</div>}
              <h3 className="av-plano-nome">{p.nome}</h3>
              <p className="av-plano-desc">{p.desc}</p>
              <div className="av-plano-preco">
                <span className="moeda">R$</span>
                <span className="valor">{p.preco}</span>
                <span className="mes">/mês</span>
              </div>
              {p.ia && (
                <div className="av-plano-ia">
                  <div className="av-plano-ia-selo">🤖 EXCLUSIVO EXPERT</div>
                  <strong>Atendimento + confirmação de agenda no WhatsApp com IA altamente treinada</strong>
                  <span>Sua clínica responde, agenda e confirma consultas 24h por dia — sem depender da recepção.</span>
                </div>
              )}
              <ul className="av-plano-itens">
                {p.itens.map((it, j) => <li key={j}><span>✔</span> {it}</li>)}
              </ul>
              <button
                className={p.destaque ? 'av-btn-cta av-btn-full' : 'av-btn-ghost av-btn-full'}
                onClick={() => assinar(p.nome)}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>

        {/* DIFERENCIAIS */}
        <div className="av-dif-grid">
          <div className="av-dif-card av-dif-ia av-anim av-a-zoom">
            <div className="av-dif-selo">EXCLUSIVO EXPERT</div>
            <div className="av-dif-icon">🤖</div>
            <h3>IA atendendo no seu WhatsApp</h3>
            <p>
              Uma IA <strong>altamente treinada</strong> atende seus pacientes,
              agenda e <strong>confirma consultas automaticamente</strong> no WhatsApp,
              24 horas por dia. Menos falta, menos telefone ocupado, recepção livre
              para quem está na clínica.
            </p>
          </div>
          <div className="av-dif-card av-anim av-a-up" style={{ '--d': '0.12s' }}>
            <div className="av-dif-icon">🤝</div>
            <h3>Suporte presencial de verdade</h3>
            <p>
              Enquanto os CRMs gigantes te deixam num chat com robô, a gente vai
              <strong> até a sua clínica</strong> em Brasília e Goiânia. Implantação,
              treinamento da equipe e suporte olho no olho.
            </p>
          </div>
          <div className="av-dif-card av-anim av-a-flip" style={{ '--d': '0.24s' }}>
            <div className="av-dif-icon">📈</div>
            <h3>Relatórios do SEU jeito</h3>
            <p>
              Precisa de um relatório que nenhum sistema tem? Nós <strong>construímos
              dentro do sistema</strong>, sob medida para a necessidade da sua clínica.
              Você pede, a gente entrega.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
