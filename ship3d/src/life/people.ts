// Draws every person on board with a single instanced mesh. Each figure is a handful of boxes;
// arms and legs swing in the vertex shader, so thousands of people cost one draw call and no
// per-frame skeleton work. What each person does is decided by Crowd (crowd.ts).
import * as THREE from 'three';

export const enum Anim {
  Walk = 0,
  Idle = 1,
  Dance = 2,
  Swim = 3,
  Lie = 4,
  Sit = 5,
  Wave = 6,
  Jog = 7,
}

/** Body parts, for the shader: which limb a vertex belongs to. */
const TORSO = 0;
const HEAD = 1;
const ARM_L = 2;
const ARM_R = 3;
const LEG_L = 4;
const LEG_R = 5;
/** Which of the person's colours a vertex takes. */
const SKIN = 0;
const SHIRT = 1;
const PANTS = 2;
const HAIR = 3;

const SHOE = 4;

function figureGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const part: number[] = [];
  const tint: number[] = [];
  const idx: number[] = [];
  const push = (g: THREE.BufferGeometry, x: number, y: number, z: number, p: number, t: number, sx = 1, sy = 1, sz = 1) => {
    g.scale(sx, sy, sz);
    g.translate(x, y, z);
    const a = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const base = pos.length / 3;
    for (let i = 0; i < a.count; i++) {
      pos.push(a.getX(i), a.getY(i), a.getZ(i));
      // normals of a squashed shape: undo the scale and renormalise
      const nx = n.getX(i) / sx;
      const ny = n.getY(i) / sy;
      const nz = n.getZ(i) / sz;
      const l = Math.hypot(nx, ny, nz) || 1;
      nor.push(nx / l, ny / l, nz / l);
      part.push(p);
      tint.push(t);
    }
    const ix = g.getIndex()!;
    for (let i = 0; i < ix.count; i++) idx.push(base + ix.getX(i));
    g.dispose();
  };
  const tube = (rt: number, rb: number, h: number, seg = 6) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, true);
  // 1.74 m tall, feet on y = 0, facing +z
  push(tube(0.185, 0.15, 0.5, 8), 0, 1.17, 0, TORSO, SHIRT, 1, 1, 0.6);
  push(new THREE.SphereGeometry(0.185, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2), 0, 1.415, 0, TORSO, SHIRT, 1, 0.32, 0.6);
  push(tube(0.15, 0.155, 0.2, 8), 0, 0.83, 0, TORSO, PANTS, 1, 1, 0.66);
  push(tube(0.05, 0.055, 0.1, 6), 0, 1.47, 0, HEAD, SKIN);
  push(new THREE.SphereGeometry(0.112, 8, 6), 0, 1.615, 0.005, HEAD, SKIN, 0.92, 1.1, 1);
  push(new THREE.SphereGeometry(0.119, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.56), 0, 1.628, -0.012, HEAD, HAIR, 0.94, 1.1, 1.02);
  for (const s of [-1, 1]) {
    const arm = s < 0 ? ARM_L : ARM_R;
    const leg = s < 0 ? LEG_L : LEG_R;
    push(new THREE.SphereGeometry(0.062, 6, 4), s * 0.215, 1.385, 0, arm, SHIRT);
    push(tube(0.052, 0.046, 0.27), s * 0.228, 1.26, 0, arm, SHIRT);
    push(tube(0.044, 0.034, 0.33), s * 0.228, 0.965, 0, arm, SKIN);
    push(new THREE.SphereGeometry(0.042, 5, 3), s * 0.228, 0.79, 0, arm, SKIN);
    push(tube(0.082, 0.064, 0.36), s * 0.088, 0.6, 0, leg, PANTS);
    push(tube(0.058, 0.042, 0.4), s * 0.088, 0.24, 0, leg, SKIN);
    push(new THREE.BoxGeometry(0.095, 0.065, 0.23), s * 0.088, 0.033, 0.045, leg, SHOE);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  g.setAttribute('aTint', new THREE.Float32BufferAttribute(tint, 1));
  g.setIndex(idx);
  return g;
}

