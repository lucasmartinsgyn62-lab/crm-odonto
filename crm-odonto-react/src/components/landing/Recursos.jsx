const dores = [
  'Paciente que some porque ninguém confirmou a consulta',
  'Caixa fechado "de cabeça" no fim do dia',
  'Prontuário espalhado em papel e grupos de WhatsApp',
  'Zero visão de quanto cada dentista produz',
];

const recursos = [
  { icon: '📅', nome: 'Agenda Inteligente', desc: 'Agenda por dentista com status coloridos: confirmado, atendido, falta, reagendou. A recepção enxerga o dia inteiro em segundos.' },
  { icon: '🧑‍⚕️', nome: 'Gestão de Pacientes', desc: 'Cadastro completo, histórico e prontuário digital de cada paciente. Chega de fichas de papel perdidas.' },
  { icon: '💰', nome: 'Caixa Diário', desc: 'Entradas por procedimento e por dentista, fechamento de caixa com histórico. Você sabe exatamente quanto entrou e de onde.' },
  { icon: '📊', nome: 'Relatórios Sob Medida', desc: 'Produção por dentista, origem dos pacientes, faturamento mensal — e personalizamos os relatórios de acordo com a SUA necessidade.' },
  { icon: '👥', nome: 'Multiusuário com Permissões', desc: 'Dono, recepção e dentistas: cada um vê só o que precisa. Controle total nas suas mãos.' },
  { icon: '☁️', nome: '100% na Nuvem + Backup Diário', desc: 'Acesse do consultório, de casa ou do celular. Backup automático todos os dias — seus dados nunca se perdem.' },
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

        {/* OS RECURSOS */}
        <span className="av-tag" style={{ marginTop: '4rem', display: 'block' }}>O que você leva</span>
        <h2 className="av-h2">Tudo que sua clínica precisa. Nada do que ela não usa.</h2>
        <div className="av-rec-grid">
          {recursos.map((r, i) => {
            const anims = ['av-a-zoom', 'av-a-up', 'av-a-flip'];
            return (
              <div className={`av-rec-card av-anim ${anims[i % 3]}`} style={{ '--d': `${(i % 3) * 0.1}s` }} key={i}>
                <div className="av-rec-icon">{r.icon}</div>
                <h3>{r.nome}</h3>
                <p>{r.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
