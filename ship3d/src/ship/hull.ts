// The hull: a lofted shell from keel to the main deck, with the flared bow, the flat transom,
// the dark boot topping at the waterline, portholes, the anchor pockets and the ship's name.
import * as THREE from 'three';
import { DRAFT, HALF, clamp, deck, extent, lerp, rng, smoothstep, sx } from '../core/data';
import { Geo, type Parts, type V3 } from '../core/geo';

/** Ship X of the flat transom (the glazed restaurant decks above overhang it). */
export const TRANSOM = 2.0;
/** Height of the ledge the lifeboats stand on: the floor of deck 6. */
export const LEDGE = 13.0;
/** Forecastle deck (deck 8) and the top of its bulwark. */
export const FORECASTLE = 19.4;
export const BULWARK = 20.9;
/** The bulwark climbs towards the stem (sheer). */
export const BULWARK_TIP = 23.0;
export const bulwarkY = (X: number) => BULWARK + (BULWARK_TIP - BULWARK) * smoothstep(298, 329, X);
const PARALLEL = 230; // where the bow starts to narrow at the waterline
const TAPER6 = 276; // where the deck-6 plan starts to narrow

const ring6 = deck(6).outline[0];
const TIP6 = Math.max(...ring6.map((p) => p[0]));
/**
 * Half-breadth of the bow at forecastle height. The flare makes it far fuller than at deck 6:
 * seen from above the forecastle is a blunt spoon, wide enough to carry the forward corners of
 * the decks above.
 */
const hbTop = (X: number, stem: number) => (HALF + 0.1) * Math.pow(clamp((stem - X) / 19, 0, 1), 0.55);
const hb6cache = new Map<number, number>();
function hb6(X: number): number {
  const key = Math.round(X * 20);
  let v = hb6cache.get(key);
  if (v === undefined) {
    const e = extent(6, clamp(X, 3, TIP6 - 0.05));
    v = e ? Math.min((e[1] - e[0]) / 2, HALF + 0.1) : 0;
    hb6cache.set(key, v);
  }
  return v;
}

/** The stem: how far forward the bow reaches at each height. Raked above water, bulb below. */
export function stemX(y: number): number {
  if (y >= 0) return 321.2 + 9.3 * Math.pow(Math.min(y, BULWARK_TIP) / BULWARK_TIP, 1.25);
  return 321.2 - 3 * Math.pow(Math.min(-y / DRAFT, 1), 2);
}

/**
 * Depth of the keel line: flat along the ship, rising towards the transom. The transom stays
 * well under water, so that no trough of the swell or the wake can show daylight under the stern.
 */
export function keelY(X: number): number {
  return -lerp(3.4, DRAFT, smoothstep(TRANSOM, 46, X));
}

/** Half-breadth of the hull at ship X and height y above the waterline. */
export function hullHalf(X: number, y: number): number {
  const st = stemX(y);
  if (X >= st) return 0;
  const yy = clamp(y, 0, FORECASTLE);
  const tw = clamp((X - PARALLEL) / (st - PARALLEL), 0, 1);
  const bw = HALF * Math.pow(Math.max(1 - Math.pow(tw, 1.9), 0), 0.85);
  const Xm = X <= TAPER6 ? X : TAPER6 + ((X - TAPER6) * (TIP6 - TAPER6)) / (st - TAPER6);
  const bd = lerp(hb6(Xm), Math.max(hb6(Xm), hbTop(X, st)), smoothstep(LEDGE - 3.5, FORECASTLE, yy));
  const f = Math.pow(yy / FORECASTLE, 1.5);
  let b = lerp(Math.min(bw, bd), bd, f);
  b *= lerp(lerp(0.955, 1, smoothstep(TRANSOM, 44, X)), 1, Math.min(1, f * 3));
  if (y < 0) {
    const v = clamp(y / keelY(X), 0, 1);
    b *= 1 - Math.pow(v, lerp(7, 2.2, tw));
  }
  return b;
}

