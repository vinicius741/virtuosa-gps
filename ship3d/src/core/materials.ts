// The ship's paints, glass, wood and lights. Geometry is grouped by these names (see Parts).
import * as THREE from 'three';

export interface Mats {
  [key: string]: THREE.Material;
}

/** A soft procedural texture: tiles with a little variation, drawn once on a canvas. */
function canvasTexture(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void, repeat = 1): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d')!;
  draw(c, size);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Teak planking: long narrow boards with dark caulking, as on the open decks. */
function teak(): THREE.CanvasTexture {
  return canvasTexture(512, (c, s) => {
    c.fillStyle = '#b08a5c';
    c.fillRect(0, 0, s, s);
    const boards = 16;
    const bw = s / boards;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < boards; i++) {
      const tone = 150 + Math.floor(rnd() * 40);
      c.fillStyle = `rgb(${tone + 22},${tone - 12},${tone - 62})`;
      c.fillRect(i * bw, 0, bw, s);
      for (let k = 0; k < 26; k++) {
        c.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 60},${rnd() > 0.5 ? 220 : 40},150,${0.03 + rnd() * 0.05})`;
        c.fillRect(i * bw + rnd() * bw, rnd() * s, 1 + rnd() * 2, 30 + rnd() * 120);
      }
      c.fillStyle = 'rgba(40,28,18,0.75)';
      c.fillRect(i * bw, 0, 1.6, s);
      // butt joints
      const j = rnd() * s;
      c.fillRect(i * bw, j, bw, 1.6);
    }
  });
}

/** Blue-green artificial turf / rubber deck, for the sport and water park areas. */
function speckle(base: string, a: string, b: string): THREE.CanvasTexture {
  return canvasTexture(256, (c, s) => {
    c.fillStyle = base;
    c.fillRect(0, 0, s, s);
    let seed = 99;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 2600; i++) {
      c.fillStyle = rnd() > 0.5 ? a : b;
      c.fillRect(rnd() * s, rnd() * s, 1.5, 1.5);
    }
  });
}

/** Pool bottom: small blue mosaic tiles. */
function mosaic(): THREE.CanvasTexture {
  return canvasTexture(256, (c, s) => {
    let seed = 5;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const n = 16;
    const t = s / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = rnd();
        c.fillStyle = `rgb(${40 + v * 40},${150 + v * 50},${200 + v * 40})`;
        c.fillRect(i * t, j * t, t, t);
      }
    }
    c.strokeStyle = 'rgba(235,250,255,0.55)';
    c.lineWidth = 1;
    for (let i = 0; i <= n; i++) {
      c.beginPath();
      c.moveTo(i * t, 0);
      c.lineTo(i * t, s);
      c.moveTo(0, i * t);
      c.lineTo(s, i * t);
      c.stroke();
    }
  });
}

/**
 * Pool water: turquoise, with moving caustics, a sheen of sky and underwater lights at night.
 * The vertex colour says how much open sky the pool sees (the indoor pool gets less sun).
 */
function poolWater(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSun: { value: new THREE.Color(1, 1, 1) },
      uSky: { value: new THREE.Color(0.5, 0.7, 1) },
      uLightDir: { value: new THREE.Vector3(0, 1, 0) },
      uNight: { value: 0 },
      uGain: { value: 1 },
    },
    vertexColors: true,
    clipping: true,
    vertexShader: /* glsl */ `
      #include <clipping_planes_pars_vertex>
      varying vec3 vWorld;
      varying vec2 vPool;
      varying float vOpen;
      void main() {
        vPool = uv;
        vOpen = color.r;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uSun;
      uniform vec3 uSky;
      uniform vec3 uLightDir;
      uniform float uNight;
      uniform float uGain;
      varying vec3 vWorld;
      varying vec2 vPool;
      varying float vOpen;
      #include <clipping_planes_pars_fragment>
      // the classic folded-sine caustic pattern
      float caustic(vec2 p, float t) {
        vec2 i = p;
        float c = 1.0;
        for (int n = 0; n < 4; n++) {
          float tt = t * (1.0 - 3.5 / float(n + 1));
          i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
          c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.005), p.y / (cos(i.y + tt) / 0.005)));
        }
        c /= 4.0;
        c = 1.17 - pow(c, 1.4);
        return pow(abs(c), 8.0);
      }
      void main() {
        #include <clipping_planes_fragment>
        vec3 V = normalize(cameraPosition - vWorld);
        vec2 p = mod(vPool * 2.3, 6.2831853) - 250.0;
        float c = caustic(p, uTime * 0.55);
        vec2 q = vPool * 3.1 + vec2(uTime * 0.6, uTime * 0.45);
        vec3 N = normalize(vec3(sin(q.x) * 0.06 + sin(q.y * 1.7) * 0.04, 1.0, cos(q.y) * 0.06 + cos(q.x * 1.3) * 0.04));
        float day = (1.0 - uNight) * mix(0.4, 1.0, vOpen);
        vec3 water = mix(vec3(0.02, 0.38, 0.55), vec3(0.1, 0.72, 0.82), 0.45 + 0.55 * c);
        vec3 col = water * (uSun * (0.25 + 0.75 * max(uLightDir.y, 0.0)) * 1.6 * day + vec3(0.25, 0.3, 0.35) * day);
        col += vec3(0.75, 1.0, 1.0) * c * 0.55 * day * uSun;
        // lights under the water after dark
        col += vec3(0.05, 0.62, 0.8) * (0.55 + 0.6 * c) * uNight * 0.9;
        float fres = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        col = mix(col * uGain, uSky * mix(0.5, 1.0, vOpen), fres * 0.8);
        vec3 H = normalize(V + uLightDir);
        col += uSun * uGain * pow(max(dot(N, H), 0.0), 420.0) * 9.0 * day * vOpen;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

export function makeMaterials(): Mats {
  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ vertexColors: true, ...o });
  const teakTex = teak();
  const m: Mats = {
    // Hull and superstructure paint: a slightly warm white with a soft sheen
    white: std({ color: 0xf4f5f2, roughness: 0.48, metalness: 0.0 }),
    // Same paint, drawn on both sides (thin panels, bulwarks, overhangs seen from below)
    white2: std({ color: 0xf4f5f2, roughness: 0.5, metalness: 0.0, side: THREE.DoubleSide }),
    navy: std({ color: 0x15233f, roughness: 0.42, metalness: 0.15 }),
    navy2: std({ color: 0x15233f, roughness: 0.42, metalness: 0.15, side: THREE.DoubleSide }),
    // Tinted window glass: almost a mirror of the sky from outside
    glass: std({ color: 0x7f95a8, roughness: 0.05, metalness: 1, envMapIntensity: 18 }),
    // Glass balustrades and wind screens
    rail: new THREE.MeshStandardMaterial({
      color: 0x8fc0d8,
      roughness: 0.05,
      metalness: 0.2,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
      envMapIntensity: 7,
    }),
    // Lit cabins and lounges, switched on as the sun goes down (see Ship.setNight)
    lit: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    teak: std({ color: 0xffffff, map: teakTex, roughness: 0.82, metalness: 0 }),
    deck: std({ color: 0xffffff, roughness: 0.9 }),
    turf: std({ color: 0xffffff, map: speckle('#3f8a4a', '#4b9a57', '#357a40'), roughness: 0.95 }),
    court: std({ color: 0xffffff, map: speckle('#3a6fb3', '#4179bd', '#3565a6'), roughness: 0.9 }),
    steel: std({ color: 0xb9c0c6, roughness: 0.32, metalness: 0.85 }),
    dark: std({ color: 0x20262c, roughness: 0.7, metalness: 0.2 }),
    orange: std({ color: 0xf2581c, roughness: 0.5, metalness: 0 }),
    yellow: std({ color: 0xf2c230, roughness: 0.45, metalness: 0 }),
    green: std({ color: 0x47692f, roughness: 0.4, metalness: 0 }),
    color: std({ color: 0xffffff, roughness: 0.6, metalness: 0 }),
    color2: std({ color: 0xffffff, roughness: 0.6, metalness: 0, side: THREE.DoubleSide }),
    tile: std({ color: 0xffffff, map: mosaic(), roughness: 0.35, metalness: 0 }),
    // Things that glow on their own: screens, signs, party lights
    glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
    water: poolWater(),
  };
  for (const k of ['teak', 'turf', 'court', 'tile']) (m[k] as THREE.MeshStandardMaterial).map!.repeat.set(1, 1);
  return m;
}
