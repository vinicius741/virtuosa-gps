// Turns the redrawn deck plans (plantas/export/deck-N.json + public/plantas/rotas.json) into the
// data the 3D ship is built from: deck outlines in metres, pools and venues of the open decks,
// balcony cabins and walking paths on the real corridors.
//
//   node ship3d/scripts/extract-plans.mjs        -> ship3d/src/data/ship.json
//
// Ship coordinates: X = metres from the stern (aft face of the ship) towards the bow,
// Z = metres from the centre line, positive to starboard. Heights are added by the 3D code.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DECKS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19];

// Every plan was traced from an image with its own scale and crop, so each deck needs its own
// pixels-per-metre (k) and the position of its aft end (stern, metres). Decks 9 to 14 are solved
// from the corners of the two recessed balcony bays, which are the same on all of them; the
// others come from the lift and stair cores, which run straight through the ship.
const ALIGN = {
  5: { k: 11.6, stern: 2 },
  6: { k: 11.6, stern: 2 },
  // decks 7 and 8 are drawn with the lifeboats, which hang outside the hull
  7: { k: 11.03, stern: 0 },
  8: { k: 10.85, stern: 0 },
  15: { k: 11.28, stern: 3 },
  16: { k: 11.44, stern: 0 },
  18: { k: 12.17, stern: 17.1 },
  19: { k: 12.57, stern: 29.6 },
};
/** Bay corners (metres from the stern) that decks 9 to 14 are fitted to. */
const BAYS = [43.68, 86.66, 168.74, 233.44];
/** The plans come out about 1 % short of the real 331 m; stretch X to match. */
const STRETCH = 1.012;
const BEAM = 43;

const r2 = (v) => Math.round(v * 100) / 100;

function load(n) {
  const d = JSON.parse(readFileSync(`${ROOT}plantas/export/deck-${n}.json`, 'utf8'));
  d.hulls = typeof d.hull[0][0] === 'number' ? [d.hull] : d.hull;
  return d;
}

/** Leftmost and rightmost crossing of the outline at plan row y. */
function span(polys, y) {
  let mn = Infinity;
  let mx = -Infinity;
  for (const p of polys) {
    for (let i = 0; i < p.length; i++) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const x = a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
        mn = Math.min(mn, x);
        mx = Math.max(mx, x);
      }
    }
  }
  return mx > mn ? [mn, mx] : null;
}

/** Scale and stern of a balcony deck, from where its width steps in and out at the two bays. */
function alignByBays(d) {
  const prof = [];
  for (let s = 1; s < d.h; s += 1) {
    const sp = span(d.hulls, d.h - s);
    prof.push(sp ? sp[1] - sp[0] : 0);
  }
  const sorted = prof.filter((w) => w > 0).sort((a, b) => a - b);
  const wide = sorted[Math.floor(sorted.length * 0.6)];
  const mid = wide * 0.84; // between the wide blocks and the recessed bays
  const cross = [];
  for (let i = 300; i < prof.length - 300; i++) {
    if ((prof[i - 1] - mid) * (prof[i] - mid) < 0 || (prof[i - 1] === mid && prof[i] !== mid)) {
      if (!cross.length || i - cross[cross.length - 1] > 150) cross.push(i);
    }
  }
  if (cross.length !== 4) throw new Error(`deck ${d.deck}: expected 4 bay corners, got ${cross.join(',')}`);
  if (process.env.DEBUG_BAYS) console.log(d.deck, cross, wide);
  // least squares: BAYS[i] = stern + cross[i] / k
  const n = 4;
  const sx = cross.reduce((a, b) => a + b, 0);
  const sy = BAYS.reduce((a, b) => a + b, 0);
  const sxx = cross.reduce((a, b) => a + b * b, 0);
  const sxy = cross.reduce((a, b, i) => a + b * BAYS[i], 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return { k: 1 / slope, stern: (sy - slope * sx) / n, wide };
}

// ---------------------------------------------------------------- geometry helpers
function simplify(pts, eps) {
  // Ramer-Douglas-Peucker on a closed ring
  if (pts.length < 5) return pts;
  const keep = new Uint8Array(pts.length);
  const rdp = (a, b) => {
    let best = -1;
    let bd = eps;
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) {
      const dist = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (dist > bd) {
        bd = dist;
        best = i;
      }
    }
    if (best > 0) {
      keep[best] = 1;
      rdp(a, best);
      rdp(best, b);
    }
  };
  // split the ring at its two farthest-apart points
  let far = 0;
  let fd = 0;
  for (let i = 1; i < pts.length; i++) {
    const dd = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (dd > fd) {
      fd = dd;
      far = i;
    }
  }
  keep[0] = keep[far] = 1;
  rdp(0, far);
  const ring = pts.concat([pts[0]]);
  const save = pts;
  pts = ring;
  const keep2 = keep;
  rdp(far, ring.length - 1);
  pts = save;
  return pts.filter((_, i) => keep2[i]);
}

