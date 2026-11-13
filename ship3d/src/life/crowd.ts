// Who is on board and what they are doing: strolling the open decks, swimming, dancing at the
// pool party, sunbathing, riding the slides, crossing the ropes course, jogging the track and
// stepping out onto their balconies. People.ts draws them; this file moves them.
import * as THREE from 'three';
import { DECK_Y, deck, rng, sx, type Pt } from '../core/data';
import type { ShipModel } from '../ship';
import { GALLERIA, GALLERIA_PARTY } from '../ship/interior';
import { BRIDGE } from '../ship/superstructure';
import { COURT, DANCE, STAGE, Y15, Y16, Y18, Y19 } from '../ship/topdecks';
import { Anim, People } from './people';

interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}
/** A place people wander in: a union of rectangles at one height, minus obstacles. */
interface Zone {
  rects: Rect[];
  y: number;
  blocked?: (x: number, z: number) => boolean;
  count: number;
  /** share of people in swimwear, of children */
  swim: number;
  kids: number;
  crew?: boolean;
  /** run instead of walk */
  lively?: number;
}

interface Wanderer {
  i: number;
  zone: Zone;
  x: number;
  z: number;
  tx: number;
  tz: number;
  yaw: number;
  speed: number;
  pause: number;
  phase: number;
  amp: number;
  scale: number;
  run: boolean;
}
interface BalconyGuest {
  i: number;
  door: Pt;
  rail: Pt;
  y: number;
  yawOut: number;
  /** seconds into the cycle */
  t: number;
  inside: number;
  outside: number;
  side: number;
  phase: number;
  scale: number;
  waves: boolean;
}
interface Swimmer {
  i: number;
  ring: Pt[];
  y: number;
  x: number;
  z: number;
  tx: number;
  tz: number;
  yaw: number;
  speed: number;
  scale: number;
}
interface Rider {
  i: number;
  slide: number;
  t: number;
  wait: number;
}
interface PathWalker {
  i: number;
  pts: Float32Array;
  cum: Float32Array;
  s: number;
  dir: number;
  speed: number;
  y: number;
  lat: number;
  phase: number;
  scale: number;
  loop: boolean;
  kind: Anim;
  pause: number;
}

const WALK = 1.6; // metres covered by one swing of the legs, roughly

const rect = (x0: number, x1: number, z0: number, z1: number): Rect => ({ x0, x1, z0: Math.min(z0, z1), z1: Math.max(z0, z1) });
const both = (x0: number, x1: number, z0: number, z1: number): Rect[] => [rect(x0, x1, z0, z1), rect(x0, x1, -z1, -z0)];
const insideRing = (ring: Pt[], x: number, z: number) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    if (ring[i][1] > z !== ring[j][1] > z && x < ((ring[j][0] - ring[i][0]) * (z - ring[i][1])) / (ring[j][1] - ring[i][1]) + ring[i][0]) c = !c;
  }
  return c;
};

export interface SplashEvent {
  x: number;
  y: number;
  z: number;
}

export class Crowd {
  readonly people: People;
  /** Splashes at the end of the slides this frame: the particle system reads and clears it. */
  readonly splashes: SplashEvent[] = [];
  private rand = rng(4242);
  private wanderers: Wanderer[] = [];
  private guests: BalconyGuest[] = [];
  private swimmers: Swimmer[] = [];
  private riders: Rider[] = [];
  private walkers: PathWalker[] = [];
  private dancers: number[] = [];
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private v3 = new THREE.Vector3();
  private basis = new THREE.Matrix4();

  constructor(
    private ship: ShipModel,
    /** 1 = the full crowd; phones use less */
    density: number,
    shadows: boolean,
  ) {
    const max = Math.round(5200 * Math.min(1, density) + 200);
    this.people = new People(max, shadows);
    const d = density;
    this.addSunbathers(0.5 * Math.min(1, d + 0.15));
    this.addParty(d);
    this.addSeated(d);
    this.addSwimmers(d);
    this.addStanding(d);
    this.addZones(d);
    this.addTrack(d);
    this.addRopes(d);
    this.addRiders();
    this.addBalconies(d);
    this.addInterior(d);
    this.update(0, 0);
  }

  // ------------------------------------------------------------------ making people
  private colour(h: number, s: number, l: number) {
    return new THREE.Color().setHSL(h, s, l);
  }

