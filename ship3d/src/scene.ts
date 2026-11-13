// The whole thing as one object: give it an element and it renders the ship at sea.
// Everything the page's controls do goes through the methods of ShipScene, so the same scene
// can be embedded in another site without this project's UI.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clamp, lerp, sx } from './core/data';
import { Environment } from './env/sky';
import { Ocean } from './env/ocean';
import { Crowd } from './life/crowd';
import { Effects } from './life/effects';
import { buildShip, type ShipModel } from './ship';
import { GALLERIA, buildInterior, type Interior } from './ship/interior';

export type Quality = 'low' | 'medium' | 'high';

export interface Shot {
  id: string;
  /** camera position and what it looks at, scene coordinates (metres, ship centred on x = 0) */
  pos: [number, number, number];
  target: [number, number, number];
  /** degrees per second the camera drifts round its target once it has arrived */
  drift?: number;
  /** go to this hour of the day (0 to 24) */
  hour?: number;
  /** camera is inside the ship: light the interior */
  interior?: boolean;
  /** cut the ship open along its length at this distance from the centre line (metres) */
  cut?: number;
}

/** The views offered by the page, in the order the tour plays them. */
export const SHOTS: Shot[] = [
  { id: 'ship', pos: [310, 62, 235], target: [0, 24, 0], drift: 1.6 },
  { id: 'pool', pos: [52, 66, 40], target: [22, 40, 0], drift: 2.2 },
  { id: 'party', pos: [17, 49.5, 22], target: [-4, 41, 1], drift: 1.2 },
  { id: 'aquapark', pos: [-78, 70, 38], target: [-106, 52, 2], drift: 2.4 },
  { id: 'balconies', pos: [70, 31, 44], target: [44, 27.5, 21], drift: 0.5 },
  { id: 'bow', pos: [255, 40, -96], target: [128, 27, 0], drift: -1.2 },
  { id: 'stern', pos: [-232, 60, 34], target: [-150, 41, 0], drift: -1.5 },
  { id: 'galleria', pos: [sx(GALLERIA.x0 + 5), GALLERIA.y6 + 2.4, 1.2], target: [sx(GALLERIA.x0 + 60), GALLERIA.y6 + 2.2, 0], interior: true },
  { id: 'cutaway', pos: [34, 25, 66], target: [16, 17, 0], drift: 0.35, interior: true, cut: 2.6 },
  { id: 'sunset', pos: [290, 24, -205], target: [0, 26, 0], drift: -0.9, hour: 18.0 },
  { id: 'night', pos: [70, 78, 70], target: [14, 40, 0], drift: 1.6, hour: 21.5 },
];

export interface ShipSceneOptions {
  quality?: Quality;
  /** hour of the day to start at, 0 to 24 (default mid-afternoon) */
  hour?: number;
  /** start on this shot (default: the whole ship) */
  shot?: string;
  /** play the tour until the user takes the camera */
  tour?: boolean;
  onShot?: (shot: Shot, byTour: boolean) => void;
  onHour?: (hour: number) => void;
  /** called once the first frame is on screen */
  onReady?: () => void;
}

/** Mid-afternoon: the hour the page opens at. */
const DAY_HOUR = 15.2;

const QUALITY: Record<Quality, { dpr: number; density: number; shadows: boolean; low: boolean }> = {
  low: { dpr: 1.25, density: 0.4, shadows: false, low: true },
  medium: { dpr: 1.5, density: 0.7, shadows: true, low: true },
  high: { dpr: 2, density: 1, shadows: true, low: false },
};

/** A phone or a small laptop gets fewer people and a lighter sea. */
export function guessQuality(): Quality {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  if (coarse) return cores >= 8 ? 'medium' : 'low';
  return cores >= 8 ? 'high' : 'medium';
}

