// Gera dist/sw.js depois do build, com a lista de arquivos para funcionar offline.
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

const DIST = 'dist';
const arquivos = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    statSync(p).isDirectory() ? walk(p) : arquivos.push(p);
  }
};
walk(DIST);

const url = (p) => '/' + relative(DIST, p).split(sep).join('/');
const precache = [];
const hash = createHash('sha256');

for (const p of arquivos) {
  const u = url(p);
  if (u === '/sw.js' || u === '/og.png') continue;
  if (u.endsWith('.html')) {
    // dist/index.html -> /, dist/pt/index.html -> /pt/ (pages are served without .html)
    precache.push(u === '/404.html' ? u : u.replace(/index\.html$/, ''));
  } else precache.push(u);
  hash.update(u).update(readFileSync(p));
}

const versao = hash.digest('hex').slice(0, 12);
const sw = `// Gerado automaticamente por scripts/gen-sw.mjs. Não edite.
const VERSAO = ${JSON.stringify(versao)};
const PRECACHE = 'vgps-' + VERSAO;
const RUNTIME = 'vgps-runtime-v1';
const ARQUIVOS = ${JSON.stringify(precache, null, 0)};

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(PRECACHE).then(async (c) => {
      // adiciona um por um para que uma falha não impeça o resto
      await Promise.all(ARQUIVOS.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    }).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('vgps-') && k !== PRECACHE && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const comTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

async function daRede(req, cacheName) {
  const res = await fetch(req);
  if (res.ok && (res.type === 'basic' || res.type === 'cors' || res.type === 'opaque')) {
    const c = await caches.open(cacheName);
    c.put(req, res.clone());
  }
  return res;
}

async function limitar(cacheName, max) {
  const c = await caches.open(cacheName);
  const ks = await c.keys();
  for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const u = new URL(req.url);

  // Páginas: rede primeiro (rápida), cache se estiver sem internet / internet lenta do navio
  if (req.mode === 'navigate') {
    e.respondWith(
      comTimeout(daRede(req, PRECACHE), 4000).catch(async () =>
        (await caches.match(req, { ignoreSearch: true })) ||
        (await caches.match(u.pathname.endsWith('/') ? u.pathname : u.pathname + '/')) ||
        (await caches.match('/')),
      ),
    );
    return;
  }

  if (u.origin === location.origin) {
    // Arquivos do site: cache primeiro, atualiza em segundo plano
    e.respondWith(
      caches.match(req).then((hit) => {
        const rede = daRede(req, RUNTIME).catch(() => hit);
        return hit || rede;
      }),
    );
    return;
  }

  // Fontes e miniaturas de vídeo ficam disponíveis offline (mapas do OSM não: política de uso deles)
  if (/fonts\\.(googleapis|gstatic)\\.com$/.test(u.hostname)) {
    e.respondWith(
      caches.match(req).then(
        (hit) => hit || daRede(req, RUNTIME).then((r) => { limitar(RUNTIME, 600); return r; }),
      ),
    );
  }
});
`;
writeFileSync(join(DIST, 'sw.js'), sw);
console.log(`sw.js: ${precache.length} arquivos no pré-cache (versão ${versao})`);