  private person(kind: 'casual' | 'swim' | 'crew' | 'kid' = 'casual'): number {
    const r = this.rand;
    const tone = Math.pow(r(), 1.25);
    const skin = new THREE.Color(1.0, 0.8, 0.66).lerp(new THREE.Color(0.34, 0.2, 0.13), tone);
    const hairPick = r();
    const hair = hairPick < 0.38 ? new THREE.Color(0.06, 0.05, 0.05) : hairPick < 0.68 ? new THREE.Color(0.25, 0.14, 0.07) : hairPick < 0.85 ? new THREE.Color(0.72, 0.56, 0.3) : new THREE.Color(0.7, 0.7, 0.7);
    let shirt: THREE.Color;
    let pants: THREE.Color;
    if (kind === 'crew') {
      shirt = new THREE.Color(0.95, 0.95, 0.95);
      pants = r() < 0.5 ? new THREE.Color(0.95, 0.95, 0.95) : new THREE.Color(0.08, 0.1, 0.18);
    } else if (kind === 'swim') {
      shirt = r() < 0.45 ? skin.clone() : r() < 0.35 ? new THREE.Color(0.93, 0.93, 0.9) : this.colour(r(), 0.5 + r() * 0.25, 0.42 + r() * 0.16);
      pants = r() < 0.3 ? new THREE.Color(0.1, 0.13, 0.25) : this.colour(r(), 0.55 + r() * 0.2, 0.4 + r() * 0.12);
    } else {
      const p = r();
      shirt = p < 0.3 ? new THREE.Color(0.94, 0.94, 0.91) : p < 0.42 ? new THREE.Color(0.1, 0.12, 0.2) : p < 0.52 ? new THREE.Color(0.55, 0.68, 0.82) : this.colour(r(), 0.3 + r() * 0.38, 0.45 + r() * 0.22);
      const q = r();
      pants = q < 0.3 ? new THREE.Color(0.8, 0.74, 0.6) : q < 0.6 ? new THREE.Color(0.14, 0.19, 0.34) : q < 0.8 ? new THREE.Color(0.9, 0.9, 0.87) : this.colour(r(), 0.35, 0.38);
    }
    return this.people.add(skin, shirt, pants, hair);
  }

  private height(kid = false) {
    return kid ? 0.56 + this.rand() * 0.2 : 0.92 + this.rand() * 0.15;
  }

  // ------------------------------------------------------------------ still life
  private addSunbathers(share: number) {
    const r = this.rand;
    const up = new THREE.Vector3(0, 1, 0);
    for (const b of this.ship.top.sunbeds) {
      if (r() > share) continue;
      const i = this.person('swim');
      if (i < 0) return;
      const sc = this.height();
      if (r() < 0.16) {
        // sitting up on the bed
        this.people.setAnim(i, Anim.Sit, r() * 6, 0.6);
        this.people.place(i, sx(b.x) + Math.sin(b.rot) * 0.1, b.y - 0.36 * sc, b.z + Math.cos(b.rot) * 0.1, b.rot, sc);
        continue;
      }
      this.people.setAnim(i, Anim.Lie, 0, 0);
      // on the back, head on the raised rest, feet pointing where the bed points
      this.q.setFromAxisAngle(up, b.rot);
      const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
      this.q.multiply(tilt);
      const off = this.v1.set(0, 0.47, 0.84 * sc).applyAxisAngle(up, b.rot);
      this.m4.compose(this.v2.set(sx(b.x) + off.x, b.y + off.y, b.z + off.z), this.q, this.v3.set(sc, sc, sc));
      this.people.placeMatrix(i, this.m4);
    }
  }

