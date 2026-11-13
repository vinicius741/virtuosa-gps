// Inside the hull: the floors of decks 5 to 7 with every venue of the plans marked out, and the
// Galleria, the two-deck indoor promenade under an LED sky. It is only drawn when the camera goes
// inside or the ship is cut open (see ShipScene.setInterior), because from outside it is hidden.
import * as THREE from 'three';
import { DECK_Y, bounds, deck, sx, type Pt } from '../core/data';
import { Parts } from '../core/geo';
import type { Mats } from '../core/materials';
import { hullHalf } from './hull';
import { edges, rrect, screen } from './kit';

/** The promenade: ship X range, half-width of the walk and of the opening in deck 7. */
export const GALLERIA = { x0: 128, x1: 232, half: 6.4, open: 3.9, y6: DECK_Y[6], y7: DECK_Y[7], top: DECK_Y[8] - 0.32 };
/** Where the party is, on the promenade floor. */
export const GALLERIA_PARTY = { x0: 172, x1: 188 };

const CATEGORY: Record<string, number> = {
  comida: 0xe9c98a,
  bar: 0xd98aa6,
  show: 0xa58ad9,
  loja: 0xe0a67a,
  servico: 0x9ac4a2,
  circulacao: 0xcfcabb,
  restrito: 0xb5b5b5,
};

