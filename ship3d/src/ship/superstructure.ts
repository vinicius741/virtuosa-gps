// Decks 6 to 14: the glazed restaurant decks at the stern, the shelves the lifeboats stand on,
// and the seven cabin decks, where every cabin of the plan gets a real balcony: recessed back
// wall with a glass door, dividers, glass balustrade.
import { DECK_Y, HALF, deck, deckTop, rng, sx, type Pt } from '../core/data';
import type { Geo, Parts } from '../core/geo';
import { LEDGE, hullHalf } from './hull';

export const SLAB = 0.28;
/** How far the balcony doors sit behind the balustrade. */
export const BALCONY_DEPTH = 1.75;
/** Lifeboat groups: ship X of the first boat's centre, number of boats. */
export const BOAT_PITCH = 15.6;
export const BOAT_GROUPS: [number, number][] = [
  [57.5, 4],
  [158, 6],
];
export const BOAT_ZONES: [number, number][] = BOAT_GROUPS.map(([x, n]) => [x - BOAT_PITCH / 2 - 0.5, x + (n - 0.5) * BOAT_PITCH + 0.5]);
/** Forward end of the glazed two-deck band at the stern. */
export const BAND_END = 40;
export const BAND_HALF = 23.3;
export const SHELF_HALF = 23.4;
const RECESS_HALF = 17.4;

export interface Balcony {
  deck: number;
  /** centre of the balcony, ship X/Z, at the door and at the rail */
  door: Pt;
  rail: Pt;
  /** width along the ship's side */
  width: number;
  y: number;
  /** is the cabin lit at night */
  lit: boolean;
}

export interface SuperInfo {
  balconies: Balcony[];
}

const inZone = (X: number) => BOAT_ZONES.some(([a, b]) => X > a && X < b);

/** Clips a ring to a ≤ X ≤ b (Sutherland-Hodgman against two planes). */
export function clipX(ring: Pt[], a: number, b: number): Pt[] {
  const cut = (pts: Pt[], x: number, keepGreater: boolean): Pt[] => {
    const out: Pt[] = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      const pin = keepGreater ? p[0] >= x : p[0] <= x;
      const qin = keepGreater ? q[0] >= x : q[0] <= x;
      if (pin) out.push(p);
      if (pin !== qin) out.push([x, p[1] + ((x - p[0]) / (q[0] - p[0])) * (q[1] - p[1])]);
    }
    return out;
  };
  return cut(cut(ring, a, true), b, false);
}

/**
 * Shape of a forward face, measured on the plans and checked against photographs: how far
 * behind the nose the edge is at each distance from the centre line (for a deck 22 m wide to
 * each side). The middle 25 m are gently cambered; the corners then sweep back about 12 m.
 */
const FRONT_PROFILE: [number, number][] = [
  [12.4, 1],
  [14.3, 2],
  [15.9, 3],
  [17.1, 4],
  [19, 6],
  [20.3, 8],
  [21.2, 10],
  [22, 12],
];
/** Half-width of the middle of a forward face, and the width of one of its six window bays. */
export const FRONT_FLAT = 12.4;
export const FRONT_BAY = (FRONT_FLAT * 2) / 6;

function frontDx(z: number): number {
  const a = Math.abs(z);
  if (a <= FRONT_FLAT) return (a / FRONT_FLAT) ** 2;
  for (let i = 1; i < FRONT_PROFILE.length; i++) {
    const [z0, d0] = FRONT_PROFILE[i - 1];
    const [z1, d1] = FRONT_PROFILE[i];
    if (a <= z1) return d0 + ((a - z0) / (z1 - z0)) * (d1 - d0);
  }
  return 12;
}

/** Ship X of a forward face at distance z from the centre line, for a deck `zm` wide to each side. */
export function frontCurve(nose: number, sweep: number, zm: number): (z: number) => number {
  const corner = zm - FRONT_FLAT;
  return (z) => {
    const az = Math.min(Math.abs(z), zm);
    // the corner keeps its measured shape; a wider or narrower deck stretches only the corner
    const d = az <= FRONT_FLAT ? frontDx(az) : frontDx(FRONT_FLAT + ((az - FRONT_FLAT) / corner) * (22 - FRONT_FLAT));
    return nose - d * (sweep / 12);
  };
}