  private addParty(d: number) {
    const r = this.rand;
    // the crowd on the dance floor, packed towards the stage
    const n = Math.round(150 * d);
    for (let k = 0; k < n; k++) {
      const i = this.person(r() < 0.6 ? 'swim' : 'casual');
      if (i < 0) return;
      const x = DANCE.x0 + 0.3 + Math.pow(r(), 1.4) * (DANCE.x1 - DANCE.x0 - 0.6);
      const z = (r() * 2 - 1) * (DANCE.z - 0.3);
      this.people.setAnim(i, r() < 0.85 ? Anim.Dance : Anim.Wave, r() * 6.28, Math.PI * 2.1 * (r() < 0.8 ? 1 : 0.5), 1);
      this.people.place(i, sx(x), Y15 + 0.05, z, -Math.PI / 2 + (r() - 0.5) * 0.9, this.height());
      this.dancers.push(i);
    }
    // performers on stage, facing the crowd
    for (let k = 0; k < 7; k++) {
      const i = this.person('casual');
      if (i < 0) return;
      const z = -5.4 + k * 1.8;
      this.people.setAnim(i, k === 3 ? Anim.Wave : Anim.Dance, k * 1.3, Math.PI * 2.1, 1);
      this.people.place(i, sx(STAGE.x0 + 2.4 + (k % 2) * 0.9), Y15 + STAGE.h, z, Math.PI / 2, this.height());
    }
    // people leaning on the gallery rail above, watching
    const m = Math.round(70 * d);
    for (let k = 0; k < m; k++) {
      const i = this.person(r() < 0.5 ? 'swim' : 'casual');
      if (i < 0) return;
      const side = r() < 0.5 ? 1 : -1;
      const along = r();
      let x: number;
      let z: number;
      let yaw: number;
      if (along < 0.8) {
        x = COURT.x0 + 3.5 + r() * (COURT.x1 - COURT.x0 - 7);
        z = side * (COURT.z + 0.45);
        yaw = side > 0 ? Math.PI : 0;
      } else {
        x = side > 0 ? COURT.x1 + 0.45 : COURT.x0 - 0.45;
        z = (r() * 2 - 1) * (COURT.z - 3.5);
        yaw = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      }
      this.people.setAnim(i, r() < 0.12 ? Anim.Wave : Anim.Idle, r() * 6, 1 + r());
      this.people.place(i, sx(x), Y16, z, yaw + (r() - 0.5) * 0.3, this.height());
    }
  }

  private addSeated(d: number) {
    const r = this.rand;
    for (const s of this.ship.top.seats) {
      if (r() > 0.42 * d + 0.08) continue;
      const i = this.person(r() < 0.4 ? 'swim' : 'casual');
      if (i < 0) return;
      const sc = this.height(r() < 0.12);
      this.people.setAnim(i, Anim.Sit, r() * 6, 0.5 + r());
      this.people.place(i, sx(s.x), s.y - 0.68 * sc, s.z, s.rot + (r() - 0.5) * 0.2, sc);
    }
  }

  private addStanding(d: number) {
    const r = this.rand;
    for (const s of this.ship.top.standing) {
      if (r() > 0.75 * d + 0.1) continue;
      const i = this.person(s.y >= Y15 && r() < 0.4 ? 'swim' : 'casual');
      if (i < 0) return;
      this.people.setAnim(i, r() < 0.1 ? Anim.Wave : Anim.Idle, r() * 6, 0.8 + r());
      this.people.place(i, sx(s.x), s.y, s.z, s.rot + (r() - 0.5) * 0.4, this.height());
    }
    // officers on the bridge wings, looking ahead
    for (const side of [1, -1]) {
      for (let k = 0; k < 2; k++) {
        const i = this.person('crew');
        if (i < 0) return;
        this.people.setAnim(i, Anim.Idle, r() * 6, 1);
        this.people.place(i, sx(BRIDGE.nose - 4.2 - k * 1.3), DECK_Y[14], side * (BRIDGE.wing - 1.2 - k * 0.5), Math.PI / 2 + side * 0.3 * k, 1);
      }
    }
  }

  // ------------------------------------------------------------------ pools
  private addSwimmers(d: number) {
    const r = this.rand;
    for (const p of this.ship.top.pools) {
      const xs = p.ring.map((q) => q[0]);
      const zs = p.ring.map((q) => q[1]);
      const x0 = Math.min(...xs);
      const x1 = Math.max(...xs);
      const z0 = Math.min(...zs);
      const z1 = Math.max(...zs);
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      if (p.kind === 'whirl') {
        // sitting round the rim, shoulders out of the bubbles
        const n = 2 + Math.floor(r() * 3 * Math.min(1, d + 0.2));
        const rad = (x1 - x0) / 2 - 0.35;
        const a0 = r() * 6.28;
        for (let k = 0; k < n; k++) {
          const i = this.person('swim');
          if (i < 0) return;
          const a = a0 + (k / 5) * Math.PI * 2;
          const sc = this.height();
          this.people.setAnim(i, Anim.Sit, r() * 6, 0.7);
          this.people.place(i, sx(cx + Math.cos(a) * rad), p.y - 1.08 * sc, cz + Math.sin(a) * rad, Math.atan2(-Math.cos(a), -Math.sin(a)), sc);
        }
        continue;
      }
      const area = (x1 - x0) * (z1 - z0);
      const shallow = p.kind === 'splash';
      const n = Math.max(3, Math.round((area / (shallow ? 5 : 7.5)) * Math.min(1.1, d + 0.1)));
      for (let k = 0; k < n; k++) {
        const kid = shallow && r() < 0.75;
        const i = this.person('swim');
        if (i < 0) return;
        let x = cx;
        let z = cz;
        for (let t = 0; t < 12; t++) {
          x = x0 + r() * (x1 - x0);
          z = z0 + r() * (z1 - z0);
          if (insideRing(p.ring, x, z)) break;
        }
        const sc = this.height(kid);
        const sw: Swimmer = { i, ring: p.ring, y: shallow ? p.y - 0.42 * sc : p.y - 1.33 * sc, x, z, tx: x, tz: z, yaw: r() * 6.28, speed: shallow ? 0.7 + r() * 0.8 : 0.22 + r() * 0.3, scale: sc };
        this.people.setAnim(i, shallow ? (r() < 0.5 ? Anim.Dance : Anim.Jog) : Anim.Swim, r() * 6, shallow ? 5 + r() * 3 : 2.2 + r() * 1.5, 1);
        this.swimmers.push(sw);
      }
    }
  }

