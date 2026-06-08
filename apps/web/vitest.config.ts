import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    globalSetup: ['./test/global-setup.ts'],
    env: {
      // Each run uses a fresh file-backed PGlite db (cleaned in global setup).
      DATABASE_URL: 'pglite://.pglite-test',
      AUTH_SECRET: 'test-secret',
      APP_URL: 'http://localhost:3000',
    },
  },
});
