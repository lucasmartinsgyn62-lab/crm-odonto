// AÇÕES DO CAUÊ — modo "faça por mim" no CRM Odontológico.
// A IA responde com [[ACAO: nome | {json}]]; o chat mostra um CARTÃO DE
// CONFIRMAÇÃO e só executa quando o usuário confirma — com a sessão dele,
// pelo mesmo dispatch das telas (então vale a RLS, a auditoria e o realtime).
// Nada destrutivo entra aqui: não existe excluir, aprovar orçamento,
// receber pagamento nem fechar caixa.
import { HORARIOS } from '../constants';

export function extrairAcao(texto) {
  const m = String(texto || '').match(/\[\[ACAO:\s*([a-z_]+)\s*\|\s*(\{[\s\S]*?\})\s*\]\]/i);
  if (!m) return null;
  try { return { nome: m[1].toLowerCase(), params: JSON.parse(m[2]) }; } catch { return null; }
}
export function limparMarcadores(texto) {
  return String(texto || '')
    .replace(/\[\[ACAO:[\s\S]*?\]\]/gi, '')
    .replace(/\[\[GUIA:[\s\S]*?\]\]/gi, '')
    .trim();
}

const achaPaciente = (ctx, nome) => ctx.state.clientes.find(c =>
  c.nome.toLowerCase() === String(nome || '').toLowerCase()) ||
  ctx.state.clientes.find(c => c.nome.toLowerCase().includes(String(nome || '').toLowerCase()));