  // ------------------------------------------------------------------ strollers
  private addZones(d: number) {
    const top = this.ship.top;
    const poolAt = (name: string) => top.pools.find((p) => p.name === name)?.ring ?? [];
    const tubs = top.pools.filter((p) => p.kind === 'whirl').map((p) => [p.ring.reduce((a, q) => a + q[0], 0) / p.ring.length, p.ring.reduce((a, q) => a + q[1], 0) / p.ring.length]);
    const whirl = (x: number, z: number) => tubs.some((c) => Math.hypot(c[0] - x, c[1] - z) < 3.1);
    const zones: Zone[] = [
      // deck 15: round the pool court and along the covered promenades
      { rects: [...both(158, 212.6, 8.7, 10.3), rect(206.6, 212.6, -10.3, 10.3), ...both(137, 212.6, 15.1, 19.6), rect(152.6, 155.2, -19.6, 19.6)], y: Y15, blocked: whirl, count: 150, swim: 0.55, kids: 0.1 },
      // the raised deck round the pool itself
      { rects: [...both(171.8, 204.8, 5.5, 7.2), rect(171.6, 173.2, -7.2, 7.2), rect(203.4, 205, -7.2, 7.2)], y: Y15 + 0.45, count: 34, swim: 1, kids: 0.15 },
      // by the buffet and its terrace
      { rects: [...both(90, 136.5, 14, 19.6), rect(4.6, 16, -18.5, 18.5)], y: Y15, count: 46, swim: 0.2, kids: 0.08 },
      // indoor pool hall
      { rects: [...both(216, 248, 5.6, 16.2), rect(216, 226.5, -16.2, 16.2), rect(244.5, 248, -16.2, 16.2)], y: Y15, blocked: (x, z) => whirl(x, z) || top.palms.some((p) => Math.hypot(p.x - x, p.z - z) < 0.8), count: 40, swim: 0.85, kids: 0.15 },
      // deck 16: the gallery over the court
      { rects: [...both(146, 222, 16.75, 17.55), rect(148.6, 154.8, -16.6, 16.6), rect(214.2, 219.6, -16.6, 16.6)], y: Y16, count: 90, swim: 0.5, kids: 0.08 },
      // the Horizon Pool deck at the stern
      { rects: [rect(1.6, 13.4, -17, 17)], y: Y16, blocked: (x, z) => insideRing(poolAt('Horizon Pool'), x, z) || (x > 2 && x < 12.2 && Math.abs(z) < 7.6) || (x > 11.2 && Math.abs(z) > 7.4), count: 22, swim: 0.7, kids: 0.1 },
      // deck 18: terraces round the amphitheatre opening, and the side promenades
      { rects: [...both(21, 45.4, 13.3, 14.6), rect(42.4, 45.6, -18.5, 18.5), ...both(45.6, 139, 17.7, 18.7)], y: Y18, count: 60, swim: 0.4, kids: 0.2 },
      // deck 19: the aquapark
      {
        rects: [rect(47.5, 89, -16.6, 16.6)],
        y: Y19,
        blocked: (x, z) =>
          (x > 56.6 && x < 63.4 && z > 0.1 && z < 6.9) ||
          Math.hypot(x - 52, z + 8.5) < 5.0 ||
          (x > 62.2 && x < 73.8 && z > 12.4) ||
          (x > 74 && x < 86 && z > 7.5 && z < 12),
        count: 80,
        swim: 0.9,
        kids: 0.45,
        lively: 0.4,
      },
      // the solarium either side of the funnel
      { rects: [...both(90.5, 145, 12.3, 13.6), rect(142.2, 145.2, -13.6, 13.6)], y: Y19, count: 36, swim: 0.6, kids: 0 },
      // the Yacht Club sun deck
      { rects: [rect(269.8, 283.4, -10.4, 1.6), rect(283.4, 296, -2.4, 1.6), rect(269.8, 281.5, 1.6, 14)], y: Y19, blocked: whirl, count: 22, swim: 0.6, kids: 0 },
      // deck hands on the forecastle
      { rects: [rect(321.5, 326.5, -3, 3)], y: DECK_Y[8], count: 3, swim: 0, kids: 0, crew: true },
    ];
    const r = this.rand;
    for (const zone of zones) {
      const n = Math.max(1, Math.round(zone.count * d));
      for (let k = 0; k < n; k++) {
        const kid = r() < zone.kids;
        const i = this.person(zone.crew ? 'crew' : r() < zone.swim ? 'swim' : 'casual');
        if (i < 0) return;
        const p = this.pick(zone);
        const run = kid && r() < (zone.lively ?? 0.15) * 2;
        const w: Wanderer = { i, zone, x: p[0], z: p[1], tx: p[0], tz: p[1], yaw: r() * 6.28, speed: run ? 2.2 + r() * 1.2 : 0.7 + r() * 0.7, pause: r() * 6, phase: r() * 6.28, amp: 0, scale: this.height(kid), run };
        this.people.setAnim(i, run ? Anim.Jog : Anim.Walk, 0, 0, 0);
        this.wanderers.push(w);
      }
    }
  }

