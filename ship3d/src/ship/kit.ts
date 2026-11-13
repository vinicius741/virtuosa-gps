// Building blocks shared by the deck builders: outlines, glass screens, glazed walls, pools.
import { sx, type Pt } from '../core/data';
import type { Geo, Parts } from '../core/geo';

export const ringSign = (p: Pt[]) => p.reduce((a, q, i) => a + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0);

/** Rounded rectangle in ship X/Z. */
export function rrect(x0: number, x1: number, z0: number, z1: number, r = 0, seg = 5): Pt[] {
  r = Math.min(r, (x1 - x0) / 2, (z1 - z0) / 2);
  if (r <= 0.01)
    return [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ];
  const out: Pt[] = [];
  const corner = (cx: number, cz: number, a0: number) => {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
  };
  corner(x0 + r, z0 + r, Math.PI);
  corner(x1 - r, z0 + r, Math.PI * 1.5);
  corner(x1 - r, z1 - r, 0);
  corner(x0 + r, z1 - r, Math.PI / 2);
  return out;
}

export function circle(cx: number, cz: number, r: number, seg = 16): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
  }
  return out;
}

export interface Edge {
  p: Pt;
  q: Pt;
  /** unit normal pointing out of the ring */
  o: Pt;
  len: number;
}

/** Edges of a ring, optionally only the parts with xa ≤ X ≤ xb (and passing `keep`). */
export function edges(ring: Pt[], xa = -Infinity, xb = Infinity, keep?: (mid: Pt, o: Pt) => boolean): Edge[] {
  const out: Edge[] = [];
  const ccw = ringSign(ring) > 0;
  for (let i = 0; i < ring.length; i++) {
    let p = ring[i];
    let q = ring[(i + 1) % ring.length];
    const dx = q[0] - p[0];
    const dz = q[1] - p[1];
    const full = Math.hypot(dx, dz);
    if (full < 1e-4) continue;
    const o: Pt = ccw ? [dz / full, -dx / full] : [-dz / full, dx / full];
    // clip the segment to the X window
    let t0 = 0;
    let t1 = 1;
    if (Math.abs(dx) < 1e-9) {
      if (p[0] < xa || p[0] > xb) continue;
    } else {
      const ta = (xa - p[0]) / dx;
      const tb = (xb - p[0]) / dx;
      t0 = Math.max(0, Math.min(ta, tb));
      t1 = Math.min(1, Math.max(ta, tb));
      if (t1 - t0 <= 1e-6) continue;
    }
    const P: Pt = [p[0] + dx * t0, p[1] + dz * t0];
    const Q: Pt = [p[0] + dx * t1, p[1] + dz * t1];
    p = P;
    q = Q;
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len < 0.02) continue;
    if (keep && !keep([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], o)) continue;
    out.push({ p, q, o, len });
  }
  return out;
}

const shift = (p: Pt, o: Pt, d: number): Pt => [p[0] + o[0] * d, p[1] + o[1] * d];

/** Glass wind screen along an edge: clear panels between slim posts, with a top rail. */
export function screen(parts: Parts, e: Edge, y: number, h: number, tint = 0xffffff, inset = 0.08) {
  const p = shift(e.p, e.o, -inset);
  const q = shift(e.q, e.o, -inset);
  parts.get('rail').color(tint).wall(p, q, y + 0.05, y + h, e.o);
  const steel = parts.get('steel').color(0xdfe3e6);
  steel.beam([sx(p[0]), y + h, p[1]], [sx(q[0]), y + h, q[1]], 0.06, 0.05);
  const n = Math.max(1, Math.round(e.len / 2.2));
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const m: Pt = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    steel.beam([sx(m[0]), y, m[1]], [sx(m[0]), y + h, m[1]], 0.05, 0.05);
  }
}

/** A glazed wall: white sill and head, a band of dark glass between, slim white mullions. */
export function glassWall(
  parts: Parts,
  e: Edge,
  y0: number,
  y1: number,
  rand: () => number,
  o: { sill?: number; head?: number; pitch?: number; lit?: number; wall?: string; colour?: number; litColour?: number } = {},
) {
  const sill = o.sill ?? 0.7;
  const head = o.head ?? 0.35;
  const pitch = o.pitch ?? 2.2;
  const wall = parts.get(o.wall ?? 'white').color(o.colour ?? 0xffffff);
  wall.wall(e.p, e.q, y0, y1, e.o);
  if (e.len < 0.9) return;
  const g0 = shift(e.p, e.o, 0.04);
  const g1 = shift(e.q, e.o, 0.04);
  const margin = Math.min(0.25, e.len * 0.1) / e.len;
  const a: Pt = [g0[0] + (g1[0] - g0[0]) * margin, g0[1] + (g1[1] - g0[1]) * margin];
  const b: Pt = [g0[0] + (g1[0] - g0[0]) * (1 - margin), g0[1] + (g1[1] - g0[1]) * (1 - margin)];
  parts.get('glass').color(0xffffff).wall(a, b, y0 + sill, y1 - head, e.o);
  const n = Math.max(1, Math.round((e.len * (1 - 2 * margin)) / pitch));
  const m0 = shift(a, e.o, 0.03);
  const m1 = shift(b, e.o, 0.03);
  const mull = parts.get('white').color(0xf4f4f2);
  const lit = parts.get('lit');
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const m: Pt = [m0[0] + (m1[0] - m0[0]) * t, m0[1] + (m1[1] - m0[1]) * t];
    if (k > 0 && k < n) mull.beam([sx(m[0]), y0 + sill, m[1]], [sx(m[0]), y1 - head, m[1]], 0.07, 0.07);
    if (k < n && rand() < (o.lit ?? 0.6)) {
      const t1 = (k + 0.94) / n;
      const t0 = (k + 0.06) / n;
      lit.color(o.litColour ?? 0xffd09a, 0.3 + rand() * 0.5);
      lit.wall([m0[0] + (m1[0] - m0[0]) * t0, m0[1] + (m1[1] - m0[1]) * t0], [m0[0] + (m1[0] - m0[0]) * t1, m0[1] + (m1[1] - m0[1]) * t1], y0 + sill, y1 - head, e.o);
    }
  }
}

