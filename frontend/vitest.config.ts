import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    // Fixed values so tests never depend on a developer's .env.local
    env: {
      VITE_API_BASE_URL: 'http://api.test',
      VITE_AI_BASE_URL: 'http://ai.test',
      VITE_SITE_URL: 'http://site.test',
    },
  },
});
