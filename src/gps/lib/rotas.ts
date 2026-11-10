// GPS do navio: calcula o caminho a pé entre dois pontos, no navegador.
// Os dados (public/plantas/rotas.json) são gerados por plantas/tools/rotas.py: para cada deck,
// uma grade de células por onde dá para andar e a posição dos elevadores e escadas.

export type Banco = 'proa' | 'meio' | 'popa';

export type DeckRota = {
  w: number;
  h: number;
  cols: number;
  rows: number;
  /** grade comprimida: cada número é (tamanho da sequência × 5 + classe) */
  g: number[];
  /** célula [x, y] de cada conjunto de elevadores e escadas */
  b: Partial<Record<Banco, [number, number]>>;
  /** custo a pé entre os conjuntos do mesmo deck ("proa-meio") */
  m: Record<string, number>;
  /** cabines: número, célula x, célula y */
  cab: number[];
};

/** Lugar: id, nome (n), categoria (c), deck (d), texto (t), ids das salas, células das portas (p); `o` = nome original, antes de traduzir. */
export type LugarRota = { id: string; n: string; c: string; d: number; t: string; ids: string[]; p: number[]; o?: string };
export type DadosRotas = { cell: number; decks: Record<string, DeckRota>; lugares: LugarRota[] };

/** Origem ou destino: uma cabine ou um lugar (que pode ter mais de uma entrada). */
export type Ponto = { chave: string; nome: string; deck: number; cat: string; celulas: [number, number][]; cabine?: number; ids?: string[]; texto?: string };

export type Trecho =
  | { tipo: 'andar'; deck: number; pts: [number, number][]; metros: number; seg: number; ate: 'destino' | Banco; sentido: 'proa' | 'popa' | '' }
  | { tipo: 'andares'; banco: Banco; de: number; ate: number; andares: number; escada: boolean; seg: number };

export type Rota = { trechos: Trecho[]; metros: number; seg: number };

export const DECKS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19];

/** Metros por pixel da planta (o navio tem 331 m e a planta mais longa, 3.765 px). */
export const MPP = 331 / 3765;
const VEL = 1.1; // m/s, passo tranquilo em corredor de navio
// Custo de andar em cada classe de célula: nada, corredor, sala, água, parede fina (sem porta na planta).
const CUSTO = [0, 1, 1.6, 6, 14];
const MARGEM = [2.2, 1, 0.45, 0.15, 0, 0, 0]; // custo extra por andar colado à parede
const PAREDE = 4;
// Peso extra (em segundos) de cada troca de deck na escolha da rota: evita rotas com duas trocas
// para economizar poucos passos. Não entra no tempo mostrado.
const TROCA = 75;

const andares = (a: number, b: number) => Math.abs(DECKS.indexOf(a) - DECKS.indexOf(b));
/** Tempo para trocar de deck: escada até 2 andares, elevador (com a espera) acima disso. */
const subir = (n: number) => (n <= 2 ? { seg: 10 + 22 * n, escada: true } : { seg: 50 + 9 * n, escada: false });

type Grade = { cols: number; rows: number; custo: Float32Array };
const grades = new Map<string, Grade>();