/** Where a forward face is sampled across the beam: the six bays, then steps round each corner. */
export function frontStations(zm: number, cornerSteps = 8): number[] {
  const zs: number[] = [];
  for (let k = 0; k < cornerSteps; k++) zs.push(-zm + (k / cornerSteps) * (zm - FRONT_FLAT));
  for (let k = 0; k <= 6; k++) zs.push(-FRONT_FLAT + k * FRONT_BAY);
  for (let k = 1; k <= cornerSteps; k++) zs.push(FRONT_FLAT + (k / cornerSteps) * (zm - FRONT_FLAT));
  return zs;
}

/**
 * Gives a deck the forward face of the real ship: everything ahead of the corners is replaced
 * by the measured curve, reaching `nose` on the centre line. `sweep` is how far back the
 * corners are (12 m on the cabin decks, less on the upper ones). The traced plans turn that
 * curve into a staircase; this puts the fair line back.
 */
export function smoothFront(ring: Pt[], nose: number, sweep = 12): Pt[] {
  const Xc = nose - sweep;
  // A plan that ends short of the corners (its own front is further aft) is cut where it is
  // still full width, and its sides are run forward to the corners.
  const tip = Math.max(...ring.map((p) => p[0]));
  const Xcut = tip < Xc + 2 ? tip - 14 : Xc;
  const cut = dedupe(clipX(ring, -Infinity, Xcut));
  const n = cut.length;
  for (let i = 0; i < n; i++) {
    const a = cut[i];
    const b = cut[(i + 1) % n];
    if (Math.abs(a[0] - Xcut) > 1e-6 || Math.abs(b[0] - Xcut) > 1e-6 || Math.abs(a[1] - b[1]) < 4) continue;
    const zm = Math.min(Math.abs(a[1]), Math.abs(b[1]));
    const dir = Math.sign(b[1] - a[1]);
    const X = frontCurve(nose, sweep, zm);
    const stations = frontStations(zm);
    // when the sides were run forward the corners themselves are new points
    const curve = (Xcut < Xc ? stations : stations.slice(1, -1)).map((z) => [X(z), z * dir] as Pt);
    return [...cut.slice(0, i + 1), ...curve, ...cut.slice(i + 1)];
  }
  return cut;
}

/** Removes points closer than eps to the previous one (clipping leaves a few). */
export function dedupe(ring: Pt[], eps = 0.02): Pt[] {
  const out: Pt[] = [];
  for (const p of ring) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > eps) out.push(p);
  }
  if (out.length > 1 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= eps) out.pop();
  return out;
}

/** What each bay of the forward face holds, from the centre outwards: W wide pane, T tall narrow window, p porthole. */
const FRONT_BAYS: Record<number, string> = { 9: 'Wpp', 10: 'Tpp', 11: 'ppp', 12: 'WWW', 13: 'TTT' };

export interface Cab {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/**
 * One cabin deck. `ring` is the outer edge of the deck (balustrades and plain walls stand on it),
 * `cabins` the cabin rectangles of the plan; a cabin that reaches the edge gets a balcony.
 */
export function cabinDeck(parts: Parts, info: SuperInfo, n: number, ring: Pt[], cabins: Cab[], opts: { y?: number; top?: number; noBalcony?: (X: number) => boolean; glassFrom?: number; frontFrom?: number; openFrom?: number } = {}) {
  const y = opts.y ?? DECK_Y[n];
  const top = opts.top ?? deckTop(n);
  const ceil = top - SLAB;
  const white = parts.get('white');
  const white2 = parts.get('white2');
  const glass = parts.get('glass');
  const lit = parts.get('lit');
  const rail = parts.get('rail');
  const steel = parts.get('steel');
  const rand = rng(n * 101 + 7);
  const area = ring.reduce((a, p, i) => a + p[0] * ring[(i + 1) % ring.length][1] - ring[(i + 1) % ring.length][0] * p[1], 0);
  const ccw = area > 0;
  const litColours = [0xffd9a8, 0xffe8c8, 0xfff2df, 0xffc98a, 0xd9e6ff];

  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 0.05) continue;
    const o: Pt = ccw ? [dz / len, -dx / len] : [-dz / len, dx / len];
    const at = (t: number): Pt => [a[0] + dx * t, a[1] + dz * t];
    const sideEdge = Math.abs(o[1]) > 0.92;
    const aftEdge = o[0] < -0.92;

