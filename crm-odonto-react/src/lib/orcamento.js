// Orçamento = a leitura comercial do plano de tratamento que o dentista montou
// no Prontuário Inteligente. Fica gravado no MESMO prontuário do paciente
// (clientes.prontuario.orcamento), então nasce em tempo real para a recepção
// (o canal realtime da tabela `clientes` já existe) e nunca sai de sincronia
// com o odontograma.
import { num } from '../constants';

export const STATUS = {
  aguardando: { label: 'Aguardando aprovação', cor: '#D97706', fundo: '#FEF3C7', icone: '⏳' },
  aprovado:   { label: 'Aprovado — a cobrar',  cor: '#1D4ED8', fundo: '#DBEAFE', icone: '✅' },
  agendado:   { label: 'Agendado',             cor: '#7C3AED', fundo: '#EDE9FE', icone: '📅' },
  pago:       { label: 'Pago',                 cor: '#15803D', fundo: '#DCFCE7', icone: '💰' },
  recusado:   { label: 'Recusado',             cor: '#B91C1C', fundo: '#FEE2E2', icone: '✖' },
};
export const ORDEM_STATUS = ['aguardando', 'aprovado', 'agendado', 'pago', 'recusado'];

export const hojeStr = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
export const paraData = s => { const [d, m, a] = String(s || '').split('/'); return a ? new Date(+a, +m - 1, +d) : null; };
export const somaDias = (dstr, n) => {
  const d = paraData(dstr) || new Date();
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  return `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
};
export const diasDesde = dstr => {
  const d = paraData(dstr); if (!d) return 0;
  const h = new Date(); h.setHours(0, 0, 0, 0);
  return Math.round((h - d) / 86400000);
};
export const brl = v => num(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Itens que entram no orçamento: o que ainda não foi concluído.
export function itensDoPlano(cliente) {
  const dentes = cliente?.prontuario?.odontograma?.dentes || {};
  return Object.entries(dentes)
    .flatMap(([d, v]) => (v.itens || []).map(i => ({ ...i, dente: +d })))
    .filter(i => i.status !== 'concluido')
    .sort((a, b) => a.dente - b.dente);
}

export function totais(itens, orc = {}) {
  const bruto = itens.reduce((s, i) => s + num(i.valor), 0);
  const desconto = orc.descontoTipo === '%'
    ? bruto * (num(orc.desconto) / 100)
    : Math.min(num(orc.desconto), bruto);
  const total = Math.max(0, bruto - desconto);
  const parcelas = Math.max(1, parseInt(orc.parcelas || 1, 10) || 1);
  return { bruto, desconto, total, parcelas, parcela: total / parcelas, qtd: itens.length };
}

// Estado do orçamento de um paciente (sempre derivado do plano atual)
export function orcamentoDe(cliente) {
  const itens = itensDoPlano(cliente);
  const orc = cliente?.prontuario?.orcamento || null;
  if (!itens.length && !orc) return null;
  const base = orc || {
    status: 'aguardando', criado_em: hojeStr(), validade: somaDias(hojeStr(), 30),
    desconto: 0, descontoTipo: '%', parcelas: 1, historico: [],
  };
  return { ...base, cliente, itens, ...totais(itens, base) };
}

export function registrar(orc, evento, quem) {
  const h = [{ quando: new Date().toISOString(), evento, quem: quem || '' }, ...(orc.historico || [])];
  return h.slice(0, 40);
}

// Mensagem de cobrança / apresentação para o WhatsApp do paciente
export function mensagemWhatsapp(o, clinica = 'nossa clínica') {
  const linhas = o.itens.map(i => `• Dente ${i.dente} — ${i.proc}: ${brl(i.valor)}`).join('\n');
  const parcela = o.parcelas > 1 ? `\nOu em ${o.parcelas}x de ${brl(o.parcela)}` : '';
  const desc = o.desconto > 0 ? `\nDesconto aplicado: -${brl(o.desconto)}` : '';
  return `Olá, ${o.cliente.nome}! Segue o seu plano de tratamento em ${clinica}:\n\n${linhas}${desc}\n\n` +
    `*Total: ${brl(o.total)}*${parcela}\n\nOrçamento válido até ${o.validade}. Posso reservar um horário para você? 😊`;
}

/* ── Horários livres (para a recepção agendar sem ver a agenda inteira) ── */
export function horariosLivres(agenda, dentista, dataStr, todos) {
  const dia = agenda[`${dentista}||${dataStr}`] || {};
  const ocupados = new Set(Object.entries(dia)
    .filter(([, s]) => s && s.nome)
    .map(([h]) => h.replace('-ENCAIXE', '')));
  return todos.filter(h => !ocupados.has(h));
}

// Próximos dias úteis a partir de amanhã (a clínica não abre domingo)
export function proximosDias(qtd = 10, inicio = 1) {
  const out = [];
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  for (let i = inicio; out.length < qtd && i < 60; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i);
    if (d.getDay() === 0) continue;
    out.push(d);
  }
  return out;
}