const VERT_PARS = /* glsl */ `
  attribute float aPart;
  attribute float aTint;
  attribute vec4 aAnim;   // kind, phase, speed, amount
  attribute vec3 aSkin;
  attribute vec3 aShirt;
  attribute vec3 aPants;
  attribute vec3 aHair;
  uniform float uTime;
  varying vec3 vTint;
  vec2 turn(vec2 v, float a) { float c = cos(a); float s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
`;

// Runs in place of <begin_vertex>: swings the limbs about hip and shoulder.
const VERT_BODY = /* glsl */ `
  vec3 transformed = vec3(position);
  vTint = aTint < 0.5 ? aSkin : aTint < 1.5 ? aShirt : aTint < 2.5 ? aPants : aTint < 3.5 ? aHair : mix(vec3(0.9), aHair * 0.6, step(0.5, fract(aAnim.y * 7.31 + aSkin.r * 13.7)));
  {
    float kind = aAnim.x;
    float ph = aAnim.y + uTime * aAnim.z;
    float amt = aAnim.w;
    float s = sin(ph);
    float legL = 0.0; float legR = 0.0; float armL = 0.0; float armR = 0.0; float lift = 0.0; float spread = 0.0;
    if (kind < 0.5) {            // walk
      legL = s * 0.6 * amt; legR = -legL; armL = -s * 0.5 * amt; armR = -armL; lift = abs(cos(ph)) * 0.035 * amt;
    } else if (kind < 1.5) {     // stand
      armL = sin(ph * 0.7) * 0.06; armR = -armL;
    } else if (kind < 2.5) {     // dance
      lift = abs(sin(ph)) * 0.16;
      armL = -2.5 + sin(ph * 2.0) * 0.6; armR = -2.3 + sin(ph * 2.0 + 1.9) * 0.7;
      legL = s * 0.28; legR = -s * 0.28; spread = 0.35;
    } else if (kind < 3.5) {     // in the water
      armL = -1.2 + s * 0.9; armR = -1.2 - s * 0.9; legL = s * 0.25; legR = -legL; lift = sin(ph * 0.5) * 0.05; spread = 0.5;
    } else if (kind < 4.5) {     // lying down
      armL = -0.1; armR = -0.1;
    } else if (kind < 5.5) {     // sitting
      legL = -1.5; legR = -1.5; armL = -0.35 + sin(ph * 0.5) * 0.05; armR = -0.35;
    } else if (kind < 6.5) {     // waving
      armR = -2.7 + sin(ph * 3.0) * 0.4; armL = sin(ph * 0.7) * 0.06; spread = 0.3;
    } else {                     // jogging
      legL = s * 0.95; legR = -legL; armL = -0.6 - s * 0.8; armR = -0.6 + s * 0.8; lift = abs(cos(ph)) * 0.07;
    }
    if (aPart > 3.5) {
      float a = aPart < 4.5 ? legL : legR;
      transformed.zy = vec2(0.0, 0.79) + turn(transformed.zy - vec2(0.0, 0.79), a);
    } else if (aPart > 1.5) {
      float a = aPart < 2.5 ? armL : armR;
      transformed.zy = vec2(0.0, 1.4) + turn(transformed.zy - vec2(0.0, 1.4), a);
      float sgn = aPart < 2.5 ? -1.0 : 1.0;
      transformed.xy = vec2(sgn * 0.2, 1.4) + turn(transformed.xy - vec2(sgn * 0.2, 1.4), sgn * spread * step(1.5, kind));
    }
    transformed.y += lift;
  }
`;

export class People {
  readonly mesh: THREE.InstancedMesh;
  readonly max: number;
  count = 0;
  private anim: Float32Array;
  private animAttr: THREE.InstancedBufferAttribute;
  private skin: Float32Array;
  private shirt: Float32Array;
  private pants: Float32Array;
  private hair: Float32Array;
  private mat: Float32Array;
  private uniforms = { uTime: { value: 0 } };
  private animDirty = false;