    // which stretches of this edge have a cabin right behind them
    const spans: [number, number, number][] = [];
    if (sideEdge && len > 1.2) {
      const s = Math.sign(o[1]);
      const lo = Math.min(a[0], b[0]);
      const hi = Math.max(a[0], b[0]);
      for (const c of cabins) {
        const outer = s > 0 ? c.z1 : c.z0;
        const x0 = Math.max(c.x0, lo);
        const x1 = Math.min(c.x1, hi);
        if (x1 - x0 < 1.4) continue;
        const zEdge = a[1] + (((x0 + x1) / 2 - a[0]) / dx) * dz;
        // the plan draws the cabin without its balcony: the gap to the edge is the balcony
        const gap = (zEdge - outer) * s;
        if (gap < 0.7 || gap > 3.9) continue;
        if (opts.noBalcony?.((x0 + x1) / 2)) continue;
        const ts = [(x0 - a[0]) / dx, (x1 - a[0]) / dx].sort((p, q) => p - q);
        spans.push([ts[0], ts[1], Math.min(Math.max(gap, 1.4), 2.6)]);
      }
    } else if (aftEdge && len > 1.2) {
      const lo = Math.min(a[1], b[1]);
      const hi = Math.max(a[1], b[1]);
      for (const c of cabins) {
        const z0 = Math.max(c.z0, lo);
        const z1 = Math.min(c.z1, hi);
        if (z1 - z0 < 1.4) continue;
        const xEdge = a[0] + (((z0 + z1) / 2 - a[1]) / dz) * dx;
        const gap = c.x0 - xEdge;
        if (gap < 0.5 || gap > 4.5) continue;
        const ts = [(z0 - a[1]) / dz, (z1 - a[1]) / dz].sort((p, q) => p - q);
        spans.push([ts[0], ts[1], Math.min(Math.max(gap, 1.6), 3)]);
      }
    }
    spans.sort((p, q) => p[0] - q[0]);
    // drop overlaps (two traced cabins claiming the same stretch)
    const clean: [number, number, number][] = [];
    for (const s of spans) {
      const last = clean[clean.length - 1];
      if (last && s[0] < last[1] - 0.02 / len) {
        if ((s[1] - last[1]) * len > 1.2) clean.push([last[1], s[1], s[2]]);
      } else clean.push(s);
    }
    // neighbouring balconies share one depth, so their back walls and dividers line up
    for (let k = 1; k < clean.length; k++) if ((clean[k][0] - clean[k - 1][1]) * len < 0.6 && Math.abs(clean[k][2] - clean[k - 1][2]) < 0.5) clean[k][2] = clean[k - 1][2];

