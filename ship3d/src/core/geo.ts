// A small geometry builder. The ship is assembled from thousands of quads, boxes and flat
// polygons; collecting them per material keeps the whole model in a handful of draw calls.
import * as THREE from 'three';
import { sx, type Pt } from './data';

export type V3 = [number, number, number];

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

export class Geo {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  idx: number[] = [];
  private r = 1;
  private g = 1;
  private b = 1;
  private tmp = new THREE.Color();

  /** Colour of the vertices added from now on (multiplies the material colour). */
  color(c: THREE.ColorRepresentation, mul = 1): this {
    this.tmp.set(c);
    this.r = this.tmp.r * mul;
    this.g = this.tmp.g * mul;
    this.b = this.tmp.b * mul;
    return this;
  }

  get count() {
    return this.pos.length / 3;
  }

  vert(p: V3, n: V3, u = 0, v = 0): number {
    this.pos.push(p[0], p[1], p[2]);
    this.nor.push(n[0], n[1], n[2]);
    this.uv.push(u, v);
    this.col.push(this.r, this.g, this.b);
    return this.pos.length / 3 - 1;
  }

  /** Quad a-b-c-d (in order around the edge). The normal follows the winding unless `facing` is given. */
  quad(a: V3, b: V3, c: V3, d: V3, facing?: V3, uv?: [number, number, number, number]): this {
    let n = norm(cross(sub(b, a), sub(d, a)));
    let flip = false;
    if (facing && n[0] * facing[0] + n[1] * facing[1] + n[2] * facing[2] < 0) {
      n = [-n[0], -n[1], -n[2]];
      flip = true;
    }
    const [u0, v0, u1, v1] = uv ?? [0, 0, 1, 1];
    const i = this.vert(a, n, u0, v0);
    this.vert(b, n, u1, v0);
    this.vert(c, n, u1, v1);
    this.vert(d, n, u0, v1);
    if (flip) this.idx.push(i, i + 2, i + 1, i, i + 3, i + 2);
    else this.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
    return this;
  }

  tri(a: V3, b: V3, c: V3, facing?: V3): this {
    let n = norm(cross(sub(b, a), sub(c, a)));
    let flip = false;
    if (facing && n[0] * facing[0] + n[1] * facing[1] + n[2] * facing[2] < 0) {
      n = [-n[0], -n[1], -n[2]];
      flip = true;
    }
    const i = this.vert(a, n);
    this.vert(b, n);
    this.vert(c, n);
    if (flip) this.idx.push(i, i + 2, i + 1);
    else this.idx.push(i, i + 1, i + 2);
    return this;
  }

