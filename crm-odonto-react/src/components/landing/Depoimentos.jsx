const depoimentos = [
  {
    stars: '★★★★★',
    texto: '"Minha recepção vivia no caderno e no WhatsApp. Em uma semana com o AvancerCRM as faltas caíram e o fechamento de caixa passou a bater todo dia. Não volto atrás."',
    nome: 'Dra. Camila R.',
    area: 'Clínica em Goiânia — GO',
    av: 'CR',
  },
  {
    stars: '★★★★★',
    texto: '"O que me ganhou foi o suporte presencial. Eles vieram na clínica, treinaram minha equipe e em dois dias estava tudo rodando. Nenhum sistema grande faz isso."',
    nome: 'Dr. Felipe M.',
    area: 'Clínica em Brasília — DF',
    av: 'FM',
  },
  {
    stars: '★★★★★',
    texto: '"Pedi um relatório de produção por dentista do jeito que eu precisava e eles construíram DENTRO do sistema. Hoje sei exatamente quanto cada cadeira fatura."',
    nome: 'Dra. Patrícia S.',
    area: 'Clínica em Águas Claras — DF',
    av: 'PS',
  },
];

export default function Depoimentos() {
  return (
    <section className="av-sec av-sec-depo" id="sec-depo">
      <div className="av-container">
        <span className="av-tag">Quem usa, recomenda</span>
        <h2 className="av-h2">Donos de clínica que pararam de<br />administrar no escuro</h2>
        <div className="av-depo-grid">
          {depoimentos.map((d, i) => (
            <div className={`av-depo-card av-anim ${['av-a-up', 'av-a-zoom', 'av-a-up'][i % 3]}`} style={{ '--d': `${i * 0.12}s` }} key={i}>
              <div className="av-depo-stars">{d.stars}</div>
              <p className="av-depo-text">{d.texto}</p>
              <div className="av-depo-autor">
                <div className="av-depo-av">{d.av}</div>
                <div>
                  <div className="av-depo-nome">{d.nome}</div>
                  <div className="av-depo-area">{d.area}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