/** A plain painted wall with an optional row of windows. */
export function plainWall(parts: Parts, e: Edge, y0: number, y1: number, rand: () => number, o: { wall?: string; colour?: number; windows?: boolean; lit?: number } = {}) {
  parts
    .get(o.wall ?? 'white')
    .color(o.colour ?? 0xffffff)
    .wall(e.p, e.q, y0, y1, e.o);
  if (!o.windows || e.len < 2.4) return;
  const n = Math.floor(e.len / 2.6);
  const g = parts.get('glass').color(0xffffff);
  const lit = parts.get('lit');
  for (let k = 0; k < n; k++) {
    const c = (k + 0.5) / n;
    const h = 0.75 / e.len;
    const a = shift([e.p[0] + (e.q[0] - e.p[0]) * (c - h), e.p[1] + (e.q[1] - e.p[1]) * (c - h)], e.o, 0.035);
    const b = shift([e.p[0] + (e.q[0] - e.p[0]) * (c + h), e.p[1] + (e.q[1] - e.p[1]) * (c + h)], e.o, 0.035);
    g.wall(a, b, y0 + 0.95, y0 + 2.1, e.o);
    if (rand() < (o.lit ?? 0.4)) {
      lit.color(0xffd9a8, 0.4 + rand() * 0.5);
      lit.wall(shift(a, e.o, 0.02), shift(b, e.o, 0.02), y0 + 0.95, y0 + 2.1, e.o);
    }
  }
}

export interface Pool {
  ring: Pt[];
  /** height of the water surface */
  y: number;
  kind: 'pool' | 'whirl' | 'splash';
  deck: number;
  name: string;
  /** under a roof or open to the sky */
  open: boolean;
}

/**
 * A pool sunk into (or standing on) a deck: coping, tiled basin and the water surface.
 * `rim` lifts the edge above the deck, as whirlpool tubs have.
 */
export function pool(parts: Parts, pools: Pool[], ring: Pt[], yDeck: number, o: { rim?: number; depth?: number; kind?: Pool['kind']; deck: number; name: string; open?: boolean; coping?: number }) {
  const rim = o.rim ?? 0.12;
  const depth = o.depth ?? 1.3;
  const cw = o.coping ?? 0.45;
  const cx = ring.reduce((a, p) => a + p[0], 0) / ring.length;
  const cz = ring.reduce((a, p) => a + p[1], 0) / ring.length;
  const grow = (d: number): Pt[] =>
    ring.map(([x, z]) => {
      const l = Math.hypot(x - cx, z - cz) || 1;
      return [x + ((x - cx) / l) * d, z + ((z - cz) / l) * d] as Pt;
    });
  const outer = grow(cw);
  const white = parts.get('white').color(0xf2f0ea);
  // coping: a ring of pale stone around the water
  white.poly(outer, yDeck + rim, true, [ring]);
  white.ringWalls(outer, yDeck, yDeck + rim);
  // basin
  const tile = parts.get('tile').color(0xffffff);
  tile.ringWalls(ring, yDeck + rim - depth, yDeck + rim, true);
  tile.poly(ring, yDeck + rim - depth, true);
  const yw = yDeck + rim - 0.12;
  // water: vertex colour carries how much sky it sees
  parts
    .get('water')
    .color(o.open === false ? 0x808080 : 0xffffff)
    .poly(ring, yw, true, [], (x, z) => [x, z]);
  pools.push({ ring, y: yw, kind: o.kind ?? 'pool', deck: o.deck, name: o.name, open: o.open !== false });
}

/** A simple bar: a counter with a dark top and a back shelf, under whatever roof is above. */
export function barCounter(parts: Parts, x0: number, x1: number, z0: number, z1: number, y: number, colour = 0x6b4a32) {
  const g: Geo = parts.get('color').color(colour);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  g.box(sx(cx), y + 0.55, cz, x1 - x0, 1.1, z1 - z0);
  parts
    .get('dark')
    .color(0x1e2226)
    .box(sx(cx), y + 1.13, cz, x1 - x0 + 0.25, 0.07, z1 - z0 + 0.25);
}
