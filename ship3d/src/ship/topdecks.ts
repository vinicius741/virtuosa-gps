// Decks 15 to 19: the buffet, the pool court with its stage, the indoor pool under the sliding
// glass roof, the sports deck and amphitheatre, the kids' clubs, the aquapark and the Yacht Club.
// Positions come from the plans (pools, whirlpools, venues); what a plan cannot show (heights,
// which parts are open to the sky) is laid out here.
import { DECK_Y, bounds, deck, extent, inside, rng, rooms, sx, type Pt } from '../core/data';
import type { Parts } from '../core/geo';
import { barCounter, circle, edges, glassWall, plainWall, pool, rrect, screen, type Pool } from './kit';
import { FRONT_FLAT, SLAB, cabinDeck, clipX, dedupe, frontCurve, frontStations, smoothFront, toCab, type SuperInfo } from './superstructure';

export const Y15 = DECK_Y[15];
export const Y16 = DECK_Y[16];
export const Y18 = DECK_Y[18];
export const Y19 = DECK_Y[19];
export const Y20 = DECK_Y[20];

/** The open court around the main pool (deck 15), which deck 16 looks down into. */
export const COURT = { x0: 155.5, x1: 213.5, z: 16.2 };
/** The indoor pool hall under the sliding roof. */
export const HALL = { x0: 213.5, x1: 250, mez: 223 };
export const STAGE = { x0: 156, x1: 160.6, z: 8.2, h: 0.9 };
export const DANCE = { x0: 160.9, x1: 170.2, z: 8.2 };
/** Funnel casing on deck 19. */
export const CASING = { x0: 91, x1: 141, z: 11.5 };
export const AMPHI = { cx: 8, tiers: 8, r0: 9.5, step: 3.6, rise: 0.42 };

/** Where each upper deck ends at the bow: nose on the centre line, corners `sweep` further aft. */
export const FRONT: Record<number, { nose: number; sweep: number }> = {
  15: { nose: 311.2, sweep: 9.5 },
  // decks 16 and 18 share one raked face, from the foot of deck 16 to the screen of deck 19
  16: { nose: 310.2, sweep: 8.5 },
  18: { nose: 307.4, sweep: 5.7 },
  19: { nose: 304.6, sweep: 2.9 },
};

export interface Sunbed {
  x: number;
  z: number;
  y: number;
  rot: number;
  deck: number;
}
export interface Spot {
  x: number;
  z: number;
  y: number;
  /** direction the person faces: 0 = starboard (+z), PI/2 = the bow (+x) */
  rot: number;
}
export interface TopInfo {
  pools: Pool[];
  sunbeds: Sunbed[];
  /** places where people stand and chat: bars, rails with a view */
  standing: Spot[];
  /** amphitheatre seats */
  seats: Spot[];
  /** the walking track loop on deck 16, ship X/Z */
  track: Pt[];
  parasols: { x: number; z: number; y: number; colour: number }[];
  palms: { x: number; z: number; y: number; h: number }[];
  /** the big screen behind the stage: centre (scene), width, height */
  ledScreen: { x: number; y: number; z: number; w: number; h: number };
}