function grade(dados: DadosRotas, deck: number): Grade {
  const k = String(deck);
  let gr = grades.get(k);
  if (gr) return gr;
  const d = dados.decks[k];
  const n = d.cols * d.rows;
  const g = new Uint8Array(n);
  let i = 0;
  for (const r of d.g) {
    const v = r % 5;
    const fim = i + Math.floor(r / 5);
    if (v) g.fill(v, i, fim);
    i = fim;
  }
  // Folga: quantas células até a parede mais próxima (até 6), para a rota andar pelo meio do corredor.
  let m = new Uint8Array(n);
  for (let j = 0; j < n; j++) m[j] = g[j] && g[j] !== PAREDE ? 1 : 0;
  const folga = new Uint8Array(n);
  for (let p = 0; p < 6; p++) {
    const e = new Uint8Array(n);
    for (let y = 0; y < d.rows; y++) {
      for (let x = 0; x < d.cols; x++) {
        const c = y * d.cols + x;
        if (!m[c]) continue;
        let ok = 1;
        for (let dy = -1; dy <= 1 && ok; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < d.cols && ny < d.rows && !m[ny * d.cols + nx]) {
              ok = 0;
              break;
            }
          }
        }
        e[c] = ok;
        folga[c] += ok;
      }
    }
    m = e;
  }
  const custo = new Float32Array(n);
  for (let j = 0; j < n; j++) custo[j] = g[j] ? CUSTO[g[j]] + MARGEM[folga[j]] : 0;
  gr = { cols: d.cols, rows: d.rows, custo };
  grades.set(k, gr);
  return gr;
}

type Mapa = { dist: Float32Array; ant: Int32Array };

/** Dijkstra na grade a partir de uma ou mais células. Distâncias em "células de corredor". */
function espalhar(gr: Grade, fontes: [number, number][]): Mapa {
  const { cols, rows, custo } = gr;
  const dist = new Float32Array(cols * rows).fill(Infinity);
  const ant = new Int32Array(cols * rows).fill(-1);
  // fila de prioridade (heap binário) de [distância, célula]
  const hd: number[] = [];
  const hc: number[] = [];
  const poe = (dd: number, c: number) => {
    let i = hd.length;
    hd.push(dd);
    hc.push(c);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (hd[p] <= dd) break;
      hd[i] = hd[p];
      hc[i] = hc[p];
      i = p;
    }
    hd[i] = dd;
    hc[i] = c;
  };
  const tira = () => {
    const c = hc[0];
    const ld = hd.pop()!;
    const lc = hc.pop()!;
    const n = hd.length;
    if (n) {
      let i = 0;
      for (;;) {
        let f = 2 * i + 1;
        if (f >= n) break;
        if (f + 1 < n && hd[f + 1] < hd[f]) f++;
        if (hd[f] >= ld) break;
        hd[i] = hd[f];
        hc[i] = hc[f];
        i = f;
      }
      hd[i] = ld;
      hc[i] = lc;
    }
    return c;
  };
  for (const [x, y] of fontes) {
    const c = y * cols + x;
    if (!custo[c]) continue;
    dist[c] = 0;
    poe(0, c);
  }
  while (hd.length) {
    const dd = hd[0];
    const c = tira();
    if (dd > dist[c]) continue;
    const x = c % cols;
    const y = (c - x) / cols;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= rows) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        if ((!dx && !dy) || nx < 0 || nx >= cols) continue;
        const v = ny * cols + nx;
        if (!custo[v]) continue;
        // na diagonal, não corta a quina de uma parede
        if (dx && dy && (!custo[y * cols + nx] || !custo[ny * cols + x])) continue;
        const nd = Math.fround(dd + (dx && dy ? 1.4142 : 1) * custo[v]); // mesma precisão de `dist`
        if (nd < dist[v]) {
          dist[v] = nd;
          ant[v] = c;
          poe(nd, v);
        }
      }
    }
  }
  return { dist, ant };
}

/** Caminho (em células) da célula `alvo` de volta até a fonte do mapa. */
function voltar(gr: Grade, mapa: Mapa, alvo: [number, number]): [number, number][] {
  const out: [number, number][] = [];
  let c = alvo[1] * gr.cols + alvo[0];
  if (!isFinite(mapa.dist[c])) return out;
  while (c >= 0) {
    out.push([c % gr.cols, Math.floor(c / gr.cols)]);
    c = mapa.ant[c];
  }
  return out;
}

