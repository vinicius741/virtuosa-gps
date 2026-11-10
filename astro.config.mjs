// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://virtuosa-gps.vinicius741.workers.dev',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