const SKY_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uGain;
  varying vec2 vUv;
  vec3 pal(float t) { return 0.5 + 0.5 * cos(6.2831853 * (t + vec3(0.0, 0.2, 0.45))); }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  void main() {
    // the LED dome: slow clouds of colour with ribbons of light running the length of the promenade
    vec2 p = vec2(vUv.x * 16.0, vUv.y * 2.0);
    float n = noise(p * 0.9 + vec2(uTime * 0.25, 0.0)) * 0.6 + noise(p * 2.3 - vec2(uTime * 0.4, uTime * 0.1)) * 0.4;
    vec3 col = pal(n * 0.9 + vUv.x * 0.6 + uTime * 0.03) * (0.35 + 0.65 * n);
    float ribbon = smoothstep(0.06, 0.0, abs(vUv.y - 0.5 - 0.3 * sin(vUv.x * 22.0 + uTime * 1.6)));
    col += vec3(1.0, 0.95, 0.85) * ribbon * 0.8;
    float star = step(0.992, hash(floor(vUv * vec2(520.0, 64.0)))) * (0.5 + 0.5 * sin(uTime * 3.0 + vUv.x * 90.0));
    col += star;
    // panel seams
    vec2 cell = fract(vUv * vec2(52.0, 6.0));
    col *= 0.82 + 0.18 * smoothstep(0.0, 0.06, cell.x) * smoothstep(0.0, 0.1, cell.y);
    gl_FragColor = vec4(col * 1.15 * uGain, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface Interior {
  group: THREE.Group;
  sky: THREE.Mesh;
}

export function buildInterior(mats: Mats): Interior {
  const group = new THREE.Group();
  group.name = 'interior';
  const parts = new Parts();
  const white = parts.get('white');
  const colour = parts.get('color');
  const glow = parts.get('glow');
  const dark = parts.get('dark');
  const G = GALLERIA;

  // floors that follow the hull
  const floorRing = (y: number, x0: number, x1: number): Pt[] => {
    const side: Pt[] = [];
    for (let X = x0; X <= x1; X += 6) side.push([X, Math.max(hullHalf(X, y) - 0.25, 0.5)]);
    side.push([x1, Math.max(hullHalf(x1, y) - 0.25, 0.5)]);
    return [...side, ...side.reverse().map(([X, z]) => [X, -z] as Pt)];
  };
  // deck 7 opens over the promenade, with three bridges across
  const holes: Pt[][] = [];
  const spans = [G.x0 + 2, 152, 156, 178, 182, 204, 208, G.x1 - 2];
  for (let k = 0; k < spans.length; k += 2) holes.push(rrect(spans[k], spans[k + 1], -G.open, G.open, 1.2));
  for (const n of [5, 6, 7]) {
    const y = DECK_Y[n];
    const ring = floorRing(y, 3, n === 5 ? 316 : 292);
    white.color(0xd9d4c8).slab(ring, y - 0.25, y, n === 7 ? holes : []);
    // venues from the plan: a coloured floor and waist-high partitions, so you can see in
    for (const r of deck(n).rooms) {
      if (/Galleria|Elevadores|Escadas|Atrium/i.test(r.n)) continue;
      const b = bounds(r.p);
      const overlaps = n >= 6 && b.x1 > G.x0 && b.x0 < G.x1;
      if (overlaps && Math.abs(b.cz) < G.half + 1.5) continue; // would stand in the promenade
      const c = CATEGORY[r.c] ?? 0xcfcabb;
      const hull = hullHalf(b.cx, y) - 0.4;
      // venues beside the promenade stop at its shop fronts
      const keepOut = overlaps ? G.half + 1.2 : 0;
      const poly = r.p.map(([X, z]) => [X, Math.sign(b.cz) * Math.max(Math.min(Math.abs(z), hull), keepOut)] as Pt);
      colour.color(c).poly(poly, y + 0.02, true);
      colour.color(c, 0.72).ringWalls(poly, y, y + 1.15);
      colour.ringWalls(poly, y, y + 1.15, true);
    }
  }
  for (const h of holes) for (const e of edges(h)) screen(parts, { ...e, o: [-e.o[0], -e.o[1]] }, G.y7, 1.1, 0xffffff, 0);

  // the promenade: polished floor, shop fronts on two levels, the LED sky
  colour.color(0xb9a58a).poly(rrect(G.x0, G.x1, -G.half, G.half), G.y6 + 0.03, true);
  // an inlaid runner down the middle
  colour.color(0xe8dcc0).poly(rrect(G.x0 + 1, G.x1 - 1, -1.1, 1.1, 1), G.y6 + 0.045, true);
  const shopColours = [0xffc66e, 0xff8fb1, 0x8fd3ff, 0xfff1c9, 0xb9a0ff, 0x9df0c0, 0xffa66e];
  let k = 0;
  for (const [y0, y1] of [
    [G.y6, G.y7 - 0.3],
    [G.y7, G.top],
  ]) {
    for (const s of [1, -1]) {
      for (let X = G.x0; X < G.x1 - 0.5; X += 6.5) {
        const X1 = Math.min(X + 6.5, G.x1);
        const z = s * (G.half + (y0 === G.y7 ? 0.9 : 0));
        // glowing shop window between dark pilasters, a sign band above
        glow.color(shopColours[k++ % shopColours.length], 0.85).wall([X + 0.5, z], [X1 - 0.5, z], y0 + 0.25, y1 - 0.75, [0, -s]);
        glow.color(shopColours[(k * 3) % shopColours.length], 0.5).wall([X + 0.5, z - s * 0.02], [X1 - 0.5, z - s * 0.02], y1 - 0.62, y1 - 0.2, [0, -s]);
        dark.color(0x2a2622).box(sx(X), (y0 + y1) / 2, z - s * 0.1, 0.5, y1 - y0, 0.3);
      }
    }
  }
  // end walls with tall light panels
  for (const [X, dir] of [
    [G.x0, 1],
    [G.x1, -1],
  ]) {
    dark.color(0x2a2622).wall([X, -G.half - 1], [X, G.half + 1], G.y6, G.top, [dir, 0]);
    glow.color(0xfff1c9, 0.7).wall([X + dir * 0.05, -3.2], [X + dir * 0.05, 3.2], G.y6 + 2.6, G.top - 0.6, [dir, 0]);
  }
  // DJ booth and a bar island where the party is
  const px = (GALLERIA_PARTY.x0 + GALLERIA_PARTY.x1) / 2;
  dark.color(0x1c1a20).box(sx(GALLERIA_PARTY.x1 + 2.2), G.y6 + 0.6, 0, 1.4, 1.2, 3.6);
  glow.color(0xff3d81, 0.8).box(sx(GALLERIA_PARTY.x1 + 1.48), G.y6 + 0.6, 0, 0.04, 0.8, 3.2, 0, 2);
  colour.color(0x6b4a32).box(sx(px - 14), G.y6 + 0.55, 0, 5, 1.1, 2);
  const tiles = [0xff3d81, 0x29d3ff, 0xffd23d, 0x8a5cff];
  for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) glow.color(tiles[(i + j * 2) % 4], 0.3).box(sx(GALLERIA_PARTY.x0 + i * 2 + 1), G.y6 + 0.06, -5 + j * 2, 1.9, 0.03, 1.9, 0, 4);

  for (const [key, g] of parts.entries()) {
    const m = new THREE.Mesh(g.build(), mats[key]);
    m.name = `interior-${key}`;
    if (mats[key].transparent) m.renderOrder = 6;
    group.add(m);
  }
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(G.x1 - G.x0, G.half * 2 + 1.8),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uGain: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: SKY_FRAG,
      side: THREE.DoubleSide,
    }),
  );
  sky.rotation.x = Math.PI / 2;
  sky.position.set(sx((G.x0 + G.x1) / 2), G.top - 0.02, 0);
  sky.name = 'galleria-sky';
  group.add(sky);
  return { group, sky };
}