    const plain = (t0: number, t1: number) => {
      if ((t1 - t0) * len < 0.03) return;
      const p = at(t0);
      const q = at(t1);
      // this stretch is closed by something else (the raked face of the top decks)
      if (opts.openFrom !== undefined && Math.min(p[0], q[0]) > opts.openFrom - 1e-3) return;
      white.color(0xffffff).wall(p, q, y, ceil, o);
      const l = (t1 - t0) * len;
      if (opts.glassFrom !== undefined && Math.min(p[0], q[0]) > opts.glassFrom) {
        // navigation bridge and the forward lounges: one continuous band of glass
        const off: Pt = [o[0] * 0.04, o[1] * 0.04];
        glass.color(0xffffff).wall([p[0] + off[0], p[1] + off[1]], [q[0] + off[0], q[1] + off[1]], y + 0.6, ceil - 0.08, o);
        return;
      }
      const zm = Math.abs((p[1] + q[1]) / 2);
      if (opts.frontFrom !== undefined && Math.min(p[0], q[0]) > opts.frontFrom - 1e-3) {
        // The forward face. Round the corners: a strip of dark window. In the flat middle: six
        // bays, each either a tall pane or a white panel with one porthole, deck by deck as on
        // the real ship.
        const pane = (w: number, y0: number, y1: number, light = false) => {
          const h = Math.min(0.5, w / 2 / l);
          const c0: Pt = [p[0] + (q[0] - p[0]) * (0.5 - h) + o[0] * 0.045, p[1] + (q[1] - p[1]) * (0.5 - h) + o[1] * 0.045];
          const c1: Pt = [p[0] + (q[0] - p[0]) * (0.5 + h) + o[0] * 0.045, p[1] + (q[1] - p[1]) * (0.5 + h) + o[1] * 0.045];
          glass.color(0xffffff).wall(c0, c1, y0, y1, o);
          if (light && rand() < 0.5) {
            lit.color(litColours[Math.floor(rand() * litColours.length)], 0.4 + rand() * 0.5);
            lit.wall([c0[0] + o[0] * 0.02, c0[1] + o[1] * 0.02], [c1[0] + o[0] * 0.02, c1[1] + o[1] * 0.02], y0, y1, o);
          }
        };
        if (zm > FRONT_FLAT) {
          pane(l, y + 0.95, y + 2.05, true);
          return;
        }
        const bay = Math.min(2, Math.floor(zm / FRONT_BAY)); // 0 = the two middle bays, 2 = the outer ones
        const kind = (FRONT_BAYS[n] ?? 'ppp')[bay];
        if (kind === 'W') pane(l - 0.35, y + 0.35, y + 1.75, true);
        else if (kind === 'T') pane(1.25, y + 0.3, ceil - 0.35, true);
        else pane(0.95, y + 1.15, y + 1.75);
        return;
      }
      if (l < 2.6) return;
      // ocean-view windows, one every cabin width
      const count = Math.floor(l / 2.75);
      const pitch = l / count;
      for (let k = 0; k < count; k++) {
        const c0 = (t0 * len + pitch * (k + 0.5) - 0.7) / len;
        const c1 = (t0 * len + pitch * (k + 0.5) + 0.7) / len;
        const w0 = at(c0);
        const w1 = at(c1);
        const on = rand() < 0.4;
        const target = on ? lit : glass;
        if (on) lit.color(litColours[Math.floor(rand() * litColours.length)], 0.5 + rand() * 0.5);
        const d = on ? 0.05 : 0.035;
        target.wall([w0[0] + o[0] * d, w0[1] + o[1] * d], [w1[0] + o[0] * d, w1[1] + o[1] * d], y + 1.0, y + 2.05, o);
        if (on) glass.wall([w0[0] + o[0] * 0.03, w0[1] + o[1] * 0.03], [w1[0] + o[0] * 0.03, w1[1] + o[1] * 0.03], y + 1.0, y + 2.05, o);
      }
    };