export class ShipScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly env: Environment;
  readonly ocean: Ocean;
  readonly ship: ShipModel;
  readonly interior: Interior;
  readonly crowd: Crowd;
  readonly effects: Effects;
  readonly quality: Quality;
  /** hours of ship time per real second while the clock runs */
  timeLapse = 0;
  tour = false;
  private shot: Shot = SHOTS[0];
  private opts: ShipSceneOptions;
  private time = 0;
  private last = performance.now();
  private raf = 0;
  private fly: { t: number; dur: number; p0: THREE.Vector3; t0: THREE.Vector3; p1: THREE.Vector3; t1: THREE.Vector3; h0: number; h1: number | null } | null = null;
  private tourT = 0;
  private userHold = 0;
  /** the Galleria view walks the camera along the promenade until the user takes it */
  private stroll = true;
  private fill = new THREE.AmbientLight(0xfff0e0, 0);
  private clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  private inside = false;
  private calm = false;
  private dpr: number;
  private maxDpr: number;
  private frames = 0;
  private slow = 0;
  private fpsT = 0;
  private ready = false;
  private resizeObs: ResizeObserver;
  private disposed = false;

  constructor(
    private el: HTMLElement,
    opts: ShipSceneOptions = {},
  ) {
    this.opts = opts;
    this.quality = opts.quality ?? guessQuality();
    const q = QUALITY[this.quality];
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.maxDpr = Math.min(devicePixelRatio || 1, q.dpr);
    this.dpr = this.maxDpr;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = q.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.setAttribute('aria-label', '3D view of the ship at sea');
    el.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(38, 1, 2, 90000);
    this.env = new Environment(this.renderer, this.scene, q.low);
    const hour = opts.hour !== undefined && Number.isFinite(opts.hour) ? opts.hour : undefined;
    this.env.setHour(hour ?? SHOTS.find((s) => s.id === opts.shot)?.hour ?? DAY_HOUR);
    this.ocean = new Ocean(this.env, q.low);
    this.scene.add(this.ocean.mesh, this.fill);

    this.ship = buildShip();
    this.interior = buildInterior(this.ship.mats);
    this.interior.group.visible = false;
    this.ship.group.add(this.interior.group);
    this.crowd = new Crowd(this.ship, q.density, q.shadows && this.quality === 'high');
    this.ship.group.add(this.crowd.people.mesh);
    this.effects = new Effects(this.ship, q.low);
    this.ship.group.add(this.effects.group);
    this.scene.add(this.ship.group);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.497;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 1500;
    this.controls.zoomSpeed = 0.9;
    this.controls.addEventListener('start', () => {
      // the user took the camera: stop flying and stop the tour
      this.fly = null;
      this.userHold = 6;
      this.stroll = false;
      if (this.tour) {
        this.tour = false;
        this.opts.onShot?.(this.shot, false);
      }
    });

    const first = SHOTS.find((s) => s.id === opts.shot) ?? SHOTS[0];
    this.shot = first;
    this.camera.position.set(...first.pos);
    this.controls.target.set(...first.target);
    this.applyMode(first);
    // no camera that moves by itself for people who asked their system for less motion
    this.calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.tour = (opts.tour ?? false) && !this.calm;

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(el);
    this.resize();
    this.frame = this.frame.bind(this);
    this.raf = requestAnimationFrame(this.frame);
  }

  get hour() {
    return this.env.hour;
  }

  get currentShot() {
    return this.shot;
  }

  setHour(h: number) {
    this.env.setHour(h);
    this.opts.onHour?.(this.env.hour);
  }

  /** Fly the camera to one of SHOTS (by id) or to any shot description. */
  goTo(shot: string | Shot, seconds = 2.6, byTour = false) {
    const s = typeof shot === 'string' ? SHOTS.find((x) => x.id === shot) : shot;
    if (!s) return;
    this.shot = s;
    if (!byTour) this.tour = false;
    const p1 = new THREE.Vector3(...s.pos);
    const t1 = new THREE.Vector3(...s.target);
    // on a tall, narrow screen stand further back so the subject still fits
    const aspect = this.camera.aspect;
    if (aspect < 1 && !s.interior) p1.sub(t1).multiplyScalar(lerp(1.75, 1, clamp((aspect - 0.45) / 0.55, 0, 1))).add(t1);
    // the tour comes back to the afternoon after its sunset and night shots; a view picked by hand keeps the hour
    const h1 = s.hour ?? (byTour && SHOTS.includes(s) ? DAY_HOUR : null);
    this.fly = { t: 0, dur: seconds, p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1, t1, h0: this.env.hour, h1 };
    this.stroll = true;
    this.applyMode(s);
    this.userHold = 0;
    this.tourT = 0;
    this.opts.onShot?.(s, byTour);
  }

  startTour() {
    this.tour = true;
    this.tourT = 0;
    this.goTo(SHOTS[(SHOTS.indexOf(this.shot) + 1) % SHOTS.length], 3.2, true);
  }

  /** Light the inside of the ship, and optionally cut it open `cut` metres from the centre line. */
  setInterior(on: boolean, cut: number | null = null) {
    const cutting = on && cut !== null;
    if (on !== this.inside || cutting !== this.renderer.clippingPlanes.length > 0) {
      this.inside = on;
      this.interior.group.visible = on;
      // seen from inside, walls need their back faces too
      for (const [key, m] of Object.entries(this.ship.mats)) {
        if (!(m instanceof THREE.MeshStandardMaterial) || key.endsWith('2') || key === 'rail') continue;
        m.side = on ? THREE.DoubleSide : THREE.FrontSide;
        m.needsUpdate = true;
      }
      for (const name of ['hull', 'hull-under']) {
        const mesh = this.ship.group.getObjectByName(name) as THREE.Mesh | undefined;
        if (mesh) mesh.visible = true;
      }
      this.renderer.clippingPlanes = cutting ? [this.clip] : [];
    }
    if (cutting) this.clip.constant = cut!;
  }

  private applyMode(s: Shot) {
    this.setInterior(!!s.interior, s.cut ?? null);
    this.controls.minDistance = s.interior && s.cut === undefined ? 0.5 : 4;
  }

  private resize() {
    const w = this.el.clientWidth || 1;
    const h = this.el.clientHeight || 1;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    // keep the horizontal view on tall phone screens from getting too narrow
    this.camera.fov = this.camera.aspect < 1 ? lerp(52, 38, clamp((this.camera.aspect - 0.45) / 0.55, 0, 1)) : 38;
    this.camera.updateProjectionMatrix();
  }

  private frame(now: number) {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    // the first timestamp can be earlier than the moment the scene was built
    const real = clamp((now - this.last) / 1000, 0, 0.1);
    this.last = now;
    const dt = real;
    this.time += dt;
    const time = this.time;

    // --- camera
    if (this.fly) {
      const f = this.fly;
      f.t = Math.min(1, f.t + dt / f.dur);
      const k = f.t * f.t * (3 - 2 * f.t);
      this.camera.position.lerpVectors(f.p0, f.p1, k);
      // rise a little on long moves, so the camera clears the ship
      const hop = Math.min(60, f.p0.distanceTo(f.p1) * 0.12) * Math.sin(Math.PI * k);
      this.camera.position.y += hop;
      this.controls.target.lerpVectors(f.t0, f.t1, k);
      if (f.h1 !== null) {
        let d = f.h1 - f.h0;
        if (d > 12) d -= 24;
        if (d < -12) d += 24;
        this.setHour(f.h0 + d * k);
      }
      if (f.t >= 1) this.fly = null;
    } else if (this.userHold > 0) {
      this.userHold -= dt;
    } else if (this.shot.drift && !this.calm) {
      const a = (this.shot.drift * Math.PI * dt) / 180;
      const p = this.camera.position.sub(this.controls.target);
      const c = Math.cos(a);
      const s = Math.sin(a);
      p.set(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
      this.camera.position.copy(p.add(this.controls.target));
    } else if (this.shot.id === 'galleria' && this.stroll && !this.calm) {
      // stroll along the promenade and back
      const u = 0.5 - 0.5 * Math.cos(time * 0.07);
      const x = sx(GALLERIA.x0 + 5 + u * (GALLERIA.x1 - GALLERIA.x0 - 62));
      this.camera.position.set(x, GALLERIA.y6 + 2.4 + Math.sin(time * 1.9) * 0.03, 1.2 * Math.cos(time * 0.11));
      this.controls.target.set(x + 55, GALLERIA.y6 + 2.3, 0);
    }
    if (this.tour && !this.fly) {
      this.tourT += dt;
      if (this.tourT > 11) this.startTour();
    }
    this.controls.update();
    if (this.camera.position.y < 1.2 && !this.inside) this.camera.position.y = 1.2;
    const dist = this.camera.position.distanceTo(this.controls.target);
    this.camera.near = clamp(dist * 0.02, 0.15, 25);
    this.camera.updateProjectionMatrix();

    if (this.timeLapse) this.setHour(this.env.hour + this.timeLapse * dt);

    // --- the sea and the ship riding it
    this.env.update(time);
    const night = this.env.night;
    this.ocean.update(dt, time, night);
    const g = this.ship.group;
    g.rotation.x = Math.sin(time * 0.42) * 0.006 + Math.sin(time * 0.27 + 1) * 0.003;
    g.rotation.z = Math.sin(time * 0.33 + 0.7) * 0.0028;
    g.position.y = Math.sin(time * 0.36) * 0.16;

    // --- lights that depend on the hour
    const gain = 0.42 / this.env.exposure;
    const mats = this.ship.mats;
    (mats.lit as THREE.MeshBasicMaterial).opacity = night;
    const litMesh = g.getObjectByName('lit');
    if (litMesh) litMesh.visible = night > 0.01;
    this.fill.intensity = night * 0.75 + (this.inside ? 2.1 / this.env.exposure : 0);
    const wu = (mats.water as THREE.ShaderMaterial).uniforms;
    wu.uTime.value = time;
    wu.uNight.value = night;
    wu.uGain.value = gain;
    wu.uLightDir.value.copy(this.env.lightDir);
    const sunLevel = Math.min(1, this.env.sun.intensity / 16) * (night > 0.6 ? 0.2 : 1);
    wu.uSun.value.copy(this.env.sun.color).multiplyScalar(sunLevel);
    wu.uSky.value.copy(this.env.horizonColor).multiplyScalar(2.2 * gain);
    // things that glow keep their brightness whatever the exposure does
    (mats.glow as THREE.MeshBasicMaterial).color.setScalar(gain * lerp(1.6, 2.6, night));
    const su = (this.ship.screen.material as THREE.ShaderMaterial).uniforms;
    su.uTime.value = time;
    su.uNight.value = night;
    su.uGain.value = gain;
    su.uBeat.value = Math.pow(1 - ((time * 2.1) % 1), 2);
    const sky = (this.interior.sky.material as THREE.ShaderMaterial).uniforms;
    sky.uTime.value = time;
    sky.uGain.value = gain * 1.6;
    for (const s of this.ship.details.spinners) s.obj.rotation.y = time * s.speed;

    // --- people and spray
    this.crowd.update(dt, time);
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.effects.update(dt, time, { night, gain, light: gain * (0.12 + 0.88 * sunLevel) * 2.2, speed: this.ocean.speed, pixelHeight: size.y, fov: this.camera.fov, splashes: this.crowd.splashes });
    this.crowd.splashes.length = 0;

    this.renderer.render(this.scene, this.camera);
    if (!this.ready) {
      this.ready = true;
      this.opts.onReady?.();
    }
    this.adapt(real);
  }

  /** Lowers the resolution when frames take too long, and raises it back when there is room. */
  private adapt(dt: number) {
    this.frames++;
    this.fpsT += dt;
    if (dt > 1 / 28) this.slow++;
    if (this.fpsT < 2) return;
    const fps = this.frames / this.fpsT;
    const slowShare = this.slow / this.frames;
    this.frames = 0;
    this.slow = 0;
    this.fpsT = 0;
    let next = this.dpr;
    if (fps < 32 || slowShare > 0.5) next = Math.max(0.6, this.dpr - 0.2);
    else if (fps > 55 && this.dpr < this.maxDpr) next = Math.min(this.maxDpr, this.dpr + 0.1);
    if (next !== this.dpr) {
      this.dpr = next;
      this.resize();
    }
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.controls.dispose();
    this.env.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
