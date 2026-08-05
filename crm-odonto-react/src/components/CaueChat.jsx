import { useEffect, useRef, useState } from 'react';
import caueVideo from '../assets/caue1.webm';
import caueVideo2 from '../assets/caue2.webm';
import { supabase } from '../lib/supabase';
import { useCRM } from '../context/CRMContext';
import { CAUE_ACOES, extrairAcao, limparMarcadores } from '../lib/caueAcoes';
import CaueGuia, { extrairGuia, pediuGuia, detectarGuiaPorTexto, CAUE_ROTEIROS } from './CaueGuia';

// CAUÊ — assistente do CRM Odontológico. Botão flutuante no canto de baixo à
// direita abre/fecha o chat. Personagem animado + balão, no mesmo padrão do
// assistente do CRM de loja.
// pointer-events: none em TUDO do personagem — nada ali é clicável; o sistema
// atrás continua 100% usável. Quando o mouse passa por cima, ele fica quase
// invisível (rastreio manual do mouse, porque o elemento não recebe eventos).
function CauePersonagem({ aberto, usuario }) {
  const areaRef = useRef(null);
  const areaRef2 = useRef(null);
  const [fantasma, setFantasma] = useState(false);
  useEffect(() => {
    function aoMover(e) {
      const dentroDe = el => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      };
      const dentro = dentroDe(areaRef.current) || dentroDe(areaRef2.current);
      setFantasma(v => (v === dentro ? v : dentro));
    }
    window.addEventListener('mousemove', aoMover, { passive: true });
    return () => window.removeEventListener('mousemove', aoMover);
  }, []);

  const pn = (usuario?.nome || '').split(' ')[0];
  const primeiroNome = pn.toLowerCase() === 'caue' ? '' : pn;

  if (aberto) {
    return (
      <>
        <video ref={areaRef} src={caueVideo2} autoPlay loop muted playsInline
          style={{
            position: 'fixed', zIndex: 69, pointerEvents: 'none',
            right: 56, bottom: 'min(524px, calc(100vh - 330px))',
            width: 176, height: 'auto', background: 'transparent', display: 'block',
            opacity: fantasma ? 0.1 : 1, transition: 'opacity .18s',
          }} />
        <div ref={areaRef2} style={{
          position: 'fixed', zIndex: 71, pointerEvents: 'none',
          right: 246, bottom: 'calc(min(524px, 100vh - 330px) + 190px)',
          maxWidth: 200, background: '#fff', border: '2px solid #0090dd', borderRadius: 14,
          padding: '10px 13px', fontSize: 12.5, fontWeight: 600, color: '#0a3555', lineHeight: 1.45,
          boxShadow: '0 8px 24px rgba(0,144,221,.22)',
          opacity: fantasma ? 0.1 : 1, transition: 'opacity .18s',
        }}>
          Me pergunte aqui tudo sobre o sistema 💬
        </div>
      </>
    );
  }
  return (
    <>
      <video ref={areaRef} src={caueVideo} autoPlay loop muted playsInline
        style={{
          position: 'fixed', right: 74, bottom: 8, width: 190, height: 'auto', zIndex: 68,
          pointerEvents: 'none', background: 'transparent', display: 'block',
          opacity: fantasma ? 0.1 : 1, transition: 'opacity .18s',
        }} />
      <div ref={areaRef2} style={{
        position: 'fixed', right: 268, bottom: 130, maxWidth: 210, zIndex: 68, pointerEvents: 'none',
        background: '#fff', border: '2px solid #0090dd', borderRadius: 14, padding: '10px 13px',
        fontSize: 12.5, fontWeight: 600, color: '#0a3555', lineHeight: 1.45,
        boxShadow: '0 8px 24px rgba(0,144,221,.22)',
        opacity: fantasma ? 0.1 : 1, transition: 'opacity .18s',
      }}>
        {primeiroNome ? `Oi, ${primeiroNome}! ` : 'Oi! '}Dúvida no sistema? Clique no ✨ 💙
      </div>
    </>
  );
}

