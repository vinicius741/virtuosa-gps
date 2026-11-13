// The page: the 3D scene plus its controls (views, tour, time of day, language).
import { SHOTS, ShipScene, type Quality } from './scene';
import { TEXTS, type Lang } from './ui/texts';

const q = new URLSearchParams(location.search);
const GPS_SITE = 'https://virtuosa-gps.vinicius741.workers.dev';

let lang: Lang = q.get('lang') === 'pt' || location.pathname.startsWith('/pt') || (!q.get('lang') && location.pathname === '/' && navigator.language.toLowerCase().startsWith('pt')) ? 'pt' : 'en';
if (q.get('lang') === 'en') lang = 'en';

const ICON: Record<string, string> = {
  play: '<path d="M7 5l12 7-12 7z" fill="currentColor"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4"/><path d="M6.5 6.6A16.6 16.6 0 002 12s3.6 7 10 7a10.5 10.5 0 004.3-.9"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
  route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3.5 3.5 0 000-7H9a3.5 3.5 0 010-7h7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
const icon = (name: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

const stage = document.getElementById('stage')!;
const loading = document.getElementById('loading')!;
const top = document.getElementById('top')!;
const bottom = document.getElementById('bottom')!;
const hint = document.getElementById('hint')!;
document.getElementById('loading-text')!.textContent = TEXTS[lang].loading;
if (q.get('ui') === '0') document.body.classList.add('noui');

function start() {
  let view: ShipScene;
  try {
    view = new ShipScene(stage, {
      quality: (q.get('q') as Quality) || undefined,
      hour: q.has('hour') && Number.isFinite(Number(q.get('hour'))) ? Number(q.get('hour')) : undefined,
      shot: q.get('shot') ?? undefined,
      tour: !q.has('shot') && !q.has('cam') && q.get('tour') !== '0',
      onShot: () => render(),
      onHour: (h) => syncClock(h),
      onReady: () => {
        loading.classList.add('done');
        setTimeout(() => loading.remove(), 1200);
        if (!sessionStorage.getItem('v3d-hint')) {
          hint.classList.add('on');
          setTimeout(() => hint.classList.remove('on'), 5200);
          try {
            sessionStorage.setItem('v3d-hint', '1');
          } catch {
            /* private mode */
          }
        }
      },
    });
  } catch (err) {
    console.error(err);
    document.getElementById('loading-text')!.textContent = TEXTS[lang].noWebgl;
    loading.querySelector('.wave')?.remove();
    return;
  }

  let slider: HTMLInputElement | null = null;
  let clockOut: HTMLElement | null = null;
  let clockIcon: HTMLElement | null = null;
  const fmt = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
  function syncClock(h: number) {
    if (!slider || !clockOut || !clockIcon) return;
    if (document.activeElement !== slider) slider.value = String(h);
    clockOut.textContent = fmt(h);
    const night = h < 5.6 || h > 18.4;
    if (clockIcon.dataset.n !== String(night)) {
      clockIcon.dataset.n = String(night);
      clockIcon.innerHTML = icon(night ? 'moon' : 'sun');
    }
  }

  function render() {
    const t = TEXTS[lang];
    // the controls are redrawn on every change: remember which one had the focus
    const active = document.activeElement as HTMLElement | null;
    const focusKey = active?.dataset?.shot ? `[data-shot="${active.dataset.shot}"]` : active && 'tour' in (active.dataset ?? {}) ? '[data-tour]' : active?.id ? `#${active.id}` : null;
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    hint.textContent = t.drag;
    const clean = document.body.classList.contains('clean');
    top.innerHTML = `
      <div class="brand hideable"><b>${t.title}</b><span>${t.unofficial}</span></div>
      <div class="grow"></div>
      <a class="pill gps hideable" href="${GPS_SITE}${lang === 'pt' ? '/pt/' : '/'}" aria-label="${t.gps}" title="${t.gps}">${icon('route')}<span>${t.gps}</span></a>
      <button class="pill hideable" id="lang" aria-label="${lang === 'pt' ? 'Switch to English' : 'Mudar para português'}">${lang === 'pt' ? 'EN' : 'PT'}</button>
      <button class="pill icon" id="clean" aria-pressed="${clean}" aria-label="${clean ? t.show : t.hide}" title="${clean ? t.show : t.hide}">${icon(clean ? 'eyeOff' : 'eye')}</button>`;
    const cur = view.currentShot;
    const [name, text] = t.shots[cur.id] ?? ['', ''];
    const scroll = document.getElementById('chips')?.scrollLeft ?? 0;
    bottom.innerHTML = `
      <div id="caption" aria-live="polite"><h2>${name}</h2><p>${text}</p></div>
      <div id="chips" role="group" aria-label="Views">
        <button class="chip tour" data-tour aria-pressed="${view.tour}">${icon(view.tour ? 'stop' : 'play')}<span>${view.tour ? t.stopTour : t.tour}</span></button>
        ${SHOTS.map((s) => `<button class="chip" data-shot="${s.id}" aria-pressed="${!view.tour && s.id === cur.id}">${t.shots[s.id][0]}</button>`).join('')}
      </div>
      <div id="clock">
        <span id="clock-icon"></span>
        <label class="sr" for="hour">${t.time}</label>
        <input id="hour" type="range" min="0" max="24" step="0.05" value="${view.hour}" />
        <output for="hour"></output>
        <button id="lapse" aria-pressed="${view.timeLapse > 0}" aria-label="${t.timeLapse}" title="${t.timeLapse}">${icon(view.timeLapse > 0 ? 'stop' : 'clock')}</button>
      </div>
      <p id="notice">${t.notice}</p>`;
    slider = bottom.querySelector('#hour');
    clockOut = bottom.querySelector('output');
    clockIcon = bottom.querySelector('#clock-icon');
    const chips = document.getElementById('chips')!;
    chips.scrollLeft = scroll;
    if (view.tour) chips.querySelector<HTMLElement>(`[data-shot="${cur.id}"]`)?.style.setProperty('border-color', 'var(--accent)');
    syncClock(view.hour);
    if (focusKey && focusKey !== '#hour') document.querySelector<HTMLElement>(focusKey)?.focus({ preventScroll: true });
    slider!.addEventListener('input', () => {
      view.timeLapse = 0;
      bottom.querySelector('#lapse')!.setAttribute('aria-pressed', 'false');
      view.setHour(Number(slider!.value));
    });
  }

  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!el) return;
    if (el.dataset.shot) view.goTo(el.dataset.shot);
    else if ('tour' in el.dataset) {
      if (view.tour) view.tour = false;
      else view.startTour();
      render();
    } else if (el.id === 'lang') {
      lang = lang === 'pt' ? 'en' : 'pt';
      history.replaceState(null, '', lang === 'pt' ? '/pt/' : '/');
      render();
    } else if (el.id === 'clean') {
      document.body.classList.toggle('clean');
      render();
    } else if (el.id === 'lapse') {
      view.timeLapse = view.timeLapse > 0 ? 0 : 0.5;
      render();
    }
  });
  render();
  // debugging: ?cam=x,y,z,tx,ty,tz places the camera by hand
  if (q.has('cam')) {
    const c = q.get('cam')!.split(',').map(Number);
    view.goTo({ id: 'custom', pos: [c[0], c[1], c[2]], target: [c[3], c[4], c[5]], interior: q.get('inside') === '1', cut: q.has('cut') ? Number(q.get('cut')) : undefined }, 0.01);
  }
  Object.assign(window, { __view: view, __ready: true });
}
start();