/** Point on the hull surface (scene coordinates), pushed out along the surface normal. */
export function hullPoint(X: number, y: number, side: number, off = 0): V3 {
  const b = hullHalf(X, y);
  if (!off) return [sx(X), y, b * side];
  const n = hullNormal(X, y, side);
  return [sx(X) + n[0] * off, y + n[1] * off, b * side + n[2] * off];
}

export function hullNormal(X: number, y: number, side: number): V3 {
  const e = 0.25;
  const dbdx = (hullHalf(X + e, y) - hullHalf(X - e, y)) / (2 * e);
  const dbdy = (hullHalf(X, y + e) - hullHalf(X, y - e)) / (2 * e);
  // surface z = side * b(X, y): the normal is (-db/dX, -db/dy, 1) on the starboard side
  const n: V3 = [-dbdx, -dbdy, side];
  const l = Math.hypot(n[0], n[1], n[2]);
  return [n[0] / l, n[1] / l, n[2] / l];
}

/** A patch that follows the hull between two X and two heights (decals, windows, pockets). */
export function hullPatch(g: Geo, X0: number, X1: number, y0: number, y1: number, side: number, off: number, nx = 1, ny = 1, shear = 0, flipU = false) {
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const u0 = i / nx;
      const u1 = (i + 1) / nx;
      const v0 = j / ny;
      const v1 = (j + 1) / ny;
      const P = (u: number, v: number) => hullPoint(lerp(X0, X1, u) + shear * (lerp(y0, y1, v) - y0), lerp(y0, y1, v), side, off);
      const n = hullNormal(lerp(X0, X1, (u0 + u1) / 2), lerp(y0, y1, (v0 + v1) / 2), side);
      const U = (u: number) => (flipU ? 1 - u : u);
      g.quad(P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1), n, [U(u0), v0, U(u1), v1]);
    }
  }
}

function hullDisc(g: Geo, X: number, y: number, r: number, side: number, off: number, segs = 10) {
  const n = hullNormal(X, y, side);
  const c = hullPoint(X, y, side, off);
  // two tangents: along the ship and up the plating
  const tx: V3 = [n[2] * side, 0, -n[0] * side];
  const tl = Math.hypot(tx[0], tx[2]) || 1;
  tx[0] /= tl;
  tx[2] /= tl;
  const ty: V3 = [n[1] * tx[2] - n[2] * tx[1], n[2] * tx[0] - n[0] * tx[2], n[0] * tx[1] - n[1] * tx[0]];
  const base = g.count;
  g.vert(c, n, 0.5, 0.5);
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const ca = Math.cos(a) * r;
    const sa = Math.sin(a) * r;
    g.vert([c[0] + tx[0] * ca + ty[0] * sa, c[1] + tx[1] * ca + ty[1] * sa, c[2] + tx[2] * ca + ty[2] * sa], n, 0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5);
  }
  for (let i = 0; i < segs; i++) {
    const a = base + 1 + i;
    const b = base + 1 + ((i + 1) % segs);
    // wind so the face looks outwards whichever side it is on
    const p0 = g.pos.slice(a * 3, a * 3 + 3);
    const p1 = g.pos.slice(b * 3, b * 3 + 3);
    const cr: V3 = [
      (p0[1] - c[1]) * (p1[2] - c[2]) - (p0[2] - c[2]) * (p1[1] - c[1]),
      (p0[2] - c[2]) * (p1[0] - c[0]) - (p0[0] - c[0]) * (p1[2] - c[2]),
      (p0[0] - c[0]) * (p1[1] - c[1]) - (p0[1] - c[1]) * (p1[0] - c[0]),
    ];
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] > 0) g.idx.push(base, a, b);
    else g.idx.push(base, b, a);
  }
}

/** Height of the top edge of the hull plating along the bow part (t: 0 at PARALLEL, 1 at the stem). */
const topAt = (t: number) => LEDGE + (BULWARK - LEDGE) * smoothstep(0.262, 0.372, t) + (BULWARK_TIP - BULWARK) * smoothstep(0.69, 0.99, t);
/** t where the plating has reached forecastle height. */
export const FORE_T = 0.372;
export const foreX = (t: number, y: number) => PARALLEL + t * (stemX(y) - PARALLEL);

