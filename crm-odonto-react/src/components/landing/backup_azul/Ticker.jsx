export default function Ticker() {
  const items = [
    'AVALIAÇÃO GRATUITA — AGENDE JÁ A SUA',
    'SORRIA COM CONFIANÇA — TRATAMENTOS PERSONALIZADOS',
    'ATENDIMENTO HUMANIZADO E DE ALTA QUALIDADE',
  ];
  const doubled = [...items, ...items];
  return (
    <div
      className="ticker-wrap"
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
