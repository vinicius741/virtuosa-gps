// What makes the silhouette: the twin-shell funnel with its exhaust pipes, the radar mast,
// the satellite domes, the lifeboats on their davits, the water slides and the ropes course.
import * as THREE from 'three';
import { DECK_Y, lerp, rng, sx } from '../core/data';
import type { Geo, Parts, V3 } from '../core/geo';
import { LEDGE } from './hull';
import { BOAT_GROUPS, BOAT_PITCH, SHELF_HALF } from './superstructure';
import { CASING, Y19, Y20 } from './topdecks';

export interface DetailInfo {
  /** things that turn: radar scanners */
  spinners: { obj: THREE.Object3D; speed: number }[];
  /** tops of the exhaust pipes (scene coordinates), where the haze comes out */
  exhausts: THREE.Vector3[];
  /** water slides: centre line, tube radius, whether the tube is closed */
  slides: { curve: THREE.CatmullRomCurve3; radius: number; closed: boolean; seconds: number }[];
  /** walkway of the ropes course, scene coordinates */
  ropes: THREE.CatmullRomCurve3;
  /** flag halyard positions: where flags fly */
  flags: { pos: THREE.Vector3; size: [number, number]; colours: number[] }[];
  meshes: THREE.Object3D[];
  /** the bucket of the water playground, tipped by the animation */
  bucket: THREE.Object3D | null;
}

/** Sweeps a closed section along stations: `sec(u)` returns [z, y] pairs, colours go per row. */
function loft(g: Geo, n: number, x: (u: number) => number, sec: (u: number) => [number, number][], colours: THREE.ColorRepresentation[], place: (x: number, y: number, z: number) => V3) {
  const rows = sec(0).length;
  for (let i = 0; i < n; i++) {
    const u0 = -1 + (2 * i) / n;
    const u1 = -1 + (2 * (i + 1)) / n;
    const a = sec(u0);
    const b = sec(u1);
    for (let j = 0; j < rows - 1; j++) {
      g.color(colours[j]);
      for (const s of [1, -1]) {
        const p0 = place(x(u0), a[j][1], a[j][0] * s);
        const p1 = place(x(u1), b[j][1], b[j][0] * s);
        const p2 = place(x(u1), b[j + 1][1], b[j + 1][0] * s);
        const p3 = place(x(u0), a[j + 1][1], a[j + 1][0] * s);
        const mid = place((x(u0) + x(u1)) / 2, (a[j][1] + a[j + 1][1]) / 2, 0);
        const out: V3 = [(p0[0] + p2[0]) / 2 - mid[0], (p0[1] + p2[1]) / 2 - mid[1], (p0[2] + p2[2]) / 2 - mid[2]];
        g.quad(p0, p1, p2, p3, out);
      }
    }
  }
}

