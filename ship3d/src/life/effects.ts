// Small moving things that sell the scene: spray where the slides end and where the bow cuts
// the sea, the tipping bucket of the water playground, haze over the funnel, flags, and the
// party lights that sweep the pool deck once the sun is low.
import * as THREE from 'three';
import { rng, sx } from '../core/data';
import type { ShipModel } from '../ship';
import { COURT, STAGE, Y15, Y19 } from '../ship/topdecks';
import type { SplashEvent } from './crowd';

const MAX = 1400;

const POINT_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec4 aColor;
  varying vec4 vColor;
  uniform float uScale;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
    gl_Position = projectionMatrix * mv;
  }
`;
const POINT_FRAG = /* glsl */ `
  varying vec4 vColor;
  uniform float uGain;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.25, d) * vColor.a;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor.rgb * uGain, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class Effects {
  readonly group = new THREE.Group();
  private pos = new Float32Array(MAX * 3);
  private vel = new Float32Array(MAX * 3);
  private life = new Float32Array(MAX);
  private span = new Float32Array(MAX);
  private size = new Float32Array(MAX);
  private size0 = new Float32Array(MAX);
  private col = new Float32Array(MAX * 4);
  /** 0 = water drop (falls), 1 = haze (rises and spreads) */
  private kind = new Uint8Array(MAX);
  private next = 0;
  private points: THREE.Points;
  private pmat: THREE.ShaderMaterial;
  private rand = rng(99);
  private flags: THREE.ShaderMaterial[] = [];
  private beams: { mesh: THREE.Mesh; phase: number; speed: number }[] = [];
  private beamMat: THREE.ShaderMaterial;
  private bulbs: THREE.Points;
  private bucketT = 0;
  private jets: { x: number; y: number; z: number; vx: number; vy: number; vz: number; rate: number }[] = [];

  constructor(
    private ship: ShipModel,
    private lowPower: boolean,
  ) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    this.pmat = new THREE.ShaderMaterial({ vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, uniforms: { uScale: { value: 600 }, uGain: { value: 1 } }, transparent: true, depthWrite: false });
    this.points = new THREE.Points(g, this.pmat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 8;
    this.group.add(this.points);

    // flags: a strip of cloth that ripples away from its hoist
    for (const f of ship.details.flags) {
      const geo = new THREE.PlaneGeometry(f.size[0], f.size[1], 12, 4);
      geo.translate(-f.size[0] / 2, 0, 0);
      const mat = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 }, uA: { value: new THREE.Color(f.colours[0]) }, uB: { value: new THREE.Color(f.colours[1]) }, uLen: { value: f.size[0] }, uLight: { value: 1 } },
        vertexShader: /* glsl */ `
          uniform float uTime; uniform float uLen; varying vec2 vUv; varying float vShade;
          void main() {
            vUv = uv;
            vec3 p = position;
            float k = -p.x / uLen;
            float w = sin(p.x * 3.2 + uTime * 9.0) * 0.22 * k + sin(p.x * 1.3 + uTime * 5.3 + p.y) * 0.16 * k;
            p.z += w; p.y -= k * k * 0.25;
            vShade = 0.8 + w * 1.2;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uA; uniform vec3 uB; uniform float uLight; varying vec2 vUv; varying float vShade;
          void main() {
            vec3 c = vUv.y > 0.5 ? uA : uB;
            gl_FragColor = vec4(c * vShade * uLight, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(f.pos);
      this.flags.push(mat);
      this.group.add(m);
    }

    // party beams from the truss over the stage
    this.beamMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uOn: { value: 0 } },
      vertexShader: 'attribute vec3 color; varying vec3 vC; varying float vT; void main(){ vC = color; vT = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uOn; varying vec3 vC; varying float vT; void main(){ gl_FragColor = vec4(vC * uOn * (0.05 + 0.5 * vT * vT), 1.0); }',
    });
    const beamColours = [0xff3d81, 0x29d3ff, 0xffd23d, 0x8a5cff, 0x3dffa2, 0xffffff];
    for (let k = 0; k < (lowPower ? 4 : 8); k++) {
      const len = 26;
      const cone = new THREE.ConeGeometry(2.4, len, 14, 1, true);
      cone.translate(0, -len / 2, 0);
      const c = new THREE.Color(beamColours[k % beamColours.length]);
      const cols = new Float32Array(cone.getAttribute('position').count * 3);
      for (let i = 0; i < cols.length; i += 3) c.toArray(cols, i);
      cone.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      const mesh = new THREE.Mesh(cone, this.beamMat);
      mesh.position.set(sx(STAGE.x1 - 0.3), Y15 + 9.0, -STAGE.z + ((k + 0.5) / 8) * STAGE.z * 2 * (lowPower ? 2 : 1));
      mesh.renderOrder = 9;
      this.beams.push({ mesh, phase: k * 1.7, speed: 0.5 + (k % 3) * 0.23 });
      this.group.add(mesh);
    }

    // festoon lights round the pool court and along the top-deck rails
    const bulbPos: number[] = [];
    const bulbCol: number[] = [];
    const warm = new THREE.Color(1, 0.78, 0.45);
    const addBulbs = (x0: number, z0: number, x1: number, z1: number, y: number, step: number, sag: number, colour = warm) => {
      const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / step));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        bulbPos.push(sx(x0 + (x1 - x0) * t), y - sag * Math.sin(Math.PI * ((t * 4) % 1)), z0 + (z1 - z0) * t);
        bulbCol.push(colour.r, colour.g, colour.b);
      }
    };
    const y16 = ship.top.pools.find((p) => p.name === 'Horizon Pool')!.y + 3.6;
    for (const s of [1, -1]) {
      addBulbs(COURT.x0, s * COURT.z, COURT.x1, s * COURT.z, y16, 1.1, 0.5);
      addBulbs(COURT.x0, s * COURT.z, COURT.x0 + 20, 0, y16 + 1.5, 1.2, 0.7);
      addBulbs(COURT.x1, s * COURT.z, COURT.x1 - 20, 0, y16 + 1.5, 1.2, 0.7);
      addBulbs(47, s * 16.5, 90, s * 16.5, Y19 + 3.2, 1.4, 0.4, new THREE.Color(0.5, 0.9, 1));
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(bulbPos, 3));
    bg.setAttribute('aColor', new THREE.Float32BufferAttribute(bulbCol.flatMap((v, i) => (i % 3 === 2 ? [v, 1] : [v])), 4));
    bg.setAttribute('aSize', new THREE.Float32BufferAttribute(new Float32Array(bulbPos.length / 3).fill(0.55), 1));
    this.bulbs = new THREE.Points(bg, new THREE.ShaderMaterial({ vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, uniforms: { uScale: { value: 600 }, uGain: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.bulbs.renderOrder = 9;
    this.group.add(this.bulbs);

    // fountains of the water playground and the jets that feed the slides' splash pool
    const px = 52;
    const pz = -8.5;
    for (const [hx, hz] of [
      [-3.4, 2.4],
      [3.2, 2.8],
      [0.4, -3.6],
    ])
      this.jets.push({ x: sx(px + hx), y: Y19 + 1.3, z: pz + hz, vx: 0, vy: 0.4, vz: 0, rate: 16 });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      this.jets.push({ x: sx(px + Math.cos(a) * 2.6), y: Y19 + 0.15, z: pz + Math.sin(a) * 2.6, vx: -Math.cos(a) * 1.3, vy: 5.2, vz: -Math.sin(a) * 1.3, rate: 14 });
    }
  }

  private emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, kind: number, r: number, g: number, b: number, a: number) {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.life[i] = life;
    this.span[i] = life;
    this.size0[i] = size;
    this.kind[i] = kind;
    this.col.set([r, g, b, a], i * 4);
  }

  splash(e: SplashEvent, power = 1) {
    const r = this.rand;
    const n = Math.round((this.lowPower ? 14 : 30) * power);
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2;
      const sp = (0.6 + r() * 2.2) * Math.sqrt(power);
      this.emit(e.x + Math.cos(a) * 0.3, e.y + 0.1, e.z + Math.sin(a) * 0.3, Math.cos(a) * sp, 2.4 + r() * 3.4 * Math.sqrt(power), Math.sin(a) * sp, 0.7 + r() * 0.6, 0.35 + r() * 0.4, 0, 0.9, 0.97, 1, 0.9);
    }
  }

  update(dt: number, time: number, o: { night: number; gain: number; light: number; speed: number; pixelHeight: number; fov: number; splashes: SplashEvent[] }) {
    const r = this.rand;
    for (const s of o.splashes) this.splash(s);

    // steady jets
    for (const j of this.jets) {
      let n = j.rate * dt * (this.lowPower ? 0.5 : 1);
      while (n > 0) {
        if (n >= 1 || r() < n) this.emit(j.x + (r() - 0.5) * 0.3, j.y, j.z + (r() - 0.5) * 0.3, j.vx + (r() - 0.5) * 0.9, j.vy + r() * 0.8, j.vz + (r() - 0.5) * 0.9, 0.9 + r() * 0.4, 0.22 + r() * 0.2, 0, 0.88, 0.96, 1, 0.8);
        n -= 1;
      }
    }
    // the bucket fills, tips, and empties over whoever stands below
    const bucket = this.ship.details.bucket;
    if (bucket) {
      this.bucketT = (this.bucketT + dt) % 14;
      const t = this.bucketT;
      const tip = t < 10.5 ? Math.sin(t * 2.2) * 0.05 * (t / 10.5) : t < 11.3 ? ((t - 10.5) / 0.8) * 2.1 : t < 12.6 ? 2.1 : 2.1 * (1 - (t - 12.6) / 1.4);
      bucket.rotation.z = tip;
      if (t > 11.0 && t < 12.3) {
        for (let k = 0; k < (this.lowPower ? 4 : 9); k++) this.emit(bucket.position.x - 1.1 + (r() - 0.5) * 1.6, bucket.position.y - 0.6, bucket.position.z + (r() - 0.5) * 1.6, -0.6 + (r() - 0.5), -1 - r() * 2, (r() - 0.5) * 1.2, 1.3, 0.45 + r() * 0.3, 0, 0.9, 0.97, 1, 0.9);
      }
    }
    // spray thrown up where the stem meets the swell
    const sprayRate = (this.lowPower ? 14 : 34) * (o.speed / 9.5);
    let n = sprayRate * dt;
    while (n > 0) {
      if (n >= 1 || r() < n) {
        const side = r() < 0.5 ? 1 : -1;
        const back = r() * 16;
        this.emit(sx(322.5 - back) + r(), 0.3 + r() * 0.8, side * (0.8 + back * 0.42), 1 + r() * 2.5, 2.2 + r() * 3.2, side * (2.2 + r() * 3.5), 1.0 + r() * 0.7, 0.7 + r() * 1.1, 0, 0.95, 0.98, 1, 0.5);
      }
      n -= 1;
    }
    // a thin warm haze from the exhausts, carried aft
    if (!this.lowPower || r() < 0.5) {
      const ex = this.ship.details.exhausts;
      if (ex.length && r() < dt * 16) {
        const e = ex[Math.floor(r() * ex.length)];
        this.emit(e.x, e.y + 0.3, e.z, -2.5 - r() * 2, 1.6 + r(), (r() - 0.5) * 0.8, 3.2 + r() * 2, 2.2 + r() * 1.5, 1, 0.42, 0.42, 0.44, 0.1);
      }
    }

    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) {
        this.size[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      const k = i * 3;
      const t = 1 - Math.max(this.life[i], 0) / this.span[i];
      if (this.kind[i] === 0) {
        this.vel[k + 1] -= 9.8 * dt;
        this.vel[k] -= o.speed * 0.12 * dt;
        this.size[i] = this.size0[i] * (1 + t * 0.8);
        this.col[i * 4 + 3] = (1 - t * t) * 0.85;
      } else {
        this.vel[k] -= o.speed * 0.5 * dt;
        this.size[i] = this.size0[i] * (1 + t * 4);
        this.col[i * 4 + 3] = 0.1 * (1 - t) * Math.min(1, t * 6);
      }
      this.pos[k] += this.vel[k] * dt;
      this.pos[k + 1] += this.vel[k + 1] * dt;
      this.pos[k + 2] += this.vel[k + 2] * dt;
      if (this.life[i] <= 0) this.size[i] = 0;
    }
    const g = this.points.geometry;
    g.getAttribute('position').needsUpdate = true;
    g.getAttribute('aSize').needsUpdate = true;
    g.getAttribute('aColor').needsUpdate = true;
    // point size in pixels for a 1 m sprite at 1 m
    const scale = o.pixelHeight / (2 * Math.tan((o.fov * Math.PI) / 360));
    this.pmat.uniforms.uScale.value = scale;
    this.pmat.uniforms.uGain.value = o.light;
    const bm = this.bulbs.material as THREE.ShaderMaterial;
    bm.uniforms.uScale.value = scale;
    bm.uniforms.uGain.value = 2.2 * o.gain;
    this.bulbs.visible = o.night > 0.25;

    for (const f of this.flags) {
      f.uniforms.uTime.value = time;
      f.uniforms.uLight.value = o.light;
    }
    const on = Math.max(0, (o.night - 0.2) / 0.8);
    this.beamMat.uniforms.uOn.value = on * 0.55 * o.gain;
    for (const b of this.beams) {
      b.mesh.visible = on > 0.01;
      // sweeping out over the dance floor and the pool
      b.mesh.rotation.z = -0.95 + Math.sin(time * b.speed + b.phase) * 0.45;
      b.mesh.rotation.x = Math.sin(time * b.speed * 0.7 + b.phase * 2.1) * 0.6;
    }
  }
}
