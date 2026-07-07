export default function Ticker() {
  const items = [
    'IA ATENDE E CONFIRMA CONSULTAS NO SEU WHATSAPP — PLANO EXPERT',
    'SUPORTE PRESENCIAL EM BRASÍLIA E GOIÂNIA',
    'RELATÓRIOS PERSONALIZADOS PARA SUA CLÍNICA',
    'IMPLANTAÇÃO EM ATÉ 48H — COMECE ESSA SEMANA',
    'AGENDA, PACIENTES, CAIXA E RELATÓRIOS EM UM SÓ LUGAR',
  ];
  const doubled = [...items, ...items];
  return (
    <div
      className="ticker-wrap av-ticker"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 400, height: 40 }}
    >
      <div className="ticker-inner">
        {doubled.map((item, i) => (
          <span className="ticker-item" key={i}>
            <span className="tdot"></span>
            {item}
            <span className="tdot"></span>
          </span>
        ))}
      </div>
    </div>
  );
}
