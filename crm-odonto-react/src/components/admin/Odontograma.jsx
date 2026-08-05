import { useMemo } from 'react';
import {
  SUP_PERM, INF_PERM, SUP_DEC, INF_DEC,
  layout, pathCoroa, pathRaizes, anatomia, VIEW, nomeDente,
} from '../../lib/odontograma';

// Estado visual de cada dente (o mais "forte" ganha; a ordem importa)
export const ESTADOS = {
  ausente:    { nome: 'Ausente / extraído', fill: '#F1F5F9', stroke: '#94A3B8', cor: '#64748B' },
  implante:   { nome: 'Implante',           fill: '#EDE9FE', stroke: '#7C3AED', cor: '#6D28D9' },
  protese:    { nome: 'Coroa / prótese',    fill: '#E0F2FE', stroke: '#0891B2', cor: '#0E7490' },
  concluido:  { nome: 'Tratado (concluído)', fill: '#DCFCE7', stroke: '#16A34A', cor: '#15803D' },
  andamento:  { nome: 'Em andamento',       fill: '#DBEAFE', stroke: '#2563EB', cor: '#1D4ED8' },
  planejado:  { nome: 'Planejado',          fill: '#FEF3C7', stroke: '#D97706', cor: '#B45309' },
  saudavel:   { nome: 'Sem tratamento',     fill: '#FFFFFF', stroke: '#B6CFE0', cor: '#94A3B8' },
};
const PRIORIDADE = ['ausente', 'implante', 'protese', 'andamento', 'planejado', 'concluido'];

// Deriva o estado do dente a partir dos itens do plano de tratamento
export function estadoDoDente(itens = []) {
  if (!itens.length) return 'saudavel';
  const marcas = new Set(itens.map(i => i.marca).filter(Boolean));
  const status = new Set(itens.map(i => i.status));
  for (const p of PRIORIDADE) {
    if (marcas.has(p)) return p;
    if (status.has(p)) return p;
  }
  return 'saudavel';
}