/** Tira os degraus da grade: mantém só os pontos onde o caminho muda de rumo (Douglas-Peucker). */
function simplificar(p: [number, number][], tol: number): [number, number][] {
  if (p.length < 3) return p;
  const fica = new Uint8Array(p.length);
  fica[0] = fica[p.length - 1] = 1;
  const pilha: [number, number][] = [[0, p.length - 1]];
  while (pilha.length) {
    const [a, b] = pilha.pop()!;
    const [ax, ay] = p[a];
    const [bx, by] = p[b];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let pior = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const dd = Math.abs((bx - ax) * (ay - p[i][1]) - (ax - p[i][0]) * (by - ay)) / len;
      if (dd > pior) {
        pior = dd;
        idx = i;
      }
    }
    if (pior > tol && idx > 0) {
      fica[idx] = 1;
      pilha.push([a, idx], [idx, b]);
    }
  }
  return p.filter((_, i) => fica[i]);
}

function andar(dados: DadosRotas, deck: number, celulas: [number, number][], ate: 'destino' | Banco): Trecho {
  const k = dados.cell;
  const pts = simplificar(celulas, 1.2).map(([x, y]) => [(x + 0.5) * k, (y + 0.5) * k] as [number, number]);
  let px = 0;
  for (let i = 1; i < pts.length; i++) px += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const metros = px * MPP;
  const dy = pts.length ? pts[pts.length - 1][1] - pts[0][1] : 0;
  const sentido = Math.abs(dy) * MPP < 12 ? '' : dy < 0 ? 'proa' : 'popa';
  return { tipo: 'andar', deck, pts, metros, seg: metros / VEL, ate, sentido };
}

/** Segundos de caminhada para um custo da grade (em células). */
const segundos = (dados: DadosRotas, custo: number) => (custo * dados.cell * MPP) / VEL;

/**
 * Melhor rota entre dois pontos. No mesmo deck vai direto; entre decks, escolhe o conjunto de
 * elevadores que dá o menor tempo total, passando por um deck intermediário se for preciso.
 */