const area = (p) => {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
};

const inside = (p, x, y) => {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if (p[i][1] > y !== p[j][1] > y && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
  }
  return c;
};

// ---------------------------------------------------------------- walking paths
function grid(dr) {
  const n = dr.cols * dr.rows;
  const g = new Uint8Array(n);
  let i = 0;
  for (const r of dr.g) {
    const v = r % 5;
    const end = i + Math.floor(r / 5);
    if (v) g.fill(v, i, end);
    i = end;
  }
  return g;
}

/** A* over the walkable cells, keeping to the middle of corridors. */
function pathfinder(dr, g) {
  const { cols, rows } = dr;
  const n = cols * rows;
  const walk = (c) => g[c] === 1 || g[c] === 2;
  const clear = new Uint8Array(n);
  let m = new Uint8Array(n);
  for (let c = 0; c < n; c++) m[c] = walk(c) ? 1 : 0;
  for (let p = 0; p < 4; p++) {
    const e = new Uint8Array(n);
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const c = y * cols + x;
        if (!m[c]) continue;
        if (m[c - 1] && m[c + 1] && m[c - cols] && m[c + cols] && m[c - cols - 1] && m[c - cols + 1] && m[c + cols - 1] && m[c + cols + 1]) {
          e[c] = 1;
          clear[c]++;
        }
      }
    }
    m = e;
  }
  const dist = new Float32Array(n);
  const prev = new Int32Array(n);
  const hd = new Float32Array(n * 8);
  const hc = new Int32Array(n * 8);
  /** Dijkstra flood from one cell; `to(cell)` then walks back along the cheapest path. */
  const flood = (from) => {
    dist.fill(Infinity);
    prev.fill(-1);
    let size = 0;
    const push = (dd, c) => {
      let i = size++;
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
    const pop = () => {
      const c = hc[0];
      size--;
      if (size > 0) {
        const ld = hd[size];
        const lc = hc[size];
        let i = 0;
        for (;;) {
          let l = 2 * i + 1;
          if (l >= size) break;
          if (l + 1 < size && hd[l + 1] < hd[l]) l++;
          if (hd[l] >= ld) break;
          hd[i] = hd[l];
          hc[i] = hc[l];
          i = l;
        }
        hd[i] = ld;
        hc[i] = lc;
      }
      return c;
    };
    dist[from] = 0;
    push(0, from);
    while (size > 0) {
      const top = hd[0];
      const c = pop();
      if (top > dist[c]) continue;
      const cx = c % cols;
      const cy = (c - cx) / cols;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const nc = ny * cols + nx;
          if (!walk(nc)) continue;
          if (dx && dy && (!walk(cy * cols + nx) || !walk(ny * cols + cx))) continue;
          const nd = top + (dx && dy ? 1.414 : 1) * (1 + 2.5 / (1 + clear[nc]));
          if (nd < dist[nc]) {
            dist[nc] = nd;
            prev[nc] = c;
            push(nd, nc);
          }
        }
      }
    }
    return (to) => {
      if (prev[to] < 0) return null;
      const out = [];
      for (let c = to; c >= 0; c = prev[c]) out.push([c % cols, Math.floor(c / cols)]);
      return out.reverse();
    };
  };
  return { flood, clear, walk };
}

