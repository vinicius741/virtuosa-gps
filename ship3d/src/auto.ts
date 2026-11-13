// The scene for a page that cannot know what device it will run on. Instead of guessing the
// quality from what the browser says, AutoShip starts light, watches how the device keeps up
// and moves up one quality at a time while there is room; it moves back down when there is not,
// and tells the page to show something else when even the lightest scene is too much.
//
//   const ship = new AutoShip(el, { onFallback: () => showPhotosInstead() });
//   ship.scene?.goTo('pool');   ship.setMode('lite');   ship.dispose();
//
// Changing quality rebuilds the scene (the number of people, the sea and the shadows are all
// decided when it is built), keeping the camera, the hour and the view where they were.
import { ShipScene, TIERS, type Perf, type Quality, type ShipSceneOptions } from './scene';

/** 'auto' measures; 'lite' and 'full' are the viewer's own choice and are not second-guessed. */
export type Mode = 'auto' | 'lite' | 'full';
export type FallbackReason = 'no-webgl' | 'too-slow' | 'context-lost';

export interface AutoShipOptions extends Omit<ShipSceneOptions, 'quality' | 'fpsCap' | 'camera' | 'onContextLost'> {
  mode?: Mode;
  /** the best quality 'auto' and 'full' may use (default: 'medium' with a touch screen, 'high' without) */
  ceiling?: Quality;
  /** localStorage key that remembers the quality this device settled on; null to not remember */
  storageKey?: string | null;
  /** a scene was built at this quality; `settled` once AutoShip has stopped trying others */
  onQuality?: (quality: Quality, settled: boolean) => void;
  /** there is no 3D to show: the scene is gone and the page should show something else */
  onFallback?: (reason: FallbackReason) => void;
}

/** Under this many frames per second on the lightest scene, pictures serve the viewer better. */
const SLIDESHOW_FPS = 16;
/** A remembered quality is trusted for this long, then measured again. */
const REMEMBER_MS = 14 * 24 * 3600 * 1000;

export class AutoShip {
  scene: ShipScene | null = null;
  quality: Quality = 'lite';
  mode: Mode;
  /** no further qualities will be tried unless the device starts to struggle */
  settled = false;
  private opts: AutoShipOptions;
  private top: Quality;
  private ceiling: Quality;
  private windows = 0;
  private trial = false;
  private bad = 0;
  private hopeless = 0;
  private pending: { quality: Quality; trial: boolean; settled: boolean } | null = null;
  private pointers = 0;
  private announced = false;
  private insisted = false;
  private disposed = false;
  private onDown = () => this.pointers++;
  private onUp = () => (this.pointers = Math.max(0, this.pointers - 1));

  constructor(
    private el: HTMLElement,
    opts: AutoShipOptions = {},
  ) {
    this.opts = opts;
    this.mode = opts.mode ?? 'auto';
    const touch = matchMedia('(pointer: coarse)').matches;
    this.ceiling = opts.ceiling ?? (touch ? 'medium' : 'high');
    this.top = this.ceiling;
    el.addEventListener('pointerdown', this.onDown);
    addEventListener('pointerup', this.onUp);
    addEventListener('pointercancel', this.onUp);
    this.start({ hour: opts.hour, shot: opts.shot, tour: opts.tour });
  }

  /** Switch between measuring and the viewer's own choice. Also brings the 3D back after a fallback. */
  setMode(mode: Mode) {
    this.mode = mode;
    this.insisted = !this.scene && mode !== 'auto';
    if (mode === 'auto') this.forget();
    this.top = this.ceiling;
    const s = this.scene;
    const keep = s ? { hour: s.hour, shot: s.currentShot.id, tour: s.tour, camera: s.view, timeLapse: s.timeLapse } : { hour: this.opts.hour, shot: this.opts.shot, tour: this.opts.tour };
    if (s && ((mode === 'lite' && this.quality === 'lite') || (mode === 'full' && this.quality === this.top))) {
      this.settle();
      return;
    }
    if (s && mode === 'auto') {
      // measure again from where it is
      this.settled = false;
      this.windows = 0;
      this.trial = false;
      if (this.quality === 'lite') s.setFpsCap(null);
      this.opts.onQuality?.(this.quality, false);
      return;
    }
    this.freeze();
    s?.dispose();
    this.scene = null;
    this.start(keep);
  }

  dispose() {
    this.disposed = true;
    this.el.removeEventListener('pointerdown', this.onDown);
    removeEventListener('pointerup', this.onUp);
    removeEventListener('pointercancel', this.onUp);
    this.scene?.dispose();
    this.scene = null;
    this.el.style.backgroundImage = '';
  }

  // ------------------------------------------------------------------------------------------

  private start(keep: Keep) {
    const top = TIERS.indexOf(this.top);
    if (this.mode === 'lite') return this.build('lite', keep, false, true);
    if (this.mode === 'full') return this.build(this.top, keep, false, true);
    const known = this.recall();
    if (known) return this.build(TIERS[Math.min(TIERS.indexOf(known), top)], keep, false, true);
    // a phone starts on the lightest scene; a computer two steps up, where it will almost always stay or rise
    const first = matchMedia('(pointer: coarse)').matches ? 'lite' : 'medium';
    this.build(TIERS[Math.min(TIERS.indexOf(first), top)], keep, false, false);
  }