export function planejar(dados: DadosRotas, de: Ponto, para: Ponto): Rota | null {
  const gA = grade(dados, de.deck);
  const gB = grade(dados, para.deck);
  const mA = espalhar(gA, de.celulas);
  const mB = espalhar(gB, para.celulas);
  const em = (gr: Grade, m: Mapa, c: [number, number]) => m.dist[c[1] * gr.cols + c[0]];

  // Grafo pequeno: origem, destino e cada conjunto de elevadores de cada deck. Pesos em segundos.
  type No = string;
  const viz = new Map<No, [No, number][]>();
  const liga = (a: No, b: No, s: number) => {
    if (!isFinite(s)) return;
    (viz.get(a) ?? viz.set(a, []).get(a)!).push([b, s]);
    (viz.get(b) ?? viz.set(b, []).get(b)!).push([a, s]);
  };
  const no = (deck: number, b: string) => `${deck}:${b}`;

  if (de.deck === para.deck) {
    let melhor = Infinity;
    for (const c of para.celulas) melhor = Math.min(melhor, em(gA, mA, c));
    // leve vantagem para o caminho direto, para não "passar pelo elevador" em caso de empate
    liga('O', 'D', segundos(dados, melhor) * 0.98);
  }
  for (const deck of DECKS) {
    const d = dados.decks[deck];
    for (const [b, c] of Object.entries(d.b) as [Banco, [number, number]][]) {
      if (deck === de.deck) liga('O', no(deck, b), segundos(dados, em(gA, mA, c)));
      if (deck === para.deck) liga(no(deck, b), 'D', segundos(dados, em(gB, mB, c)));
      for (const outro of DECKS) {
        if (outro > deck && dados.decks[outro].b[b]) liga(no(deck, b), no(outro, b), subir(andares(deck, outro)).seg + TROCA);
      }
    }
    for (const [par, custo] of Object.entries(d.m)) {
      const [a, b] = par.split('-');
      liga(no(deck, a), no(deck, b), segundos(dados, custo / dados.cell));
    }
  }

  const dist = new Map<No, number>([['O', 0]]);
  const ant = new Map<No, No>();
  const feito = new Set<No>();
  for (;;) {
    let u: No | undefined;
    for (const [k, v] of dist) if (!feito.has(k) && (u === undefined || v < dist.get(u)!)) u = k;
    if (u === undefined || u === 'D') break;
    feito.add(u);
    for (const [v, s] of viz.get(u) ?? []) {
      const nd = dist.get(u)! + s;
      if (nd < (dist.get(v) ?? Infinity)) {
        dist.set(v, nd);
        ant.set(v, u);
      }
    }
  }
  if (!dist.has('D')) return null;
  const nos: No[] = ['D'];
  while (nos[0] !== 'O') nos.unshift(ant.get(nos[0])!);

  const trechos: Trecho[] = [];
  const parte = (n: No) => {
    const [deck, b] = n.split(':');
    return { deck: Number(deck), banco: b as Banco };
  };
  for (let i = 1; i < nos.length; i++) {
    const a = nos[i - 1];
    const b = nos[i];
    if (a === 'O' && b === 'D') {
      let alvo = para.celulas[0];
      for (const c of para.celulas) if (em(gA, mA, c) < em(gA, mA, alvo)) alvo = c;
      trechos.push(andar(dados, de.deck, voltar(gA, mA, alvo).reverse(), 'destino'));
    } else if (a === 'O') {
      const { deck, banco } = parte(b);
      trechos.push(andar(dados, deck, voltar(gA, mA, dados.decks[deck].b[banco]!).reverse(), banco));
    } else if (b === 'D') {
      const { deck, banco } = parte(a);
      trechos.push(andar(dados, deck, voltar(gB, mB, dados.decks[deck].b[banco]!), 'destino'));
    } else {
      const x = parte(a);
      const y = parte(b);
      if (x.deck === y.deck) {
        const gr = grade(dados, x.deck);
        const m = espalhar(gr, [dados.decks[x.deck].b[x.banco]!]);
        trechos.push(andar(dados, x.deck, voltar(gr, m, dados.decks[x.deck].b[y.banco]!).reverse(), y.banco));
      } else {
        const n = andares(x.deck, y.deck);
        trechos.push({ tipo: 'andares', banco: x.banco, de: x.deck, ate: y.deck, andares: n, ...subir(n) });
      }
    }
  }
  // Um trecho de poucos passos até o elevador não merece um mapa: fica só o resto.
  const uteis = trechos.filter((t) => t.tipo !== 'andar' || t.pts.length > 1);
  return {
    trechos: uteis,
    metros: uteis.reduce((s, t) => s + (t.tipo === 'andar' ? t.metros : 0), 0),
    seg: uteis.reduce((s, t) => s + t.seg, 0),
  };
}

/** Cabine pelo número (o número sem os três últimos dígitos é o deck). */
export function cabine(dados: DadosRotas, num: number): Ponto | null {
  const deck = Math.floor(num / 1000);
  const cab = dados.decks[deck]?.cab;
  if (!cab) return null;
  for (let i = 0; i < cab.length; i += 3) {
    if (cab[i] === num) return { chave: `c${num}`, nome: `Cabine ${num}`, deck, cat: 'cabines', celulas: [[cab[i + 1], cab[i + 2]]], cabine: num };
  }
  return null;
}

export function lugar(l: LugarRota): Ponto {
  const celulas: [number, number][] = [];
  for (let i = 0; i < l.p.length; i += 2) celulas.push([l.p[i], l.p[i + 1]]);
  return { chave: l.id, nome: l.n, deck: l.d, cat: l.c, celulas, ids: l.ids, texto: l.t };
}

/**
 * Ponte entre o mapa dos decks (MapaNavio) e o GPS (GpsNavio), quando os dois estão na mesma página:
 * o GPS preenche estas funções e o mapa as usa no botão "Como chegar".
 */
export const ponte: { tem?: (chave: string) => boolean; ir?: (chave: string) => void } = {};
