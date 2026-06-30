import { useState } from 'react';

export default function Contato() {
  const [form, setForm] = useState({ nome: '', wpp: '', servico: '', msg: '' });

  function handleSubmit(e) {
    e.preventDefault();
    const wpp = '5562900000000';
    const texto = `Olá! Me chamo ${form.nome}. Tenho interesse em: ${form.servico || 'avaliação'}. ${form.msg}`;
    window.open(`https://wa.me/${wpp}?text=${encodeURIComponent(texto)}`, '_blank');
  }

  return (
    <section className="sec-cont" id="sec-cont">
      <div className="container">
        <div className="cont-grid">
          <div className="cont-info">
            <span className="stag">Contato</span>
            <h2 className="stitle">Agende sua consulta<br />hoje mesmo</h2>
            <p>Entre em contato conosco e agende sua avaliação gratuita. Estamos prontos para transformar o seu sorriso!</p>
            <div className="cont-itens">
              <div className="ci">
                <div className="ci-ic"><i className="ti ti-map-pin"></i></div>
                <div className="ci-t">
                  <strong>Endereço</strong>
                  <span>Rua Exemplo, 123 — Sua Cidade</span>
                </div>
              </div>
              <div className="ci">
                <div className="ci-ic"><i className="ti ti-brand-whatsapp"></i></div>
                <div className="ci-t">
                  <strong>WhatsApp</strong>
                  <span>(62) 9 0000-0000</span>
                </div>
              </div>
              <div className="ci">
                <div className="ci-ic"><i className="ti ti-clock"></i></div>
                <div className="ci-t">
                  <strong>Horário de Atendimento</strong>
                  <span>Seg–Sex: 08h às 18h | Sáb: 08h às 12h</span>
                </div>
              </div>
              <div className="ci">
                <div className="ci-ic"><i className="ti ti-brand-instagram"></i></div>
                <div className="ci-t">
                  <strong>Instagram</strong>
                  <span>@seuconsultorio</span>
                </div>
              </div>
            </div>
          </div>

          <div className="cont-form">
            <h3>Solicitar Avaliação Gratuita</h3>
            <form onSubmit={handleSubmit}>
              <div className="fg">
                <label>Nome completo</label>
                <input
                  className="inf"
                  placeholder="Seu nome..."
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  required
                />
              </div>
              <div className="fg">
                <label>WhatsApp</label>
                <input
                  className="inf"
                  placeholder="(62) 9 0000-0000"
                  value={form.wpp}
                  onChange={e => setForm(f => ({ ...f, wpp: e.target.value }))}
                />
              </div>
              <div className="fg">
                <label>Serviço de interesse</label>
                <select
                  className="inf"
                  value={form.servico}
                  onChange={e => setForm(f => ({ ...f, servico: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  <option>Avaliação Gratuita</option>
                  <option>Clareamento Dental</option>
                  <option>Implante Dentário</option>
                  <option>Ortodontia / Aparelho</option>
                  <option>Facetas / Lentes</option>
                  <option>Harmonização Facial</option>
                  <option>Outros</option>
                </select>
              </div>
              <div className="fg">
                <label>Mensagem (opcional)</label>
                <textarea
                  className="inf"
                  placeholder="Conte um pouco sobre o que você precisa..."
                  value={form.msg}
                  onChange={e => setForm(f => ({ ...f, msg: e.target.value }))}
                  style={{ height: 80, resize: 'none' }}
                />
              </div>
              <button type="submit" className="btn-form">
                <i className="ti ti-brand-whatsapp"></i> Enviar pelo WhatsApp
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