  private build(quality: Quality, keep: Keep, trial: boolean, settled: boolean) {
    this.quality = quality;
    this.trial = trial;
    this.settled = settled;
    this.windows = 0;
    this.bad = 0;
    this.hopeless = 0;
    this.pending = null;
    const o = this.opts;
    try {
      this.scene = new ShipScene(this.el, {
        ...o,
        ...keep,
        quality,
        // while it is still deciding, the lightest scene runs free: a cap would hide how much room there is
        fpsCap: quality === 'lite' && !settled ? null : undefined,
        onReady: () => {
          this.el.style.backgroundImage = '';
          if (!this.announced) {
            this.announced = true;
            o.onReady?.();
          }
        },
        onPerf: (p) => this.watch(p),
        onContextLost: () => this.giveUp('context-lost'),
      });
    } catch (err) {
      console.warn('[virtuosa-3d] no WebGL scene:', err);
      this.scene = null;
      this.giveUp('no-webgl');
      return;
    }
    if (keep.timeLapse) this.scene.timeLapse = keep.timeLapse;
    o.onQuality?.(quality, settled);
  }

  /** Called every two seconds with what the scene measured. */
  private watch(p: Perf) {
    if (this.disposed || !this.scene) return;
    this.opts.onPerf?.(p);
    if (this.pending) {
      this.move(this.pending.quality, this.pending.trial, this.pending.settled);
      return;
    }
    // the first two seconds include compiling the shaders and filling the caches: not a fair sample
    if (++this.windows < 2) return;
    const i = TIERS.indexOf(this.quality);
    const smooth = p.atBest && p.fps >= p.target * 0.9;
    const poor = p.fps < p.target * 0.62;

    if (this.quality === 'lite') {
      // the resolution is already as low as it goes and it still crawls: stop torturing the phone
      // (unless the viewer came back from the fallback and asked for the 3D anyway)
      this.hopeless = p.atFloor && p.fps < SLIDESHOW_FPS && !this.insisted ? this.hopeless + 1 : 0;
      if (this.hopeless >= 3) return this.giveUp('too-slow');
    }
    if (this.mode !== 'auto') return;

    if (this.trial) {
      // just moved up: this one sample decides whether it stays
      this.trial = false;
      if (p.fps < p.target * 0.75) {
        this.top = TIERS[i - 1];
        return this.move(TIERS[i - 1], false, true);
      }
    }
    if (!this.settled) {
      if (smooth && i < TIERS.indexOf(this.top)) this.move(TIERS[i + 1], true);
      else this.settle();
      return;
    }
    // settled, but the device may get hot or busy later
    this.bad = poor && i > 0 ? this.bad + 1 : 0;
    if (this.bad >= 3) {
      this.top = TIERS[i - 1];
      this.move(TIERS[i - 1], false, true);
    }
  }

  private settle() {
    this.settled = true;
    this.trial = false;
    if (this.quality === 'lite') this.scene?.setFpsCap(30);
    this.remember();
    this.opts.onQuality?.(this.quality, true);
  }

  /** Rebuild at another quality, as soon as the viewer is not in the middle of something. */
  private move(quality: Quality, trial: boolean, settled = false) {
    const s = this.scene;
    if (!s) return;
    if (this.pointers > 0 || s.busy) {
      this.pending = { quality, trial, settled };
      return;
    }
    const keep: Keep = { hour: s.hour, shot: s.currentShot.id, tour: s.tour, camera: s.view, timeLapse: s.timeLapse };
    this.freeze();
    s.dispose();
    this.scene = null;
    this.build(quality, keep, trial, settled);
    // a step down is final: `top` was lowered first, so the quality above is not tried again
    if (settled && this.scene) this.remember();
  }

  /** Leave the last picture on the element while the next scene is built. */
  private freeze() {
    const shot = this.scene?.snapshot();
    if (!shot) return;
    this.el.style.backgroundImage = `url(${shot})`;
    this.el.style.backgroundSize = 'cover';
    this.el.style.backgroundPosition = 'center';
  }

  private giveUp(reason: FallbackReason) {
    if (this.disposed) return;
    this.scene?.dispose();
    this.scene = null;
    this.el.style.backgroundImage = '';
    if (reason === 'too-slow') this.forget();
    this.opts.onFallback?.(reason);
  }

  private get key() {
    return this.opts.storageKey === undefined ? 'virtuosa-3d-quality' : this.opts.storageKey;
  }

  private remember() {
    if (!this.key || this.mode !== 'auto') return;
    try {
      localStorage.setItem(this.key, JSON.stringify({ q: this.quality, t: Date.now() }));
    } catch {
      /* private mode, or storage turned off */
    }
  }

  private recall(): Quality | null {
    if (!this.key) return null;
    try {
      const v = JSON.parse(localStorage.getItem(this.key) ?? 'null') as { q?: Quality; t?: number } | null;
      if (v && typeof v.t === 'number' && Date.now() - v.t < REMEMBER_MS && TIERS.includes(v.q as Quality)) return v.q as Quality;
    } catch {
      /* nothing remembered */
    }
    return null;
  }

  private forget() {
    if (!this.key) return;
    try {
      localStorage.removeItem(this.key);
    } catch {
      /* nothing to forget */
    }
  }
}

interface Keep {
  hour?: number;
  shot?: string;
  tour?: boolean;
  camera?: { pos: [number, number, number]; target: [number, number, number] };
  timeLapse?: number;
}