function lifeboats(parts: Parts) {
  const col = parts.get('color');
  const white = parts.get('white');
  const dark = parts.get('dark');
  const L = 14.6;
  const W = 2.25;
  for (const side of [1, -1]) {
    for (const [x0, count] of BOAT_GROUPS) {
      for (let k = 0; k < count; k++) {
        const X = x0 + k * BOAT_PITCH;
        const zc = side * (SHELF_HALF - 0.75);
        const y0 = LEDGE + 1.15;
        const place = (lx: number, ly: number, lz: number): V3 => [sx(X) + lx, y0 + ly, zc + lz];
        // taper towards both ends, a little blunter at the stern
        const w = (u: number) => W * Math.pow(Math.max(1 - Math.pow(Math.abs(u), u < 0 ? 5 : 3.2), 0), 0.5);
        const hTop = (u: number) => 3.3 - 0.9 * Math.pow(Math.abs(u), 3);
        loft(
          col,
          16,
          (u) => (u * L) / 2,
          (u) => {
            const ww = Math.max(w(u), 0.02);
            return [
              [0, 0.35 * Math.pow(Math.abs(u), 4) * 1.6],
              [ww * 0.72, 0.38],
              [ww, 1.3],
              [ww * 1.02, 1.62],
              [ww * 0.95, 1.7],
              [ww * 0.86, 2.55],
              [ww * 0.5, hTop(u)],
              [0, hTop(u) + 0.08],
            ];
          },
          [0xf1f1ee, 0xf1f1ee, 0x1d1f22, 0xf2581c, 0xf2581c, 0xf2581c, 0xf2581c],
          place,
        );
        // windows along the canopy
        dark.color(0x14181c);
        for (let i = -3; i <= 3; i++) {
          if (i === 0) continue;
          const u = (i * 1.5) / (L / 2);
          const ww = w(u);
          for (const s of [1, -1]) {
            const a = place(i * 1.5 - 0.5, 1.82, s * (ww * 0.945 + 0.03));
            const b = place(i * 1.5 + 0.5, 1.82, s * (ww * 0.945 + 0.03));
            const c = place(i * 1.5 + 0.5, 2.45, s * (ww * 0.87 + 0.03));
            const d = place(i * 1.5 - 0.5, 2.45, s * (ww * 0.87 + 0.03));
            dark.quad(a, b, c, d, [0, 0.2, s]);
          }
        }
        // davits: a white arm at each end, reaching out over the boat from the deck above
        white.color(0xffffff);
        for (const e of [-1, 1]) {
          const dx = sx(X) + e * (L / 2 + 0.25);
          const zin = side * (SHELF_HALF - 4.4);
          white.beam([dx, LEDGE, zin], [dx, LEDGE + 5.4, zin + side * 1.2], 0.55, 0.7);
          white.beam([dx, LEDGE + 5.4, zin + side * 1.2], [dx, LEDGE + 5.0, zc + side * 0.6], 0.5, 0.6);
          white.beam([dx, LEDGE, zc - side * 1.5], [dx, LEDGE + 1.3, zc - side * 0.2], 0.4, 0.4);
        }
      }
    }
  }
}

