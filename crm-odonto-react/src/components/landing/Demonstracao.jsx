const demos = [
  {
    gif: '/func-agenda.gif',
    tag: 'Agenda',
    nome: 'Agenda por dentista, colorida e sem confusão',
    desc: 'Cada status tem sua cor — confirmado, em atendimento, aguardando, falta. A recepção bate o olho e entende o dia inteiro. Botão de encaixe em cada horário e busca de paciente e procedimento com um clique.',
  },
  {
    gif: '/func-procedimentos.gif',
    tag: 'Procedimentos',
    nome: 'Tabela de procedimentos com preços e convênios',
    desc: 'Todos os procedimentos com valor, cor por convênio e importação da tabela do convênio via planilha. A busca filtra em tempo real entre centenas de itens enquanto você digita.',
  },
  {
    gif: '/func-relatorios.gif',
    tag: 'Relatórios',
    nome: 'Relatórios gerenciais que mostram o que importa',
    desc: 'Faturamento do período, ticket médio, comparação com o mês anterior, receita por dentista, origem dos pacientes e taxa de ocupação da agenda. Exporte em Excel ou PDF com um clique.',
  },
  {
    gif: '/func-dashboard.gif',
    tag: 'Dashboard',
    nome: 'O dia inteiro em uma tela',
    desc: 'Agendados, atendidos, fila de espera, faltas, receita do dia e taxa de comparecimento — atualizados em tempo real. A visão que o dono e a recepção abrem logo de manhã.',
  },
];

export default function Demonstracao() {
  return (
    <section className="av-sec av-sec-demo" id="sec-demo">
      <div className="av-container">
        <span className="av-tag" style={{ display: 'block' }}>Veja funcionando</span>
        <h2 className="av-h2">O sistema por dentro, em movimento.</h2>
        <p className="av-demo-sub">
          Nada de foto parada: veja como a agenda, os procedimentos, os relatórios e o painel do dia
          realmente funcionam no AvancerCRM.
        </p>

        <div className="av-demo-list">
          {demos.map((d, i) => (
            <div
              className={`av-demo-row av-anim ${i % 2 === 0 ? 'av-a-left' : 'av-a-right'}`}
              key={i}
            >
              <div className="av-demo-media">
                <div className="av-demo-frame">
                  <div className="av-demo-bar">
                    <span></span><span></span><span></span>
                  </div>
                  <img src={d.gif} alt={d.nome} loading="lazy" />
                </div>
              </div>
              <div className="av-demo-text">
                <span className="av-tag">{d.tag}</span>
                <h3>{d.nome}</h3>
                <p>{d.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