  private pick(zone: Zone): Pt {
    const r = this.rand;
    let total = 0;
    for (const q of zone.rects) total += (q.x1 - q.x0) * (q.z1 - q.z0);
    for (let t = 0; t < 30; t++) {
      let a = r() * total;
      let chosen = zone.rects[0];
      for (const q of zone.rects) {
        a -= (q.x1 - q.x0) * (q.z1 - q.z0);
        if (a <= 0) {
          chosen = q;
          break;
        }
      }
      const x = chosen.x0 + r() * (chosen.x1 - chosen.x0);
      const z = chosen.z0 + r() * (chosen.z1 - chosen.z0);
      if (!zone.blocked?.(x, z)) return [x, z];
    }
    const q = zone.rects[0];
    return [(q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2];
  }

  private allowed(zone: Zone, x: number, z: number): boolean {
    if (zone.blocked?.(x, z)) return false;
    for (const q of zone.rects) if (x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1) return true;
    return false;
  }

  /** Can you walk in a straight line from a to b without leaving the zone? */
  private clear(zone: Zone, ax: number, az: number, bx: number, bz: number): boolean {
    const dist = Math.hypot(bx - ax, bz - az);
    const n = Math.ceil(dist / 0.7);
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      if (!this.allowed(zone, ax + (bx - ax) * t, az + (bz - az) * t)) return false;
    }
    return true;
  }