/** Navy lattice for the funnel's sides: louvres and diagonal braces, see-through between them. */
function latticeTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 256;
  const c = cv.getContext('2d')!;
  c.clearRect(0, 0, cv.width, cv.height);
  c.strokeStyle = '#141f38';
  c.fillStyle = '#141f38';
  c.lineWidth = 7;
  for (let y = 14; y < 256; y += 22) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(1024, y);
    c.stroke();
  }
  c.lineWidth = 9;
  for (let x = 0; x <= 1024; x += 64) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, 256);
    c.stroke();
  }
  c.lineWidth = 6;
  for (let x = 0; x < 1024; x += 128) {
    c.beginPath();
    c.moveTo(x, 256);
    c.lineTo(x + 128, 0);
    c.moveTo(x + 128, 256);
    c.lineTo(x + 256, 0);
    c.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** The project's own emblem (a navigation arrow in a ring), for the funnel. Not the cruise line's logo. */
function emblemTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const c = cv.getContext('2d')!;
  c.clearRect(0, 0, 256, 256);
  c.fillStyle = '#141f38';
  c.beginPath();
  c.arc(128, 128, 122, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#ffffff';
  c.lineWidth = 12;
  c.beginPath();
  c.arc(128, 128, 104, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.moveTo(62, 124);
  c.lineTo(196, 58);
  c.lineTo(138, 196);
  c.lineTo(126, 138);
  c.closePath();
  c.fill();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function funnel(parts: Parts, info: DetailInfo) {
  const navy = parts.get('navy2');
  const steel = parts.get('steel');
  const dark = parts.get('dark');
  const XA = CASING.x0 + 1.5; // aft, the tall end
  const XF = CASING.x1 + 1.5; // forward tip
  const base = Y20 + 0.25;
  const topAt = (X: number) => {
    const u = (XF - X) / (XF - XA);
    return base + 0.5 + 9.4 * Math.pow(Math.sin((Math.min(u * 1.16, 1) * Math.PI) / 2), 0.92);
  };
  const N = 30;
  const lattice = new THREE.MeshStandardMaterial({ map: latticeTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.2, color: 0xffffff });
  const latticeGeo: { pos: number[]; uv: number[]; idx: number[]; nor: number[] } = { pos: [], uv: [], idx: [], nor: [] };
  const zIn = 2.6;
  const zOut = CASING.z;
  navy.color(0x15233f);
  for (const side of [1, -1]) {
    for (let i = 0; i < N; i++) {
      const X0 = lerp(XF, XA, i / N);
      const X1 = lerp(XF, XA, (i + 1) / N);
      const t0 = topAt(X0);
      const t1 = topAt(X1);
      // roof of the shell, slightly cambered: three strips
      const zs = [zIn, zIn + 1.2, zOut - 1.2, zOut];
      const drop = [0.55, 0, 0, 0.55];
      for (let k = 0; k < 3; k++) {
        navy.quad([sx(X0), t0 - drop[k], side * zs[k]], [sx(X1), t1 - drop[k], side * zs[k]], [sx(X1), t1 - drop[k + 1], side * zs[k + 1]], [sx(X0), t0 - drop[k + 1], side * zs[k + 1]], [0, 1, 0]);
      }
      // rim under the roof edge, on both faces of the shell
      for (const z of [zIn, zOut]) {
        navy.quad([sx(X0), t0 - 0.55, side * z], [sx(X1), t1 - 0.55, side * z], [sx(X1), t1 - 1.6, side * z], [sx(X0), t0 - 1.6, side * z]);
        // lattice below the rim
        const b = latticeGeo.pos.length / 3;
        const h0 = Math.max(t0 - 1.6 - base, 0);
        const h1 = Math.max(t1 - 1.6 - base, 0);
        latticeGeo.pos.push(sx(X0), base, side * z, sx(X1), base, side * z, sx(X1), base + h1, side * z, sx(X0), base + h0, side * z);
        const ua = (XF - X0) / 9;
        const ub = (XF - X1) / 9;
        latticeGeo.uv.push(ua, 0, ub, 0, ub, h1 / 8.4, ua, h0 / 8.4);
        for (let q = 0; q < 4; q++) latticeGeo.nor.push(0, 0, side * (z === zOut ? 1 : -1));
        latticeGeo.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      }
    }
    // the aft end: a slanted navy frame closing the shell
    const ta = topAt(XA);
    navy.quad([sx(XA), ta, side * zIn], [sx(XA), ta, side * zOut], [sx(XA + 3.2), base, side * zOut], [sx(XA + 3.2), base, side * zIn]);
    navy.beam([sx(XA), ta - 0.3, side * zIn], [sx(XA + 3.2), base, side * zIn], 0.6, 0.6);
    navy.beam([sx(XA), ta - 0.3, side * zOut], [sx(XA + 3.2), base, side * zOut], 0.6, 0.6);
    // sill along the bottom
    navy.beam([sx(XF), base + 0.25, side * zOut], [sx(XA + 3.2), base + 0.25, side * zOut], 0.5, 0.5);
    navy.beam([sx(XF), base + 0.25, side * zIn], [sx(XA + 3.2), base + 0.25, side * zIn], 0.5, 0.5);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(latticeGeo.pos, 3));
  lg.setAttribute('normal', new THREE.Float32BufferAttribute(latticeGeo.nor, 3));
  lg.setAttribute('uv', new THREE.Float32BufferAttribute(latticeGeo.uv, 2));
  lg.setIndex(latticeGeo.idx);
  const lm = new THREE.Mesh(lg, lattice);
  lm.castShadow = true;
  lm.name = 'funnel-lattice';
  info.meshes.push(lm);
  // emblem on the outer face of each shell
  const em = new THREE.MeshStandardMaterial({ map: emblemTexture(), transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  for (const side of [1, -1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), em);
    m.position.set(sx(XA + 15), base + 4.4, side * (zOut + 0.08));
    if (side < 0) m.rotation.y = Math.PI;
    info.meshes.push(m);
  }
  // uptake casing between the shells and the clusters of exhaust pipes, raked aft
  dark.color(0x191c21).box(sx(XA + 13), base + 1.7, 0, 19, 3.4, zIn * 2 + 1.6);
  const rake = 0.3;
  for (const [cz, cx] of [
    [-6.4, XA + 9.5],
    [0, XA + 6],
    [6.4, XA + 9.5],
  ]) {
    for (const [dx, dz, len] of [
      [0, -0.8, 14.2],
      [0, 0.8, 13.6],
      [1.7, -0.8, 13.0],
      [1.7, 0.8, 12.4],
    ]) {
      const r = 0.62;
      const pipe = new THREE.CylinderGeometry(r, r, len, 12, 1, false);
      pipe.translate(0, len / 2, 0);
      pipe.rotateZ(rake);
      pipe.translate(sx(cx + dx), base - 0.5, cz + dz);
      steel.color(0xb7bcc0).add(pipe);
      const tip = new THREE.CylinderGeometry(r + 0.03, r + 0.03, 1.2, 12, 1, false);
      tip.translate(0, len - 0.6, 0);
      tip.rotateZ(rake);
      tip.translate(sx(cx + dx), base - 0.5, cz + dz);
      dark.color(0x2a2d31).add(tip);
      info.exhausts.push(new THREE.Vector3(sx(cx + dx) - Math.sin(rake) * len, base - 0.5 + Math.cos(rake) * len, cz + dz));
    }
  }
}

function mast(parts: Parts, info: DetailInfo) {
  const navy = parts.get('navy');
  const white = parts.get('white');
  const steel = parts.get('steel');
  const X = 263.5;
  const y = Y20;
  white.color(0xffffff).box(sx(X), y + 1.4, 0, 6, 2.8, 7.5);
  // the dark arch: two legs leaning aft, joined at the top
  const foot = (s: number): V3 => [sx(X + 1.6), y + 2.8, s * 2.9];
  const head = (s: number): V3 => [sx(X - 1.6), y + 13.2, s * 2.3];
  navy.color(0x15233f);
  for (const s of [1, -1]) navy.beam(foot(s), head(s), 1.5, 1.2);
  navy.beam([head(-1)[0], head(-1)[1] - 0.3, head(-1)[2] - 0.5], [head(1)[0], head(1)[1] - 0.3, head(1)[2] + 0.5], 1.5, 1.4);
  // platforms with radar scanners
  for (const [h, w, d] of [
    [5.2, 7.5, 3],
    [8.6, 6, 2.6],
    [11.2, 4.4, 2.2],
  ]) {
    const px = sx(X + 1.6 - (3.2 * (h - 2.8)) / 10.4) + 1.2;
    white.color(0xffffff).box(px, y + h, 0, d, 0.18, w);
    steel.color(0xdfe3e6);
    for (const s of [1, -1]) steel.beam([px + d / 2, y + h + 0.9, s * (w / 2)], [px - d / 2, y + h + 0.9, s * (w / 2)], 0.05, 0.05);
    steel.beam([px + d / 2, y + h + 0.9, -w / 2], [px + d / 2, y + h + 0.9, w / 2], 0.05, 0.05);
  }
  const scanner = (h: number, off: number, len: number, speed: number) => {
    const g = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.38, len), new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.5 }));
    bar.position.y = 0.55;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0xcfd4d8, roughness: 0.4, metalness: 0.6 }));
    post.position.y = 0.2;
    g.add(bar, post);
    g.position.set(sx(X + 1.6 - (3.2 * (h - 2.8)) / 10.4) + 2.2, y + h + 0.1, off);
    bar.castShadow = true;
    info.spinners.push({ obj: g, speed });
    info.meshes.push(g);
  };
  scanner(5.2, -1.6, 3.6, 2.4);
  scanner(8.6, 1.2, 3.0, 2.9);
  // top pole, yardarm and aerials
  const topY = y + 13.4;
  white.color(0xffffff).beam([sx(X - 1.6), topY, 0], [sx(X - 1.9), topY + 4.2, 0], 0.32, 0.32);
  steel.color(0xdfe3e6).beam([sx(X - 1.9), topY + 4.2, 0], [sx(X - 1.9), topY + 6.6, 0], 0.07, 0.07);
  white.beam([sx(X - 1.7), topY + 1.6, -4.4], [sx(X - 1.7), topY + 1.6, 4.4], 0.2, 0.2);
  for (const s of [1, -1]) {
    steel.beam([sx(X - 1.7), topY + 1.6, s * 4.2], [sx(X - 1.7), topY + 3.0, s * 4.2], 0.05, 0.05);
    steel.beam([sx(X + 3), y + 2.8, s * 3.4], [sx(X + 3), y + 7.5, s * 3.4], 0.05, 0.05);
  }
  // signal flags on the yardarm halyards
  info.flags.push({ pos: new THREE.Vector3(sx(X - 1.7), topY + 0.2, 3.6), size: [1.5, 1.0], colours: [0x2a67c9, 0xffffff] });
  info.flags.push({ pos: new THREE.Vector3(sx(X - 1.7), topY + 0.2, -3.6), size: [1.5, 1.0], colours: [0xd42e2e, 0xffffff] });
}