function Dente({ pos, itens, selecionado, onClick, sup }) {
  const est = ESTADOS[estadoDoDente(itens)];
  const coroa = useMemo(() => pathCoroa(pos.num), [pos.num]);
  const raizes = useMemo(() => pathRaizes(pos.num), [pos.num]);
  const faces = [...new Set(itens.flatMap(i => i.faces || []))];
  return (
    <g className="od-dente" onClick={() => onClick(pos.num)} style={{ cursor: 'pointer' }}>
      <g transform={pos.transform}>
        {/* área de clique generosa */}
        <rect x={-19} y={sup ? -104 : -104} width={38} height={112} fill="transparent" />
        {raizes.map((d, i) => (
          <path key={'r' + i} d={d} fill={est.fill} stroke={est.stroke} strokeWidth={selecionado ? 2.6 : 1.5} strokeLinejoin="round" />
        ))}
        {coroa.map((d, i) => (
          <path key={'c' + i} d={d} fill={est.fill} stroke={est.stroke}
            strokeWidth={selecionado ? 2.6 : 1.5} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {estadoDoDente(itens) === 'ausente' && (
          <g stroke="#EF4444" strokeWidth={2.4} strokeLinecap="round">
            <line x1={-13} y1={-4} x2={13} y2={-30} /><line x1={-13} y1={-30} x2={13} y2={-4} />
          </g>
        )}
        {estadoDoDente(itens) === 'implante' && (
          <g stroke="#7C3AED" strokeWidth={1.6}>
            <line x1={0} y1={-14} x2={0} y2={-60} />
            {[-22, -30, -38, -46, -54].map(y => <line key={y} x1={-6} y1={y} x2={6} y2={y} />)}
          </g>
        )}
        {selecionado && <circle cx={0} cy={-14} r={26} fill="none" stroke="#00B3FF" strokeWidth={2} strokeDasharray="4 4" opacity={.9} />}
      </g>
      {/* número FDI */}
      <g>
        <rect x={pos.rotulo.x - 15} y={pos.rotulo.y - 11} width={30} height={19} rx={6}
          fill={selecionado ? '#00B3FF' : '#fff'} stroke={selecionado ? '#00B3FF' : '#DCEDF8'} />
        <text x={pos.rotulo.x} y={pos.rotulo.y + 2.5} textAnchor="middle" fontSize={12} fontWeight={700}
          fill={selecionado ? '#fff' : est.cor}>{pos.num}</text>
      </g>
      {/* marcador de quantidade de procedimentos */}
      {itens.length > 0 && (
        <g>
          <circle cx={pos.rotulo.x + 16} cy={pos.rotulo.y - 11} r={8} fill={est.stroke} />
          <text x={pos.rotulo.x + 16} y={pos.rotulo.y - 7.5} textAnchor="middle" fontSize={9.5} fontWeight={800} fill="#fff">{itens.length}</text>
        </g>
      )}
      {faces.length > 0 && (
        <text x={pos.x} y={sup ? pos.y - 4 : pos.y + 10} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={est.cor} opacity={.9}>
          {faces.join('')}
        </text>
      )}
      <title>{`${pos.num} — ${nomeDente(pos.num)}${itens.length ? ' · ' + itens.map(i => i.proc).join(', ') : ''}`}</title>
    </g>
  );
}

export default function Odontograma({
  dentes = {}, selecionados = new Set(), onToggle = () => {},
  decidua = false, radiografia = null, opacidadeRx = 0.55, mostrarAnatomia = true,
}) {
  const sup = useMemo(() => layout(decidua ? SUP_DEC : SUP_PERM, true), [decidua]);
  const inf = useMemo(() => layout(decidua ? INF_DEC : INF_PERM, false), [decidua]);
  const an = anatomia();

  return (
    // viewBox recortado: tira o vazio de cima e de baixo e o desenho ocupa melhor o espaço
    <svg viewBox={`0 46 ${VIEW.w} ${VIEW.h - 86}`} className="od-svg" role="img" aria-label="Odontograma panorâmico">
      <defs>
        <linearGradient id="od-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FBFEFF" /><stop offset="100%" stopColor="#F2FAFF" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={VIEW.w} height={VIEW.h} fill="url(#od-bg)" rx="18" />

      {/* radiografia real do paciente por baixo do traçado (quando escolhida) */}
      {radiografia && (
        <image href={radiografia} x="0" y="0" width={VIEW.w} height={VIEW.h}
          preserveAspectRatio="xMidYMid slice" opacity={opacidadeRx} />
      )}

      {/* traçado anatômico — o "panorâmico genérico só em linhas" */}
      {mostrarAnatomia && (
        <g fill="none" stroke="#BBDCEF" strokeWidth="1.3" opacity={radiografia ? .5 : .85}>
          <path d={an.mandibula} /><path d={an.borda_inf} strokeDasharray="6 5" opacity={.7} />
          <path d={an.condilos} /><path d={an.seios} strokeDasharray="7 5" />
          <path d={an.nasal} /><path d={an.palato} strokeDasharray="5 4" />
          <path d={an.coluna} strokeDasharray="3 6" opacity={.5} />
        </g>
      )}

      {/* linha média */}
      <line x1={VIEW.w / 2} y1="70" x2={VIEW.w / 2} y2={VIEW.h - 40} stroke="#9FE3FF" strokeWidth="1" strokeDasharray="4 6" opacity={.8} />
      <text x={VIEW.w / 2} y="62" textAnchor="middle" fontSize="9" fontWeight="700" fill="#9FE3FF" letterSpacing="1.5">LINHA MÉDIA</text>
      <text x="24" y="300" fontSize="9" fontWeight="700" fill="#B6CFE0" letterSpacing="1.5" transform="rotate(-90 24 300)">LADO DIREITO</text>
      <text x={VIEW.w - 16} y="300" fontSize="9" fontWeight="700" fill="#B6CFE0" letterSpacing="1.5" transform={`rotate(90 ${VIEW.w - 16} 300)`}>LADO ESQUERDO</text>

      {sup.map(p => (
        <Dente key={p.num} pos={p} sup itens={dentes[p.num]?.itens || []}
          selecionado={selecionados.has(p.num)} onClick={onToggle} />
      ))}
      {inf.map(p => (
        <Dente key={p.num} pos={p} sup={false} itens={dentes[p.num]?.itens || []}
          selecionado={selecionados.has(p.num)} onClick={onToggle} />
      ))}
    </svg>
  );
}

export function LegendaOdontograma() {
  return (
    <div className="od-legenda">
      {Object.entries(ESTADOS).map(([k, e]) => (
        <span key={k}><i style={{ background: e.fill, borderColor: e.stroke }} />{e.nome}</span>
      ))}
    </div>
  );
}