export function buildTopDecks(parts: Parts, sup: SuperInfo): TopInfo {
  const info: TopInfo = { pools: [], sunbeds: [], standing: [], seats: [], track: [], parasols: [], palms: [], ledScreen: { x: 0, y: 0, z: 0, w: 1, h: 1 } };
  const rand = rng(1519);
  const white = parts.get('white');
  const white2 = parts.get('white2');
  const teak = parts.get('teak');
  const deckG = parts.get('deck');
  const glass = parts.get('glass');
  const steel = parts.get('steel');
  const dark = parts.get('dark');
  const colour = parts.get('color');
  const glow = parts.get('glow');

  // forward ends: each deck a little further aft than the one below, all with a clean sweep
  const clampZ = (r: Pt[], lim: number, from: number) => r.map(([X, z]) => [X, X > from ? Math.sign(z) * Math.min(Math.abs(z), lim) : z] as Pt);
  const ring15 = smoothFront(clampZ(deck(15).outline[0], 21.45, 280), FRONT[15].nose, FRONT[15].sweep);
  const ring16 = smoothFront(clampZ(deck(16).outline[0], 21.45, 285), FRONT[16].nose, FRONT[16].sweep);
  const [raw18f, ring18a] = [...deck(18).outline].sort((a, b) => bounds(b).x1 - bounds(a).x1);
  const [raw19f, ring19a] = [...deck(19).outline].sort((a, b) => bounds(b).x1 - bounds(a).x1);
  const ring18f = smoothFront(clampZ(raw18f, 21.3, 280), FRONT[18].nose, FRONT[18].sweep);
  const ring19f = smoothFront(clampZ(raw19f, 21, 275), FRONT[19].nose, FRONT[19].sweep);
  const half = (n: number, X: number) => {
    const e = extent(n, X);
    return e ? Math.min(-e[0], e[1]) : 0;
  };

  // ------------------------------------------------------------------ deck 15
  {
    const y = Y15;
    const top = Y16 - SLAB;
    white.color(0xffffff).slab(ring15, y - SLAB, y, [], undefined, false);
    teak.color(0xffffff).poly(ring15, y, true);

    // aft terrace of the buffet: open sides under the deck above
    for (const e of edges(ring15, 0, 17)) screen(parts, e, y, 1.15);
    for (const X of [6, 11, 16]) for (const s of [1, -1]) white.beam([sx(X), y, s * (half(15, X) - 0.6)], [sx(X), top, s * (half(15, X) - 0.6)], 0.35, 0.35);
    // buffet: glass all round
    for (const e of edges(ring15, 17, 88)) glassWall(parts, e, y, top, rand, { sill: 0.55, head: 0.5, lit: 0.85 });
    white.wall([17, -half(15, 17)], [17, half(15, 17)], y, top, [-1, 0]);
    glass.color(0xffffff).wall([16.95, -18], [16.95, 18], y + 0.3, top - 0.4, [-1, 0]);
    // promenades and the pool court: tall glass wind screens
    for (const e of edges(ring15, 88, HALL.x0)) screen(parts, e, y, 2.3);

    // lifts and toilets: a white core in the middle
    const core = rrect(98, 135, -12.8, 12.8, 1.5);
    for (const e of edges(core)) plainWall(parts, e, y, top, rand, { windows: false });
    // bars facing the court
    barCounter(parts, 139, 150, -17.5, -15.6, y);
    barCounter(parts, 139, 150, 15.6, 17.5, y, 0xe9dccb);
    barCounter(parts, 205, 211, 12.5, 20, y);
    for (let i = 0; i < 9; i++) {
      info.standing.push({ x: 140 + i * 1.2, z: -14.6, y, rot: Math.PI });
      info.standing.push({ x: 140 + i * 1.2, z: 14.6, y, rot: 0 });
    }

    // stage with the big screen behind it, and the dance floor
    colour.color(0x23262b).box(sx((STAGE.x0 + STAGE.x1) / 2), y + STAGE.h / 2, 0, STAGE.x1 - STAGE.x0, STAGE.h, STAGE.z * 2);
    const sw = 15;
    const sh = 6.6;
    const sy = y + STAGE.h + 1.5 + sh / 2;
    dark.color(0x15181c).box(sx(STAGE.x0 + 0.25), sy, 0, 0.5, sh + 0.5, sw + 0.5);
    info.ledScreen = { x: sx(STAGE.x0 + 0.52), y: sy, z: 0, w: sw, h: sh };
    // truss over the stage with the lighting rig, on two towers
    for (const s of [1, -1]) {
      steel.color(0x8f969c).beam([sx(STAGE.x1 - 0.3), y, s * (STAGE.z + 0.4)], [sx(STAGE.x1 - 0.3), y + 9.2, s * (STAGE.z + 0.4)], 0.35, 0.35);
      dark.color(0x111316).box(sx(STAGE.x0 + 1.2), y + STAGE.h + 1.3, s * (STAGE.z - 0.9), 1.1, 2.6, 1.3);
    }
    steel.color(0x8f969c).beam([sx(STAGE.x1 - 0.3), y + 9.0, -STAGE.z - 0.4], [sx(STAGE.x1 - 0.3), y + 9.0, STAGE.z + 0.4], 0.4, 0.4);
    // dance floor: a chequer of lit tiles
    const tiles = 8;
    const tw = (DANCE.x1 - DANCE.x0) / tiles;
    const tz = (DANCE.z * 2) / 14;
    const palette = [0xff3d81, 0x29d3ff, 0xffd23d, 0x8a5cff, 0x3dffa2];
    for (let i = 0; i < tiles; i++) {
      for (let j = 0; j < 14; j++) {
        glow.color(palette[(i * 3 + j * 5 + Math.floor(rand() * 2)) % palette.length], 0.34);
        glow.box(sx(DANCE.x0 + (i + 0.5) * tw), y + 0.025, -DANCE.z + (j + 0.5) * tz, tw - 0.08, 0.05, tz - 0.08, 0, 4);
      }
    }

    // the main pool on its raised platform
    const plat = rrect(171, 205.5, -7.6, 7.6, 1.2);
    white.color(0xf2f0ea).slab(plat, y, y + 0.45, [], undefined, false);
    const poolRing = rrect(174, 202.5, -4.7, 4.7, 1.6, 6);
    teak.color(0xffffff).poly(plat, y + 0.45, true, [poolRing.map(([x, z]) => [x + Math.sign(x - 188.25) * 0.45, z + Math.sign(z) * 0.45] as Pt)]);
    pool(parts, info.pools, poolRing, y + 0.45, { deck: 15, name: 'Atmosphere Pool', depth: 1.5 });
    // whirlpools named on the plan
    for (const r of rooms(15, /Hidromassagem/)) {
      const b = bounds(r.p);
      const inHall = b.cx > HALL.x0;
      pool(parts, info.pools, circle(b.cx, b.cz, Math.min(2.1, Math.max(1.4, (b.x1 - b.x0) / 2 + 0.2)), 14), y, { rim: 0.75, depth: 0.9, kind: 'whirl', deck: 15, name: 'whirlpool', open: !inHall && Math.abs(b.cz) < COURT.z });
    }

    // --- indoor pool hall: two decks high behind glass, the plan's Tropical Pool in the middle
    for (const e of edges(ring15, HALL.x0, HALL.x1)) glassWall(parts, e, y, Y18 - 0.3, rand, { sill: 0.5, head: 0.4, pitch: 2.6, lit: 0.9, litColour: 0xbfe9ff });
    const hz = half(15, HALL.x0 + 1) - 0.1;
    screen(parts, { p: [HALL.x0, -hz], q: [HALL.x0, hz], o: [-1, 0], len: hz * 2 }, y, top - y, 0xffffff, 0);
    const tp = rooms(15, /Tropical Pool/)[0];
    const tb = bounds(tp.p);
    pool(parts, info.pools, rrect(tb.x0 - 1, tb.x1 + 1, -4.3, 4.3, 1.8, 6), y, { deck: 15, name: 'Tropical Pool', open: false });
    for (const [px, pz] of [
      [228, -7.5],
      [228, 7.5],
      [244.5, -7.5],
      [244.5, 7.5],
      [236, -12.5],
      [236, 12.5],
    ])
      info.palms.push({ x: px, z: pz, y, h: 4.6 + rand() * 1.2 });

    // --- forward: suites with balconies, and the open wings above the bridge
    const house = dedupe(clipX(ring15, HALL.x1, 400));
    cabinDeck(parts, sup, 15, house, deck(15).cabins.map(toCab), { glassFrom: FRONT[15].nose - FRONT[15].sweep });

    // sunbeds round the pool, facing it
    for (let X = 172.5; X < 205; X += 1.95) {
      for (const z of [11.5, 13.8]) {
        for (const s of [1, -1]) info.sunbeds.push({ x: X, z: s * z, y, rot: s > 0 ? Math.PI : 0, deck: 15 });
      }
    }
    for (let X = 227.5; X < 246; X += 2.1) for (const s of [1, -1]) info.sunbeds.push({ x: X, z: s * 17.6, y, rot: s > 0 ? Math.PI : 0, deck: 15 });
  }

  // ------------------------------------------------------------------ deck 16
  {
    const y = Y16;
    const top = Y18 - SLAB;
    const courtVoid = rrect(COURT.x0, COURT.x1, -COURT.z, COURT.z, 3);
    const hallVoid = rrect(HALL.mez + 3.5, HALL.x1 - 4, -10.5, 10.5, 2.5);
    white.color(0xffffff).slab(ring16, y - SLAB, y, [courtVoid, hallVoid], undefined, false);
    teak.color(0xffffff).poly(ring16, y, true, [courtVoid, hallVoid]);
    // rails round the two openings
    for (const e of edges(courtVoid)) screen(parts, { ...e, o: [-e.o[0], -e.o[1]] }, y, 1.2, 0xffffff, 0);
    for (const e of edges(hallVoid)) screen(parts, { ...e, o: [-e.o[0], -e.o[1]] }, y, 1.2, 0xffffff, 0);
    // outer edge: glass all the way round the open parts
    for (const e of edges(ring16, 0, 14)) screen(parts, e, y, 1.3);
    for (const e of edges(ring16, 14, HALL.mez)) screen(parts, e, y, 2.3);
    // the hall's upper level is closed by the deck-15 glass wall; here, its aft partition
    const hz = half(15, HALL.mez) - 0.1;
    screen(parts, { p: [HALL.mez, -hz], q: [HALL.mez, hz], o: [-1, 0], len: hz * 2 }, y, top - y, 0xffffff, 0);

    // sports and entertainment block, with the gym at its forward end
    const block = rrect(52, 141.4, -17.6, 17.6, 3);
    for (const e of edges(block)) glassWall(parts, e, y, top, rand, { sill: 0.9, head: 0.5, pitch: 2.4, lit: 0.7, litColour: e.p[0] > 90 ? 0xd9ecff : 0xffd09a });
    // power walking track around it
    const trackOuter = rrect(48.5, 145, -21, 21, 6, 8);
    const trackInner = rrect(50.8, 142.7, -18.7, 18.7, 4, 8);
    parts
      .get('court')
      .color(0xc8603a)
      .poly(trackOuter, y + 0.02, true, [trackInner]);
    info.track = rrect(49.7, 143.8, -19.85, 19.85, 5, 8);

    // amphitheatre: stepped seating rising towards the bow, looking aft over the Horizon Pool
    for (let k = 0; k < AMPHI.tiers; k++) {
      const r0 = AMPHI.r0 + k * AMPHI.step;
      const r1 = r0 + AMPHI.step;
      const yk = y + (k + 1) * AMPHI.rise;
      const arc = (r: number): Pt[] => {
        const pts: Pt[] = [];
        for (let i = 0; i <= 20; i++) {
          const a = -1.25 + (i / 20) * 2.5;
          const X = AMPHI.cx + Math.cos(a) * r;
          const z = Math.sin(a) * r;
          pts.push([X, Math.max(-17.8, Math.min(17.8, z))]);
        }
        return pts;
      };
      const inner = arc(r0);
      const outer = arc(r1).reverse();
      const tier = dedupe([...inner, ...outer]);
      teak.color(0xffffff).poly(tier, yk, true);
      white.color(0xeeeeea);
      for (let i = 0; i < inner.length - 1; i++) white.quad([sx(inner[i][0]), yk - AMPHI.rise, inner[i][1]], [sx(inner[i + 1][0]), yk - AMPHI.rise, inner[i + 1][1]], [sx(inner[i + 1][0]), yk, inner[i + 1][1]], [sx(inner[i][0]), yk, inner[i][1]], [-1, 0, 0]);
      // seats along each tier
      const seats = Math.floor((r0 * 2.3) / 1.1);
      for (let i = 0; i < seats; i++) {
        const a = -1.15 + ((i + 0.5) / seats) * 2.3;
        const X = AMPHI.cx + Math.cos(a) * (r0 + 1.4);
        const z = Math.sin(a) * (r0 + 1.4);
        if (Math.abs(z) > 17) continue;
        info.seats.push({ x: X, z, y: yk, rot: Math.atan2(AMPHI.cx - X, -z) });
      }
    }
    // Horizon Pool at the very stern
    const hp = rooms(16, /Horizon Pool/)[0];
    const hb = bounds(hp.p);
    pool(parts, info.pools, rrect(hb.x0 - 0.5, hb.x1 + 0.6, hb.z0 - 2.4, hb.z1 + 2.4, 1.2), y, { deck: 16, name: 'Horizon Pool' });
    for (const r of rooms(16, /Hidromassagem/)) {
      const b = bounds(r.p);
      pool(parts, info.pools, circle(b.cx, b.cz - Math.sign(b.cz) * 0.4, 1.5, 12), y, { rim: 0.75, depth: 0.9, kind: 'whirl', deck: 16, name: 'whirlpool' });
    }

    // Yacht Club: suites with balconies, the Top Sail Lounge behind glass at the front
    const house = dedupe(clipX(ring16, HALL.x1, 400));
    cabinDeck(parts, sup, 16, house, deck(16).cabins.map(toCab), { openFrom: FRONT[16].nose - FRONT[16].sweep });

    // sunbeds on the gallery round the court, looking down at the pool
    for (let X = 158; X < 212; X += 1.95) {
      for (const z of [18.7, 20.5]) for (const s of [1, -1]) if (half(16, X) > z + 1.0) info.sunbeds.push({ x: X, z: s * z, y, rot: s > 0 ? Math.PI : 0, deck: 16 });
    }
    for (let z = -14; z <= 14; z += 1.95) {
      info.sunbeds.push({ x: 146.6, z, y, rot: Math.PI / 2, deck: 16 });
      info.sunbeds.push({ x: 221.4, z, y, rot: -Math.PI / 2, deck: 16 });
    }
    for (let z = -16; z <= 16; z += 2.05) if (Math.abs(z) > 8) info.sunbeds.push({ x: 12.4, z, y, rot: -Math.PI / 2, deck: 16 });
    for (let i = 0; i < 12; i++) info.standing.push({ x: 1.2, z: -15 + i * 2.7, y, rot: -Math.PI / 2 });
  }

  // ------------------------------------------------------------------ deck 18
  {
    const y = Y18;
    const top = Y19 - SLAB;
    // aft island: sun terraces round the amphitheatre opening, kids' clubs, lounges
    const voidA = rrect(Math.max(bounds(ring18a).x0 + 1.1, 18.6), 41.5, -12.6, 12.6, 6, 6);
    white.color(0xffffff).slab(ring18a, y - SLAB, y, [voidA], undefined, false);
    teak.color(0xffffff).poly(ring18a, y, true, [voidA]);
    for (const e of edges(voidA)) screen(parts, { ...e, o: [-e.o[0], -e.o[1]] }, y, 1.2, 0xffffff, 0);
    for (const e of edges(ring18a)) screen(parts, e, y, 2.0);
    // kids' clubs: bright panels and round windows
    const kids = rrect(46.5, 93, -17, 17.2, 2.5);
    const kidColours = [0xffc928, 0xf2622e, 0x2e9bf2, 0x56b948, 0xe94f8a, 0xffffff];
    for (const e of edges(kids)) {
      const n = Math.max(1, Math.round(e.len / 3.4));
      for (let k = 0; k < n; k++) {
        const a: Pt = [e.p[0] + ((e.q[0] - e.p[0]) * k) / n, e.p[1] + ((e.q[1] - e.p[1]) * k) / n];
        const b: Pt = [e.p[0] + ((e.q[0] - e.p[0]) * (k + 1)) / n, e.p[1] + ((e.q[1] - e.p[1]) * (k + 1)) / n];
        colour.color(kidColours[Math.floor(rand() * kidColours.length)]).wall(a, b, y, top, e.o);
        const m: Pt = [(a[0] + b[0]) / 2 + e.o[0] * 0.04, (a[1] + b[1]) / 2 + e.o[1] * 0.04];
        const t: Pt = [(b[0] - a[0]) / (e.len / n), (b[1] - a[1]) / (e.len / n)];
        glass.color(0xffffff).wall([m[0] - t[0] * 0.7, m[1] - t[1] * 0.7], [m[0] + t[0] * 0.7, m[1] + t[1] * 0.7], y + 1.0, y + 2.3, e.o);
      }
    }
    const lounge = rrect(93, bounds(ring18a).x1 - 1.6, -19.4, 19.4, 4);
    for (const e of edges(lounge)) glassWall(parts, e, y, top, rand, { sill: 0.4, head: 0.4, pitch: 2.4, lit: 0.8, litColour: 0xc9a8ff });
    for (const r of rooms(18, /Hidromassagem/)) {
      const b = bounds(r.p);
      pool(parts, info.pools, circle(b.cx, b.cz, 1.5, 12), y, { rim: 0.75, depth: 0.9, kind: 'whirl', deck: 18, name: 'whirlpool' });
    }
    barCounter(parts, 43, 45.6, -9, -3, y);
    for (let i = 0; i < 5; i++) info.standing.push({ x: 42.2, z: -8.6 + i * 1.3, y, rot: Math.PI / 2 });
    // sunbeds on the terraces
    const b18 = bounds(ring18a);
    for (let X = b18.x0 + 3; X < 44; X += 1.95) for (const z of [16.0, 18.2]) for (const s of [1, -1]) if (half(18, X) > z + 1.3) info.sunbeds.push({ x: X, z: s * z, y, rot: -Math.PI / 2, deck: 18 });
    for (let X = 48; X < 92; X += 1.95) for (const s of [1, -1]) if (half(18, X) > 20.9) info.sunbeds.push({ x: X, z: s * 19.8, y, rot: s > 0 ? 0 : Math.PI, deck: 18 });
    for (let i = 0; i < 6; i++) info.parasols.push({ x: b18.x0 + 5 + i * 3.6, z: (i % 2 ? 1 : -1) * 16.4, y, colour: [0xffffff, 0x2a67c9, 0xf2a22e][i % 3] });

    // forward island: the pool hall's sliding glass roof, then the Yacht Club
    const roofRing = dedupe(clipX(ring15, HALL.mez, HALL.x1));
    const rb = bounds(roofRing);
    const zmax = Math.min(-rb.z0, rb.z1) - 0.2;
    const arch = (z: number) => y + 0.25 + 2.0 * Math.cos(((z / zmax) * Math.PI) / 2);
    const NZ = 10;
    const railG = parts.get('rail').color(0xffffff);
    for (let i = 0; i < NZ; i++) {
      const z0 = -zmax + (i / NZ) * 2 * zmax;
      const z1 = -zmax + ((i + 1) / NZ) * 2 * zmax;
      railG.quad([sx(rb.x0), arch(z0), z0], [sx(rb.x1), arch(z0), z0], [sx(rb.x1), arch(z1), z1], [sx(rb.x0), arch(z1), z1], [0, 1, 0]);
      // ribs
      for (let X = rb.x0; X <= rb.x1 + 0.01; X += (rb.x1 - rb.x0) / 9) white.color(0xf4f4f2).beam([sx(X), arch(z0), z0], [sx(X), arch(z1), z1], 0.16, 0.22);
    }
    for (const z of [-zmax, -zmax * 0.5, 0, zmax * 0.5, zmax]) white.beam([sx(rb.x0), arch(z), z], [sx(rb.x1), arch(z), z], 0.2, 0.2);
    // gable ends of the roof
    for (const X of [rb.x0, rb.x1]) {
      for (let i = 0; i < NZ; i++) {
        const z0 = -zmax + (i / NZ) * 2 * zmax;
        const z1 = -zmax + ((i + 1) / NZ) * 2 * zmax;
        railG.quad([sx(X), y - 0.3, z0], [sx(X), y - 0.3, z1], [sx(X), arch(z1), z1], [sx(X), arch(z0), z0]);
      }
    }
    const yc = dedupe(clipX(ring18f, HALL.x1, 400));
    white.color(0xffffff).slab(yc, y - SLAB, y, [], undefined, false);
    teak.color(0xffffff).poly(yc, y, true);
    cabinDeck(parts, sup, 18, yc, deck(18).cabins.map(toCab), { openFrom: FRONT[18].nose - FRONT[18].sweep });

    // the raked face of decks 16 and 18: white, with one great pane in the middle (the lounge
    // and the restaurant above it) and smaller ones towards the corners
    const zm = 21.3;
    const foot = frontCurve(FRONT[16].nose, FRONT[16].sweep, zm);
    const head = frontCurve(FRONT[19].nose, FRONT[19].sweep, zm);
    const yTop = Y19 + 0.36;
    const at = (z: number, v: number): [number, number, number] => [sx(foot(z) + (head(z) - foot(z)) * v), Y16 - SLAB + (yTop - Y16 + SLAB) * v, z];
    const zs = frontStations(zm, 6);
    const lit = parts.get('lit');
    for (let i = 0; i < zs.length - 1; i++) {
      const z0 = zs[i];
      const z1 = zs[i + 1];
      const mid = Math.abs((z0 + z1) / 2);
      white.color(0xffffff).quad(at(z0, 0), at(z1, 0), at(z1, 1), at(z0, 1), [1, 0.5, 0]);
      // one great pane across the four middle bays, smaller ones in the bay either side
      const big = mid < FRONT_FLAT - (FRONT_FLAT * 2) / 6;
      const rows = big ? [[0.14, 0.47], [0.53, 0.86]] : mid < FRONT_FLAT ? [[0.2, 0.42], [0.6, 0.82]] : [];
      const g = big ? 0.06 : 0.55;
      // lift the panes off the face along its own normal (round the corners it faces sideways)
      const a0 = at(z0, 0);
      const a1 = at(z1, 0);
      const a2 = at(z0, 1);
      const u = [a1[0] - a0[0], a1[1] - a0[1], a1[2] - a0[2]];
      const w = [a2[0] - a0[0], a2[1] - a0[1], a2[2] - a0[2]];
      let nx = u[1] * w[2] - u[2] * w[1];
      let ny = u[2] * w[0] - u[0] * w[2];
      let nz = u[0] * w[1] - u[1] * w[0];
      const nl = Math.hypot(nx, ny, nz) * (nx < 0 ? -1 : 1);
      nx /= nl;
      ny /= nl;
      nz /= nl;
      const lift = (p: [number, number, number], d: number): [number, number, number] => [p[0] + nx * d, p[1] + ny * d, p[2] + nz * d];
      for (const [v0, v1] of rows) {
        const q = [at(z0 + g, v0), at(z1 - g, v0), at(z1 - g, v1), at(z0 + g, v1)];
        glass.color(0xffffff).quad(lift(q[0], 0.06), lift(q[1], 0.06), lift(q[2], 0.06), lift(q[3], 0.06), [nx, ny, nz]);
        if (rand() < 0.75) {
          lit.color(0xffd9a8, 0.3 + rand() * 0.4);
          lit.quad(lift(q[0], 0.09), lift(q[1], 0.09), lift(q[2], 0.09), lift(q[3], 0.09), [nx, ny, nz]);
        }
      }
    }
  }

  // ------------------------------------------------------------------ deck 19
  {
    const y = Y19;
    const top = Y20 - SLAB;
    // aft island: ropes course, aquapark, the funnel casing, the solarium
    white.color(0xffffff).slab(ring19a, y - SLAB, y, [], undefined, false);
    const b = bounds(ring19a);
    const park = dedupe(clipX(ring19a, b.x0, 90));
    deckG.color(0x6fb6d6).poly(park, y, true);
    teak.color(0xffffff).poly(dedupe(clipX(ring19a, 90, 400)), y, true);
    for (const e of edges(ring19a)) screen(parts, e, y, 2.2);
    const casing = rrect(CASING.x0, CASING.x1, -CASING.z, CASING.z, 2.5);
    for (const e of edges(casing)) plainWall(parts, e, y, Y20, rand, { windows: false });
    white.color(0xffffff).slab(casing, Y20 - 0.01, Y20 + 0.25);
    // bar by the aquapark
    const bar = rooms(19, /Savannah Bar/)[0];
    if (bar) {
      const bb = bounds(bar.p);
      barCounter(parts, bb.x0 + 6, bb.x1 - 2, bb.z0 + 2.5, bb.z0 + 4.2, y, 0xb9824a);
      white2.color(0xf2d9a0).box(sx((bb.x0 + bb.x1) / 2 + 2), y + 3.1, bb.cz - 1, bb.x1 - bb.x0 - 4, 0.16, 7);
      for (const dx of [-5, 5]) for (const dz of [-3, 3]) steel.color(0xcfd4d8).beam([sx(bb.cx + 2 + dx), y, bb.cz - 1 + dz], [sx(bb.cx + 2 + dx), y + 3.1, bb.cz - 1 + dz], 0.14, 0.14);
      for (let i = 0; i < 6; i++) info.standing.push({ x: bb.x0 + 6.5 + i * 1.4, z: bb.z0 + 1.6, y, rot: 0 });
    }
    // splash pool where the slides end, and a paddling pool for the small ones
    pool(parts, info.pools, rrect(63, 73, 13.2, 18.4, 2), y, { deck: 19, name: 'splash pool', kind: 'splash', depth: 0.7 });
    pool(parts, info.pools, circle(52, -8.5, 4.2, 18), y, { deck: 19, name: 'paddling pool', kind: 'splash', depth: 0.35, rim: 0.08 });
    // sunbeds of the solarium, beside the funnel
    for (let X = 93; X < 144; X += 1.95) for (const z of [14.7, 16.9]) for (const s of [1, -1]) if (half(19, X) > z + 1.2 && inside(ring19a, X, s * z)) info.sunbeds.push({ x: X, z: s * z, y, rot: s > 0 ? 0 : Math.PI, deck: 19 });
    for (let i = 0; i < 5; i++) info.parasols.push({ x: 76 + i * 3.1, z: -15.5, y, colour: [0xf2c230, 0xffffff][i % 2] });
    for (let i = 0; i < 10; i++) info.standing.push({ x: 50 + i * 3.3, z: -(half(19, 50 + i * 3.3) - 0.9), y, rot: Math.PI });

    // forward island: the Yacht Club's own sun deck and pool
    white.color(0xffffff).slab(ring19f, y - SLAB, y, [], undefined, false);
    teak.color(0xffffff).poly(ring19f, y, true);
    for (const e of edges(ring19f)) {
      const fwd = Math.min(e.p[0], e.q[0]) > FRONT[19].nose - FRONT[19].sweep - 1e-3;
      if (fwd) {
        // the dark wind break that crowns the forward face
        glass.color(0xffffff).wall(e.p, e.q, y + 0.35, y + 2.5, e.o);
        white.color(0xffffff).wall(e.p, e.q, y - SLAB, y + 0.35, e.o);
        white.beam([sx(e.p[0]), y + 2.56, e.p[1]], [sx(e.q[0]), y + 2.56, e.q[1]], 0.16, 0.12);
        parts.get('white2').color(0xdfe6ea).wall([e.p[0] - e.o[0] * 0.05, e.p[1] - e.o[1] * 0.05], [e.q[0] - e.o[0] * 0.05, e.q[1] - e.o[1] * 0.05], y, y + 2.5, [-e.o[0], -e.o[1]]);
      } else screen(parts, e, y, 2.0);
    }
    const fb = bounds(ring19f);
    const yhouse = rrect(fb.x0 + 0.6, 268.5, -10.8, 10.8, 2);
    for (const e of edges(yhouse)) glassWall(parts, e, y, top, rand, { sill: 0.5, head: 0.4, lit: 0.8 });
    white.color(0xffffff).slab(rrect(fb.x0 + 0.2, 269, -11.4, 11.4, 2.4), top, Y20);
    // grill under a canopy
    white2.color(0xffffff).box(sx(276.5), y + 3.0, -13.5, 14, 0.18, 9);
    for (const dx of [-6.5, 0, 6.5]) for (const dz of [-4, 4]) steel.color(0xcfd4d8).beam([sx(276.5 + dx), y, -13.5 + dz], [sx(276.5 + dx), y + 3.0, -13.5 + dz], 0.14, 0.14);
    barCounter(parts, 271, 281, -14.2, -12.8, y, 0x3a4652);
    for (let i = 0; i < 6; i++) info.standing.push({ x: 272 + i * 1.5, z: -11.8, y, rot: Math.PI });
    const ycp = rooms(19, /Yacht Club Pool/)[0];
    const pb = ycp ? bounds(ycp.p) : { x0: 282, x1: 293, z0: 2.4, z1: 12.8, cx: 287.5, cz: 7.6 };
    pool(parts, info.pools, rrect(pb.x0 + 0.5, pb.x1 - 0.5, pb.z0 + 1, pb.z1 - 1, 1.6), y, { deck: 19, name: 'Yacht Club Pool' });
    for (const r of rooms(19, /Whirlpool/)) {
      const wb = bounds(r.p);
      if (wb.cx > pb.x0 - 3 && wb.cx < pb.x1 && wb.cz > pb.z0 && wb.cz < pb.z1) continue; // the one drawn inside the pool
      pool(parts, info.pools, circle(wb.cx, wb.cz, 1.7, 12), y, { rim: 0.75, depth: 0.9, kind: 'whirl', deck: 19, name: 'whirlpool' });
    }
    for (let X = 271; X < 298; X += 2.0) {
      for (const z of [-4.5, -7.2]) if (X > 284 && inside(ring19f, X, z - 1.5)) info.sunbeds.push({ x: X, z, y, rot: 0, deck: 19 });
      if (inside(ring19f, X, 18.2) && half(19, X) > 19.4) info.sunbeds.push({ x: X, z: 16.6, y, rot: 0, deck: 19 });
    }
    for (let i = 0; i < 4; i++) info.parasols.push({ x: 286 + i * 3.2, z: -11.5, y, colour: 0xffffff });
    for (let i = 0; i < 9; i++) {
      const z = -14 + i * 3.5;
      const e = extent(19, 297);
      if (e && z > e[0] + 1 && z < e[1] - 1) info.standing.push({ x: FRONT[19].nose - 1.5 - (Math.abs(z) > 9.5 ? (Math.abs(z) - 9.5) * 0.5 : 0), z, y, rot: Math.PI / 2 });
    }
  }
  // no sunbed where a whirlpool or a pool already is
  const taken = info.pools.map((p) => {
    const b = bounds(p.ring);
    return { x: b.cx, z: b.cz, r: Math.max(b.x1 - b.x0, b.z1 - b.z0) / 2 + 1.5 };
  });
  info.sunbeds = info.sunbeds.filter((b) => !taken.some((t) => Math.hypot(t.x - b.x, t.z - b.z) < t.r));
  return info;
}
