import { useEffect, useMemo, useState } from 'react';

const dores = [
  'Paciente que some porque ninguém confirmou a consulta',
  'Caixa fechado “de cabeça” no fim do dia',
  'Prontuário espalhado em papel e grupos de WhatsApp',
  'Zero visão de quanto cada dentista produz',
];

const recursos = [
  { grupo: 'Principal', icon: '▦', nome: 'Dashboard Diária', desc: 'Agendados, atendidos, fila de espera, faltas, receita e comparecimento em tempo real.', badge: 'Atualizado agora', stat: '92%', label: 'comparecimento', bars: [72, 91, 64, 86] },
  { grupo: 'Principal', icon: '◫', nome: 'Agenda', desc: 'Agenda por dentista, status coloridos, encaixes e busca rápida de pacientes.', badge: 'Consulta confirmada', stat: '14:30', label: 'próximo horário', bars: [35, 76, 93, 58] },
  { grupo: 'Gestão', icon: '◎', nome: 'Pacientes', desc: 'Cadastro completo, histórico e prontuário digital com fotos e arquivos.', badge: 'Prontuário atualizado', stat: '1.248', label: 'pacientes ativos', bars: [82, 68, 88, 95] },
  { grupo: 'Gestão', icon: '◇', nome: 'Dentistas', desc: 'Cadastro da equipe e acompanhamento da produção de cada profissional.', badge: 'Meta atingida', stat: 'R$ 42k', label: 'produção da equipe', bars: [55, 78, 92, 69] },
  { grupo: 'Gestão', icon: '⌖', nome: 'Origens', desc: 'Descubra quais canais trazem mais pacientes e oferecem melhor retorno.', badge: 'Google em destaque', stat: '38%', label: 'vieram por indicação', bars: [90, 72, 48, 61] },
  { grupo: 'Gestão', icon: '✦', nome: 'Procedimentos', desc: 'Tabela de preços por convênio e importação rápida por planilha XLS.', badge: 'Planilha importada', stat: '186', label: 'procedimentos', bars: [60, 82, 74, 96] },
  { grupo: 'Análise', icon: '↗', nome: 'Relatórios', desc: 'Faturamento, ticket médio, ocupação e receita por dentista em Excel e PDF.', badge: 'PDF exportado', stat: '+18%', label: 'faturamento no mês', bars: [42, 58, 77, 96] },
  { grupo: 'Análise', icon: '◉', nome: 'Auditoria', desc: 'Registro completo de quem alterou o quê e quando dentro do sistema.', badge: 'Registro protegido', stat: '100%', label: 'ações rastreadas', bars: [88, 88, 88, 88] },
  { grupo: 'Caixa', icon: 'R$', nome: 'Fechamento de Caixa', desc: 'Entradas por procedimento e dentista, com senha de fechamento.', badge: 'Caixa conferido', stat: 'R$ 8.420', label: 'receita de hoje', bars: [67, 85, 76, 93] },
  { grupo: 'Caixa', icon: '▤', nome: 'Histórico de Caixa', desc: 'Todos os fechamentos anteriores disponíveis para consulta.', badge: 'Histórico salvo', stat: '365 dias', label: 'sempre disponíveis', bars: [48, 62, 79, 91] },
  { grupo: 'Automação', icon: '✺', nome: 'WhatsApp & IA', desc: 'Atendimento, agendamento e confirmação automáticos pelo WhatsApp.', badge: 'Paciente respondido', stat: '24h', label: 'atendimento automático', bars: [92, 96, 89, 98] },
  { grupo: 'Automação', icon: '⇢', nome: 'Vendas / Pipeline', desc: 'Funil visual para acompanhar negociações e converter novos pacientes.', badge: 'Lead convertido', stat: '31%', label: 'mais conversões', bars: [36, 59, 74, 94] },
  { grupo: 'Segurança', icon: '⌾', nome: 'Verificação em 2 etapas', desc: 'Proteção adicional no login com código do aplicativo autenticador.', badge: 'Acesso protegido', stat: '2FA', label: 'segurança ativada', bars: [100, 100, 100, 100] },
  { grupo: 'Segurança', icon: '☁', nome: 'Nuvem + Backup Diário', desc: 'Acesse de qualquer lugar com backup automático todos os dias.', badge: 'Backup concluído', stat: '100%', label: 'dados protegidos', bars: [76, 84, 92, 100] },
];