  // ------------------------------------------------------------------ paths: track, ropes, slides
  private pathWalker(pts: Pt[] | THREE.Vector3[], y: number | null, loop: boolean, kind: Anim, speed: number, type: 'casual' | 'swim' | 'kid' = 'casual', lat = 0): PathWalker | null {
    const n = pts.length + (loop ? 1 : 0);
    const arr = new Float32Array(n * 3);
    const cum = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const p = pts[k % pts.length];
      if (p instanceof THREE.Vector3) arr.set([p.x, p.y, p.z], k * 3);
      else arr.set([sx(p[0]), y ?? 0, p[1]], k * 3);
      if (k > 0) cum[k] = cum[k - 1] + Math.hypot(arr[k * 3] - arr[k * 3 - 3], arr[k * 3 + 2] - arr[k * 3 - 1]);
    }
    const i = this.person(type === 'kid' ? 'casual' : type);
    if (i < 0) return null;
    const r = this.rand;
    const w: PathWalker = { i, pts: arr, cum, s: r() * cum[n - 1], dir: loop || r() < 0.5 ? 1 : -1, speed, y: y ?? 0, lat, phase: r() * 6, scale: this.height(type === 'kid'), loop, kind, pause: 0 };
    this.people.setAnim(i, kind, 0, 0, 1);
    this.walkers.push(w);
    return w;
  }

  private addTrack(d: number) {
    const r = this.rand;
    const n = Math.round(22 * d) + 4;
    for (let k = 0; k < n; k++) {
      const jog = r() < 0.6;
      this.pathWalker(this.ship.top.track, Y16 + 0.03, true, jog ? Anim.Jog : Anim.Walk, jog ? 2.6 + r() * 1.3 : 1.3 + r() * 0.4, 'casual', (r() - 0.5) * 1.6);
    }
  }

  private addRopes(d: number) {
    const pts = this.ship.details.ropes.getSpacedPoints(40);
    const n = Math.round(5 * d) + 3;
    for (let k = 0; k < n; k++) this.pathWalker(pts, null, false, Anim.Walk, 0.45 + this.rand() * 0.25, this.rand() < 0.4 ? 'kid' : 'casual');
  }

  /** People walking the corridors drawn on the plans: used for the decks seen in the cutaway. */
  private addCorridorWalkers(decks: number[], perDeck: number) {
    const r = this.rand;
    for (const n of decks) {
      const paths = deck(n).paths;
      if (!paths.length) continue;
      for (let k = 0; k < perDeck; k++) {
        const flat = paths[Math.floor(r() * paths.length)];
        const pts: Pt[] = [];
        for (let j = 0; j < flat.length; j += 2) pts.push([flat[j], flat[j + 1]]);
        // deck 7 is open over the promenade: nobody walks on air
        if (n === 7 && pts.some(([X, z]) => X > GALLERIA.x0 && X < GALLERIA.x1 && Math.abs(z) < GALLERIA.open + 0.4)) continue;
        const w = this.pathWalker(pts, DECK_Y[n] + 0.02, false, Anim.Walk, 0.8 + r() * 0.7, 'casual', (r() - 0.5) * 0.9);
        if (!w) return;
      }
    }
  }

  private addRiders() {
    this.ship.details.slides.forEach((s, slide) => {
      const n = Math.max(2, Math.round(s.seconds / 4.2));
      for (let k = 0; k < n; k++) {
        const i = this.person('swim');
        if (i < 0) return;
        this.people.setAnim(i, Anim.Lie, 0, 0);
        this.riders.push({ i, slide, t: k / n, wait: 0 });
      }
    });
  }

  // ------------------------------------------------------------------ inside the ship
  private addInterior(d: number) {
    const r = this.rand;
    const G = GALLERIA;
    const zones: Zone[] = [
      // the promenade floor, either side of the party
      { rects: [rect(G.x0 + 1, GALLERIA_PARTY.x0 - 1, -5.6, 5.6), rect(GALLERIA_PARTY.x1 + 4, G.x1 - 1, -5.6, 5.6), ...both(GALLERIA_PARTY.x0 - 1, GALLERIA_PARTY.x1 + 4, 4.2, 5.6)], y: G.y6 + 0.04, blocked: (x, z) => x > 162 && x < 169.5 && Math.abs(z) < 1.6, count: 130, swim: 0.05, kids: 0.1 },
      // the galleries above, and the bridges between them
      { rects: [...both(G.x0 + 1, G.x1 - 1, G.open + 0.5, G.half - 0.3), rect(152.5, 155.5, -G.open, G.open), rect(178.5, 181.5, -G.open, G.open), rect(204.5, 207.5, -G.open, G.open)], y: G.y7 + 0.02, count: 60, swim: 0, kids: 0.05 },
    ];
    for (const zone of zones) {
      const n = Math.max(1, Math.round(zone.count * d));
      for (let k = 0; k < n; k++) {
        const kid = r() < zone.kids;
        const i = this.person('casual');
        if (i < 0) return;
        const p = this.pick(zone);
        this.people.setAnim(i, Anim.Walk, 0, 0, 0);
        this.wanderers.push({ i, zone, x: p[0], z: p[1], tx: p[0], tz: p[1], yaw: r() * 6.28, speed: 0.7 + r() * 0.6, pause: r() * 6, phase: r() * 6.28, amp: 0, scale: this.height(kid), run: false });
      }
    }
    // the party under the LED sky
    const n = Math.round(110 * d);
    for (let k = 0; k < n; k++) {
      const i = this.person('casual');
      if (i < 0) return;
      const x = GALLERIA_PARTY.x0 + 0.4 + Math.pow(r(), 0.8) * (GALLERIA_PARTY.x1 - GALLERIA_PARTY.x0 - 0.8);
      this.people.setAnim(i, r() < 0.85 ? Anim.Dance : Anim.Wave, r() * 6.28, Math.PI * 2.1 * (r() < 0.8 ? 1 : 0.5), 1);
      this.people.place(i, sx(x), G.y6 + 0.08, (r() * 2 - 1) * 3.9, Math.PI / 2 + (r() - 0.5) * 1.2, this.height());
    }
    const dj = this.person('casual');
    if (dj >= 0) {
      this.people.setAnim(dj, Anim.Wave, 0, Math.PI * 2.1, 1);
      this.people.place(dj, sx(GALLERIA_PARTY.x1 + 3.3), G.y6 + 0.04, 0, -Math.PI / 2, 1);
    }
    // and people walking the real corridors of the plans, deck by deck
    this.addCorridorWalkers([5, 6, 7], Math.round(26 * d));
    this.addCorridorWalkers([8, 9, 10, 11, 12, 13, 14], Math.round(9 * d));
  }

  // ------------------------------------------------------------------ balconies
  private addBalconies(d: number) {
    const r = this.rand;
    for (const b of this.ship.sup.balconies) {
      if (r() > 0.3 * d + 0.04) continue;
      const pair = r() < 0.4 ? 2 : 1;
      const dx = b.rail[0] - b.door[0];
      const dz = b.rail[1] - b.door[1];
      const len = Math.hypot(dx, dz) || 1;
      const yawOut = Math.atan2(dx / len, dz / len);
      for (let k = 0; k < pair; k++) {
        const i = this.person(r() < 0.3 ? 'swim' : 'casual');
        if (i < 0) return;
        const inside = 14 + r() * 70;
        const outside = 16 + r() * 60;
        const total = inside + outside + 4;
        this.guests.push({
          i,
          door: b.door,
          rail: b.rail,
          y: b.y + 0.02,
          yawOut,
          t: r() * total,
          inside,
          outside,
          side: pair === 2 ? (k ? 0.45 : -0.45) : (r() - 0.5) * Math.min(1.2, b.width - 1),
          phase: r() * 6,
          scale: this.height(r() < 0.08),
          waves: r() < 0.18,
        });
      }
    }
  }

  // ------------------------------------------------------------------ every frame
  update(dt: number, time: number) {
    const P = this.people;
    const r = this.rand;

    for (const w of this.wanderers) {
      if (w.pause > 0) {
        w.pause -= dt;
        w.amp = Math.max(0, w.amp - dt * 4);
        if (w.pause <= 0) {
          // somewhere new to go, in a straight line
          for (let t = 0; t < 8; t++) {
            const p = this.pick(w.zone);
            if (Math.hypot(p[0] - w.x, p[1] - w.z) > 1.5 && this.clear(w.zone, w.x, w.z, p[0], p[1])) {
              w.tx = p[0];
              w.tz = p[1];
              break;
            }
          }
          if (w.tx === w.x && w.tz === w.z) w.pause = 1 + r() * 3;
        }
      } else {
        const dx = w.tx - w.x;
        const dz = w.tz - w.z;
        const dist = Math.hypot(dx, dz);
        const step = w.speed * dt;
        if (dist <= step + 0.02) {
          w.x = w.tx;
          w.z = w.tz;
          w.pause = w.run ? r() * 1.5 : r() < 0.45 ? 0.2 : 2 + r() * 9;
        } else {
          w.x += (dx / dist) * step;
          w.z += (dz / dist) * step;
          const want = Math.atan2(dx, dz);
          let da = want - w.yaw;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          w.yaw += da * Math.min(1, dt * 8);
          w.phase += (step / (WALK * w.scale)) * Math.PI * (w.run ? 0.8 : 1);
          w.amp = Math.min(1, w.amp + dt * 5);
        }
      }
      P.setStride(w.i, w.phase, w.amp);
      P.place(w.i, sx(w.x), w.zone.y, w.z, w.yaw, w.scale);
    }

    for (const w of this.walkers) {
      const total = w.cum[w.cum.length - 1];
      if (w.pause > 0) {
        w.pause -= dt;
        P.setStride(w.i, w.phase, 0.15);
        continue;
      }
      w.s += w.dir * w.speed * dt;
      if (w.loop) {
        if (w.s > total) w.s -= total;
      } else if (w.s > total || w.s < 0) {
        w.s = Math.max(0, Math.min(total, w.s));
        w.dir = -w.dir;
        w.pause = 1 + r() * 4;
      }
      // find the segment (paths are short, a scan is fine)
      let k = 1;
      while (k < w.cum.length - 1 && w.cum[k] < w.s) k++;
      const a = (k - 1) * 3;
      const b = k * 3;
      const seg = w.cum[k] - w.cum[k - 1] || 1;
      const t = (w.s - w.cum[k - 1]) / seg;
      const ddx = w.pts[b] - w.pts[a];
      const ddz = w.pts[b + 2] - w.pts[a + 2];
      const x = w.pts[a] + ddx * t - (ddz / seg) * w.lat;
      const z = w.pts[a + 2] + ddz * t + (ddx / seg) * w.lat;
      const y = w.pts[a + 1] + (w.pts[b + 1] - w.pts[a + 1]) * t;
      w.phase += ((w.speed * dt) / (WALK * w.scale)) * Math.PI * (w.kind === Anim.Jog ? 0.75 : 1);
      P.setStride(w.i, w.phase, 1);
      P.place(w.i, x, y, z, Math.atan2(ddx * w.dir, ddz * w.dir), w.scale);
    }

    for (const s of this.swimmers) {
      const dx = s.tx - s.x;
      const dz = s.tz - s.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.3) {
        // paddle off somewhere else in the pool
        for (let t = 0; t < 6; t++) {
          const a = r() * Math.PI * 2;
          const l = 1.5 + r() * 6;
          const nx = s.x + Math.cos(a) * l;
          const nz = s.z + Math.sin(a) * l;
          if (insideRing(s.ring, nx, nz) && insideRing(s.ring, nx + Math.cos(a) * 0.6, nz + Math.sin(a) * 0.6)) {
            s.tx = nx;
            s.tz = nz;
            break;
          }
        }
      } else {
        const step = Math.min(dist, s.speed * dt);
        s.x += (dx / dist) * step;
        s.z += (dz / dist) * step;
        let da = Math.atan2(dx, dz) - s.yaw;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        s.yaw += da * Math.min(1, dt * 3);
      }
      P.place(s.i, sx(s.x), s.y, s.z, s.yaw, s.scale);
    }

    // slides: lie back, feet first, follow the tube
    const slides = this.ship.details.slides;
    for (const rd of this.riders) {
      const s = slides[rd.slide];
      if (rd.wait > 0) {
        rd.wait -= dt;
        if (rd.wait <= 0) rd.t = 0;
        continue;
      }
      // faster towards the bottom
      rd.t += (dt / s.seconds) * (0.55 + 0.9 * rd.t);
      if (rd.t >= 1) {
        const end = s.curve.getPointAt(1, this.v1);
        this.splashes.push({ x: end.x, y: end.y - 0.4, z: end.z });
        P.hide(rd.i);
        rd.wait = 1.5 + r() * 3;
        continue;
      }
      if (!(rd.t >= 0)) rd.t = 0;
      const p = s.curve.getPointAt(rd.t, this.v1);
      const tan = s.curve.getTangentAt(rd.t, this.v2);
      const upv = this.v3.set(0, 1, 0).addScaledVector(tan, -tan.y).normalize();
      // body axis (feet to head) points back up the slide, the chest faces up
      const yAxis = tan.clone().negate();
      const xAxis = new THREE.Vector3().crossVectors(yAxis, upv).normalize();
      this.basis.makeBasis(xAxis, yAxis, upv);
      this.basis.setPosition(p.x + tan.x * 0.8 - upv.x * (s.radius - 0.2), p.y + tan.y * 0.8 - upv.y * (s.radius - 0.2), p.z + tan.z * 0.8 - upv.z * (s.radius - 0.2));
      P.placeMatrix(rd.i, this.basis);
    }

    // balconies: out to the rail, a while in the sun, back inside
    for (const g of this.guests) {
      const total = g.inside + g.outside + 4;
      g.t = (g.t + dt) % total;
      const t = g.t;
      const px = -Math.cos(g.yawOut) * g.side;
      const pz = Math.sin(g.yawOut) * g.side;
      if (t < g.inside) {
        P.hide(g.i);
        continue;
      }
      let k: number;
      let yaw = g.yawOut;
      let amp = 0;
      if (t < g.inside + 2) {
        k = (t - g.inside) / 2;
        amp = 1;
      } else if (t < g.inside + 2 + g.outside) {
        k = 1;
      } else {
        k = 1 - (t - g.inside - 2 - g.outside) / 2;
        yaw = g.yawOut + Math.PI;
        amp = 1;
      }
      const x = g.door[0] + (g.rail[0] - g.door[0]) * k + px;
      const z = g.door[1] + (g.rail[1] - g.door[1]) * k + pz;
      const waving = g.waves && k === 1 && Math.sin(time * 0.35 + g.phase) > 0.55;
      P.setKind(g.i, amp ? Anim.Walk : waving ? Anim.Wave : Anim.Idle);
      P.setStride(g.i, amp ? k * 5 + g.phase : time * (waving ? 1 : 0.6) + g.phase, 1);
      P.place(g.i, sx(x), g.y, z, yaw, g.scale);
    }

    P.update(time);
  }
}