function shellGeometry(): { white: THREE.BufferGeometry; navy: THREE.BufferGeometry } {
  // columns: fixed stations along the parallel body, then a fan that follows the stem
  const stations: { X?: number; t?: number }[] = [];
  for (const X of [TRANSOM, 2.6, 3.6, 5, 7, 10, 14, 19, 25, 32, 40, 48]) stations.push({ X });
  for (let X = 56; X < PARALLEL; X += 6) stations.push({ X });
  const NB = 84;
  for (let i = 0; i <= NB; i++) stations.push({ t: 1 - Math.pow(1 - i / NB, 1.45) });

  const build = (rows: ((st: { X?: number; t?: number }) => number)[], colour: THREE.ColorRepresentation) => {
    const g = new THREE.BufferGeometry();
    const pos: number[] = [];
    const idx: number[] = [];
    const nc = stations.length;
    for (const side of [1, -1]) {
      const base = pos.length / 3;
      for (const row of rows) {
        for (const st of stations) {
          const y = row(st);
          const X = st.X ?? foreX(st.t!, y);
          pos.push(sx(X), y, hullHalf(X, y) * side);
        }
      }
      for (let j = 0; j < rows.length - 1; j++) {
        for (let i = 0; i < nc - 1; i++) {
          const a = base + j * nc + i;
          const b = a + 1;
          const c = a + nc;
          const d = c + 1;
          if (side > 0) idx.push(a, b, c, b, d, c);
          else idx.push(a, c, b, b, c, d);
        }
      }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    // at the stem the two sides meet in a line: the collapsed triangles there leave no normal
    const nrm = g.getAttribute('normal');
    for (let v = 0; v < nrm.count; v++) {
      if (Math.hypot(nrm.getX(v), nrm.getY(v), nrm.getZ(v)) < 0.5 && v % nc > 0) nrm.setXYZ(v, nrm.getX(v - 1), nrm.getY(v - 1), nrm.getZ(v - 1));
    }
    const col = new THREE.Color(colour);
    const cols = new Float32Array(pos.length);
    for (let i = 0; i < cols.length; i += 3) cols.set([col.r, col.g, col.b], i);
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
    return g;
  };

  const BOOT = 0.85;
  const under = [1, 0.86, 0.7, 0.52, 0.34, 0.16].map((v) => (st: { X?: number }) => v * (st.X !== undefined ? keelY(st.X) : -DRAFT));
  const navy = build([...under, () => 0, () => BOOT], 0x16284a);
  const side = [BOOT, 2.2, 3.8, 5.4, 7, 8.6, 10.2, 11.6, LEDGE].map((y) => () => y);
  const upper = [0.2, 0.4, 0.6, 0.8, 1].map((s) => (st: { t?: number }) => LEDGE + s * (topAt(st.t ?? 0) - LEDGE));
  const white = build([...side, ...upper], 0xffffff);
  return { white, navy };
}

export function buildHull(parts: Parts): THREE.BufferGeometry[] {
  const shell = shellGeometry();
  const white = parts.get('white');
  const white2 = parts.get('white2');
  const glass = parts.get('glass');
  const dark = parts.get('dark');
  const lit = parts.get('lit');
  const navy = parts.get('navy');
  const rand = rng(41);

  // --- transom
  white.color(0xffffff);
  const rowsT = [0.85, 3, 6, 9, 11, LEDGE];
  for (let j = 0; j < rowsT.length - 1; j++) {
    const y0 = rowsT[j];
    const y1 = rowsT[j + 1];
    const b0 = hullHalf(TRANSOM, y0);
    const b1 = hullHalf(TRANSOM, y1);
    white.quad([sx(TRANSOM), y0, -b0], [sx(TRANSOM), y0, b0], [sx(TRANSOM), y1, b1], [sx(TRANSOM), y1, -b1], [-1, 0, 0]);
  }
  navy.color(0x16284a);
  const kb = keelY(TRANSOM);
  navy.quad([sx(TRANSOM), kb, -hullHalf(TRANSOM, kb * 0.6)], [sx(TRANSOM), kb, hullHalf(TRANSOM, kb * 0.6)], [sx(TRANSOM), 0.85, hullHalf(TRANSOM, 0.85)], [sx(TRANSOM), 0.85, -hullHalf(TRANSOM, 0.85)], [-1, 0, 0]);
  // long window of the aft restaurant on deck 5, and the row of mooring ports under it
  glass.color(0xffffff);
  glass.quad([sx(TRANSOM) - 0.04, 9.9, -17.6], [sx(TRANSOM) - 0.04, 9.9, 17.6], [sx(TRANSOM) - 0.04, 11.7, 17.6], [sx(TRANSOM) - 0.04, 11.7, -17.6], [-1, 0, 0]);
  dark.color(0x3a4046);
  for (let i = -3; i <= 3; i++) {
    const w = i === 0 ? 7 : 3.2;
    dark.quad([sx(TRANSOM) - 0.04, 7.9, i * 5.4 - w / 2], [sx(TRANSOM) - 0.04, 7.9, i * 5.4 + w / 2], [sx(TRANSOM) - 0.04, 8.55, i * 5.4 + w / 2], [sx(TRANSOM) - 0.04, 8.55, i * 5.4 - w / 2], [-1, 0, 0]);
  }

  for (const side of [1, -1]) {
    // --- portholes: deck 4 and deck 5, in the irregular groups a real hull has
    for (const [y, r, skip] of [
      [7.3, 0.36, 0.3],
      [10.5, 0.46, 0.14],
    ] as const) {
      let run = 0;
      for (let X = 14; X < 300; X += 2.55) {
        if (run <= 0) {
          run = 3 + Math.floor(rand() * 14);
          if (rand() < skip) {
            X += 4 + rand() * 12;
            continue;
          }
        }
        run--;
        // service doors and the tender platform break the rows amidships
        if ((X > 118 && X < 126) || (X > 196 && X < 203)) continue;
        const on = rand() < 0.42;
        hullDisc(on ? lit : glass, X, y, r, side, on ? 0.035 : 0.03);
        if (on) hullDisc(glass, X, y, r, side, 0.02);
      }
    }
    // --- windows of decks 6 and 7 in the bow plating, where the hull rises to the forecastle
    for (const [y0, y1] of [
      [14.2, 15.35],
      [17.2, 18.25],
    ]) {
      for (let X = 263; X < 290; X += 2.3) {
        if (rand() < 0.1) continue;
        const on = rand() < 0.38;
        hullPatch(on ? lit : glass, X, X + 1.35, y0, y1, side, 0.035);
        if (on) hullPatch(glass, X, X + 1.35, y0, y1, side, 0.02);
      }
    }
    // --- mooring ports near the bow
    // mooring ports: a row of small openings high on the bow, a few more below them
    dark.color(0x23282d);
    for (const X of [309.5, 312.3, 315.1, 317.9]) hullPatch(dark, X, X + 2.0, 15.2, 16.0, side, 0.04, 2, 1);
    for (const X of [311, 312.7, 314.4, 316.1, 323.5, 325]) hullPatch(dark, X, X + 0.8, 13.5, 14.0, side, 0.04);
    for (const X of [299.2, 300.9]) hullPatch(dark, X, X + 1.2, 15.0, 15.6, side, 0.04);
    // --- anchor pocket: the slanted dark recess low on the bow
    dark.color(0x30363c);
    hullPatch(dark, 306.2, 310.8, 1.4, 9.4, side, 0.045, 2, 6, -0.62);
    // the anchor itself, stowed at the top of the pocket
    white.color(0x5c6268);
    hullPatch(white, 307.1, 307.9, 6.0, 8.8, side, 0.09, 1, 3, -0.62);
    hullPatch(white, 306.5, 308.6, 5.5, 6.1, side, 0.09, 2, 1, -0.62);
    white.color(0xffffff);
    // --- shell doors amidships (tender and pilot doors), slightly darker panels
    white.color(0xdfe2e2);
    for (const X of [120, 198]) hullPatch(white, X, X + 4.2, 3.4, 6.4, side, 0.03);
    white.color(0xffffff);
  }

  // --- forecastle deck and the inside of its bulwark
  const edge: [number, number][] = [];
  for (let i = 0; i <= 60; i++) {
    const t = FORE_T + (1 - FORE_T) * (1 - Math.pow(1 - i / 60, 1.3));
    const X = foreX(t, FORECASTLE);
    edge.push([X, Math.max(hullHalf(X, FORECASTLE) - 0.22, 0)]);
  }
  const ring: [number, number][] = [...edge, ...edge.slice(0, -1).reverse().map(([X, z]) => [X, -z] as [number, number])];
  parts.get('deck').color(0x8fa5ad).poly(ring, FORECASTLE, true);
  white2.color(0xf2f2f0);
  for (const s of [1, -1]) {
    for (let i = 0; i < edge.length - 1; i++) {
      const a = edge[i];
      const b = edge[i + 1];
      const ya = bulwarkY(a[0]);
      const yb = bulwarkY(b[0]);
      white2.quad([sx(a[0]), FORECASTLE, a[1] * s], [sx(b[0]), FORECASTLE, b[1] * s], [sx(b[0]), yb, b[1] * s], [sx(a[0]), ya, a[1] * s]);
      // capping rail
      const ao = hullHalf(a[0], ya);
      const bo = hullHalf(b[0], yb);
      white2.quad([sx(a[0]), ya, a[1] * s], [sx(b[0]), yb, b[1] * s], [sx(b[0]), yb, bo * s], [sx(a[0]), ya, ao * s], [0, 1, 0]);
    }
  }

  // --- bulbous bow, under water
  const bulb = new THREE.SphereGeometry(1, 20, 12);
  bulb.scale(8.5, 2.7, 3.0);
  bulb.translate(sx(319.5), -5.4, 0);
  navy.color(0x16284a).add(bulb);

  return [shell.white, shell.navy];
}

/** The ship's name as a texture: italic capitals, dark blue on transparent. */
export function nameTexture(text: string, sub?: string): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = sub ? 320 : 200;
  const c = cv.getContext('2d')!;
  c.clearRect(0, 0, cv.width, cv.height);
  c.fillStyle = '#13233f';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = 'italic 600 150px "Times New Roman", "Liberation Serif", "DejaVu Serif", Georgia, serif';
  c.fillText(text, 512, 100, 980);
  if (sub) {
    c.font = '500 70px "Helvetica Neue", Arial, "Liberation Sans", sans-serif';
    c.fillText(sub, 512, 255, 700);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Name plates on both bows and on the transom. */
export function buildNames(): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  const mat = (tex: THREE.Texture) =>
    new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, depthWrite: false });
  const bowTex = nameTexture('VIRTUOSA');
  for (const side of [1, -1]) {
    const g = new Geo();
    // seen from outside, the text must read left to right: towards the bow to starboard, towards the stern to port
    hullPatch(g, 293, 308, 16.9, 19.1, side, 0.05, 12, 2, 0, side < 0);
    const m = new THREE.Mesh(g.build(), mat(bowTex));
    m.material.vertexColors = false;
    out.push(m);
  }
  const g = new Geo();
  const x = sx(TRANSOM) - 0.06;
  g.quad([x, 4.0, -9], [x, 4.0, 9], [x, 7.6, 9], [x, 7.6, -9], [-1, 0, 0], [0, 0, 1, 1]);
  out.push(new THREE.Mesh(g.build(), mat(nameTexture('VIRTUOSA', 'VALLETTA'))));
  return out;
}
