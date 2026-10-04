import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { sitemapPlugin } from './sitemap.plugin.ts';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.PORT ?? 5173);
  const siteUrl = (env.VITE_SITE_URL ?? `http://localhost:${port}`).replace(/\/+$/, '');
  const apiUrl = (env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

  return {
    plugins: [react(), sitemapPlugin({ siteUrl, apiUrl })],
    server: { port, strictPort: true },
    preview: { port, strictPort: true },
    build: {
      target: 'es2022',
      sourcemap: false,
    },
  };
});
