// Astro integration for sites that use virtuosa-gps as a dependency.
// It serves the deck plans and the route data (public/plantas/ of this package) at `base`
// during `astro dev`, and copies them into the build output.
//
//   import virtuosaGps from 'virtuosa-gps/integration';
//   export default defineConfig({ integrations: [virtuosaGps()] });
import { cpSync, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const DADOS = fileURLToPath(new URL('./public/plantas/', import.meta.url));
const TIPOS = { '.json': 'application/json', '.svg': 'image/svg+xml' };

/** @param {{ base?: string }} [opts] @returns {import('astro').AstroIntegration} */
export default function virtuosaGps({ base = '/plantas/' } = {}) {
  return {
    name: 'virtuosa-gps',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'virtuosa-gps:plantas',
                configureServer(server) {
                  server.middlewares.use(base, (req, res, next) => {
                    const rel = normalize(decodeURIComponent((req.url ?? '').split('?')[0])).replace(/^([/\\])+/, '');
                    const f = join(DADOS, rel);
                    if (!rel || rel.startsWith('..') || !existsSync(f) || !statSync(f).isFile()) return next();
                    res.setHeader('content-type', TIPOS[extname(f)] ?? 'application/octet-stream');
                    res.end(readFileSync(f));
                  });
                },
              },
            ],
          },
        });
      },
      'astro:build:done': ({ dir }) => {
        cpSync(DADOS, fileURLToPath(new URL('.' + base, dir)), { recursive: true });
      },
    },
  };
}
