const dores = [
  'Paciente que some porque ninguém confirmou a consulta',
  'Caixa fechado “de cabeça” no fim do dia',
  'Prontuário espalhado em papel e grupos de WhatsApp',
  'Zero visão de quanto cada dentista produz',
];

export default function Recursos() {
  return (
    <section className="av-sec av-sec-recursos" id="sec-recursos">
      <div className="av-container">
        <div className="av-dor-box">
          <span className="av-tag">Reconhece a sua clínica aqui?</span>
          <h2 className="av-h2">Todo dia sem gestão é dinheiro saindo pela porta.</h2>
          <div className="av-dor-list">
            {dores.map((dor, i) => (
              <div className="av-dor-item av-anim av-a-left" style={{ '--d': `${i * 0.08}s` }} key={dor}>
                <span>×</span>{dor}
              </div>
            ))}
          </div>
          <p className="av-dor-fecho">
            Cada um desses problemas tem nome: <strong>falta de sistema</strong>. E todos eles o AvancerCRM resolve.
          </p>
        </div>
      </div>
    </section>
  );
}
