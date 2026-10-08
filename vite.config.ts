import { defineConfig } from 'vitest/config';

// Relative base so the build works at any GitHub Pages sub-path (user.github.io/<repo>/).
export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
  test: { environment: 'node' },
});
