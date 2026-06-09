import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  // @clausage/shared is a workspace-only package (never published), so inline it
  // into the bundle. commander + zod are real npm deps and stay external — they
  // resolve from the installed package at runtime.
  noExternal: ['@clausage/shared'],
  external: ['commander', 'zod'],
  // The entry's `#!/usr/bin/env node` shebang is preserved automatically.
});