    let cursor = 0;
    let depth = BALCONY_DEPTH;
    const back = (p: Pt): Pt => [p[0] - o[0] * depth, p[1] - o[1] * depth];
    const divider = (t: number) => {
      const p = at(t);
      const q = back(p);
      const e: Pt = [p[0] - o[0] * 0.08, p[1] - o[1] * 0.08];
      white2.color(0xf4f4f1).quad([sx(e[0]), y, e[1]], [sx(q[0]), y, q[1]], [sx(q[0]), ceil, q[1]], [sx(e[0]), ceil, e[1]]);
    };
    for (let k = 0; k < clean.length; k++) {
      const [t0, t1] = clean[k];
      depth = clean[k][2];
      // a short gap between two cabins is just a thicker divider, not a stretch of wall
      if ((t0 - cursor) * len > 0.5 || k === 0) plain(cursor, t0);
      const p = at(t0);
      const q = at(t1);
      const pb = back(p);
      const qb = back(q);
      const w = (t1 - t0) * len;
      // back wall, a touch grey: it only ever sees bounced light
      white.color(0xe9eae8).quad([sx(pb[0]), y, pb[1]], [sx(qb[0]), y, qb[1]], [sx(qb[0]), ceil, qb[1]], [sx(pb[0]), ceil, pb[1]], [o[0], 0, o[1]]);
      // sliding door
      const m0 = 0.32 / w;
      const m1 = 1 - 0.32 / w;
      const g0: Pt = [pb[0] + (qb[0] - pb[0]) * m0 + o[0] * 0.03, pb[1] + (qb[1] - pb[1]) * m0 + o[1] * 0.03];
      const g1: Pt = [pb[0] + (qb[0] - pb[0]) * m1 + o[0] * 0.03, pb[1] + (qb[1] - pb[1]) * m1 + o[1] * 0.03];
      const on = rand() < 0.46;
      glass.color(0xffffff).wall(g0, g1, y + 0.06, y + 2.12, o);
      if (on) {
        lit.color(litColours[Math.floor(rand() * litColours.length)], 0.45 + rand() * 0.55);
        lit.wall([g0[0] + o[0] * 0.02, g0[1] + o[1] * 0.02], [g1[0] + o[0] * 0.02, g1[1] + o[1] * 0.02], y + 0.06, y + 2.12, o);
      }
      divider(t0);
      if (k === clean.length - 1 || clean[k + 1][0] - t1 > 0.01) divider(t1);
      // glass balustrade with a handrail
      const r0: Pt = [p[0] - o[0] * 0.05, p[1] - o[1] * 0.05];
      const r1: Pt = [q[0] - o[0] * 0.05, q[1] - o[1] * 0.05];
      rail.color(0xffffff).wall(r0, r1, y + 0.06, y + 1.1, o);
      steel.color(0xe6e8ea).beam([sx(r0[0]), y + 1.12, r0[1]], [sx(r1[0]), y + 1.12, r1[1]], 0.07, 0.05);
      const mid = at((t0 + t1) / 2);
      const mb = back(mid);
      info.balconies.push({
        deck: n,
        door: [mb[0] + o[0] * 0.35, mb[1] + o[1] * 0.35],
        rail: [mid[0] - o[0] * 0.45, mid[1] - o[1] * 0.45],
        width: w,
        y,
        lit: on,
      });
      cursor = t1;
    }
    plain(cursor, 1);
  }
}

/** Windows in a long wall: a row of dark panes with some lit ones. */
function windowRow(glass: Geo, lit: Geo, rand: () => number, p: Pt, q: Pt, o: Pt, y0: number, y1: number, pitch: number, width: number, litChance = 0.35) {
  const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
  const count = Math.max(1, Math.floor(len / pitch));
  const step = len / count;
  for (let k = 0; k < count; k++) {
    const c = (step * (k + 0.5)) / len;
    const h = width / 2 / len;
    const w0: Pt = [p[0] + (q[0] - p[0]) * (c - h) + o[0] * 0.035, p[1] + (q[1] - p[1]) * (c - h) + o[1] * 0.035];
    const w1: Pt = [p[0] + (q[0] - p[0]) * (c + h) + o[0] * 0.035, p[1] + (q[1] - p[1]) * (c + h) + o[1] * 0.035];
    glass.color(0xffffff).wall(w0, w1, y0, y1, o);
    if (rand() < litChance) {
      lit.color(rand() < 0.7 ? 0xffd9a8 : 0xfff0d8, 0.5 + rand() * 0.5);
      lit.wall([w0[0] + o[0] * 0.02, w0[1] + o[1] * 0.02], [w1[0] + o[0] * 0.02, w1[1] + o[1] * 0.02], y0, y1, o);
    }
  }
}