function radomes(parts: Parts) {
  const white = parts.get('white');
  const dome = (X: number, z: number, y: number, r: number, stand: number) => {
    white.color(0xffffff);
    const ped = new THREE.CylinderGeometry(r * 0.42, r * 0.55, stand, 12);
    ped.translate(sx(X), y + stand / 2, z);
    white.add(ped);
    const s = new THREE.SphereGeometry(r, 20, 14);
    s.translate(sx(X), y + stand + r * 0.82, z);
    white.color(0xfafafa).add(s);
  };
  dome(256.5, 16.6, Y19, 2.6, 2.2);
  dome(256.5, -16.6, Y19, 2.6, 2.2);
  dome(CASING.x1 + 6, 5.2, Y19, 1.7, 3.6);
  dome(CASING.x1 + 6, -5.2, Y19, 1.7, 3.6);
  dome(CASING.x1 - 3, 0, Y20 + 0.25, 1.15, 1.0);
  dome(271.5, 6, Y20, 0.9, 0.8);
  dome(271.5, -6, Y20, 0.9, 0.8);
}

function slides(parts: Parts, info: DetailInfo) {
  const y = Y19;
  const steel = parts.get('steel');
  const col = parts.get('color');
  const col2 = parts.get('color2');
  const tx = 60;
  const tz = 3.5;
  // tower: four legs, three platforms, stairs suggested by diagonal stringers
  const H = 11.2;
  steel.color(0xe0b83a);
  for (const dx of [-2.2, 2.2]) for (const dz of [-2.2, 2.2]) steel.beam([sx(tx + dx), y, tz + dz], [sx(tx + dx), y + H + 1.2, tz + dz], 0.26, 0.26);
  for (const h of [3.7, 7.4, H]) {
    col.color(0xd9b24a).box(sx(tx), y + h, tz, 5, 0.16, 5);
    for (const dz of [-2.4, 2.4]) steel.beam([sx(tx - 2.4), y + h + 1.1, tz + dz], [sx(tx + 2.4), y + h + 1.1, tz + dz], 0.06, 0.06);
    for (const dx of [-2.4, 2.4]) steel.beam([sx(tx + dx), y + h + 1.1, tz - 2.4], [sx(tx + dx), y + h + 1.1, tz + 2.4], 0.06, 0.06);
  }
  for (let k = 0; k < 3; k++) steel.beam([sx(tx - 2.2), y + k * 3.7, tz + (k % 2 ? 2.2 : -2.2)], [sx(tx + 2.2), y + (k + 1) * 3.7, tz + (k % 2 ? 2.2 : -2.2)], 0.3, 0.12);
  // roof over the top platform
  col2.color(0xf2c230);
  const roof = new THREE.ConeGeometry(4.2, 1.6, 4, 1);
  roof.rotateY(Math.PI / 4);
  roof.translate(sx(tx), y + H + 2.0, tz);
  col2.add(roof);

  const V = (X: number, h: number, z: number) => new THREE.Vector3(sx(X), y + h, z);
  const defs: { pts: THREE.Vector3[]; radius: number; colour: number; closed: boolean; seconds: number }[] = [];
  // 1: green tube, a corkscrew round the tower's aft side down to the splash pool
  {
    const pts: THREE.Vector3[] = [V(tx - 2.6, H + 0.9, tz)];
    const cx = 52;
    const cz = 5;
    const turns = 2.25;
    const n = 26;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = Math.PI * 0 + t * turns * Math.PI * 2;
      const r = 5.6 + t * 1.2;
      pts.push(V(cx + Math.cos(a) * r, lerp(H + 0.4, 1.7, t), cz + Math.sin(a) * r));
    }
    pts.push(V(62.5, 1.15, 13.6), V(65.5, 0.95, 15.6));
    defs.push({ pts, radius: 0.72, colour: 0x4a7a35, closed: true, seconds: 15 });
  }
  // 2: yellow flume that swings out over the ship's side before coming home
  defs.push({
    pts: [V(tx + 2.6, 7.9, tz), V(66, 7.4, 6), V(72, 6.4, 14), V(77, 5.2, 21.5), V(83, 4.0, 23.6), V(87.5, 3.1, 19), V(85, 2.4, 13), V(78, 1.7, 12.6), V(73.5, 1.1, 14.6), V(70.5, 0.9, 16)],
    radius: 0.7,
    colour: 0xf0c22e,
    closed: false,
    seconds: 13,
  });
  // 3: dark green tube: a long run aft and round, the tallest of the three
  defs.push({
    pts: [V(tx, H + 0.9, tz - 2.6), V(60, H + 0.3, -3), V(63, 9.6, -9), V(70, 8.4, -12.5), V(78, 7.0, -10), V(81, 6.0, -3), V(78, 5.0, 4), V(71.5, 4.0, 6.5), V(67, 3.0, 2), V(69, 2.2, -4), V(75, 1.6, -5.5), V(80, 1.2, -1), V(79, 0.95, 6.5), V(74.5, 0.9, 11), V(71.5, 0.85, 13.4)],
    radius: 0.72,
    colour: 0x2f5a3a,
    closed: true,
    seconds: 19,
  });
  for (const d of defs) {
    const curve = new THREE.CatmullRomCurve3(d.pts, false, 'catmullrom', 0.5);
    const segs = Math.round(curve.getLength() * 1.6);
    let tube: THREE.BufferGeometry;
    if (d.closed) tube = new THREE.TubeGeometry(curve, segs, d.radius, 12, false);
    else {
      // open flume: the lower two thirds of a tube
      tube = new THREE.TubeGeometry(curve, segs, d.radius, 12, false);
      const idx = tube.getIndex()!;
      const keep: number[] = [];
      const posA = tube.getAttribute('position');
      const frames = curve.computeFrenetFrames(segs, false);
      for (let i = 0; i < idx.count; i += 3) {
        const a = idx.getX(i);
        const seg = Math.min(Math.floor(a / 13), segs);
        const c = curve.getPointAt(seg / segs);
        const avgY = (posA.getY(idx.getX(i)) + posA.getY(idx.getX(i + 1)) + posA.getY(idx.getX(i + 2))) / 3;
        void frames;
        if (avgY - c.y < d.radius * 0.45) keep.push(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
      }
      tube.setIndex(keep);
    }
    col2.color(d.colour).add(tube);
    // supports
    const len = curve.getLength();
    for (let s = 5; s < len - 3; s += 6.5) {
      const p = curve.getPointAt(s / len);
      if (p.y - y < 1.5 || Math.abs(p.z) > 20.5) continue;
      steel.color(0xe0b83a).beam([p.x, y, p.z], [p.x, p.y - d.radius, p.z], 0.16, 0.16);
    }
    info.slides.push({ curve, radius: d.radius, closed: d.closed, seconds: d.seconds });
  }

  // water playground at the paddling pool: a frame with a tipping bucket and spray hoops
  const px = 52;
  const pz = -8.5;
  steel.color(0x3fa7d6);
  for (const [dx, dz] of [
    [-1.6, -1.6],
    [1.6, -1.6],
    [1.6, 1.6],
    [-1.6, 1.6],
  ])
    steel.beam([sx(px + dx), y, pz + dz], [sx(px + dx * 0.7), y + 5.2, pz + dz * 0.7], 0.2, 0.2);
  col.color(0xf2622e).box(sx(px), y + 5.3, pz, 3.2, 0.2, 3.2);
  const bucket = new THREE.Group();
  const bm = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.7, 1.5, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.5, side: THREE.DoubleSide }));
  bm.position.y = -0.2;
  bm.castShadow = true;
  bucket.add(bm);
  bucket.position.set(sx(px), y + 6.6, pz);
  info.bucket = bucket;
  info.meshes.push(bucket);
  for (const [hx, hz, c] of [
    [-3.4, 2.4, 0xe94f8a],
    [3.2, 2.8, 0x56b948],
    [0.4, -3.6, 0xf2c230],
  ]) {
    const hoop = new THREE.TorusGeometry(1.25, 0.11, 8, 20, Math.PI);
    hoop.rotateY(Math.atan2(hz, hx));
    hoop.translate(sx(px + hx), y + 0.1, pz + hz);
    col.color(c).add(hoop);
  }
}

