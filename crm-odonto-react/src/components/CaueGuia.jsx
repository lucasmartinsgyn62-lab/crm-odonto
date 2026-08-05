import { useEffect, useRef, useState } from 'react';

// GUIA NA TELA — modo "Me mostre" do Cauê (mesmo motor do CRM de loja).
// [[GUIA: nome]] → o chat minimiza, a tela escurece com um FURO no elemento certo,
// um anel pulsante marca o alvo e uma caixinha explica o passo. Quem clica é o
// USUÁRIO. Se o alvo não aparecer em ~8s, provavelmente é permissão — o guia avisa.
//
// Alvos são marcados no HTML com data-guia="...":
//   menu.<id> · agenda.* · cli.* · pront.* · orc.* · caixa.* · proc.* · rel.* · wpp.* · seg.*

export const CAUE_ROTEIROS = {
  marcar_consulta: {
    titulo: 'Marcar uma consulta',
    passos: [
      { alvo: 'menu.agenda', txt: 'Clique aqui em **Agenda**.' },
      { alvo: 'agenda.dentista', txt: 'Escolha o **dentista** que vai atender (a data fica no calendário do topo).' },
      { txt: 'Ache um horário vazio, clique na **lupa** da coluna PACIENTE e escolha a pessoa. O WhatsApp e os procedimentos vêm sozinhos do cadastro. 🦷' },
    ],
  },
  encaixe_urgencia: {
    titulo: 'Encaixar uma urgência',
    passos: [
      { alvo: 'menu.agenda', txt: 'Clique em **Agenda**.' },
      { alvo: 'agenda.encaixe', txt: 'No horário que você quer, clique em **+ ENCAIXE**.' },
      { txt: 'Aparece uma linha extra naquele horário. Escolha o paciente ali e pronto — a agenda normal continua intacta. 🚨' },
    ],
  },
  novo_paciente: {
    titulo: 'Cadastrar um paciente',
    passos: [
      { alvo: 'menu.clientes', txt: 'Clique em **Pacientes**.' },
      { alvo: 'cli.nome', txt: 'Digite o **nome** aqui (é o único campo obrigatório).' },
      { alvo: 'cli.salvar', txt: 'Preencha o WhatsApp e clique em **Salvar paciente**. Com o WhatsApp você consegue confirmar consulta e mandar orçamento. 📱' },
    ],
  },
  ficha_clinica: {
    titulo: 'Preencher a ficha de saúde',
    passos: [
      { alvo: 'menu.clientes', txt: 'Clique em **Pacientes**.' },
      { alvo: 'cli.ficha', txt: 'Clique em **Ficha de saúde do paciente**.' },
      { txt: 'Preencha alergia, doença, remédio e medo do dentista. É isso que vira a **tarja vermelha de alerta** para o dentista antes de atender. ⚠️' },
    ],
  },
  lancar_tratamento: {
    titulo: 'Marcar o tratamento no dente',
    passos: [
      { alvo: 'menu.prontuario', txt: 'Clique em **Prontuário Inteligente**.' },
      { alvo: 'pront.odontograma', txt: 'Clique no **dente** que vai ser tratado (pode clicar em vários).' },
      { alvo: 'pront.lancar', txt: 'Escolha o tratamento (ou use os botões rápidos) e clique em **Anotar no dente**.' },
      { txt: 'Pronto: o desenho fica colorido e o **orçamento nasce sozinho** na tela Orçamentos para a recepção cobrar. 🧾' },
    ],
  },
  enviar_radiografia: {
    titulo: 'Colocar a radiografia do paciente',
    passos: [
      { alvo: 'menu.prontuario', txt: 'Clique em **Prontuário Inteligente**.' },
      { alvo: 'pront.rx', txt: 'Clique em **Enviar radiografia** e escolha a imagem no computador.' },
      { txt: 'Ela aparece do lado do odontograma. Dá para **clarear, dar contraste, inverter e ampliar** — e fica guardada no prontuário. 🩻' },
    ],
  },
  enviar_orcamento: {
    titulo: 'Mandar o orçamento para o paciente',
    passos: [
      { alvo: 'menu.orcamentos', txt: 'Clique em **Orçamentos**.' },
      { alvo: 'orc.cobrar', txt: 'No cartão do paciente, clique em **Mandar para o paciente**.' },
      { txt: 'Abre o WhatsApp dele com o orçamento já escrito: cada dente, o valor e o parcelamento. É só apertar enviar. 💬' },
    ],
  },
  aprovar_orcamento: {
    titulo: 'Registrar que o paciente aceitou',
    passos: [
      { alvo: 'menu.orcamentos', txt: 'Clique em **Orçamentos**.' },
      { alvo: 'orc.aprovar', txt: 'No cartão do paciente, clique em **Ele aceitou**.' },
      { txt: 'O orçamento sai da fila de espera e vai para “Aprovado”, onde aparece o botão de **marcar a consulta**. ✅' },
    ],
  },
  agendar_orcamento: {
    titulo: 'Marcar a consulta de um orçamento aprovado',
    passos: [
      { alvo: 'menu.orcamentos', txt: 'Clique em **Orçamentos**.' },
      { alvo: 'orc.agendar', txt: 'Clique em **Marcar a consulta**.' },
      { txt: 'A tela mostra só os **dias e horários livres** do dentista. Escolha um e confirme — a consulta entra na agenda sozinha. 📅' },
    ],
  },
  receber_pagamento: {
    titulo: 'Registrar um pagamento',
    passos: [
      { alvo: 'menu.orcamentos', txt: 'Se o paciente está pagando o tratamento, clique em **Orçamentos**.' },
      { alvo: 'orc.recebi', txt: 'Clique em **Recebi o pagamento** e informe a forma (Pix, dinheiro, cartão…).' },
      { txt: 'Também dá para receber pela **Agenda**: no atendimento marcado como ATENDIDO aparece o botão **Pagar**. Os dois caem no Fechamento de Caixa. 💰' },
    ],
  },
  fechar_caixa: {
    titulo: 'Fechar o caixa do dia',
    passos: [
      { alvo: 'menu.caixa', txt: 'Clique em **Fechamento de Caixa**.' },
      { txt: 'Confira os pagamentos do dia e os totais por forma (Pix, dinheiro, cartão).' },
      { alvo: 'caixa.fechar', txt: 'Clique em **Fechar o caixa de hoje** e digite a senha (a padrão é 123). O dia vai para o Histórico. ✅' },
    ],
  },
  importar_convenio: {
    titulo: 'Importar a tabela do convênio',
    passos: [
      { alvo: 'menu.procedimentos', txt: 'Clique em **Procedimentos**.' },
      { alvo: 'proc.importar', txt: 'Clique em **Importar XLS** e escolha a planilha do convênio.' },
      { txt: 'A planilha precisa ter as colunas **Nome procedimento** e **Valor**. Os itens entram como “CONVÊNIO — nome”, com a cor que você escolher. 📄' },
    ],
  },
  ver_relatorios: {
    titulo: 'Ver como foi o mês',
    passos: [
      { alvo: 'menu.relatorio', txt: 'Clique em **Relatórios**.' },
      { alvo: 'rel.periodo', txt: 'Escolha o **mês e o ano** aqui.' },
      { txt: 'Em **Resumo do mês** você vê faturamento, faltas e comparecimento. Em **De onde vem o dinheiro**, quem indicou e qual dentista produziu mais. 📊' },
    ],
  },
  robos_whatsapp: {
    titulo: 'Conhecer os robôs de mensagem',
    passos: [
      { alvo: 'menu.whatsapp', txt: 'Clique em **WhatsApp & IA**.' },
      { alvo: 'wpp.robos', txt: 'Abra a aba **Robôs de mensagens**.' },
      { txt: 'Escolha o robô que resolve a sua dor (confirmar consulta, cobrar, trazer paciente sumido) e clique em **Quero esta ferramenta**. A equipe ativa com você. 🚀' },
    ],
  },
  ativar_2fa: {
    titulo: 'Proteger a conta com 2 etapas',
    passos: [
      { alvo: 'seg.usuario', txt: 'Clique no **seu nome**, aqui embaixo do menu.' },
      { txt: 'Em Segurança da Conta, ative a **verificação em duas etapas** e leia o QR Code com o aplicativo autenticador do celular. 🔒' },
    ],
  },
};