/** Decks 6 and 7: stern band of glass, lifeboat shelves and recess, and the block between them. */
function lowerDecks(parts: Parts) {
  const white = parts.get('white');
  const white2 = parts.get('white2');
  const glass = parts.get('glass');
  const lit = parts.get('lit');
  const teak = parts.get('teak');
  const rand = rng(606);
  const y0 = LEDGE;
  const y1 = DECK_Y[8];

  // --- glazed band at the stern (the two-deck restaurants), wider than the hull
  const B = BAND_HALF;
  const bandRing: Pt[] = [
    [0, -B + 1.2],
    [0.5, -B],
    [BAND_END, -B],
    [BAND_END, B],
    [0.5, B],
    [0, B - 1.2],
  ];
  white.color(0xffffff);
  white.slab(bandRing, y0 - 0.75, y0 - 0.2); // lower rim
  white.slab(bandRing, y1 - 0.5, y1, [], undefined, false); // upper rim / floor of the deck-8 terrace
  teak.color(0xffffff).poly(bandRing, y1, true);
  // the glass itself, set slightly in from the rims
  const inset = (r: Pt[], d: number): Pt[] => r.map(([x, z]) => [x < 1 ? x + d : x, z > 0 ? z - d : z + d] as Pt);
  const gr = inset(bandRing, 0.18);
  glass.color(0xffffff);
  for (let i = 0; i < gr.length; i++) {
    const a = gr[i];
    const b = gr[(i + 1) % gr.length];
    if (a[0] === BAND_END && b[0] === BAND_END) continue;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const l = Math.hypot(dx, dz);
    const o: Pt = [dz / l, -dx / l];
    glass.wall(a, b, y0 - 0.2, y1 - 0.5, o);
    // thin white mullions
    const count = Math.round(l / 2.4);
    white.color(0xf4f4f2);
    for (let k = 1; k < count; k++) {
      const t = k / count;
      const m: Pt = [a[0] + dx * t + o[0] * 0.03, a[1] + dz * t + o[1] * 0.03];
      white.beam([sx(m[0]), y0 - 0.2, m[1]], [sx(m[0]), y1 - 0.5, m[1]], 0.07, 0.07);
    }
    // warm restaurant light behind some panes at night
    if (l > 4) {
      for (let k = 0; k < count; k++) {
        if (rand() < 0.55) continue;
        const t0 = (k + 0.08) / count;
        const t1 = (k + 0.92) / count;
        lit.color(0xffc98a, 0.35 + rand() * 0.5);
        lit.wall([a[0] + dx * t0 + o[0] * 0.02, a[1] + dz * t0 + o[1] * 0.02], [a[0] + dx * t1 + o[0] * 0.02, a[1] + dz * t1 + o[1] * 0.02], y0, y1 - 0.8, o);
      }
    }
  }

  for (const s of [1, -1]) {
    const o: Pt = [0, s];
    // --- lifeboat shelves: a ledge standing proud of the hull, with a deep fascia
    for (const [a, b] of BOAT_ZONES) {
      const ring: Pt[] = [
        [a, s * (HALF - 0.4)],
        [b, s * (HALF - 0.4)],
        [b, s * SHELF_HALF],
        [a, s * SHELF_HALF],
      ];
      white.color(0xffffff).slab(ring, y0 - 0.85, y0);
      // recess wall behind the boats: two rows of windows (decks 6 and 7)
      white.color(0xeeefec).wall([a, s * RECESS_HALF], [b, s * RECESS_HALF], y0, y1, o);
      windowRow(glass, lit, rand, [a + 1, s * RECESS_HALF], [b - 1, s * RECESS_HALF], o, y0 + 0.9, y0 + 2.3, 3.1, 2.1, 0.5);
      windowRow(glass, lit, rand, [a + 1, s * RECESS_HALF], [b - 1, s * RECESS_HALF], o, y0 + 4.1, y0 + 5.5, 3.1, 2.1, 0.5);
      // end walls of the recess
      white.color(0xffffff);
      white.wall([a, s * RECESS_HALF], [a, s * (HALF + 0.02)], y0, y1, [1, 0]);
      white.wall([b, s * RECESS_HALF], [b, s * (HALF + 0.02)], y0, y1, [-1, 0]);
      // floor of the recess
      parts
        .get('deck')
        .color(0x9aa9ae)
        .poly(
          [
            [a, s * RECESS_HALF],
            [b, s * RECESS_HALF],
            [b, s * (HALF - 0.4)],
            [a, s * (HALF - 0.4)],
          ],
          y0 + 0.01,
          true,
        );
    }
    // --- plain plating between and beyond the boat zones
    const flush: [number, number][] = [
      [BAND_END, BOAT_ZONES[0][0]],
      [BOAT_ZONES[0][1], BOAT_ZONES[1][0]],
      [BOAT_ZONES[1][1], 268],
    ];
    for (const [a, b] of flush) {
      const z = s * (b > 260 ? HALF - 0.3 : HALF + 0.02);
      white.color(0xffffff).wall([a, z], [b, z], y0, y1, o);
    }
    // the tall dark panel between the two groups of boats
    const [pa, pb] = [BOAT_ZONES[0][1] + 6, BOAT_ZONES[1][0] - 6];
    glass.color(0xffffff).wall([pa, s * (HALF + 0.06)], [pb, s * (HALF + 0.06)], y0 + 0.5, y1 - 0.5, o);
    for (let X = pa + 2.4; X < pb - 1; X += 2.4) white.color(0xf4f4f2).beam([sx(X), y0 + 0.5, s * (HALF + 0.09)], [sx(X), y1 - 0.5, s * (HALF + 0.09)], 0.06, 0.06);
    white.beam([sx(pa), (y0 + y1) / 2, s * (HALF + 0.09)], [sx(pb), (y0 + y1) / 2, s * (HALF + 0.09)], 0.08, 0.08);
    // a few windows in the plating just aft of the first boats
    windowRow(glass, lit, rand, [BAND_END + 1, s * (HALF + 0.02)], [BOAT_ZONES[0][0] - 1, s * (HALF + 0.02)], o, y0 + 1, y0 + 2.2, 2.6, 1.5, 0.4);
    white2.color(0xffffff);
  }
  // Inside, decks 6 and 7 are closed by the deck above; the bow part is the hull's own plating.
}

