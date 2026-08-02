// Geometria do odontograma panorâmico (desenho em linhas, padrão FDI).
// Puro cálculo — sem React — para poder ser reaproveitado (impressão, geração
// da radiografia de exemplo, testes).

// Ordem de exibição = como aparece numa panorâmica: direita do paciente à esquerda da tela.
export const SUP_PERM = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
export const INF_PERM = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
export const SUP_DEC  = [55,54,53,52,51,61,62,63,64,65];
export const INF_DEC  = [85,84,83,82,81,71,72,73,74,75];

export const QUADRANTES = {
  1: 'Superior direito', 2: 'Superior esquerdo',
  3: 'Inferior esquerdo', 4: 'Inferior direito',
  5: 'Superior direito (decíduo)', 6: 'Superior esquerdo (decíduo)',
  7: 'Inferior esquerdo (decíduo)', 8: 'Inferior direito (decíduo)',
};

export const FACES = ['O', 'M', 'D', 'V', 'L'];
export const FACES_NOME = {
  O: 'Oclusal/Incisal', M: 'Mesial', D: 'Distal', V: 'Vestibular', L: 'Lingual/Palatina',
};

export function ehDecidua(num) { const q = Math.floor(num / 10); return q >= 5 && q <= 8; }
export function quadrante(num) { return Math.floor(num / 10); }
export function ehSuperior(num) { const q = quadrante(num); return q === 1 || q === 2 || q === 5 || q === 6; }

// Tipo do dente pela posição no quadrante
export function tipoDente(num) {
  const p = num % 10;
  if (ehDecidua(num)) return p <= 2 ? 'incisivo' : p === 3 ? 'canino' : 'molar';
  if (p <= 2) return 'incisivo';
  if (p === 3) return 'canino';
  if (p <= 5) return 'premolar';
  return 'molar';
}

export function nomeDente(num) {
  const p = num % 10, sup = ehSuperior(num), dec = ehDecidua(num);
  const base = {
    incisivo: p === 1 ? 'Incisivo central' : 'Incisivo lateral',
    canino: 'Canino',
    premolar: p === 4 ? '1º pré-molar' : '2º pré-molar',
    molar: dec ? (p === 4 ? '1º molar' : '2º molar') : (p === 6 ? '1º molar' : p === 7 ? '2º molar' : '3º molar (siso)'),
  }[tipoDente(num)];
  return `${base}${dec ? ' decíduo' : ''} ${sup ? 'superior' : 'inferior'} ${quadrante(num) % 2 === 1 ? 'direito' : 'esquerdo'}`;
}

// Nº de raízes (aproximação anatômica usual)
export function raizes(num) {
  const t = tipoDente(num), sup = ehSuperior(num), p = num % 10;
  if (ehDecidua(num)) return t === 'molar' ? (sup ? 3 : 2) : 1;
  if (t === 'molar') return sup ? 3 : 2;
  if (t === 'premolar' && sup && p === 4) return 2;
  return 1;
}

const MEDIDAS = {
  incisivo:  { w: 21, h: 30, raiz: 42 },
  canino:    { w: 23, h: 34, raiz: 54 },
  premolar:  { w: 25, h: 27, raiz: 42 },
  molar:     { w: 33, h: 29, raiz: 40 },
};

export function medidas(num) {
  const m = MEDIDAS[tipoDente(num)];
  const k = ehDecidua(num) ? 0.76 : 1;
  return { w: m.w * k, h: m.h * k, raiz: m.raiz * k };
}

// Contorno FECHADO da coroa em coordenadas locais: origem na borda
// oclusal/incisal, dente crescendo para cima (y negativo). Serve para superior
// e inferior (o inferior é espelhado por transform).
export function pathCoroa(num) {
  const { w, h } = medidas(num);
  const t = tipoDente(num);
  const a = w / 2, b = a * 0.84;           // largura na oclusal e no colo
  let oclusal;
  if (t === 'incisivo') {
    oclusal = `L ${a.toFixed(1)} 0`;
  } else if (t === 'canino') {
    oclusal = `Q ${(-a / 2).toFixed(1)} 3 0 5 Q ${(a / 2).toFixed(1)} 3 ${a.toFixed(1)} 0`;
  } else if (t === 'premolar') {
    oclusal = `Q ${(-a / 2).toFixed(1)} 5 0 0 Q ${(a / 2).toFixed(1)} 5 ${a.toFixed(1)} 0`;
  } else {
    const n = ehDecidua(num) ? 2 : 3;      // cúspides
    oclusal = '';
    for (let i = 0; i < n; i++) {
      const x0 = -a + (2 * a * i) / n, x1 = -a + (2 * a * (i + 1)) / n;
      oclusal += ` Q ${((x0 + x1) / 2).toFixed(1)} 5.5 ${x1.toFixed(1)} 0`;
    }
  }
  const cervical = (-h * 0.62).toFixed(1);
  return [
    `M ${(-a).toFixed(1)} 0 ${oclusal}` +
    ` C ${(a * 1.04).toFixed(1)} ${cervical} ${b.toFixed(1)} ${cervical} ${b.toFixed(1)} ${(-h).toFixed(1)}` +
    ` L ${(-b).toFixed(1)} ${(-h).toFixed(1)}` +
    ` C ${(-b).toFixed(1)} ${cervical} ${(-a * 1.04).toFixed(1)} ${cervical} ${(-a).toFixed(1)} 0 Z`,
  ];
}

