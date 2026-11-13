// The sea. A polar grid centred on the ship (fine near the hull, stretching to the horizon),
// moved by Gerstner waves and shaded with sky reflections, sun glitter, foam and the wake.
// The ship stays at the origin: the water travels past it instead.
import * as THREE from 'three';
import { rng } from '../core/data';
import type { Environment } from './sky';

/** Tileable noise: normal in RG, foam breakup in B, height in A. */
function noiseTexture(size = 256): THREE.DataTexture {
  const rand = rng(1234);
  const octave = (period: number) => {
    const lat = new Float32Array(period * period);
    for (let i = 0; i < lat.length; i++) lat[i] = rand();
    return (u: number, v: number) => {
      const x = u * period;
      const y = v * period;
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const fx = x - x0;
      const fy = y - y0;
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      const at = (i: number, j: number) => lat[(((j % period) + period) % period) * period + (((i % period) + period) % period)];
      return (at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx) * (1 - sy) + (at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx) * sy;
    };
  };
  const oct = [4, 8, 16, 32, 64].map(octave);
  const foamOct = [6, 12, 24, 48].map(octave);
  const h = new Float32Array(size * size);
  const f = new Float32Array(size * size);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const u = i / size;
      const v = j / size;
      let a = 0;
      let amp = 0.5;
      for (const o of oct) {
        a += o(u, v) * amp;
        amp *= 0.5;
      }
      h[j * size + i] = a;
      let b = 0;
      amp = 0.5;
      for (const o of foamOct) {
        b += Math.abs(o(u, v) * 2 - 1) * amp;
        amp *= 0.55;
      }
      f[j * size + i] = b;
    }
  }
  const data = new Uint8Array(size * size * 4);
  const at = (i: number, j: number) => h[((j + size) % size) * size + ((i + size) % size)];
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const dx = (at(i + 1, j) - at(i - 1, j)) * 14;
      const dy = (at(i, j + 1) - at(i, j - 1)) * 14;
      const k = (j * size + i) * 4;
      data[k] = Math.max(0, Math.min(255, (dx * 0.5 + 0.5) * 255));
      data[k + 1] = Math.max(0, Math.min(255, (dy * 0.5 + 0.5) * 255));
      data[k + 2] = Math.max(0, Math.min(255, f[j * size + i] * 1.6 * 255));
      data[k + 3] = Math.max(0, Math.min(255, h[j * size + i] * 255));
    }
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function polarGrid(rings: number, segs: number): THREE.BufferGeometry {
  const pos = new Float32Array((rings + 1) * (segs + 1) * 3);
  const idx: number[] = [];
  const NEAR = 460;
  const FAR = 60000;
  const split = 0.62;
  let p = 0;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const r = t <= split ? (NEAR * t) / split : NEAR * Math.exp(((t - split) / (1 - split)) * Math.log(FAR / NEAR));
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      pos[p++] = Math.cos(a) * r;
      pos[p++] = 0;
      pos[p++] = Math.sin(a) * r;
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * (segs + 1) + j;
      const b = a + segs + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

const WAVES = /* glsl */ `
  // direction (xy), wavelength, amplitude
  const int NW = 7;
  uniform vec4 uWaves[NW];
  uniform float uTime;
  uniform float uTravel;
  uniform float uSea;

  // Gerstner sum. q: position in the sea's own frame. Returns displacement; fills normal slope.
  vec3 gerstner(vec2 q, float fade, out vec2 slope) {
    vec3 d = vec3(0.0);
    slope = vec2(0.0);
    for (int i = 0; i < NW; i++) {
      vec4 w = uWaves[i];
      float k = 6.2831853 / w.z;
      float a = w.w * uSea * (i > 3 ? fade : 1.0);
      float ph = k * dot(w.xy, q) - sqrt(9.81 * k) * uTime;
      float c = cos(ph);
      float s = sin(ph);
      float steep = 0.72 / (k * w.w * float(NW) + 0.001);
      steep = min(steep, 1.0) * a;
      d.xz += w.xy * steep * c * 0.6;
      d.y += a * s;
      slope += w.xy * (k * a * c);
    }
    return d;
  }

  // Half-breadth of the hull at the waterline, ship centred on x = 0
  float hullHalf(float x) {
    float t = clamp((x - 68.0) / 88.5, 0.0, 1.0);
    float bow = pow(max(1.0 - pow(t, 1.9), 0.0), 0.85);
    float stern = 0.9 + 0.1 * smoothstep(-164.0, -120.0, x);
    return 21.5 * bow * stern;
  }
`;

const VERT = /* glsl */ `
  ${WAVES}
  varying vec3 vWorld;
  varying vec2 vSea;
  varying float vFade;
  varying float vCrest;

  void main() {
    vec3 p = position;
    float r = length(p.xz);
    vFade = 1.0 - smoothstep(350.0, 2600.0, r);
    vec2 q = p.xz + vec2(uTravel, 0.0);
    vec2 slope;
    vec3 d = gerstner(q, vFade, slope);
    // the swell flattens against the hull, where the ship's own wave takes over
    float side = abs(p.z) - hullHalf(p.x);
    float inHull = step(-166.0, p.x) * step(p.x, 157.0);
    float near = inHull * (1.0 - smoothstep(0.0, 14.0, side));
    d *= mix(1.0, 0.45, near);
    // bow wave: a ridge running aft along two arms from the stem
    float back = 157.0 - p.x;
    float arm = abs(p.z) - (hullHalf(p.x) * step(0.0, back) + max(back, 0.0) * 0.21);
    float ridge = exp(-arm * arm / (9.0 + back * 0.35)) * exp(-max(back, 0.0) / 190.0) * step(-4.0, back);
    d.y += ridge * 1.25 * (0.75 + 0.25 * sin(q.x * 0.35));
    // the hollow just behind the bow wave, then the stern wave
    float astern = -165.5 - p.x;
    float wakeHalf = 19.0 + max(astern, 0.0) * 0.075;
    float inWake = step(0.0, astern) * (1.0 - smoothstep(wakeHalf - 4.0, wakeHalf + 8.0, abs(p.z)));
    d.y += inWake * 0.55 * sin(astern * 0.16 - uTime * 2.2) * exp(-astern / 150.0);
    vCrest = d.y;
    p += d * (0.15 + 0.85 * vFade);
    vWorld = p;
    vSea = q;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = /* glsl */ `
  ${WAVES}
  uniform samplerCube uSky;
  uniform sampler2D uNoise;
  uniform vec3 uLightDir;
  uniform vec3 uSunColor;
  uniform vec3 uHorizon;
  uniform float uNight;
  uniform float uGolden;
  uniform float uShipLights;
  uniform float uGain;
  varying vec3 vWorld;
  varying vec2 vSea;
  varying float vFade;
  varying float vCrest;

  // Does the mirrored view ray hit the ship? A cheap stand-in for a real reflection pass:
  // two boxes, the hull and the superstructure.
  float boxHit(vec3 ro, vec3 rd, vec3 mn, vec3 mx, out vec3 n) {
    vec3 inv = 1.0 / rd;
    vec3 t0 = (mn - ro) * inv;
    vec3 t1 = (mx - ro) * inv;
    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);
    float tn = max(max(tmin.x, tmin.y), tmin.z);
    float tf = min(min(tmax.x, tmax.y), tmax.z);
    n = -sign(rd) * step(tmin.yzx, tmin.xyz) * step(tmin.zxy, tmin.xyz);
    return (tf > max(tn, 0.0)) ? tn : -1.0;
  }

  void main() {
    vec3 V = normalize(cameraPosition - vWorld);
    float dist = length(cameraPosition - vWorld);
    vec2 slope;
    gerstner(vSea, vFade, slope);
    slope *= 0.15 + 0.85 * vFade;

    // small ripples: three layers of the noise texture sliding over each other
    float t = uTime;
    vec4 n1 = texture2D(uNoise, vSea * 0.021 + vec2(-t * 0.012, t * 0.008));
    vec4 n2 = texture2D(uNoise, vSea * 0.067 + vec2(t * 0.021, t * 0.017));
    vec4 n3 = texture2D(uNoise, vSea * 0.23 + vec2(-t * 0.05, -t * 0.036));
    float rip = 1.0 - smoothstep(60.0, 1400.0, dist) * 0.72;
    vec2 detail = ((n1.xy - 0.5) * 0.85 + (n2.xy - 0.5) * 0.6 + (n3.xy - 0.5) * 0.4 * rip) * (0.5 + 0.5 * uSea);
    vec3 N = normalize(vec3(-slope.x - detail.x * 0.9, 1.0, -slope.y - detail.y * 0.9));

    // --- the ship's wake
    float x = vWorld.x;
    float z = vWorld.z;
    float half_ = hullHalf(x);
    float side = abs(z) - half_;
    float inLen = step(-166.0, x) * step(x, 158.0);
    float foamNoise = n2.z * 0.55 + n3.z * 0.6;
    float churn = texture2D(uNoise, vSea * 0.011 + vec2(t * 0.004, 0.0)).z;
    // foam hugging the hull, strongest at the bow
    float skirt = inLen * exp(-max(side, 0.0) / mix(2.2, 5.5, smoothstep(40.0, 150.0, x))) * (0.35 + 0.85 * smoothstep(20.0, 150.0, x));
    // the two arms of the bow wave
    float back = 157.0 - x;
    float armZ = half_ * step(0.0, back) + max(back, 0.0) * 0.21;
    float armD = abs(z) - armZ;
    float armW = 2.5 + max(back, 0.0) * 0.05;
    float arm = exp(-armD * armD / (armW * armW)) * exp(-max(back, 0.0) / 150.0) * step(-3.0, back);
    // churned water behind the propellers, a long fading trail
    float astern = -165.5 - x;
    float wakeHalf = 18.0 + max(astern, 0.0) * 0.07;
    float inWake = step(-2.0, astern) * (1.0 - smoothstep(wakeHalf - 5.0, wakeHalf + 3.0, abs(z)));
    float trail = inWake * exp(-max(astern, 0.0) / 520.0);
    float edge = step(0.0, astern) * exp(-pow((abs(z) - wakeHalf) / 3.5, 2.0)) * exp(-astern / 380.0);
    float wash = trail * (0.35 + 0.65 * exp(-max(astern, 0.0) / 90.0));
    float foam = skirt * smoothstep(0.25, 0.75, foamNoise + skirt * 0.5)
               + arm * smoothstep(0.3, 0.8, foamNoise + arm * 0.6)
               + wash * smoothstep(0.42 - wash * 0.3, 0.85, foamNoise * 0.7 + churn * 0.6)
               + edge * smoothstep(0.35, 0.8, foamNoise);
    // whitecaps on the steepest open-sea crests
    // a few thin whitecaps on the steepest open-sea crests
    float cap = smoothstep(0.92, 1.25, vCrest / max(uSea, 0.2) + (n2.z - 0.5) * 0.9) * smoothstep(0.55, 0.8, n3.z) * vFade;
    foam = clamp(foam + cap * 0.35, 0.0, 1.0);
    N = normalize(mix(N, vec3(0.0, 1.0, 0.0), foam * 0.5));

    // --- reflection
    float NV = max(dot(N, V), 0.0);
    float fres = 0.02 + 0.98 * pow(1.0 - NV, 5.0);
    vec3 R = reflect(-V, N);
    R.y = abs(R.y) + 0.02;
    R = normalize(R);
    float rough = mix(0.5, 3.2, smoothstep(200.0, 6000.0, dist));
    vec3 refl = textureCube(uSky, R, rough).rgb;
    // keep the sun disc out of the cube lookup; the glitter below draws it properly
    refl = min(refl, vec3(6.0));

    // the ship mirrored in the water beside it
    vec3 bn;
    vec3 ro = vWorld + vec3(0.0, 0.05, 0.0);
    float lit = max(dot(uLightDir, vec3(0.0, 1.0, 0.0)), 0.0);
    vec3 shipLight = uGain * uSunColor * 2.6 * (1.0 - uNight) + vec3(0.35, 0.42, 0.5) * (1.0 - uNight) + vec3(1.0, 0.72, 0.38) * uShipLights * 0.55;
    float h1 = boxHit(ro, R, vec3(-165.0, -1.0, -21.4), vec3(150.0, 20.0, 21.4), bn);
    if (h1 > 0.0) {
      float sunny = 0.28 + 0.72 * max(dot(bn, uLightDir), 0.0);
      refl = mix(refl, vec3(0.86, 0.87, 0.88) * shipLight * sunny * 0.3, 0.8 * exp(-h1 / 60.0));
    } else {
      float h2 = boxHit(ro, R, vec3(-160.0, 20.0, -21.4), vec3(146.0, 52.0, 21.4), bn);
      if (h2 > 0.0) {
        float sunny = 0.3 + 0.7 * max(dot(bn, uLightDir), 0.0);
        vec3 band = mix(vec3(0.13, 0.17, 0.22), vec3(0.8), step(0.72, fract((ro.y + R.y * h2) / 2.8)));
        refl = mix(refl, band * shipLight * sunny * 0.3 + vec3(1.0, 0.7, 0.35) * uShipLights * 0.25, 0.75 * exp(-h2 / 90.0));
      }
    }

    // --- the water itself
    vec3 deep = mix(vec3(0.006, 0.045, 0.095), vec3(0.02, 0.03, 0.06), uGolden);
    vec3 scatter = mix(vec3(0.0, 0.2, 0.26), vec3(0.09, 0.12, 0.12), uGolden);
    float dayLight = (1.0 - uNight) * (0.25 + 0.75 * lit);
    float through = pow(max(dot(V, -uLightDir) * 0.5 + 0.5, 0.0), 3.0) * clamp(vCrest * 0.6 + 0.35, 0.0, 1.0);
    vec3 body = deep * (0.6 + 0.9 * dayLight) + scatter * (through * 1.5 + 0.12 + 0.3 * clamp(vCrest * 0.4, 0.0, 1.0)) * dayLight * (0.5 + uSunColor);
    // aerated water in the wake is paler and greener
    body = mix(body, vec3(0.12, 0.42, 0.46) * (0.03 + dayLight * 1.2), clamp(trail * 0.75 + skirt * 0.5 + arm * 0.4, 0.0, 0.85));
    body += vec3(0.004, 0.007, 0.014) * uNight;
    // contact shadow under the hull's flank
    body *= 1.0 - 0.45 * inLen * exp(-max(side, 0.0) / 5.0);

    body *= uGain;
    vec3 col = mix(body, refl, fres);

    // sun (or moon) glitter
    vec3 H = normalize(V + uLightDir);
    float nh = max(dot(N, H), 0.0);
    float glit = pow(nh, mix(900.0, 220.0, smoothstep(100.0, 5000.0, dist))) * mix(34.0, 5.0, smoothstep(100.0, 5000.0, dist));
    glit += pow(nh, 60.0) * 0.12;
    col += uGain * uSunColor * glit * (1.0 - uNight * 0.9) * (1.0 - foam);
    col += vec3(0.55, 0.68, 1.0) * glit * uNight * 0.06;

    // foam is matte and lit by sky and sun
    vec3 foamCol = uGain * vec3(0.92, 0.96, 0.97) * (uSunColor * (0.35 + 1.5 * lit) * (1.0 - uNight) + vec3(0.32, 0.4, 0.5) * (1.0 - uNight) + vec3(0.03, 0.045, 0.07) + vec3(1.0, 0.75, 0.45) * uShipLights * 0.12 * inLen);
    col = mix(col, foamCol, foam * 0.92);

    // warm glow of the ship's lights on the water at night
    float glow = uShipLights * exp(-max(side, 0.0) / 26.0) * inLen;
    col += uGain * vec3(1.0, 0.66, 0.3) * glow * 0.045 * (0.6 + n2.z);

    // haze towards the horizon
    float haze = 1.0 - exp(-pow(dist / 9000.0, 1.25));
    col = mix(col, uHorizon * mix(0.9, 0.5, uNight), clamp(haze, 0.0, 1.0));

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class Ocean {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  /** Ship speed through the water, m/s (20 knots is about 10). */
  speed = 9.5;
  private travel = 0;

  constructor(
    private env: Environment,
    lowPower: boolean,
  ) {
    const dir = (deg: number) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
    // long swell from ahead and to starboard, plus shorter wind waves on top
    const waves = [
      [...dir(162), 138, 0.62],
      [...dir(195), 86, 0.36],
      [...dir(140), 52, 0.22],
      [...dir(215), 31, 0.14],
      [...dir(120), 19, 0.085],
      [...dir(178), 11.5, 0.05],
      [...dir(245), 6.4, 0.028],
    ].map((w) => new THREE.Vector4(w[0], w[1], w[2], w[3]));
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uWaves: { value: waves },
        uTime: { value: 0 },
        uTravel: { value: 0 },
        uSea: { value: 1 },
        uSky: { value: env.cubeTarget.texture },
        uNoise: { value: noiseTexture(lowPower ? 128 : 256) },
        uLightDir: { value: env.lightDir },
        uSunColor: { value: new THREE.Color() },
        uHorizon: { value: env.horizonColor },
        uNight: { value: 0 },
        uGolden: { value: 0 },
        uShipLights: { value: 0 },
        uGain: { value: 1 },
      },
    });
    this.mesh = new THREE.Mesh(polarGrid(lowPower ? 150 : 230, lowPower ? 192 : 320), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -2;
  }

  update(dt: number, time: number, shipLights: number) {
    this.travel += this.speed * dt;
    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uTravel.value = this.travel % 100000;
    u.uNight.value = this.env.night;
    u.uGolden.value = this.env.golden;
    u.uShipLights.value = shipLights;
    u.uGain.value = 0.42 / this.env.exposure;
    (u.uSunColor.value as THREE.Color).copy(this.env.sun.color).multiplyScalar(this.env.night > 0.6 ? 0.25 : Math.min(1, this.env.sun.intensity / 16));
  }

  /** Height of the swell at a point beside the ship, for things that float. */
  heightAt(x: number, z: number, time: number): number {
    let y = 0;
    for (const w of this.material.uniforms.uWaves.value as THREE.Vector4[]) {
      const k = (Math.PI * 2) / w.z;
      y += w.w * Math.sin(k * (w.x * (x + this.travel) + w.y * z) - Math.sqrt(9.81 * k) * time);
    }
    return y;
  }
}
