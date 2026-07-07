import { useState } from 'react';

const WPP = '5562981949053';

export default function Contato() {
  const [form, setForm] = useState({ nome: '', wpp: '', clinica: '', plano: '', msg: '' });

  function handleSubmit(e) {
    e.preventDefault();
    const linhas = [
      'Olá! Quero agendar uma *demonstração gratuita* do AvancerCRM.',
      '',
      `*Nome:* ${form.nome}`,
      form.clinica ? `*Clínica:* ${form.clinica}` : null,
      form.wpp ? `*WhatsApp:* ${form.wpp}` : null,
      `*Plano de interesse:* ${form.plano || 'Ainda não sei — quero ver a demonstração'}`,
      form.msg ? `*Mensagem:* ${form.msg}` : null,
    ].filter(l => l !== null);
    window.open(`https://wa.me/${WPP}?text=${encodeURIComponent(linhas.join('\n'))}`, '_blank');
  }

  return (
    <section className="av-sec av-sec-cont" id="sec-cont">
      <div className="av-container">
        <div className="av-cont-grid">
          <div className="av-cont-info">
            <span className="av-tag">Fale com a gente</span>
            <h2 className="av-h2">Veja o AvancerCRM rodando<br />antes de pagar qualquer coisa</h2>
            <p className="av-cont-sub">
              Demonstração gratuita, sem compromisso. Se fizer sentido, sua clínica
              está rodando no sistema em até 48 horas.
            </p>
            <div className="av-cont-itens">
              <div className="av-ci av-anim av-a-left">
                <div className="av-ci-ic"><i className="ti ti-map-pin"></i></div>
                <div className="av-ci-t">
                  <strong>Atendimento presencial</strong>
                  <span>Brasília — DF e Goiânia — GO</span>
                </div>
              </div>
              <div className="av-ci av-anim av-a-left" style={{ '--d': '0.08s' }}>
                <div className="av-ci-ic"><i className="ti ti-brand-whatsapp"></i></div>
                <div className="av-ci-t">
                  <strong>WhatsApp</strong>
                  <span>(62) 98194-9053</span>
                </div>
              </div>
              <div className="av-ci av-anim av-a-left" style={{ '--d': '0.16s' }}>
                <div className="av-ci-ic"><i className="ti ti-clock"></i></div>
                <div className="av-ci-t">
                  <strong>Horário comercial</strong>
                  <span>Seg–Sex: 08h às 18h</span>
                </div>
              </div>
              <div className="av-ci av-anim av-a-left" style={{ '--d': '0.24s' }}>
                <div className="av-ci-ic"><i className="ti ti-brand-instagram"></i></div>
                <div className="av-ci-t">
                  <strong>Instagram</strong>
                  <span>@avancercrm</span>
                </div>
              </div>
            </div>
          </div>

          <div className="av-cont-form av-anim av-a-right">
            <h3>Agendar demonstração gratuita</h3>
            <form onSubmit={handleSubmit}>
              <div className="fg">
                <label>Seu nome</label>
                <input
                  className="inf"
                  placeholder="Nome completo..."
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  required
                />
              </div>
              <div className="fg">
                <label>WhatsApp</label>
                <input
                  className="inf"
                  placeholder="(62) 90000-0000"
                  value={form.wpp}
                  onChange={e => setForm(f => ({ ...f, wpp: e.target.value }))}
                />
              </div>
              <div className="fg">
                <label>Nome da clínica</label>
                <input
                  className="inf"
                  placeholder="Clínica..."
                  value={form.clinica}
                  onChange={e => setForm(f => ({ ...f, clinica: e.target.value }))}
                />
              </div>
              <div className="fg">
                <label>Plano de interesse</label>
                <select
                  className="inf"
                  value={form.plano}
                  onChange={e => setForm(f => ({ ...f, plano: e.target.value }))}
                >
                  <option value="">Ainda não sei — quero ver a demonstração</option>
                  <option>Essencial — R$ 300/mês</option>
                  <option>Expert — R$ 450/mês</option>
                </select>
              </div>
              <div className="fg">
                <label>Mensagem (opcional)</label>
                <textarea
                  className="inf"
                  placeholder="Conte um pouco sobre a sua clínica..."
                  value={form.msg}
                  onChange={e => setForm(f => ({ ...f, msg: e.target.value }))}
                  style={{ height: 70, resize: 'none' }}
                />
              </div>
              <button type="submit" className="av-btn-cta av-btn-full">
                <i className="ti ti-brand-whatsapp"></i> Chamar no WhatsApp agora
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
