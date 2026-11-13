// Assembles the ship: every builder adds its quads to a shared set of geometry collectors,
// one per material, so the finished model is a few large meshes.
import * as THREE from 'three';
import { rng, sx } from '../core/data';
import { Parts } from '../core/geo';
import { makeMaterials, type Mats } from '../core/materials';
import { buildDetails, parasolGeometry, sunbedGeometry, type DetailInfo } from './details';
import { buildHull, buildNames } from './hull';
import { buildSuperstructure, type SuperInfo } from './superstructure';
import { buildTopDecks, type TopInfo } from './topdecks';

export interface ShipModel {
  group: THREE.Group;
  mats: Mats;
  sup: SuperInfo;
  top: TopInfo;
  details: DetailInfo;
  /** the big screen by the pool, animated by Life */
  screen: THREE.Mesh;
}

const SCREEN_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uBeat;
  uniform float uNight;
  uniform float uGain;
  varying vec2 vUv;
  vec3 pal(float t) { return 0.5 + 0.5 * cos(6.2831853 * (t + vec3(0.0, 0.33, 0.67))); }
  void main() {
    // LED wall: bars that jump with the beat over drifting colour, with visible pixels
    vec2 cell = vec2(96.0, 42.0);
    vec2 g = floor(vUv * cell) / cell;
    float bar = floor(g.x * 24.0) / 24.0;
    float h = 0.25 + 0.55 * abs(sin(bar * 37.0 + uTime * 2.2)) * (0.55 + 0.45 * uBeat) + 0.12 * sin(bar * 91.0 + uTime * 5.0);
    float on = step(g.y, h);
    vec3 bg = pal(g.x * 0.6 + g.y * 0.3 + uTime * 0.07) * 0.32;
    float ring = smoothstep(0.03, 0.0, abs(length((g - 0.5) * vec2(2.2, 1.0)) - fract(uTime * 0.5) * 0.9));
    vec3 col = mix(bg, pal(bar + uTime * 0.13), on) + ring * 0.6;
    vec2 px = fract(vUv * cell);
    col *= smoothstep(0.0, 0.18, px.x) * smoothstep(0.0, 0.18, px.y);
    col *= mix(1.3, 1.6, uNight) * uGain;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function buildShip(): ShipModel {
  const group = new THREE.Group();
  const mats = makeMaterials();
  const parts = new Parts();

  const shells = buildHull(parts);
  const sup = buildSuperstructure(parts);
  const top = buildTopDecks(parts, sup);
  const details = buildDetails(parts, top.palms);

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, name: string) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    const see = mat.transparent || name === 'water';
    mesh.castShadow = !see && name !== 'lit' && name !== 'glow';
    mesh.receiveShadow = !see;
    if (mat.transparent) mesh.renderOrder = name === 'lit' ? 4 : 6;
    group.add(mesh);
    return mesh;
  };
  add(shells[0], mats.white, 'hull');
  add(shells[1], mats.navy, 'hull-under');
  for (const [key, g] of parts.entries()) {
    const mat = mats[key];
    if (!mat) throw new Error(`no material "${key}"`);
    add(g.build(), mat, key);
  }
  for (const m of buildNames()) {
    m.renderOrder = 2;
    group.add(m);
  }
  for (const m of details.meshes) group.add(m);

  // sunbeds: one instanced mesh, cushions in a few colours
  const rand = rng(2024);
  const beds = new THREE.InstancedMesh(sunbedGeometry(), new THREE.MeshStandardMaterial({ roughness: 0.8 }), top.sunbeds.length);
  const dummy = new THREE.Object3D();
  const c = new THREE.Color();
  const bedColours = [0xf4f4f0, 0xf4f4f0, 0x2a67c9, 0x2a67c9, 0xf2a22e, 0xe9e2d0];
  top.sunbeds.forEach((b, i) => {
    dummy.position.set(sx(b.x), b.y, b.z);
    dummy.rotation.set(0, b.rot, 0);
    dummy.updateMatrix();
    beds.setMatrixAt(i, dummy.matrix);
    beds.setColorAt(i, c.set(b.deck === 19 ? 0xf4f4f0 : bedColours[Math.floor(rand() * bedColours.length)]));
  });
  beds.castShadow = true;
  beds.receiveShadow = true;
  beds.name = 'sunbeds';
  group.add(beds);

  const sunshades = new THREE.InstancedMesh(parasolGeometry(), new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide }), top.parasols.length);
  top.parasols.forEach((p, i) => {
    dummy.position.set(sx(p.x), p.y, p.z);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    sunshades.setMatrixAt(i, dummy.matrix);
    sunshades.setColorAt(i, c.set(p.colour));
  });
  sunshades.castShadow = true;
  sunshades.name = 'parasols';
  group.add(sunshades);

  const led = top.ledScreen;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(led.w, led.h),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uBeat: { value: 0 }, uNight: { value: 0 }, uGain: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: SCREEN_FRAG,
    }),
  );
  screen.position.set(led.x, led.y, led.z);
  screen.rotation.y = Math.PI / 2;
  screen.name = 'led-screen';
  group.add(screen);

  return { group, mats, sup, top, details, screen };
}