// Plano B: se a ponte com o cérebro cair, o cliente nunca fica sem resposta.
const RESPOSTAS = [
  { re: /(marcar|agendar|agenda|hor[áa]rio|consulta)/i, txt: 'No menu **Agenda**: escolha a data no calendário do topo, o dentista, ache um horário vazio e clique na lupa da coluna PACIENTE. Para urgência, use o botão **+ ENCAIXE**. 🦷' },
  { re: /(odontograma|dente|c[áa]rie|canal|restaura|extra)/i, txt: 'No **Prontuário Inteligente** você clica no dente no desenho e escolhe o tratamento. A radiografia fica do lado, e o orçamento nasce sozinho para a recepção. 🦷' },
  { re: /(radiograf|raio.?x|panor[âa]mic|tomograf)/i, txt: 'Prontuário Inteligente → **Enviar radiografia**. Depois dá para clarear, dar contraste, inverter e ampliar a imagem. 🩻' },
  { re: /(or[çc]amento|aprovad|cobrar|aceitou)/i, txt: 'Tudo em **Orçamentos**: “Mandar para o paciente” abre o WhatsApp com o texto pronto; “Ele aceitou” aprova; depois aparece “Marcar a consulta”, que só mostra os horários livres. 🧾' },
  { re: /(caixa|pagamento|recebi|pix|dinheiro)/i, txt: 'O pagamento entra de dois jeitos: pelo botão **Pagar** na agenda (atendimento ATENDIDO) ou por **Recebi o pagamento** no orçamento. Os dois caem no **Fechamento de Caixa**. 💰' },
  { re: /(relat[óo]rio|faturamento|m[êe]s|falta)/i, txt: 'Em **Relatórios** escolha o mês: “Resumo do mês” traz faturamento, faltas e comparecimento; “De onde vem o dinheiro” mostra origem dos pacientes e produção por dentista. 📊' },
  { re: /(conv[êe]nio|tabela|pre[çc]o|procedimento)/i, txt: 'Em **Procedimentos** você ajusta os valores e importa a tabela do convênio por planilha XLS (colunas “Nome procedimento” e “Valor”). 📄' },
  { re: /(whats|rob[ôo]|mensagem|autom)/i, txt: 'Em **WhatsApp & IA → Robôs de mensagens** ficam as automações (confirmar consulta, cobrar, trazer paciente sumido). Clique em “Quero esta ferramenta” que a equipe ativa com você. 🚀' },
  { re: /(paciente|cadastr|ficha|alergia)/i, txt: 'No menu **Pacientes**: só o nome é obrigatório. A **Ficha de saúde** (alergia, doença, remédio, medo) vira a tarja de alerta que o dentista vê antes de atender. ⚠️' },
  { re: /(senha|seguran|2fa|duas etapas)/i, txt: 'Clique no seu nome no rodapé do menu para abrir **Segurança da Conta** e ativar a verificação em duas etapas. A senha do caixa quem troca é o administrador, no 🔑 do Fechamento de Caixa. 🔒' },
];
function saudacaoNome(usuario) {
  const pn = (usuario?.nome || '').split(' ')[0];
  return !pn || pn.toLowerCase() === 'caue' ? '' : `, ${pn}`;
}
const FALLBACK = 'Não consegui falar com o meu cérebro agora 😅 Tente de novo em instantes — ou me pergunte de outro jeito que eu tento pelo caminho curto.';

