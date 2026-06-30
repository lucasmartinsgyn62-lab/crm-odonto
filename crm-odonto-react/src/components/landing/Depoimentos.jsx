const depoimentos = [
  {
    stars: '★★★★★',
    texto: '"Atendimento excepcional! Fiz meu clareamento e ficou perfeito. A equipe é super atenciosa e o ambiente muito aconchegante. Super recomendo!"',
    nome: 'Maria S.',
    area: 'Clareamento Dental',
    av: 'MS',
  },
  {
    stars: '★★★★★',
    texto: '"Estava com medo de fazer implante, mas o Dr. foi incrível! Explicou tudo detalhadamente, não senti dor e o resultado ficou natural. Excelente profissional!"',
    nome: 'João P.',
    area: 'Implante Dentário',
    av: 'JP',
  },
  {
    stars: '★★★★★',
    texto: '"Coloquei facetas de porcelana e transformou meu sorriso completamente! Resultado muito além do esperado. Investimento que vale muito a pena!"',
    nome: 'Ana L.',
    area: 'Facetas em Porcelana',
    av: 'AL',
  },
];

export default function Depoimentos() {
  return (
    <section className="sec-depo" id="sec-depo">
      <div className="container">
        <span className="stag" style={{ color: 'var(--b3)' }}>Depoimentos</span>
        <h2 className="stitle" style={{ color: '#fff' }}>O que nossos pacientes<br />dizem sobre nós</h2>
        <div className="depo-grid">
          {depoimentos.map((d, i) => (
            <div className="dc" key={i}>
              <div className="dstars">{d.stars}</div>
              <p className="dtext">{d.texto}</p>
              <div className="dautor">
                <div className="dav">{d.av}</div>
                <div>
                  <div className="dname">{d.nome}</div>
                  <div className="darea">{d.area}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
