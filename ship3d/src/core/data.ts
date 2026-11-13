// Typed access to the data extracted from the deck plans (scripts/extract-plans.mjs),
// plus the vertical layout of the ship, which the plans do not carry.
import raw from '../data/ship.json';

export type Pt = [number, number];
export interface Room {
  id: string;
  /** name on the plan (Portuguese or the venue's own name) */
  n: string;
  /** category: piscina, comida, bar, show, esporte, criancas, circulacao, restrito... */
  c: string;
  p: Pt[];
}
export interface DeckData {
  k: number;
  stern: number;
  w: number;
  h: number;
  outline: Pt[][];
  rooms: Room[];
  /** [number, x0, x1, z0, z1] */
  cabins: number[][];
  /** flat [x, z, x, z...] polylines along the walkable grid */
  paths: number[][];
}

export const SHIP = raw as unknown as { beam: number; decks: Record<string, DeckData> };
export const DECKS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19];
export const deck = (n: number): DeckData => SHIP.decks[String(n)];

/** Length overall, metres. Ship X runs from 0 (aft face) to LENGTH (tip of the bow). */
export const LENGTH = 331;
export const BEAM = 43;
export const HALF = BEAM / 2;
export const DRAFT = 8.75;
/** Ship X of the scene origin: the model is centred so it turns around its middle. */
export const X0 = 165.5;
/** Ship X -> scene x. */
export const sx = (X: number) => X - X0;

/** Floor height of each deck above the waterline, metres. There is no deck 17. */
export const DECK_Y: Record<number, number> = {
  4: 5.9,
  5: 9.0,
  6: 13.0,
  7: 16.2,
  8: 19.4,
  9: 22.2,
  10: 25.0,
  11: 27.8,
  12: 30.6,
  13: 33.4,
  14: 36.2,
  15: 39.0,
  16: 42.6,
  18: 46.0,
  19: 49.2,
  20: 52.4, // roof of the deck 19 structures
};
export const nextDeck = (n: number) => (n === 16 ? 18 : n === 19 ? 20 : n + 1);
export const deckTop = (n: number) => DECK_Y[nextDeck(n)];

/** Where the vertical line X = x crosses a ring: sorted z values. */
export function crossings(ring: Pt[], x: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    if ((a[0] <= x && b[0] > x) || (b[0] <= x && a[0] > x)) {
      out.push(a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]));
    }
  }
  return out.sort((p, q) => p - q);
}

/** Port and starboard edge of a deck at ship X, or null where the deck does not exist. */
export function extent(n: number, x: number): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (const ring of deck(n).outline) {
    const c = crossings(ring, x);
    if (c.length) {
      lo = Math.min(lo, c[0]);
      hi = Math.max(hi, c[c.length - 1]);
    }
  }
  return hi > lo ? [lo, hi] : null;
}

export function inside(ring: Pt[], x: number, z: number): boolean {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    if (ring[i][1] > z !== ring[j][1] > z && x < ((ring[j][0] - ring[i][0]) * (z - ring[i][1])) / (ring[j][1] - ring[i][1]) + ring[i][0]) c = !c;
  }
  return c;
}

export function ringArea(p: Pt[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

export function bounds(p: Pt[]): { x0: number; x1: number; z0: number; z1: number; cx: number; cz: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const [x, z] of p) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    z0 = Math.min(z0, z);
    z1 = Math.max(z1, z);
  }
  return { x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
}

export const rooms = (n: number, test: RegExp | ((r: Room) => boolean)): Room[] =>
  deck(n).rooms.filter((r) => (test instanceof RegExp ? test.test(r.n) : test(r)));

/** Small deterministic random generator: the ship looks the same on every load. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
