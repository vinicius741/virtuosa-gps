import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Standalone build of the 3D ship (ship3d/dist), deployed as its own Cloudflare Worker.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
  server: { port: 4330, host: '127.0.0.1' },
  preview: { port: 4331, host: '127.0.0.1' },
});