// Raízes: cunhas fechadas saindo do colo, levemente divergentes
export function pathRaizes(num) {
  const { w, h, raiz } = medidas(num);
  const n = raizes(num);
  const b = (w / 2) * 0.84;
  const out = [];
  for (let i = 0; i < n; i++) {
    const larg = (2 * b) / n;
    const x0 = -b + larg * i, x1 = x0 + larg;
    const meio = (x0 + x1) / 2;
    const L = raiz * (n > 1 ? 0.82 : 1);
    const ponta = meio * 1.5;                                  // divergência suave
    const yTopo = -h - L, yMeio = -h - L * 0.55;
    out.push(
      `M ${(x0 + larg * 0.06).toFixed(1)} ${(-h + 1).toFixed(1)}` +
      ` C ${(x0 + (ponta - x0) * 0.45).toFixed(1)} ${yMeio.toFixed(1)} ${(ponta - larg * 0.16).toFixed(1)} ${(yTopo + L * 0.18).toFixed(1)} ${ponta.toFixed(1)} ${yTopo.toFixed(1)}` +
      ` C ${(ponta + larg * 0.16).toFixed(1)} ${(yTopo + L * 0.18).toFixed(1)} ${(x1 + (ponta - x1) * 0.45).toFixed(1)} ${yMeio.toFixed(1)} ${(x1 - larg * 0.06).toFixed(1)} ${(-h + 1).toFixed(1)} Z`
    );
  }
  return out;
}

export const VIEW = { w: 1040, h: 560 };

// Curva oclusal em "sorriso" (centro mais baixo), como numa panorâmica
function yOclusal(t) { return 262 + 30 * Math.sin(Math.PI * t); }

// Posição/rotação de cada dente da arcada
export function layout(nums, sup) {
  const n = nums.length;
  const x0 = nums.length > 12 ? 44 : 190;   // decídua ocupa menos largura
  const x1 = VIEW.w - x0;
  return nums.map((num, i) => {
    const t = (i + 0.5) / n;
    const x = x0 + t * (x1 - x0);
    const yo = yOclusal(t);
    const y = sup ? yo - 22 : yo + 22;      // espaço entre as arcadas
    const ang = (t - 0.5) * 44;             // leque: raízes abrem para fora
    const transform = sup
      ? `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)})`
      : `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(1 -1) rotate(${ang.toFixed(1)})`;
    const { h, raiz } = medidas(num);
    const alturaTotal = h + raiz + 12;
    return { num, x, y, ang, transform, rotulo: { x, y: sup ? y - alturaTotal : y + alturaTotal } };
  });
}

// Traçado anatômico de fundo (mandíbula, seios maxilares, fossa nasal, côndilos)
// — dá o aspecto de radiografia panorâmica sem depender de imagem externa.
export function anatomia() {
  return {
    mandibula: 'M 92 190 C 96 300, 150 420, 300 468 C 420 505, 620 505, 740 468 C 890 420, 944 300, 948 190' +
               ' M 92 190 C 120 200, 140 236, 146 276 M 948 190 C 920 200, 900 236, 894 276',
    borda_inf: 'M 150 300 C 190 420, 330 476, 520 480 C 710 476, 850 420, 890 300',
    condilos: 'M 92 190 a 26 20 0 1 1 52 6 M 948 190 a 26 20 0 1 0 -52 6',
    seios: 'M 160 176 C 210 130, 320 128, 372 176 C 392 226, 340 268, 268 264 C 200 260, 156 224, 160 176' +
           ' M 880 176 C 830 130, 720 128, 668 176 C 648 226, 700 268, 772 264 C 840 260, 884 224, 880 176',
    nasal: 'M 520 96 L 470 190 C 470 214, 570 214, 570 190 Z M 520 110 L 520 196',
    palato: 'M 300 214 C 400 236, 640 236, 740 214',
    coluna: 'M 486 470 L 486 546 M 554 470 L 554 546',
  };
}