export const CAUE_ACOES = {
  criar_paciente: {
    titulo: p => `Cadastrar o paciente ${p.nome || ''}`,
    resumo: p => [p.wpp && `WhatsApp ${p.wpp}`, p.orig && `veio de ${p.orig}`, p.tipo || 'NOVO'].filter(Boolean).join(' · '),
    valida: p => (!p.nome?.trim() ? 'Preciso do nome do paciente.' : null),
    executar: async (p, ctx) => {
      await ctx.dispatch({ type: 'ADD_CLIENTE', payload: {
        nome: p.nome.trim(), wpp: p.wpp || '', orig: p.orig || '',
        tipo: (p.tipo || 'NOVO').toUpperCase() === 'RETORNO' ? 'RETORNO' : 'NOVO',
        areas: [], obs: p.obs || '', prontuario: {},
      } });
      return `Paciente ${p.nome} cadastrado.`;
    },
  },
  criar_dentista: {
    titulo: p => `Cadastrar ${p.nome || 'o dentista'}`,
    resumo: p => [p.esp, p.cro, p.tel].filter(Boolean).join(' · ') || 'sem especialidade informada',
    valida: p => (!p.nome?.trim() ? 'Preciso do nome do dentista.' : null),
    executar: async (p, ctx) => {
      await ctx.dispatch({ type: 'ADD_DENTISTA', payload: { nome: p.nome.trim(), esp: p.esp || '', cro: p.cro || '', tel: p.tel || '' } });
      return `${p.nome} cadastrado — já tem agenda própria.`;
    },
  },
  criar_procedimento: {
    titulo: p => `Cadastrar "${p.nome || ''}" na tabela`,
    resumo: p => `Valor: R$ ${Number(p.valor || 0).toFixed(2)}${p.convenio ? ` · convênio ${p.convenio}` : ''}`,
    valida: p => (!p.nome?.trim() ? 'Preciso do nome do procedimento.'
      : !(Number(p.valor) > 0) ? 'Preciso de um valor maior que zero.' : null),
    executar: async (p, ctx) => {
      await ctx.dispatch({ type: 'ADD_PROCEDIMENTO', payload: { nome: p.nome.trim(), valor: Number(p.valor), cor: null, convenio: p.convenio || null } });
      return `"${p.nome}" entrou na tabela de preços.`;
    },
  },
  criar_origem: {
    titulo: p => `Criar a origem "${p.nome || ''}"`,
    resumo: () => 'Passa a aparecer no cadastro do paciente e no relatório de marketing.',
    valida: p => (!p.nome?.trim() ? 'Preciso do nome da origem.' : null),
    executar: async (p, ctx) => { await ctx.dispatch({ type: 'ADD_ORIGEM', payload: p.nome.trim() }); return `Origem "${p.nome}" criada.`; },
  },
  lancar_procedimento: {
    titulo: p => `Anotar ${p.procedimento || 'o tratamento'} no dente ${(p.dentes || []).join(', ')}`,
    resumo: p => `Paciente ${p.paciente}${p.valor ? ` · R$ ${Number(p.valor).toFixed(2)}` : ' · valor da tabela'}`,
    valida: (p, ctx) => {
      if (!p.paciente) return 'Preciso do nome do paciente.';
      if (!achaPaciente(ctx, p.paciente)) return `Não achei o paciente "${p.paciente}" no cadastro.`;
      if (!p.procedimento) return 'Preciso saber qual tratamento.';
      const dentes = (p.dentes || []).map(Number).filter(Boolean);
      if (!dentes.length) return 'Preciso do número do dente (padrão FDI, ex.: 16).';
      return null;
    },
    executar: async (p, ctx) => {
      const cli = achaPaciente(ctx, p.paciente);
      const dentes = { ...(cli.prontuario?.odontograma?.dentes || {}) };
      const valor = p.valor != null && p.valor !== '' ? Number(p.valor) : (ctx.procPrecos[p.procedimento] || 0);
      (p.dentes || []).map(Number).filter(Boolean).forEach(d => {
        const item = {
          id: crypto.randomUUID(), proc: p.procedimento, faces: p.faces || [],
          status: ['planejado', 'andamento', 'concluido'].includes(p.situacao) ? p.situacao : 'planejado',
          marca: '', valor, dentista: p.dentista || '', data: ctx.hoje(), obs: p.obs || '',
          criado_por: ctx.usuario?.nome || 'Cauê',
        };
        dentes[d] = { itens: [...(dentes[d]?.itens || []), item] };
      });
      await ctx.salvarOdontograma(cli, dentes);
      return `Anotado no prontuário de ${cli.nome}. O orçamento já está na tela Orçamentos.`;
    },
  },
  agendar_consulta: {
    titulo: p => `Marcar ${p.paciente || 'o paciente'} em ${p.data || ''} às ${p.hora || ''}`,
    resumo: p => `Com ${p.dentista || 'o dentista'}${p.procedimentos?.length ? ` · ${p.procedimentos.join(', ')}` : ''}`,
    valida: (p, ctx) => {
      if (!p.paciente || !achaPaciente(ctx, p.paciente)) return `Não achei o paciente "${p.paciente || ''}" no cadastro.`;
      if (!p.dentista || !ctx.state.dentistas.some(d => d.nome === p.dentista)) return 'Preciso do nome exato do dentista.';
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(p.data || '')) return 'A data precisa estar como DD/MM/AAAA.';
      if (!HORARIOS.includes(p.hora)) return `Horário inválido. A agenda vai de ${HORARIOS[0]} às ${HORARIOS[HORARIOS.length - 1]}, de 30 em 30 minutos.`;
      const dia = ctx.state.agenda[`${p.dentista}||${p.data}`] || {};
      if (dia[p.hora]?.nome) return `${p.hora} já está ocupado nesse dia. Quer que eu veja outro horário?`;
      return null;
    },
    executar: async (p, ctx) => {
      const cli = achaPaciente(ctx, p.paciente);
      await ctx.dispatch({ type: 'SET_AGENDA_SLOT', payload: {
        agKey: `${p.dentista}||${p.data}`, horario: p.hora,
        slot: {
          nome: cli.nome, wpp: cli.wpp || '', tipo: cli.tipo || 'RETORNO', orig: cli.orig || '',
          areas: p.procedimentos || [], valor: (p.procedimentos || []).reduce((s, a) => s + (ctx.procPrecos[a] || 0), 0),
          status: 'AGENDADO', dur: 60, obs: 'Marcado pelo Cauê',
        },
      } });
      return `${cli.nome} marcado em ${p.data} às ${p.hora} com ${p.dentista}.`;
    },
  },
};
