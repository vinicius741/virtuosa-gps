// Sky, sun, moon and stars, driven by a single "hour of the day" value. The sky is also
// captured into a cube map that lights the ship and is what the sea reflects.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { clamp, lerp, rng, smoothstep } from '../core/data';

const DEG = Math.PI / 180;

export class Environment {
  readonly sky: Sky;
  readonly sun = new THREE.DirectionalLight(0xffffff, 3);
  readonly hemi = new THREE.HemisphereLight(0xbfd9ff, 0x2a4f6a, 1);
  readonly stars: THREE.Points;
  /** Direction towards the sun (or the moon at night): the light the scene is lit by. */
  readonly lightDir = new THREE.Vector3();
  readonly sunDir = new THREE.Vector3();
  readonly sunColor = new THREE.Color();
  readonly horizonColor = new THREE.Color();
  /** 0 by day, 1 in full night. */
  night = 0;
  /** 0 at noon, 1 at sunrise or sunset. */
  golden = 0;
  hour = 15.5;
  exposure = 0.22;
  readonly cubeTarget: THREE.WebGLCubeRenderTarget;
  private cubeCam: THREE.CubeCamera;
  private envScene = new THREE.Scene();
  private pmrem: THREE.PMREMGenerator;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private dirty = true;
  private lastEnv = -1;
  private starMat: THREE.PointsMaterial;
  private seaMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, toneMapped: false });

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    lowPower: boolean,
  ) {
    this.sky = new Sky();
    this.sky.scale.setScalar(45000);
    this.sky.frustumCulled = false;
    const u = this.sky.material.uniforms;
    u.cloudCoverage.value = 0.42;
    u.cloudDensity.value = 0.5;
    u.cloudElevation.value = 0.45;
    u.cloudScale.value = 0.00022;
    u.cloudSpeed.value = 0.00006;
    scene.add(this.sky);

    // Stars: points on a far sphere, only visible at night
    const rand = rng(77);
    const n = lowPower ? 900 : 2200;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const y = rand() * 0.98 + 0.02;
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(a) * r * 30000, y * 30000, Math.sin(a) * r * 30000], i * 3);
      const b = 0.35 + Math.pow(rand(), 3) * 0.65;
      const warm = rand();
      col.set([b * (0.85 + warm * 0.15), b * 0.92, b * (1 - warm * 0.2)], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.starMat = new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -1;
    scene.add(this.stars);

    // Sun: one shadow map that covers the whole ship
    this.sun.castShadow = true;
    const s = this.sun.shadow;
    s.mapSize.setScalar(lowPower ? 2048 : 4096);
    s.camera.left = -182;
    s.camera.right = 182;
    s.camera.top = 60;
    s.camera.bottom = -60;
    s.camera.near = 50;
    s.camera.far = 900;
    s.bias = -0.0005;
    s.normalBias = 0.14;
    s.radius = 1.6;
    scene.add(this.sun, this.sun.target, this.hemi);

    this.cubeTarget = new THREE.WebGLCubeRenderTarget(lowPower ? 128 : 256, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    this.cubeCam = new THREE.CubeCamera(1, 100000, this.cubeTarget);
    const copy = new THREE.Mesh(this.sky.geometry, this.sky.material);
    copy.scale.setScalar(45000);
    this.envScene.add(copy);
    // The sky model is undefined below the horizon; the sea goes there instead, so that
    // surfaces facing down or sideways pick up the colour of the water.
    const sea = new THREE.Mesh(new THREE.SphereGeometry(30000, 32, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), this.seaMat);
    this.envScene.add(sea);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.setHour(this.hour);
  }

  setHour(h: number) {
    this.hour = ((h % 24) + 24) % 24;
    // Sun height: a plain sine over the day, a little above 60 degrees at noon
    const elev = Math.sin(((this.hour - 6) / 12) * Math.PI) * 63 * DEG;
    // It rises ahead and to starboard and sets astern and to port, so every side gets its light
    const az = (-40 + (this.hour - 6) * 14.5) * DEG;
    this.sunDir.set(Math.cos(elev) * Math.cos(az), Math.sin(elev), Math.cos(elev) * Math.sin(az)).normalize();
    const e = elev / DEG;
    this.night = 1 - smoothstep(-9, 3, e);
    this.golden = clamp(1 - Math.abs(e - 4) / 22, 0, 1) * (1 - this.night * 0.5);

    const u = this.sky.material.uniforms;
    u.sunPosition.value.copy(this.sunDir);
    u.turbidity.value = lerp(2.2, 7, this.golden);
    u.rayleigh.value = lerp(1.1, 2.6, this.golden) * (1 - this.night * 0.92);
    u.mieCoefficient.value = lerp(0.004, 0.012, this.golden);
    u.mieDirectionalG.value = 0.82;
    u.cloudDensity.value = lerp(0.5, 0.22, this.night);

    // Light the scene by the sun, or by a moon standing opposite once the sun is gone
    const sunUp = smoothstep(-3, 6, e);
    const warm = smoothstep(0, 28, e);
    this.sunColor.setRGB(1, lerp(0.5, 0.96, warm), lerp(0.22, 0.9, warm));
    if (this.night > 0.6) {
      this.lightDir.set(-0.35, 0.72, 0.6).normalize();
      this.sun.color.setRGB(0.55, 0.68, 1);
      this.sun.intensity = 0.42 * this.night;
    } else {
      this.lightDir.copy(this.sunDir);
      if (this.lightDir.y < 0.06) this.lightDir.setY(0.06).normalize();
      this.sun.color.copy(this.sunColor);
      this.sun.intensity = 19 * sunUp * lerp(1, 0.8, this.golden) + 0.05;
    }
    this.sun.position.copy(this.lightDir).multiplyScalar(420).add(this.sun.target.position.set(0, 30, 0));
    this.sun.target.updateMatrixWorld();
    this.fitShadow();

    this.hemi.intensity = lerp(2.5, 0.2, this.night) * lerp(1, 0.8, this.golden);
    this.hemi.color.setRGB(lerp(0.72, 1.0, this.golden), lerp(0.84, 0.72, this.golden), lerp(1.0, 0.62, this.golden)).lerp(new THREE.Color(0.2, 0.28, 0.5), this.night);
    this.hemi.groundColor.setRGB(0.34, 0.42, 0.5).lerp(new THREE.Color(0.02, 0.03, 0.06), this.night);
    this.horizonColor.setRGB(lerp(0.66, 0.95, this.golden), lerp(0.78, 0.62, this.golden), lerp(0.9, 0.5, this.golden)).multiplyScalar(lerp(1, 0.035, this.night));
    this.starMat.opacity = smoothstep(0.55, 1, this.night) * 0.95;
    this.seaMat.color.setRGB(0.05, 0.16, 0.26).lerp(this.horizonColor, 0.3).multiplyScalar(lerp(5, 0.05, this.night) * lerp(1, 0.6, this.golden));
    this.exposure = lerp(lerp(0.22, 0.3, this.golden), 0.85, this.night);
    this.renderer.toneMappingExposure = this.exposure;
    this.dirty = true;
  }

  /** Fits the shadow map to the ship's bounding box as seen from the light, whatever its direction. */
  private fitShadow() {
    const cam = this.sun.shadow.camera;
    this.sun.updateMatrixWorld();
    cam.position.copy(this.sun.position);
    cam.lookAt(this.sun.target.position);
    cam.updateMatrixWorld();
    const inv = cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    let l = Infinity;
    let r = -Infinity;
    let b = Infinity;
    let t = -Infinity;
    let n = Infinity;
    let f = -Infinity;
    const v = new THREE.Vector3();
    for (const x of [-169, 169]) {
      for (const y of [-3, 70]) {
        for (const z of [-29, 29]) {
          v.set(x, y, z).applyMatrix4(inv);
          l = Math.min(l, v.x);
          r = Math.max(r, v.x);
          b = Math.min(b, v.y);
          t = Math.max(t, v.y);
          n = Math.min(n, -v.z);
          f = Math.max(f, -v.z);
        }
      }
    }
    cam.left = l;
    cam.right = r;
    cam.bottom = b;
    cam.top = t;
    cam.near = Math.max(1, n - 5);
    cam.far = f + 5;
    cam.updateProjectionMatrix();
  }

  update(time: number) {
    this.sky.material.uniforms.time.value = time;
    if (this.dirty && time - this.lastEnv > 0.25) {
      this.dirty = false;
      this.lastEnv = time;
      // The sun's disc is far brighter than a half-float texture can hold, and one overflowing
      // texel turns the whole blurred environment black: leave it out of the captures.
      const disc = this.sky.material.uniforms.showSunDisc;
      disc.value = 0;
      this.cubeCam.update(this.renderer, this.envScene);
      const old = this.envRT;
      this.envRT = this.pmrem.fromScene(this.envScene, 0, 1, 100000);
      disc.value = 1;
      this.scene.environment = this.envRT.texture;
      this.scene.environmentIntensity = lerp(0.2, 0.5, this.night);
      old?.dispose();
    }
  }

  dispose() {
    this.envRT?.dispose();
    this.cubeTarget.dispose();
    this.pmrem.dispose();
  }
}