// ── GATILHO FIXO "Me mostre" ────────────────────────────────────────────
export function pediuGuia(texto) {
  return /(me mostr|mostra (na tela|como|pra mim|pra min)|passo a passo|me ensina|como fa[çc]o|onde fica|me guia)/i.test(String(texto || ''));
}
const DETECTORES = [
  [/encaix|urg[êe]ncia/i, 'encaixe_urgencia'],
  [/marcar? (uma )?consulta|agendar|hor[áa]rio/i, 'marcar_consulta'],
  [/radiograf|raio.?x|panor[âa]mic|tomografi/i, 'enviar_radiografia'],
  [/odontograma|dente|tratamento no dente|c[áa]rie|canal|restaura/i, 'lancar_tratamento'],
  [/or[çc]amento.*(mand|envi|whats|cobr)|cobrar? o? paciente/i, 'enviar_orcamento'],
  [/aceit|aprov/i, 'aprovar_orcamento'],
  [/receb|pagou|pagamento|dinheiro entrou/i, 'receber_pagamento'],
  [/fechar? o? caixa|fechamento/i, 'fechar_caixa'],
  [/conv[êe]nio|tabela de pre[çc]o|amil|planilha/i, 'importar_convenio'],
  [/relat[óo]rio|faturamento|quanto (eu )?fiz|m[êe]s/i, 'ver_relatorios'],
  [/rob[ôo]|mensagem autom|whats/i, 'robos_whatsapp'],
  [/ficha|alergia|anamnese|sa[úu]de/i, 'ficha_clinica'],
  [/paciente novo|cadastrar? paciente|novo paciente/i, 'novo_paciente'],
  [/senha|seguran[çc]a|duas etapas|2fa/i, 'ativar_2fa'],
];
export function detectarGuiaPorTexto(texto) {
  const t = String(texto || '');
  for (const [re, nome] of DETECTORES) if (re.test(t)) return nome;
  return null;
}
export function extrairGuia(texto) {
  const m = String(texto || '').match(/\[\[GUIA:\s*([a-z_]+)\s*\]\]/i);
  return m ? m[1].toLowerCase() : null;
}