export default function Recursos() {
  const [ativo, setAtivo] = useState(0);
  const [pausado, setPausado] = useState(false);
  const recurso = recursos[ativo];
  const grupos = useMemo(() => [...new Set(recursos.map((item) => item.grupo))], []);

  useEffect(() => {
    if (pausado) return undefined;
    const timer = setInterval(() => setAtivo((atual) => (atual + 1) % recursos.length), 3600);
    return () => clearInterval(timer);
  }, [pausado]);

  const navegar = (direcao) => setAtivo((atual) => (atual + direcao + recursos.length) % recursos.length);

  return (
    <section className="av-sec av-sec-recursos" id="sec-recursos">
      <div className="av-container">
        <div className="av-dor-box">
          <span className="av-tag">Reconhece a sua clínica aqui?</span>
          <h2 className="av-h2">Todo dia sem gestão é dinheiro saindo pela porta.</h2>
          <div className="av-dor-list">
            {dores.map((dor, i) => (
              <div className="av-dor-item av-anim av-a-left" style={{ '--d': `${i * 0.08}s` }} key={dor}><span>×</span>{dor}</div>
            ))}
          </div>
          <p className="av-dor-fecho">Cada um desses problemas tem nome: <strong>falta de sistema</strong>. E todos eles o AvancerCRM resolve.</p>
        </div>

        <div className="av-showcase-head">
          <div>
            <span className="av-tag">Tudo em um só sistema</span>
            <h2 className="av-h2">Veja o AvancerCRM trabalhando por você</h2>
            <p className="av-func-sub">Uma visão dinâmica de tudo que sua clínica controla em um único lugar.</p>
          </div>
          <div className="av-showcase-groups" aria-label="Categorias de funcionalidades">
            {grupos.map((grupo) => {
              const indice = recursos.findIndex((item) => item.grupo === grupo);
              return <button className={recurso.grupo === grupo ? 'active' : ''} onClick={() => setAtivo(indice)} key={grupo}>{grupo}</button>;
            })}
          </div>
        </div>

        <div className="av-phone-story" onMouseEnter={() => setPausado(true)} onMouseLeave={() => setPausado(false)}>
          <button className="av-story-arrow prev" onClick={() => navegar(-1)} aria-label="Funcionalidade anterior">‹</button>
          <div className="av-story-copy" key={`copy-${ativo}`}>
            <span className="av-story-count">{String(ativo + 1).padStart(2, '0')} / {recursos.length}</span>
            <div className="av-story-icon">{recurso.icon}</div>
            <span className="av-story-group">{recurso.grupo}</span>
            <h3>{recurso.nome}</h3>
            <p>{recurso.desc}</p>
            <div className="av-story-notice"><span>✓</span>{recurso.badge}</div>
          </div>

          <div className="av-phone-wrap">
            <div className="av-phone-neon" />
            <div className="av-feature-phone">
              <div className="av-phone-speaker" />
              <div className="av-phone-screen" key={`screen-${ativo}`}>
                <div className="av-app-top"><img src="/logo-avancer.svg" alt="" /><span>•••</span></div>
                <div className="av-app-welcome"><small>{recurso.grupo}</small><strong>{recurso.nome}</strong></div>
                <div className="av-app-stat"><span>{recurso.stat}</span><small>{recurso.label}</small><i>↗</i></div>
                <div className="av-app-chart">
                  {recurso.bars.map((altura, i) => <span style={{ height: `${altura}%`, '--delay': `${i * .09}s` }} key={`${altura}-${i}`} />)}
                </div>
                <div className="av-app-cards">
                  <div><i>✓</i><span>Sincronizado</span><small>agora</small></div>
                  <div><i>✦</i><span>{recurso.badge}</span><small>AvancerCRM</small></div>
                </div>
                <div className="av-app-nav"><b>⌂</b><b>▦</b><b>＋</b><b>↗</b><b>◎</b></div>
              </div>
            </div>
          </div>
          <button className="av-story-arrow next" onClick={() => navegar(1)} aria-label="Próxima funcionalidade">›</button>
        </div>

        <div className="av-story-progress">
          {recursos.map((item, i) => <button className={i === ativo ? 'active' : ''} onClick={() => setAtivo(i)} aria-label={`Ver ${item.nome}`} key={item.nome}><span /></button>)}
        </div>
      </div>
    </section>
  );
}
