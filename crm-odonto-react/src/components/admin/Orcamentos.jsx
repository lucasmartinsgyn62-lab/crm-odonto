import { useEffect, useMemo, useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { HORARIOS } from '../../constants';
import {
  STATUS, ORDEM_STATUS, orcamentoDe, totais, registrar, mensagemWhatsapp,
  horariosLivres, proximosDias, brl, hojeStr, diasDesde, paraData,
} from '../../lib/orcamento';

const DIA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const fmtDia = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

/* ───────── modal: escolher dia e horário LIVRE ───────── */
function ModalAgendar({ orc, onFechar, onAgendar }) {
  const { state, loadAgendaMes, pad } = useCRM();
  const [dentista, setDentista] = useState(orc.itens.find(i => i.dentista)?.dentista || state.dentistas[0]?.nome || '');
  const [dia, setDia] = useState(null);
  const [hora, setHora] = useState(null);
  const dias = useMemo(() => proximosDias(12), []);

  // garante que os meses mostrados estejam carregados (para saber o que está livre)
  useEffect(() => {
    const meses = new Set(dias.map(d => `${pad(d.getMonth() + 1)}|${d.getFullYear()}`));
    meses.forEach(m => { const [mm, aa] = m.split('|'); loadAgendaMes(mm, aa); });
  }, [dias, loadAgendaMes, pad]);

  const livresPorDia = useMemo(() => {
    const map = {};
    dias.forEach(d => { map[fmtDia(d)] = horariosLivres(state.agenda, dentista, fmtDia(d), HORARIOS); });
    return map;
  }, [dias, state.agenda, dentista]);

  return (
    <div className="pi-ov" onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="orc-modal">
        <div className="orc-modal-top">
          <div>
            <b>📅 Agendar {orc.cliente.nome}</b>
            <div style={{ fontSize: 11.5, color: 'var(--cinza)' }}>Escolha um horário livre — a agenda completa fica com a recepção.</div>
          </div>
          <button className="pi-x" onClick={onFechar}>✕</button>
        </div>
        <div style={{ padding: '0 1rem 1rem' }}>
          <div className="fgg" style={{ maxWidth: 320 }}>
            <label>Profissional</label>
            <select className="inf" value={dentista} onChange={e => { setDentista(e.target.value); setDia(null); setHora(null); }}>
              {state.dentistas.map(d => <option key={d.id} value={d.nome}>{d.nome} — {d.esp}</option>)}
            </select>
          </div>

          <div className="orc-dias">
            {dias.map(d => {
              const s = fmtDia(d);
              const livres = livresPorDia[s]?.length || 0;
              return (
                <button key={s} className={`orc-dia${dia === s ? ' sel' : ''}${livres === 0 ? ' cheio' : ''}`}
                  disabled={livres === 0} onClick={() => { setDia(s); setHora(null); }}>
                  <span>{DIA_SEMANA[d.getDay()]}</span>
                  <b>{String(d.getDate()).padStart(2, '0')}/{String(d.getMonth() + 1).padStart(2, '0')}</b>
                  <i>{livres === 0 ? 'sem vaga' : `${livres} vagas`}</i>
                </button>
              );
            })}
          </div>

          {dia && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cinza)', margin: '12px 0 6px' }}>
                HORÁRIOS LIVRES EM {dia}
              </div>
              <div className="orc-horas">
                {livresPorDia[dia].map(h => (
                  <button key={h} className={`orc-hora${hora === h ? ' sel' : ''}`} onClick={() => setHora(h)}>{h}</button>
                ))}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button className="btsv" style={{ background: '#64748b' }} onClick={onFechar}>Cancelar</button>
            <button className="btsv" disabled={!dia || !hora} style={{ opacity: dia && hora ? 1 : .5 }}
              onClick={() => onAgendar({ dentista, data: dia, hora })}>
              ✓ Confirmar agendamento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── modal: detalhe do orçamento ───────── */
function ModalDetalhe({ orc, onFechar, onSalvar, onCobrar, onImprimir }) {
  const [desconto, setDesconto] = useState(orc.desconto || 0);
  const [tipo, setTipo] = useState(orc.descontoTipo || '%');
  const [parcelas, setParcelas] = useState(orc.parcelas || 1);
  const [validade, setValidade] = useState(orc.validade);
  const [obs, setObs] = useState(orc.obs || '');
  const t = totais(orc.itens, { desconto, descontoTipo: tipo, parcelas });

  return (
    <div className="pi-ov" onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="orc-modal" id="orc-print">
        <div className="orc-modal-top">
          <div>
            <b>🧾 Orçamento — {orc.cliente.nome}</b>
            <div style={{ fontSize: 11.5, color: 'var(--cinza)' }}>
              criado em {orc.criado_em} · válido até {orc.validade} · {orc.itens.length} procedimento(s)
            </div>
          </div>
          <button className="pi-x" onClick={onFechar}>✕</button>
        </div>
        <div style={{ padding: '0 1rem 1rem' }}>
          <table className="tbl">
            <thead><tr><th>DENTE</th><th>PROCEDIMENTO</th><th>FACES</th><th>DENTISTA</th><th>VALOR</th></tr></thead>
            <tbody>
              {orc.itens.map(i => (
                <tr key={i.id}>
                  <td><b>{i.dente}</b></td>
                  <td>{i.proc}{i.obs && <div style={{ fontSize: 11, color: 'var(--cinza)' }}>{i.obs}</div>}</td>
                  <td>{i.faces?.join('') || '—'}</td>
                  <td>{i.dentista || '—'}</td>
                  <td><b>{brl(i.valor)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="gg3" style={{ marginTop: 12 }}>
            <div className="fgg"><label>Desconto</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="inf" value={desconto} onChange={e => setDesconto(e.target.value)} />
                <select className="inf" style={{ width: 70 }} value={tipo} onChange={e => setTipo(e.target.value)}>
                  <option>%</option><option>R$</option>
                </select>
              </div>
            </div>
            <div className="fgg"><label>Parcelas</label>
              <select className="inf" value={parcelas} onChange={e => setParcelas(+e.target.value)}>
                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n}x</option>)}
              </select>
            </div>
            <div className="fgg"><label>Válido até</label>
              <input className="inf" value={validade} onChange={e => setValidade(e.target.value)} placeholder="dd/mm/aaaa" />
            </div>
          </div>
          <div className="fgg"><label>Observação para o paciente</label>
            <input className="inf" value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex: inclui retorno de 30 dias sem custo" />
          </div>

          <div className="orc-totais">
            <div><span>Subtotal</span><b>{brl(t.bruto)}</b></div>
            {t.desconto > 0 && <div><span>Desconto</span><b style={{ color: '#B91C1C' }}>-{brl(t.desconto)}</b></div>}
            <div className="grande"><span>Total</span><b>{brl(t.total)}</b></div>
            {t.parcelas > 1 && <div><span>Parcelamento</span><b>{t.parcelas}x de {brl(t.parcela)}</b></div>}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className="btsv" style={{ background: '#64748b' }} onClick={onImprimir}>🖨️ Imprimir</button>
            <button className="btsv" style={{ background: '#16a34a' }} onClick={() => onCobrar({ desconto, descontoTipo: tipo, parcelas, validade, obs })}>
              💬 Enviar no WhatsApp
            </button>
            <button className="btsv" onClick={() => onSalvar({ desconto, descontoTipo: tipo, parcelas, validade, obs })}>💾 Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── tela ───────────────────────────── */
export default function Orcamentos() {
  const { state, dispatch, showToast, usuario, setActivePanel, setPacienteFoco, logAudit } = useCRM();
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [detalhe, setDetalhe] = useState(null);
  const [agendando, setAgendando] = useState(null);
  const [mais, setMais] = useState({});          // cartões com as ações extras abertas

  const lista = useMemo(() => state.clientes
    .map(orcamentoDe)
    .filter(Boolean)
    .filter(o => o.itens.length > 0 || o.status === 'pago')
    .sort((a, b) => (paraData(b.criado_em) || 0) - (paraData(a.criado_em) || 0)),
    [state.clientes]);

  const visiveis = lista.filter(o =>
    (filtro === 'todos' || o.status === filtro) &&
    (!busca || o.cliente.nome.toLowerCase().includes(busca.toLowerCase())));

  const kpi = useMemo(() => {
    const k = { aguardando: 0, aprovado: 0, agendado: 0, pago: 0, recusado: 0, vAguardando: 0, vAprovado: 0, vAgendado: 0, vPago: 0 };
    lista.forEach(o => {
      k[o.status] = (k[o.status] || 0) + 1;
      if (o.status === 'aguardando') k.vAguardando += o.total;
      if (o.status === 'aprovado') k.vAprovado += o.total;
      if (o.status === 'agendado') k.vAgendado += o.total;
      if (o.status === 'pago') k.vPago += o.total;
    });
    const fechados = k.aprovado + k.agendado + k.pago;
    k.conversao = lista.length ? Math.round((fechados / lista.length) * 100) : 0;
    return k;
  }, [lista]);

  /* grava mantendo o resto do prontuário intacto */
  function salvar(o, patch, evento) {
    const anterior = o.cliente.prontuario?.orcamento || {};
    const orcamento = {
      status: o.status, criado_em: o.criado_em, validade: o.validade,
      desconto: o.desconto, descontoTipo: o.descontoTipo, parcelas: o.parcelas, obs: o.obs || '',
      ...anterior, ...patch,
    };
    if (evento) orcamento.historico = registrar(anterior, evento, usuario?.nome || usuario?.email);
    dispatch({
      type: 'UPDATE_CLIENTE',
      payload: { id: o.cliente.id, prontuario: { ...(o.cliente.prontuario || {}), orcamento } },
    });
    if (evento) logAudit?.('editou', 'orçamento', `${evento} — ${o.cliente.nome} (${brl(o.total)})`);
  }

  function aprovar(o) {
    salvar(o, { status: 'aprovado', aprovado_em: hojeStr() }, 'Orçamento aprovado');
    showToast('✔ Orçamento aprovado — agende ou cobre o paciente', 'success');
  }
  function recusar(o) {
    const motivo = window.prompt('Motivo da recusa (fica no histórico):', 'Achou caro');
    if (motivo === null) return;
    salvar(o, { status: 'recusado', motivo }, `Recusado: ${motivo}`);
  }
  function reabrir(o) {
    salvar(o, { status: 'aguardando', motivo: '' }, 'Orçamento reaberto');
  }
  function cobrar(o, patch = {}) {
    const atual = { ...o, ...patch, ...totais(o.itens, { ...o, ...patch }) };
    if (!o.cliente.wpp) { showToast('Paciente sem WhatsApp cadastrado', 'warning'); return; }
    window.open(`https://wa.me/55${o.cliente.wpp.replace(/\D/g, '')}?text=${encodeURIComponent(mensagemWhatsapp(atual))}`, '_blank', 'noopener');
    salvar(o, { ...patch, cobrado_em: hojeStr() }, 'Orçamento enviado no WhatsApp');
  }
  function marcarPago(o) {
    const forma = window.prompt('Forma de pagamento (Pix, Dinheiro, Cartão Débito, Cartão Crédito, Convênio):', 'Pix');
    if (!forma) return;
    salvar(o, { status: 'pago', pago_em: hojeStr(), forma }, `Pagamento recebido (${forma})`);
    // entra no caixa do dia, como qualquer atendimento
    dispatch({
      type: 'ADD_CAIXA_ENTRY',
      payload: {
        mes: hojeStr(), h: `ORC-${o.cliente.id.slice(0, 6)}`, nome: o.cliente.nome,
        dentista: o.itens[0]?.dentista || '', valor: o.total, forma, valor2: 0, forma2: '',
        obs: `Orçamento aprovado (${o.itens.length} procedimentos)`,
        areas: o.itens.map(i => i.proc), procedimentosRealizados: [],
        recepcionista: usuario?.nome || '—', dt: new Date().toISOString(),
      },
    });
    showToast('💰 Pagamento registrado e lançado no caixa do dia', 'success');
  }
  function agendar(o, { dentista, data, hora }) {
    const agKey = `${dentista}||${data}`;
    dispatch({
      type: 'SET_AGENDA_SLOT',
      payload: {
        agKey, horario: hora,
        slot: {
          nome: o.cliente.nome, wpp: o.cliente.wpp || '', tipo: o.cliente.tipo || 'RETORNO',
          orig: o.cliente.orig || '', areas: o.itens.map(i => i.proc).slice(0, 3),
          valor: o.total, status: 'AGENDADO', dur: 60,
          obs: `Orçamento aprovado — ${brl(o.total)}${o.parcelas > 1 ? ` em ${o.parcelas}x` : ''}`,
        },
      },
    });
    salvar(o, { status: 'agendado', agenda: { dentista, data, hora } }, `Agendado para ${data} às ${hora} com ${dentista}`);
    setAgendando(null);
    showToast(`📅 ${o.cliente.nome} agendado em ${data} às ${hora}`, 'success');
  }

  function imprimir() { window.print(); }

  return (
    <div className="orc-wrap">
      {/* 3 números que importam */}
      <div className="pi-kpis">
        <div className="pi-kpi"><span>⏳ Esperando o paciente decidir</span><b style={{ color: '#B45309' }}>{brl(kpi.vAguardando)}</b><i>{kpi.aguardando} orçamento(s) — ligue para eles</i></div>
        <div className="pi-kpi"><span>✅ Aprovado, falta receber</span><b style={{ color: '#1D4ED8' }}>{brl(kpi.vAprovado + kpi.vAgendado)}</b><i>{kpi.aprovado + kpi.agendado} paciente(s)</i></div>
        <div className="pi-kpi"><span>💰 Já pago</span><b style={{ color: '#15803D' }}>{brl(kpi.vPago)}</b><i>{kpi.conversao}% dos orçamentos fecham</i></div>
      </div>

      {/* filtros — nomes do dia a dia */}
      <div className="pi-abas" style={{ marginTop: 4 }}>
        <button className={filtro === 'todos' ? 'pi-on' : ''} onClick={() => setFiltro('todos')}>Todos ({lista.length})</button>
        {ORDEM_STATUS.map(s => (
          <button key={s} className={filtro === s ? 'pi-on' : ''} onClick={() => setFiltro(s)}>
            {STATUS[s].icone} {STATUS[s].label} ({kpi[s] || 0})
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <input className="isrch" placeholder="Buscar paciente…" value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {visiveis.length === 0 && (
        <div className="bl"><p className="pi-vazio">
          Nada por aqui. Quando o dentista marcar os dentes na tela <b>Prontuário Inteligente</b>,
          o orçamento aparece nesta tela sozinho.
        </p></div>
      )}

      <div className="orc-grid">
        {visiveis.map(o => {
          const st = STATUS[o.status] || STATUS.aguardando;
          const parado = o.status === 'aguardando' ? diasDesde(o.criado_em) : 0;
          const vencido = o.status === 'aguardando' && diasDesde(o.validade) > 0;
          return (
            <div key={o.cliente.id} className="fp orc-card" style={{ borderTop: `3px solid ${st.cor}` }}>
              <div className="orc-card-top">
                <div style={{ minWidth: 0 }}>
                  <b className="orc-nome" title={o.cliente.nome}>{o.cliente.nome}</b>
                  <div className="orc-sub">
                    {o.cliente.wpp && <span>📱 {o.cliente.wpp}</span>}
                    <span>🦷 {o.itens.length} procedimento(s)</span>
                    {o.itens[0]?.dentista && <span>👨‍⚕️ {o.itens[0].dentista}</span>}
                  </div>
                </div>
                <span className="orc-status" style={{ background: st.fundo, color: st.cor }}>{st.icone} {st.label}</span>
              </div>

              <div className="orc-valor">
                <div><span>Valor do tratamento</span><b>{brl(o.total)}</b></div>
                {o.parcelas > 1 && <div><span>Pode parcelar</span><b>{o.parcelas}x {brl(o.parcela)}</b></div>}
                <div><span>Vale até</span><b style={{ color: vencido ? '#B91C1C' : undefined }}>{o.validade}</b></div>
              </div>

              <div className="orc-dentes">
                {o.itens.slice(0, 3).map(i => (
                  <span key={i.id} title={`${i.proc} — ${brl(i.valor)}`}>{i.dente} · {i.proc}</span>
                ))}
                {o.itens.length > 3 && <span>+{o.itens.length - 3} tratamento(s)</span>}
              </div>

              {o.status === 'agendado' && o.agenda && (
                <div className="orc-aviso" style={{ background: '#EDE9FE', color: '#6D28D9' }}>
                  📅 {o.agenda.data} às {o.agenda.hora} com {o.agenda.dentista}
                </div>
              )}
              {o.status === 'recusado' && o.motivo && (
                <div className="orc-aviso" style={{ background: '#FEE2E2', color: '#B91C1C' }}>✖ {o.motivo}</div>
              )}
              {o.status === 'aguardando' && parado >= 3 && (
                <div className="orc-aviso" style={{ background: '#FEF3C7', color: '#B45309' }}>
                  ⏰ parado há {parado} dias {vencido ? '· validade vencida' : ''} — cobre o paciente
                </div>
              )}

              {/* SÓ o próximo passo em destaque; o resto fica escondido em "mais" */}
              <div className="orc-acoes">
                {o.status === 'aguardando' && <>
                  <button className="btsv orc-b grande" style={{ background: '#16a34a' }} onClick={() => cobrar(o)}>💬 Mandar para o paciente</button>
                  <button className="btsv orc-b" onClick={() => aprovar(o)}>✅ Ele aceitou</button>
                </>}
                {o.status === 'aprovado' &&
                  <button className="btsv orc-b grande" style={{ background: '#7c3aed' }} onClick={() => setAgendando(o)}>📅 Marcar a consulta</button>}
                {o.status === 'agendado' &&
                  <button className="btsv orc-b grande" style={{ background: '#15803d' }} onClick={() => marcarPago(o)}>💰 Recebi o pagamento</button>}
                {o.status === 'recusado' &&
                  <button className="btsv orc-b" style={{ background: '#64748b' }} onClick={() => reabrir(o)}>↺ Tentar de novo</button>}
                <button className="btsv orc-b" style={{ background: '#0ea5e9' }} onClick={() => setDetalhe(o)}>🔍 Ver tudo</button>
                <button className="orc-mais" onClick={() => setMais(m => ({ ...m, [o.cliente.id]: !m[o.cliente.id] }))}>
                  {mais[o.cliente.id] ? '▾ menos' : '⋯ mais'}
                </button>
              </div>
              {mais[o.cliente.id] && (
                <div className="orc-acoes">
                  {o.status !== 'aguardando' && <button className="btsv orc-b" style={{ background: '#16a34a' }} onClick={() => cobrar(o)}>💬 Mandar no WhatsApp</button>}
                  {o.status === 'aguardando' && <button className="btsv orc-b" style={{ background: '#b91c1c' }} onClick={() => recusar(o)}>✖ Não quis</button>}
                  {(o.status === 'aprovado' || o.status === 'agendado') &&
                    <button className="btsv orc-b" style={{ background: '#7c3aed' }} onClick={() => setAgendando(o)}>📅 {o.status === 'agendado' ? 'Trocar horário' : 'Marcar consulta'}</button>}
                  {o.status === 'aprovado' &&
                    <button className="btsv orc-b" style={{ background: '#15803d' }} onClick={() => marcarPago(o)}>💰 Recebi</button>}
                  <button className="btsv orc-b" style={{ background: '#475569' }}
                    onClick={() => { setPacienteFoco(o.cliente.id); setActivePanel('prontuario'); }}>🦷 Ver a boca do paciente</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {detalhe && (
        <ModalDetalhe
          orc={detalhe} onFechar={() => setDetalhe(null)} onImprimir={imprimir}
          onSalvar={patch => { salvar(detalhe, patch, 'Orçamento editado'); setDetalhe(null); showToast('✔ Orçamento atualizado', 'success'); }}
          onCobrar={patch => { cobrar(detalhe, patch); setDetalhe(null); }}
        />
      )}
      {agendando && (
        <ModalAgendar orc={agendando} onFechar={() => setAgendando(null)} onAgendar={dados => agendar(agendando, dados)} />
      )}
    </div>
  );
}