function ropesCourse(parts: Parts, info: DetailInfo) {
  const y = Y19;
  const steel = parts.get('steel');
  const col = parts.get('color');
  const h = 6.6;
  // two towers either side, with stairs suggested by the bracing
  for (const s of [1, -1]) {
    const tz = s * 15.6;
    steel.color(0xd9c15a);
    for (const dx of [-1.6, 1.6]) for (const dz of [-1.6, 1.6]) steel.beam([sx(43 + dx), y, tz + dz], [sx(43 + dx), y + h + 2.6, tz + dz], 0.22, 0.22);
    col.color(0xd9b24a).box(sx(43), y + h, tz, 3.8, 0.16, 3.8);
    steel.beam([sx(41.4), y, tz - 1.6], [sx(44.6), y + h, tz - 1.6], 0.24, 0.1);
    steel.beam([sx(44.6), y + h / 2, tz + 1.6], [sx(41.4), y + h, tz + 1.6], 0.24, 0.1);
  }
  // the walkway arcs aft between the towers; hoops overhead carry the safety line
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = -1 + (i / 14) * 2;
    pts.push(new THREE.Vector3(sx(43 - 7.4 * Math.cos((a * Math.PI) / 2)), y + h + 0.1 - 0.35 * Math.sin(Math.abs(a) * Math.PI), a * 15.6));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  info.ropes = curve;
  const N = 44;
  for (let i = 0; i < N; i++) {
    const a = curve.getPointAt(i / N);
    const b = curve.getPointAt((i + 1) / N);
    // planks with gaps, then the two hand lines and the overhead rail
    if (i % 2 === 0) col.color(0x9a6a3c).beam([a.x, a.y, a.z], [b.x, b.y, b.z], 0.9, 0.07);
    steel.color(0xcfd4d8);
    for (const off of [-0.55, 0.55]) {
      const n = new THREE.Vector3(b.z - a.z, 0, -(b.x - a.x)).normalize().multiplyScalar(off);
      steel.beam([a.x + n.x, a.y + 1.1, a.z + n.z], [b.x + n.x, b.y + 1.1, b.z + n.z], 0.045, 0.045);
    }
    steel.color(0xd9c15a).beam([a.x, y + h + 2.9, a.z], [b.x, y + h + 2.9, b.z], 0.14, 0.14);
    if (i % 4 === 0 && i > 0) {
      steel.beam([a.x, y, a.z], [a.x, y + h + 2.9, a.z], 0.16, 0.16);
    }
  }
}

