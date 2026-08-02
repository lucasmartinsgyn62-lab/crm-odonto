import { useMemo, useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { num } from '../../constants';

// 🚀 ROBÔS DE MENSAGENS — vitrine das automações de WhatsApp para a clínica.
// Mesma ideia do CRM de loja, adaptada à odontologia: cada card diz o que o robô
// faz, mostra a mensagem que o paciente recebe e o quanto isso vale. Os números
// do diagnóstico saem dos dados REAIS da clínica (agenda + planos de tratamento).
// Nenhum robô está ligado de propósito — o botão abre a conversa com a equipe.

const WHATS_EQUIPE = '5562981949053';   // comercial AvancerCRM

const brl = v => num(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RobosOdonto() {
  const { state, usuario, logAudit, showToast } = useCRM();
  const [pedidos, setPedidos] = useState({});

  /* ── Diagnóstico da própria clínica (o que dá o "peso" da oferta) ── */
  const dx = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const dias = d => Math.round((hoje - d) / 86400000);
    const parse = s => { const [dd, mm, aa] = String(s).split('/'); return aa ? new Date(+aa, +mm - 1, +dd) : null; };

    let faltas = 0, perdido = 0, amanha = 0;
    const ultimaVisita = new Map();
    Object.entries(state.agenda).forEach(([agKey, slots]) => {
      const data = agKey.includes('||') ? agKey.split('||')[1] : agKey;
      const d = parse(data);
      if (!d) return;
      Object.values(slots || {}).forEach(s => {
        if (!s?.nome) return;
        const idade = dias(d);
        if (idade >= 0 && idade <= 30 && String(s.status || '').startsWith('FALTOU')) { faltas++; perdido += num(s.valor); }
        if (idade === -1) amanha++;
        if (idade >= 0 && (s.status === 'ATENDIDO' || s.status === 'FINALIZADO')) {
          const ant = ultimaVisita.get(s.nome);
          if (!ant || d > ant) ultimaVisita.set(s.nome, d);
        }
      });
    });

    let sumidos = 0, planoAberto = 0, comPlano = 0;
    state.clientes.forEach(c => {
      // a agenda carregada cobre poucos meses: quem não aparece nela só conta
      // como sumido se o cadastro já for antigo (senão o número mentiria)
      const ult = ultimaVisita.get(c.nome);
      const cadastro = c.created_at ? new Date(c.created_at) : null;
      if (ult ? dias(ult) > 120 : (cadastro && dias(cadastro) > 180)) sumidos++;
      const itens = Object.values(c.prontuario?.odontograma?.dentes || {}).flatMap(d => d.itens || []);
      const aberto = itens.filter(i => i.status !== 'concluido').reduce((s, i) => s + num(i.valor), 0);
      if (aberto > 0) { planoAberto += aberto; comPlano++; }
    });

    return { faltas, perdido, amanha, sumidos, planoAberto, comPlano, pacientes: state.clientes.length };
  }, [state.agenda, state.clientes]);

  const ROBOS = [
    {
      emoji: '🔔', nome: 'Confirmador de Consultas', cor: '#0ea5e9',
      faz: 'Um dia antes, ele manda sozinho a confirmação de cada paciente da agenda e já marca no sistema quem respondeu SIM, quem pediu para remarcar e quem não respondeu.',
      como: '"Oi Amanda! Confirmando sua consulta amanhã às 14h com a Dra. Marina 🦷 Responda 1 para confirmar ou 2 para remarcar."',
      ganho: `Você tem ${dx.amanha} consulta(s) marcadas para amanhã. Nos últimos 30 dias foram ${dx.faltas} faltas — ${brl(dx.perdido)} de cadeira vazia.`,
      destaque: dx.faltas > 0,
    },
    {
      emoji: '🧾', nome: 'Resgate de Orçamento', cor: '#f59e0b',
      faz: 'Pega os planos de tratamento que o dentista montou no Prontuário Inteligente e ainda não foram fechados, e reaquece o paciente com parcelamento e prova social.',
      como: '"Oi Igor, seu plano de tratamento (2 restaurações + coroa) continua reservado. Dá para parcelar em até 10x — quer que eu segure um horário essa semana?"',
      ganho: `${dx.comPlano} paciente(s) com plano em aberto na sua clínica somam ${brl(dx.planoAberto)} parados.`,
      destaque: dx.planoAberto > 0,
    },
    {
      emoji: '👻', nome: 'Radar de Paciente Sumido', cor: '#8b5cf6',
      faz: 'Vigia quem não aparece há mais de 6 meses e chama de volta para a limpeza/revisão, sem a recepção precisar caçar nome em planilha.',
      como: '"Oi Fernanda, faz 7 meses da sua última limpeza 😬 Separei dois horários pra você essa semana — qual fica melhor?"',
      ganho: `${dx.sumidos} de ${dx.pacientes} pacientes cadastrados estão frios há meses. Reativar é 5× mais barato que conseguir paciente novo.`,
      destaque: dx.sumidos > 0,
    },
    {
      emoji: '🦷', nome: 'Manutenção Automática', cor: '#0d9488',
      faz: 'Cada tratamento tem seu retorno: manutenção do aparelho todo mês, revisão do implante, limpeza a cada 6 meses. O robô conta o prazo e chama na hora certa.',
      como: '"Oi João! Já é hora da manutenção do seu aparelho 🦷 Tenho quinta 15h ou sábado 09h. Reservo qual?"',
      ganho: 'Transforma tratamento pontual em receita que se repete todo mês.',
    },
    {
      emoji: '💸', nome: 'Cobrador de Parcela', cor: '#dc2626',
      faz: 'Lembra o paciente da parcela do tratamento com o valor certo e o PIX copia-e-cola da clínica — e insiste sozinho em 3 e 7 dias se não pagar.',
      como: '"Oi Bruno! A parcela 3/6 do seu tratamento (R$ 450) vence amanhã. Segue o PIX pra facilitar 😉"',
      ganho: 'Cobrança que ninguém gosta de fazer, feita sem constrangimento e sem esquecer ninguém.',
    },
    {
      emoji: '🚨', nome: 'Fila de Encaixe', cor: '#ea580c',
      faz: 'Quando alguém desmarca, ele oferece o horário vago para a fila de espera na hora — quem responder primeiro leva.',
      como: '"Vagou uma consulta hoje às 16h com o Dr. Rafael! Quer esse horário? Responda SIM que eu já reservo."',
      ganho: 'Cancelamento vira atendimento no mesmo dia, em vez de buraco na agenda.',
    },
    {
      emoji: '🩹', nome: 'Pós-Operatório Cuidadoso', cor: '#16a34a',
      faz: 'Depois de extração, canal ou cirurgia, acompanha o paciente por 3 dias com as orientações e pergunta como ele está.',
      como: '"Oi Camila, como está o pós da extração? Lembre do gelo hoje e nada de bochechar forte. Alguma dor fora do normal?"',
      ganho: 'Menos urgência às 22h, mais avaliação 5 estrelas e paciente que indica.',
    },
    {
      emoji: '⭐', nome: 'Caçador de Avaliação no Google', cor: '#eab308',
      faz: 'Algumas horas depois do atendimento, pede a avaliação com o link direto — e só pede para quem saiu satisfeito.',
      como: '"Que bom te atender hoje, Mariana! 💙 Se puder deixar uma estrelinha pra gente, leva 30 segundos: [link]"',
      ganho: 'Clínica bem avaliada aparece primeiro no Google e fecha paciente sem pagar anúncio.',
    },
    {
      emoji: '🎙️', nome: 'Resumo do Dia em Áudio', cor: '#4f46e5',
      faz: 'Todo fim de expediente você recebe no SEU WhatsApp um áudio de 30 segundos: quanto entrou, quem faltou, quanto tem amanhã e o que precisa de atenção.',
      como: '"Fala doutor! Hoje 16 atendimentos, R$ 17.130 no caixa, 2 faltas. Amanhã tem 19 marcados, 4 ainda sem confirmar."',
      ganho: 'É como ter um gerente conferindo tudo — sem folha de pagamento.',
    },
    {
      emoji: '🎂', nome: 'Aniversariante do Dia', cor: '#ec4899',
      faz: 'Manda os parabéns com um mimo (clareamento com desconto, limpeza cortesia) para o paciente lembrar da clínica no melhor dia dele.',
      como: '"Feliz aniversário, Otávio! 🎂 De presente, 20% no clareamento até o fim do mês. Aparece pra gente comemorar esse sorriso!"',
      ganho: 'A mensagem mais barata do mundo — e a que mais recebe resposta.',
    },
  ];

  function pedir(r) {
    const msg = `Olá! Sou da clínica e quero ativar o robô "${r.nome}" ${r.emoji} no meu CRM.\n\n` +
      `Clínica: ${usuario?.nome || ''}\nQuero entender como funciona o disparo e quanto custa.`;
    window.open(`https://wa.me/${WHATS_EQUIPE}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    setPedidos(p => ({ ...p, [r.nome]: true }));
    logAudit?.('criou', 'automação', `Pediu a ativação do robô "${r.nome}"`);
    showToast?.('Pedido aberto no WhatsApp — nossa equipe te chama para ativar 🚀', 'success');
  }

  return (
    <div>
      {/* Faixa de diagnóstico — o dinheiro que a clínica está deixando na mesa */}
      <div style={{
        background: 'linear-gradient(135deg,#00b3ff,#00e0ff)', color: '#fff', borderRadius: 'var(--rl)',
        padding: '1rem 1.3rem', marginBottom: '1rem', boxShadow: '0 0 22px rgba(0,179,255,.35)',
      }}>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>🚀 Robôs que trabalham enquanto você atende o paciente</div>
        <div style={{ fontSize: 13, opacity: .95, maxWidth: 900 }}>
          Cada robô manda mensagem sozinho no WhatsApp usando os dados que este CRM já tem — agenda, prontuário,
          planos de tratamento e caixa. Você não digita nada. Olhe o que a sua clínica está deixando na mesa <b>agora</b>:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginTop: 12 }}>
          {[
            ['Faltas nos últimos 30 dias', dx.faltas, brl(dx.perdido) + ' de cadeira vazia'],
            ['Planos de tratamento parados', brl(dx.planoAberto), `${dx.comPlano} pacientes esperando decisão`],
            ['Pacientes frios (sem voltar)', dx.sumidos, `de ${dx.pacientes} cadastrados`],
            ['Consultas amanhã', dx.amanha, 'confirmação automática evita o furo'],
          ].map(([t, v, s]) => (
            <div key={t} style={{ background: 'rgba(255,255,255,.16)', borderRadius: 12, padding: '.6rem .8rem' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: .6, textTransform: 'uppercase', opacity: .9 }}>{t}</div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{v}</div>
              <div style={{ fontSize: 11, opacity: .9 }}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
        {ROBOS.map(r => (
          <div key={r.nome} className="fp" style={{ margin: 0, display: 'flex', flexDirection: 'column', borderTop: `3px solid ${r.cor}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28 }}>{r.emoji}</span>
              <span style={{ fontWeight: 800, fontSize: 15 }}>{r.nome}</span>
              {r.destaque && <span className="badge b-flt" style={{ marginLeft: 'auto' }}>urgente</span>}
            </div>
            <div style={{ fontSize: 13, margin: '8px 0' }}><b>O que faz:</b> {r.faz}</div>
            <div style={{ fontSize: 12.5, color: 'var(--cinza)', background: 'var(--vc)', borderRadius: 10, padding: '.55rem .7rem', marginBottom: 8, fontStyle: 'italic' }}>
              💬 {r.como}
            </div>
            <div style={{ fontSize: 12, color: r.cor, fontWeight: 700, marginBottom: 12 }}>💰 {r.ganho}</div>
            <div style={{ marginTop: 'auto' }}>
              {pedidos[r.nome] ? (
                <div className="badge b-fin" style={{ display: 'block', textAlign: 'center', padding: '.5rem' }}>
                  ✓ Pedido enviado — nossa equipe entra em contato
                </div>
              ) : (
                <button className="btsv" style={{ width: '100%', background: r.cor }} onClick={() => pedir(r)}>
                  ⚡ Quero esta ferramenta
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="fp" style={{ marginTop: 14, borderLeft: '4px solid var(--v2)' }}>
        <div style={{ fontSize: 13.5 }}>
          <b>Como funciona a ativação:</b> nós conectamos o WhatsApp da clínica, escrevemos as mensagens com o seu jeito de falar
          e ligamos os robôs que você escolher. Você acompanha tudo por aqui — quem recebeu, quem respondeu e quem virou consulta.
          <br />Quer ver funcionando antes? Clique em qualquer robô acima que a gente te mostra ao vivo.
        </div>
      </div>
    </div>
  );
}