/** Deterministic random numbers, so the generated file only changes when the plans change. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Chaikin corner cutting: turns the staircase a grid path makes into a walkable curve. */
function smooth(pts, rounds = 2) {
  for (let r = 0; r < rounds; r++) {
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

function openSimplify(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const rdp = (a, b) => {
    let best = -1;
    let bd = eps;
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) {
      const dist = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (dist > bd) {
        bd = dist;
        best = i;
      }
    }
    if (best > 0) {
      keep[best] = 1;
      rdp(a, best);
      rdp(best, b);
    }
  };
  rdp(0, pts.length - 1);
  return pts.filter((_, i) => keep[i]);
}

// ---------------------------------------------------------------- main
const rotas = JSON.parse(readFileSync(`${ROOT}public/plantas/rotas.json`, 'utf8'));
const CELL = rotas.cell;
const OPEN_NAMES = /deck aberto|deck de sol|solarium|sun deck|área externa|aquapark|sundeck|amphitheatre|walking track|arvorismo|himalayan|pista de dança/i;
const out = { beam: BEAM, decks: {} };

for (const n of DECKS) {
  const d = load(n);
  const al = ALIGN[n] ?? alignByBays(d);
  const { k, stern } = al;
  const X = (y) => (stern + (d.h - y) / k) * STRETCH;
  const Z = (x) => (x - d.w / 2) / k;
  const P = ([x, y]) => [r2(X(y)), r2(Z(x))];

  const outline = d.hulls.map((h) => {
    let ring = simplify(h.map(P), 0.12);
    if (area(ring) < 0) ring = ring.reverse();
    return ring;
  });

  const rooms = [];
  for (const r of d.rooms) {
    const open = n >= 15 && (r.cat === 'piscina' || r.cat === 'esporte' || OPEN_NAMES.test(r.name));
    if (!r.name && !open) continue;
    if (n < 15 && !r.name) continue;
    let poly = simplify(r.poly.map(P), 0.15);
    if (poly.length < 3) continue;
    rooms.push({ id: r.id, n: r.name, c: r.cat, p: poly });
  }

  // Cabins: [number, x0, x1, z0, z1]
  const cabins = d.cabins.map((c) => {
    const xs = c.poly.map((p) => X(p[1]));
    const zs = c.poly.map((p) => Z(p[0]));
    return [Number(c.num), r2(Math.min(...xs)), r2(Math.max(...xs)), r2(Math.min(...zs)), r2(Math.max(...zs))];
  });

  // Walking paths on the real walkable grid
  const dr = rotas.decks[String(n)];
  const g = grid(dr);
  const pf = pathfinder(dr, g);
  const rand = rng(n * 7919);
  const cellXZ = ([cx, cy]) => [X(cy * CELL + CELL / 2), Z(cx * CELL + CELL / 2)];
  const openRooms = d.rooms.filter((r) => (r.cat === 'piscina' || OPEN_NAMES.test(r.name)) && !/pool|hidromassagem|whirlpool/i.test(r.name));
  const isOpen = (cx, cy) => openRooms.some((r) => inside(r.poly, cx * CELL + CELL / 2, cy * CELL + CELL / 2));
  const cand = [];
  const candOpen = [];
  for (let c = 0; c < g.length; c++) {
    if (!pf.walk(c) || pf.clear[c] < 1) continue;
    cand.push(c);
    if (n >= 15 && isOpen(c % dr.cols, Math.floor(c / dr.cols))) candOpen.push(c);
  }
  const wanted = n >= 15 ? 90 : n <= 7 ? 60 : 26;
  const paths = [];
  let tries = 0;
  while (paths.length < wanted && tries++ < 60 && cand.length > 10) {
    const pool = n >= 15 && candOpen.length > 20 && rand() < 0.85 ? candOpen : cand;
    const a = pool[Math.floor(rand() * pool.length)];
    const ax = a % dr.cols;
    const ay = Math.floor(a / dr.cols);
    const to = pf.flood(a);
    // several destinations from the same starting point
    for (let j = 0, got = 0; j < 40 && got < 5 && paths.length < wanted; j++) {
      const b = pool[Math.floor(rand() * pool.length)];
      const bx = b % dr.cols;
      const by = Math.floor(b / dr.cols);
      const dd = (Math.hypot(ax - bx, ay - by) * CELL) / k;
      if (dd < 14 || dd > (n >= 15 ? 90 : 160)) continue;
      const cells = to(b);
      if (!cells || cells.length < 8) continue;
      const pts = openSimplify(smooth(openSimplify(cells.map(cellXZ), 0.5), 2), 0.08);
      paths.push(pts.flat().map(r2));
      got++;
    }
  }

  out.decks[n] = { k: r2(k * 100) / 100, stern: r2(stern), w: d.w, h: d.h, outline, rooms, cabins, paths };
  const xs = outline.flat().map((p) => p[0]);
  const zs = outline.flat().map((p) => Math.abs(p[1]));
  console.log(
    `deck ${n}: k=${k.toFixed(2)} stern=${stern.toFixed(1)}  X ${Math.min(...xs).toFixed(1)}..${Math.max(...xs).toFixed(1)}  half-beam ${Math.max(...zs).toFixed(1)}  ` +
      `${outline.map((o) => o.length).join('+')} pts, ${rooms.length} rooms, ${cabins.length} cabins, ${paths.length} paths`,
  );
}

mkdirSync(`${ROOT}ship3d/src/data`, { recursive: true });
writeFileSync(`${ROOT}ship3d/src/data/ship.json`, JSON.stringify(out));
console.log('ship3d/src/data/ship.json', (JSON.stringify(out).length / 1024).toFixed(0), 'kB');