/** Centre-line position of each forward tier (decks 9 to 13 step back as they go up). */
export const TIER_NOSE = (n: number) => [322.8, 319.9, 316.9, 313.9, 311.3][n - 9];
export const TIER_SWEEP = 12;
/** Navigation bridge on deck 14: nose, aft edge of the wings, half-span of the wings. */
export const BRIDGE = { nose: 312.6, aft: 301.6, wing: 26.9, rake: 4.3 };

export const toCab = (c: number[]): Cab => ({ x0: c[1], x1: c[2], z0: c[3], z1: c[4] });

export function buildSuperstructure(parts: Parts): SuperInfo {
  const info: SuperInfo = { balconies: [] };
  lowerDecks(parts);
  const white = parts.get('white');
  const deckMat = parts.get('deck');


  // --- deck 8: the plan could not be aligned (it is drawn with the lifeboats), so it borrows
  // deck 9's shape. Above the boats its wall steps in and the cabins have windows, not balconies.
  const ring9 = smoothFront(deck(9).outline[0], TIER_NOSE(9), TIER_SWEEP);
  {
    const y = DECK_Y[8];
    const base = dedupe(clipX(ring9, BAND_END - 14, 300));
    // slab out to the full width, so it roofs the lifeboat recess
    white.color(0xffffff).slab(base, y - SLAB, y, [], undefined, false);
    deckMat.color(0x9aa9ae).poly(base, y, true);
    // where the hull itself is narrower (towards the bow) the slab must not stick out
    const wallRing: Pt[] = base.map(([X, z]) => {
      const lim = hullHalf(X, y) + 0.05;
      let zz = Math.sign(z) * Math.min(Math.abs(z), X > 262 ? lim : 99);
      if (inZone(X) && Math.abs(zz) > 15) zz -= Math.sign(zz) * 2.3;
      return [X, zz] as Pt;
    });
    cabinDeck(parts, info, 8, dedupe(wallRing), deck(9).cabins.map(toCab), { noBalcony: (X) => inZone(X) || X > 262 });
    // deck 9's floor reaches forward of this, over the open mooring deck: pillars hold it up
    for (const X of [304, 310, 316]) {
      const e = hullHalf(X, y) - 2.2;
      for (const s of [1, -1]) white.beam([sx(X), y, s * Math.min(e, 14)], [sx(X), DECK_Y[9] - SLAB, s * Math.min(e, 14)], 0.5, 0.5);
    }
  }

  // --- decks 9 to 13: from the plans, with the forward face swept clean
  for (let n = 9; n <= 13; n++) {
    const d = deck(n);
    const y = DECK_Y[n];
    const ring = smoothFront(d.outline[0], TIER_NOSE(n), TIER_SWEEP);
    white.color(0xffffff).slab(ring, y - SLAB - 0.2, y, [], undefined, false);
    deckMat.color(0x9aa9ae).poly(ring, y, true);
    cabinDeck(parts, info, n, ring, d.cabins.map(toCab), { frontFrom: TIER_NOSE(n) - TIER_SWEEP });
  }
  // the two raking white ladders that frame the middle of the forward face
  for (const s of [1, -1]) {
    white.color(0xffffff).beam([sx(TIER_NOSE(9) + 0.2), DECK_Y[9], s * (FRONT_BAY + 0.7)], [sx(TIER_NOSE(13) + 0.25), DECK_Y[14] - SLAB, s * (FRONT_BAY - 0.5)], 0.6, 0.3);
  }

  // --- deck 14: officers' cabins, then the navigation bridge, cantilevered ahead of the decks
  // below with its wings reaching out past the ship's sides
  {
    const d = deck(14);
    const y = DECK_Y[14];
    const body = dedupe(clipX(d.outline[0], -Infinity, BRIDGE.aft - 7.5));
    const n = body.length;
    let ring = body;
    for (let i = 0; i < n; i++) {
      const a = body[i];
      const b = body[(i + 1) % n];
      if (Math.abs(a[0] - (BRIDGE.aft - 7.5)) > 1e-6 || Math.abs(b[0] - (BRIDGE.aft - 7.5)) > 1e-6 || Math.abs(a[1] - b[1]) < 4) continue;
      const sgn = Math.sign(a[1]);
      const zs = Math.abs(a[1]);
      // the wings: straight leading edges raked back from the flat middle, square tips
      const lead = (z: number) => BRIDGE.nose - (z <= FRONT_FLAT ? 0.4 * (z / FRONT_FLAT) ** 2 : 0.4 + ((z - FRONT_FLAT) / (BRIDGE.wing - FRONT_FLAT)) * (BRIDGE.rake - 0.4));
      const half: Pt[] = [
        [BRIDGE.aft, zs],
        [BRIDGE.aft + 0.8, BRIDGE.wing],
        [lead(BRIDGE.wing), BRIDGE.wing],
      ];
      for (const z of [22, 17, FRONT_FLAT, FRONT_FLAT - FRONT_BAY, FRONT_FLAT - 2 * FRONT_BAY, 0]) half.push([lead(z), z]);
      const first = half.map(([X, z]) => [X, z * sgn] as Pt);
      const second = half
        .slice(0, -1)
        .reverse()
        .map(([X, z]) => [X, -z * sgn] as Pt);
      ring = [...body.slice(0, i + 1), ...first, ...second, ...body.slice(i + 1)];
      break;
    }
    white.color(0xffffff).slab(ring, y - SLAB - 0.25, y, [], undefined, false);
    deckMat.color(0x9aa9ae).poly(ring, y, true);
    cabinDeck(parts, info, 14, ring, d.cabins.map(toCab), { glassFrom: BRIDGE.aft - 0.2 });
    // the bridge roof: a white slab overhanging the glass all round
    const roof = dedupe(clipX(ring, BRIDGE.aft - 1, 400)).map(([X, z]) => [X + (X > BRIDGE.aft ? 0.8 : 0), z + Math.sign(z) * (Math.abs(z) > 22 ? 0.5 : 0)] as Pt);
    white.color(0xffffff).slab(roof, DECK_Y[15] - 0.1, DECK_Y[15] + 0.3);
    // struts under the wings
    for (const s of [1, -1]) {
      white.beam([sx(BRIDGE.nose - BRIDGE.rake - 3.4), y - 3.0, s * 21.4], [sx(BRIDGE.nose - BRIDGE.rake - 3.0), y - 0.5, s * (BRIDGE.wing - 1.6)], 0.28, 0.28);
    }
  }
  return info;
}