  constructor(max: number, shadows: boolean) {
    this.max = max;
    const geo = figureGeometry();
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const patch = (shader: { uniforms: Record<string, THREE.IUniform>; vertexShader: string; fragmentShader: string }, colour: boolean) => {
      shader.uniforms.uTime = this.uniforms.uTime;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${VERT_PARS}`).replace('#include <begin_vertex>', VERT_BODY);
      if (colour) {
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vTint;')
          .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * vTint, opacity );');
      }
    };
    material.onBeforeCompile = (s) => patch(s, true);
    this.mesh = new THREE.InstancedMesh(geo, material, max);
    this.mesh.name = 'people';
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = shadows;
    this.mesh.receiveShadow = true;
    if (shadows) {
      // the shadow pass needs the same limb motion, or shadows would stand still
      const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
      depth.onBeforeCompile = (s) => patch(s, false);
      this.mesh.customDepthMaterial = depth;
    }
    this.mat = this.mesh.instanceMatrix.array as Float32Array;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const attr = (size: number) => {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(max * size), size);
      return a;
    };
    this.animAttr = attr(4);
    this.animAttr.setUsage(THREE.DynamicDrawUsage);
    const skin = attr(3);
    const shirt = attr(3);
    const pants = attr(3);
    const hair = attr(3);
    geo.setAttribute('aAnim', this.animAttr);
    geo.setAttribute('aSkin', skin);
    geo.setAttribute('aShirt', shirt);
    geo.setAttribute('aPants', pants);
    geo.setAttribute('aHair', hair);
    this.anim = this.animAttr.array as Float32Array;
    this.skin = skin.array as Float32Array;
    this.shirt = shirt.array as Float32Array;
    this.pants = pants.array as Float32Array;
    this.hair = hair.array as Float32Array;
    this.mesh.count = 0;
  }

  /** Adds a person and returns its index, or -1 when the mesh is full. */
  add(skin: THREE.Color, shirt: THREE.Color, pants: THREE.Color, hair: THREE.Color): number {
    if (this.count >= this.max) return -1;
    const i = this.count++;
    skin.toArray(this.skin, i * 3);
    shirt.toArray(this.shirt, i * 3);
    pants.toArray(this.pants, i * 3);
    hair.toArray(this.hair, i * 3);
    this.mesh.count = this.count;
    this.setAnim(i, Anim.Idle, 0, 1, 1);
    this.hide(i);
    return i;
  }

  setAnim(i: number, kind: Anim, phase: number, speed: number, amount = 1) {
    const k = i * 4;
    this.anim[k] = kind;
    this.anim[k + 1] = phase;
    this.anim[k + 2] = speed;
    this.anim[k + 3] = amount;
    this.animDirty = true;
  }

  /** Walk cycle driven by the distance covered, so feet do not slide. */
  setStride(i: number, phase: number, amount: number) {
    const k = i * 4;
    this.anim[k + 1] = phase;
    this.anim[k + 3] = amount;
    this.animDirty = true;
  }

  setKind(i: number, kind: Anim, speed = 0) {
    const k = i * 4;
    if (this.anim[k] !== kind) {
      this.anim[k] = kind;
      this.anim[k + 2] = speed;
      this.animDirty = true;
    }
  }

  /** Upright person at scene position, facing `yaw` (0 = +z, PI/2 = +x), scaled. */
  place(i: number, x: number, y: number, z: number, yaw: number, scale = 1) {
    const m = this.mat;
    const k = i * 16;
    const c = Math.cos(yaw) * scale;
    const s = Math.sin(yaw) * scale;
    m[k] = c;
    m[k + 1] = 0;
    m[k + 2] = -s;
    m[k + 3] = 0;
    m[k + 4] = 0;
    m[k + 5] = scale;
    m[k + 6] = 0;
    m[k + 7] = 0;
    m[k + 8] = s;
    m[k + 9] = 0;
    m[k + 10] = c;
    m[k + 11] = 0;
    m[k + 12] = x;
    m[k + 13] = y;
    m[k + 14] = z;
    m[k + 15] = 1;
  }

  /** Any pose: lying on a sunbed, sliding down a tube. */
  placeMatrix(i: number, matrix: THREE.Matrix4) {
    matrix.toArray(this.mat, i * 16);
  }

  hide(i: number) {
    const k = i * 16;
    this.mat.fill(0, k, k + 16);
    this.mat[k + 15] = 1;
  }

  update(time: number) {
    this.uniforms.uTime.value = time;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.animDirty) {
      this.animAttr.needsUpdate = true;
      this.animDirty = false;
    }
  }
}