export default function CaueChat() {
  const { usuario, state, dispatch, procPrecos, setActivePanel } = useCRM();
  const [abertoChat, setAbertoChat] = useState(false);
  const [msgs, setMsgs] = useState([{ de: 'caue', txt: `Oi${saudacaoNome(usuario)}! Eu sou o Cauê, seu assistente aqui do sistema. 💙 Pergunte como fazer qualquer coisa — marcar consulta, odontograma, orçamento, caixa, relatórios…` }]);
  const [txt, setTxt] = useState('');
  const [pensando, setPensando] = useState(false);
  const [acao, setAcao] = useState(null);
  const [guia, setGuia] = useState(null);
  const [thread] = useState(() => localStorage.getItem('caue_thread') || (() => {
    const t = Math.random().toString(36).slice(2, 10); localStorage.setItem('caue_thread', t); return t;
  })());
  const fimRef = useRef(null);
  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, abertoChat]);

  // contexto que as ações usam para executar com a sessão do usuário
  const ctx = {
    usuario, state, dispatch, procPrecos,
    hoje: () => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; },
    salvarOdontograma: async (cli, dentes) => dispatch({
      type: 'UPDATE_CLIENTE',
      payload: { id: cli.id, prontuario: {
        ...(cli.prontuario || {}),
        odontograma: { ...(cli.prontuario?.odontograma || {}), dentes, atualizado_em: new Date().toISOString(), atualizado_por: usuario?.nome || 'Cauê' },
        orcamento: cli.prontuario?.orcamento || {
          status: 'aguardando',
          criado_em: `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
          validade: '', desconto: 0, descontoTipo: '%', parcelas: 1, obs: '', historico: [],
        },
      } },
    }),
  };

  async function enviar(textoDireto) {
    const t = (textoDireto ?? txt).trim();
    if (!t || pensando) return;
    setMsgs(m => [...m, { de: 'eu', txt: t }]);
    setTxt(''); setPensando(true);
    let resposta = '';
    try {
      const { data } = await supabase.auth.getSession();
      const r = await fetch('/api/caue-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data?.session?.access_token || ''}` },
        body: JSON.stringify({ mensagem: t, thread }),
      });
      const j = await r.json().catch(() => null);
      resposta = (r.ok && j?.resposta) ? j.resposta : '';
    } catch { /* sem rede: plano B */ }
    if (!resposta) resposta = (RESPOSTAS.find(x => x.re.test(t)) || { txt: FALLBACK }).txt;
    setPensando(false);

    const a = extrairAcao(resposta);
    const g = extrairGuia(resposta) || (pediuGuia(t) ? detectarGuiaPorTexto(t) : null);

    setMsgs(m => [...m, { de: 'caue', txt: limparMarcadores(resposta) || 'Certo!' }]);
    if (a && CAUE_ACOES[a.nome]) setAcao({ ...a, estado: 'aguardando' });
    if (g && CAUE_ROTEIROS[g]) { setGuia(g); setAbertoChat(false); }
  }

  async function confirmarAcao() {
    const def = CAUE_ACOES[acao.nome];
    const erro = def.valida?.(acao.params, ctx);
    if (erro) { setAcao(a => ({ ...a, estado: 'erro', msg: erro })); return; }
    setAcao(a => ({ ...a, estado: 'fazendo' }));
    try {
      const ok = await def.executar(acao.params, ctx);
      setAcao(a => ({ ...a, estado: 'feito', msg: ok }));
      setMsgs(m => [...m, { de: 'caue', txt: '✅ ' + ok }]);
    } catch (e) {
      setAcao(a => ({ ...a, estado: 'erro', msg: e.message || 'Não consegui fazer.' }));
    }
  }

  const btnPeq = { background: 'linear-gradient(135deg,#00b3ff,#00e0ff)', color: '#fff', border: 'none', borderRadius: 9, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' };
  const btnGhost = { background: '#fff', color: '#64748b', border: '1px solid #DCEDF8', borderRadius: 9, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' };

  if (!usuario) return null;

  return (
    <>
      {guia && <CaueGuia roteiro={guia} aoSair={() => { setGuia(null); setAbertoChat(true); }} />}
      <CauePersonagem aberto={abertoChat} usuario={usuario} />
      <button onClick={() => setAbertoChat(a => !a)} title="Cauê — assistente do sistema" data-guia="caue.botao"
        style={{ position: 'fixed', right: 18, bottom: 18, width: 54, height: 54, borderRadius: '50%', border: 'none', cursor: 'pointer', zIndex: 70, background: 'linear-gradient(135deg,#00b3ff,#00e0ff)', color: '#fff', fontSize: 24, boxShadow: '0 0 18px rgba(0,179,255,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {abertoChat ? '✕' : '✨'}
      </button>
      {abertoChat && (
        <div style={{ position: 'fixed', right: 18, bottom: 82, width: 340, height: 440, background: '#fff', border: '1px solid var(--borda)', borderRadius: 16, zIndex: 70, display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,.18)', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#00b3ff,#00e0ff)', color: '#fff', padding: '12px 16px', fontWeight: 800 }}>
            Cauê <span style={{ fontWeight: 500, fontSize: 11.5, opacity: .9 }}>· seu assistente no sistema</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.de === 'eu' ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                <div style={{ maxWidth: '85%', fontSize: 12.5, lineHeight: 1.45, padding: '8px 11px', borderRadius: 12, whiteSpace: 'pre-wrap', background: m.de === 'eu' ? 'linear-gradient(135deg,#00b3ff,#00e0ff)' : 'var(--b2)', color: m.de === 'eu' ? '#fff' : 'var(--preto)' }}>{m.txt}</div>
              </div>
            ))}
            {pensando && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontSize: 12.5, padding: '8px 11px', borderRadius: 12, background: 'var(--b2)', color: 'var(--cinza)' }}>Cauê está digitando…</div>
              </div>
            )}
            {acao && CAUE_ACOES[acao.nome] && (
              <div style={{ border: '2px solid #0090dd', borderRadius: 12, padding: '10px 12px', marginBottom: 8, background: '#f0f9ff' }}>
                <div style={{ fontWeight: 800, fontSize: 12.5, color: '#0a3555' }}>{CAUE_ACOES[acao.nome].titulo(acao.params)}</div>
                <div style={{ fontSize: 11.5, color: 'var(--cinza)', marginTop: 2 }}>{CAUE_ACOES[acao.nome].resumo(acao.params)}</div>
                {acao.estado === 'aguardando' && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button style={btnPeq} onClick={confirmarAcao}>✓ Confirmar e fazer</button>
                    <button style={btnGhost} onClick={() => setAcao(null)}>Cancelar</button>
                  </div>
                )}
                {acao.estado === 'fazendo' && <div style={{ fontSize: 12, marginTop: 6 }}>Fazendo…</div>}
                {acao.estado === 'feito' && <div className="badge b-fin" style={{ marginTop: 6, display: 'inline-block' }}>✓ {acao.msg}</div>}
                {acao.estado === 'erro' && (
                  <div style={{ marginTop: 6 }}>
                    <div className="badge b-flt" style={{ display: 'inline-block' }}>{acao.msg}</div>
                    <button style={{ ...btnGhost, marginTop: 6, display: 'block' }} onClick={() => setAcao(null)}>Fechar</button>
                  </div>
                )}
              </div>
            )}
            <div ref={fimRef} />
          </div>
          {msgs.length <= 1 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', padding: '0 10px 8px' }}>
              {['Como marco uma consulta?', 'Como faço o orçamento?', 'Como fecho o caixa?'].map(s => (
                <button key={s} style={{ ...btnGhost, fontSize: 11 }} onClick={() => enviar(s)}>{s}</button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, padding: 10, borderTop: '1px solid var(--borda)' }}>
            <input value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviar()} disabled={pensando}
              placeholder="Como faço para…" style={{ flex: 1, border: '1px solid var(--borda)', borderRadius: 9, padding: '8px 11px', fontSize: 12.5 }} />
            <button style={btnPeq} onClick={() => enviar()} disabled={pensando}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}