  /** Axis-aligned box given by centre and size, optionally turned around Y (radians). Scene coordinates. */
  box(cx: number, cy: number, cz: number, w: number, h: number, d: number, rotY = 0, faces = 63): this {
    const hx = w / 2;
    const hy = h / 2;
    const hz = d / 2;
    const cs = Math.cos(rotY);
    const sn = Math.sin(rotY);
    const P = (x: number, y: number, z: number): V3 => [cx + x * cs + z * sn, cy + y, cz - x * sn + z * cs];
    const N = (x: number, y: number, z: number): V3 => [x * cs + z * sn, y, -x * sn + z * cs];
    if (faces & 1) this.quad(P(hx, -hy, hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(hx, hy, hz), N(1, 0, 0));
    if (faces & 2) this.quad(P(-hx, -hy, -hz), P(-hx, -hy, hz), P(-hx, hy, hz), P(-hx, hy, -hz), N(-1, 0, 0));
    if (faces & 4) this.quad(P(-hx, hy, hz), P(hx, hy, hz), P(hx, hy, -hz), P(-hx, hy, -hz), N(0, 1, 0));
    if (faces & 8) this.quad(P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, -hy, hz), P(-hx, -hy, hz), N(0, -1, 0));
    if (faces & 16) this.quad(P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz), N(0, 0, 1));
    if (faces & 32) this.quad(P(hx, -hy, -hz), P(-hx, -hy, -hz), P(-hx, hy, -hz), P(hx, hy, -hz), N(0, 0, -1));
    return this;
  }

  /** Box between two points (a beam, a post, a rail), with a square w x h cross-section. */
  beam(a: V3, b: V3, w: number, h = w): this {
    const dir = norm(sub(b, a));
    let up: V3 = Math.abs(dir[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
    const side = norm(cross(dir, up));
    up = norm(cross(side, dir));
    const s: V3 = [side[0] * w * 0.5, side[1] * w * 0.5, side[2] * w * 0.5];
    const u: V3 = [up[0] * h * 0.5, up[1] * h * 0.5, up[2] * h * 0.5];
    const c = (p: V3, i: number, j: number): V3 => [p[0] + s[0] * i + u[0] * j, p[1] + s[1] * i + u[1] * j, p[2] + s[2] * i + u[2] * j];
    this.quad(c(a, 1, -1), c(b, 1, -1), c(b, 1, 1), c(a, 1, 1), side);
    this.quad(c(a, -1, -1), c(b, -1, -1), c(b, -1, 1), c(a, -1, 1), [-side[0], -side[1], -side[2]]);
    this.quad(c(a, -1, 1), c(b, -1, 1), c(b, 1, 1), c(a, 1, 1), up);
    this.quad(c(a, -1, -1), c(b, -1, -1), c(b, 1, -1), c(a, 1, -1), [-up[0], -up[1], -up[2]]);
    return this;
  }

  /** Vertical wall from ship point p to q between heights y0 and y1, facing `out` (ship X/Z direction). */
  wall(p: Pt, q: Pt, y0: number, y1: number, out: Pt, uv?: [number, number, number, number]): this {
    return this.quad([sx(p[0]), y0, p[1]], [sx(q[0]), y0, q[1]], [sx(q[0]), y1, q[1]], [sx(p[0]), y1, p[1]], [out[0], 0, out[1]], uv);
  }

  /** Flat polygon (ship X/Z ring, optional holes) at height y, facing up or down. */
  poly(ring: Pt[], y: number, up = true, holes: Pt[][] = [], uvFn?: (x: number, z: number) => [number, number]): this {
    const contour = ring.map((p) => new THREE.Vector2(p[0], p[1]));
    const hs = holes.map((h) => h.map((p) => new THREE.Vector2(p[0], p[1])));
    // ShapeUtils wants the contour clockwise and holes counter-clockwise (or the reverse): normalise.
    if (THREE.ShapeUtils.isClockWise(contour)) contour.reverse();
    for (const h of hs) if (!THREE.ShapeUtils.isClockWise(h)) h.reverse();
    const tris = THREE.ShapeUtils.triangulateShape(contour, hs);
    const all = contour.concat(...hs);
    const base = this.count;
    const n: V3 = [0, up ? 1 : -1, 0];
    for (const v of all) {
      const t = uvFn ? uvFn(v.x, v.y) : [v.x * 0.25, v.y * 0.25];
      this.vert([sx(v.x), y, v.y], n, t[0], t[1]);
    }
    for (const [a, b, c] of tris) {
      // counter-clockwise in (X, Z) looks clockwise from above, so it already faces down
      if (up) this.idx.push(base + a, base + c, base + b);
      else this.idx.push(base + a, base + b, base + c);
    }
    return this;
  }

  /** Walls all around a ring, facing outwards. */
  ringWalls(ring: Pt[], y0: number, y1: number, inward = false): this {
    const ccw = ringSign(ring) > 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const l = Math.hypot(dx, dz);
      if (l < 1e-4) continue;
      let o: Pt = ccw ? [dz / l, -dx / l] : [-dz / l, dx / l];
      if (inward) o = [-o[0], -o[1]];
      this.wall(a, b, y0, y1, o, [0, 0, l / 3, (y1 - y0) / 3]);
    }
    return this;
  }

  /** A slab: top, bottom and edge of a ring between y0 and y1. */
  slab(ring: Pt[], y0: number, y1: number, holes: Pt[][] = [], uvFn?: (x: number, z: number) => [number, number], top = true): this {
    if (top) this.poly(ring, y1, true, holes, uvFn);
    this.poly(ring, y0, false, holes, uvFn);
    this.ringWalls(ring, y0, y1);
    for (const h of holes) this.ringWalls(h, y0, y1, true);
    return this;
  }

  /** Appends a three.js geometry (already in scene coordinates), tinted with the current colour. */
  add(g: THREE.BufferGeometry, m?: THREE.Matrix4): this {
    const src = g.index ? g.toNonIndexed() : g;
    if (m) src.applyMatrix4(m);
    const p = src.getAttribute('position');
    const n = src.getAttribute('normal');
    const t = src.getAttribute('uv');
    const base = this.count;
    for (let i = 0; i < p.count; i++) {
      this.pos.push(p.getX(i), p.getY(i), p.getZ(i));
      this.nor.push(n.getX(i), n.getY(i), n.getZ(i));
      this.uv.push(t ? t.getX(i) : 0, t ? t.getY(i) : 0);
      this.col.push(this.r, this.g, this.b);
      this.idx.push(base + i);
    }
    if (src !== g) src.dispose();
    return this;
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

function ringSign(p: Pt[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return a;
}

/** Geometry collectors keyed by material name. */
export class Parts {
  private geos = new Map<string, Geo>();
  get(key: string): Geo {
    let g = this.geos.get(key);
    if (!g) {
      g = new Geo();
      this.geos.set(key, g);
    }
    return g;
  }
  entries() {
    return [...this.geos.entries()].filter(([, g]) => g.count > 0);
  }
}
