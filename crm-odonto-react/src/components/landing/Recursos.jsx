const dores = [
  'Paciente que some porque ninguém confirmou a consulta',
  'Caixa fechado "de cabeça" no fim do dia',
  'Prontuário espalhado em papel e grupos de WhatsApp',
  'Zero visão de quanto cada dentista produz',
];

const menus = [
  {
    grupo: 'Principal',
    itens: [
      { icon: '📊', nome: 'Dashboard Diária', desc: 'O dia inteiro em uma tela: agendados, atendidos, fila de espera, faltas, receita e taxa de comparecimento em tempo real.' },
      { icon: '📅', nome: 'Agenda', desc: 'Agenda por dentista com status coloridos, botão de encaixe em cada horário e busca rápida de paciente e procedimento.' },
    ],
  },
  {
    grupo: 'Gestão',
    itens: [
      { icon: '🧑‍⚕️', nome: 'Pacientes', desc: 'Cadastro completo, histórico e prontuário digital com fotos e arquivos. Fim das fichas de papel.' },
      { icon: '🦷', nome: 'Dentistas', desc: 'Cadastro da equipe e acompanhamento da produção de cada profissional.' },
      { icon: '📍', nome: 'Origens', desc: 'Saiba de onde vêm seus pacientes — Google, indicação, redes sociais, panfleto — e o que dá mais retorno.' },
      { icon: '💊', nome: 'Procedimentos', desc: 'Tabela de preços com cor por convênio e importação da tabela do convênio por planilha (XLS).' },
    ],
  },
  {
    grupo: 'Análise',
    itens: [
      { icon: '📈', nome: 'Relatórios', desc: 'Faturamento, ticket médio, ocupação da agenda, receita por dentista e comparação de meses. Exporta em Excel e PDF.' },
      { icon: '🔎', nome: 'Auditoria', desc: 'Registro de quem alterou o quê e quando — transparência total sobre tudo que acontece no sistema.' },
    ],
  },
  {
    grupo: 'Caixa',
    itens: [
      { icon: '💰', nome: 'Fechamento de Caixa', desc: 'Entradas por procedimento e por dentista, com senha de fechamento. Você sabe exatamente quanto entrou.' },
      { icon: '🧾', nome: 'Histórico de Caixa', desc: 'Todos os fechamentos anteriores guardados e disponíveis para consulta a qualquer momento.' },
    ],
  },
  {
    grupo: 'Automação',
    itens: [
      { icon: '💬', nome: 'WhatsApp & IA', desc: 'Atendimento e confirmação de consultas automáticos pelo WhatsApp, com inteligência artificial.' },
      { icon: '🗂️', nome: 'Vendas / Pipeline', desc: 'Funil de leads e negociações para acompanhar e converter novos pacientes.' },
    ],
  },
  {
    grupo: 'Segurança',
    itens: [
      { icon: '🔐', nome: 'Verificação em 2 etapas (2FA)', desc: 'Camada extra de proteção no login do administrador, com código do app autenticador.' },
      { icon: '☁️', nome: 'Nuvem + Backup Diário', desc: 'Acesse do consultório, de casa ou do celular. Backup automático todos os dias.' },
    ],
  },
];

export default function Recursos() {
  return (
    <section className="av-sec av-sec-recursos" id="sec-recursos">
      <div className="av-container">
        {/* A DOR */}
        <div className="av-dor-box">
          <span className="av-tag">Reconhece a sua clínica aqui?</span>
          <h2 className="av-h2">Todo dia sem gestão é dinheiro saindo pela porta.</h2>
          <div className="av-dor-list">
            {dores.map((d, i) => (
              <div className="av-dor-item av-anim av-a-left" style={{ '--d': `${i * 0.08}s` }} key={i}><span>✖</span> {d}</div>
            ))}
          </div>
          <p className="av-dor-fecho">
            Cada um desses problemas tem nome: <strong>falta de sistema</strong>. E todos eles o AvancerCRM resolve.
          </p>
        </div>

        {/* TODAS AS FUNCIONALIDADES DO MENU */}
        <span className="av-tag" style={{ marginTop: '4rem', display: 'block' }}>Tudo em um só sistema</span>
        <h2 className="av-h2">Todas as funcionalidades do AvancerCRM</h2>
        <p className="av-func-sub">Cada item abaixo é um menu dentro do sistema — do dia a dia da recepção à visão gerencial do dono.</p>
        <div className="av-func-groups">
          {menus.map((m, gi) => (
            <div className="av-func-group av-anim av-a-up" style={{ '--d': `${gi * 0.06}s` }} key={gi}>
              <div className="av-func-grouphead">{m.grupo}</div>
              <div className="av-func-items">
                {m.itens.map((r, i) => (
                  <div className="av-func-item" key={i}>
                    <span className="av-func-icon">{r.icon}</span>
                    <div>
                      <strong>{r.nome}</strong>
                      <span>{r.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