/** Sunbed, parasol and palm geometries (scene units, standing at the origin, facing +z). */
export function sunbedGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const add = (w: number, h: number, d: number, x: number, y: number, z: number, rx = 0) => {
    const g = new THREE.BoxGeometry(w, h, d);
    if (rx) g.rotateX(rx);
    g.translate(x, y, z);
    parts.push(g);
  };
  add(0.62, 0.07, 1.25, 0, 0.32, 0.2); // seat and leg rest
  add(0.62, 0.07, 0.75, 0, 0.5, -0.72, -0.55); // back rest, raised
  for (const sx_ of [-0.27, 0.27]) for (const z of [-0.55, 0.7]) add(0.05, 0.32, 0.05, sx_, 0.16, z);
  return mergeSimple(parts);
}

function mergeSimple(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  for (const g0 of list) {
    const g = g0.toNonIndexed();
    pos.push(...(g.getAttribute('position').array as Float32Array));
    nor.push(...(g.getAttribute('normal').array as Float32Array));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}

export function parasolGeometry(): THREE.BufferGeometry {
  const cone = new THREE.ConeGeometry(1.5, 0.55, 10, 1, true);
  cone.translate(0, 2.45, 0);
  const pole = new THREE.CylinderGeometry(0.03, 0.03, 2.5, 6);
  pole.translate(0, 1.25, 0);
  return mergeSimple([cone, pole]);
}

function palms(parts: Parts, list: { x: number; z: number; y: number; h: number }[]) {
  const col = parts.get('color');
  const col2 = parts.get('color2');
  const rand = rng(88);
  for (const p of list) {
    const lean = (rand() - 0.5) * 0.25;
    const trunk = new THREE.CylinderGeometry(0.12, 0.2, p.h, 7);
    trunk.translate(0, p.h / 2, 0);
    trunk.rotateZ(lean);
    trunk.translate(sx(p.x), p.y, p.z);
    col.color(0x7a5a3a).add(trunk);
    const tx = sx(p.x) - Math.sin(lean) * p.h;
    const ty = p.y + Math.cos(lean) * p.h;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rand();
      const len = 2.0 + rand() * 0.8;
      const mid: V3 = [tx + Math.cos(a) * len * 0.5, ty + 0.45, p.z + Math.sin(a) * len * 0.5];
      const tip: V3 = [tx + Math.cos(a) * len, ty - 0.55 - rand() * 0.4, p.z + Math.sin(a) * len];
      const w = 0.42;
      const nx = -Math.sin(a) * w;
      const nz = Math.cos(a) * w;
      col2.color(i % 2 ? 0x2f7a3a : 0x3c8f45);
      col2.quad([tx - nx * 0.4, ty, p.z - nz * 0.4], [tx + nx * 0.4, ty, p.z + nz * 0.4], [mid[0] + nx, mid[1], mid[2] + nz], [mid[0] - nx, mid[1], mid[2] - nz]);
      col2.tri([mid[0] - nx, mid[1], mid[2] - nz], [mid[0] + nx, mid[1], mid[2] + nz], tip);
    }
  }
}

export function buildDetails(parts: Parts, palmList: { x: number; z: number; y: number; h: number }[]): DetailInfo {
  const info: DetailInfo = { spinners: [], exhausts: [], slides: [], ropes: new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), flags: [], meshes: [], bucket: null };
  lifeboats(parts);
  funnel(parts, info);
  mast(parts, info);
  radomes(parts);
  slides(parts, info);
  ropesCourse(parts, info);
  palms(parts, palmList);
  // ensign at the stern and a jack at the bow
  parts.get('white').color(0xffffff).beam([sx(1.2), DECK_Y[16], 0], [sx(0.2), DECK_Y[16] + 7.5, 0], 0.14, 0.14);
  info.flags.push({ pos: new THREE.Vector3(sx(0.2), DECK_Y[16] + 5.3, 0), size: [3.4, 2.1], colours: [0xffffff, 0xd42e2e] });
  parts.get('white').beam([sx(327.5), 20.55, 0], [sx(327.5), 26.5, 0], 0.12, 0.12);
  info.flags.push({ pos: new THREE.Vector3(sx(327.5), 24.9, 0), size: [2.0, 1.3], colours: [0x15233f, 0xffffff] });
  return info;
}