function Fala({ txt }) {
  const partes = String(txt).split(/\*\*(.+?)\*\*/g);
  return <>{partes.map((p, i) => (i % 2 ? <b key={i}>{p}</b> : <span key={i}>{p}</span>))}</>;
}

export default function CaueGuia({ roteiro, aoSair }) {
  const r = CAUE_ROTEIROS[roteiro];
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [sumido, setSumido] = useState(false);
  const passo = r?.passos[i];
  const avancarRef = useRef(null);

  useEffect(() => {
    if (!passo) return;
    setSumido(false);
    if (!passo.alvo) { setRect(null); return; }
    let achouAlguma = false;
    const desde = Date.now();
    const id = setInterval(() => {
      const alvos = Array.isArray(passo.alvo) ? passo.alvo : [passo.alvo];
      let el = null;
      for (const a of alvos) { el = document.querySelector(`[data-guia="${a}"]`); if (el) break; }
      if (el) {
        achouAlguma = true;
        const b = el.getBoundingClientRect();
        setRect(v => (v && Math.abs(v.top - b.top) < 1 && Math.abs(v.left - b.left) < 1 && Math.abs(v.width - b.width) < 1 ? v
          : { top: b.top, left: b.left, width: b.width, height: b.height }));
      } else if (!achouAlguma && Date.now() - desde > 8000) {
        setSumido(true); clearInterval(id);
      }
    }, 220);
    return () => clearInterval(id);
  }, [roteiro, i]); // eslint-disable-line

  useEffect(() => {
    if (!passo?.alvo) return;
    function aoClicar(e) {
      const alvos = Array.isArray(passo.alvo) ? passo.alvo : [passo.alvo];
      const el = e.target.closest?.('[data-guia]');
      if (el && alvos.includes(el.getAttribute('data-guia'))) {
        clearTimeout(avancarRef.current);
        avancarRef.current = setTimeout(() => setI(v => v + 1), 420);
      }
    }
    document.addEventListener('click', aoClicar, true);
    return () => { document.removeEventListener('click', aoClicar, true); clearTimeout(avancarRef.current); };
  }, [roteiro, i]); // eslint-disable-line

  useEffect(() => { if (r && i >= r.passos.length) aoSair?.('fim'); }, [i]); // eslint-disable-line
  if (!r || !passo) return null;

  const caixa = rect
    ? { top: Math.min(window.innerHeight - 150, rect.top + rect.height + 12), left: Math.min(window.innerWidth - 330, Math.max(12, rect.left)) }
    : { top: window.innerHeight / 2 - 60, left: window.innerWidth / 2 - 160 };

  const btn = { background: 'linear-gradient(135deg,#00b3ff,#00e0ff)', color: '#fff', border: 'none', borderRadius: 9, padding: '6px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' };

  return (
    <>
      <style>{`@keyframes cauePulso { 0%,100% { box-shadow: 0 0 0 3px #00b3ff, 0 0 0 9999px rgba(8,25,45,.55); } 50% { box-shadow: 0 0 0 7px rgba(0,179,255,.55), 0 0 0 9999px rgba(8,25,45,.55); } }`}</style>
      {rect ? (
        <div style={{ position: 'fixed', top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8,
          borderRadius: 10, zIndex: 400, pointerEvents: 'none', animation: 'cauePulso 1.5s ease-in-out infinite' }} />
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,25,45,.55)', zIndex: 400, pointerEvents: 'none' }} />
      )}

      <div style={{ position: 'fixed', top: caixa.top, left: caixa.left, width: 316, zIndex: 401,
        background: '#fff', border: '2px solid #0090dd', borderRadius: 14, padding: '13px 15px',
        boxShadow: '0 14px 40px rgba(8,25,45,.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <span style={{ background: 'linear-gradient(135deg,#00b3ff,#00e0ff)', color: '#fff', borderRadius: 20, fontSize: 10.5, fontWeight: 800, padding: '2px 9px' }}>
            CAUÊ · passo {i + 1} de {r.passos.length}
          </span>
          <button onClick={() => aoSair?.('saiu')} title="Sair do guia"
            style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 15 }}>✕</button>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#0a3555' }}>
          {sumido
            ? <>Não achei esse botão na sua tela — pode ser que o seu acesso não inclua essa parte. Fale com o responsável pela clínica.</>
            : <Fala txt={passo.txt} />}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
          {sumido
            ? <button style={btn} onClick={() => aoSair?.('falhou')}>Entendi</button>
            : (!passo.alvo || i === r.passos.length - 1)
              ? <button style={btn} onClick={() => setI(v => v + 1)}>{i === r.passos.length - 1 ? 'Concluir' : 'Próximo'}</button>
              : <span style={{ fontSize: 11.5, color: '#94a3b8', alignSelf: 'center' }}>👆 clique no que está destacado</span>}
        </div>
      </div>
    </>
  );
}
