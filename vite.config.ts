import { defineConfig } from 'vitest/config';
import { shots } from './scripts/shots-plugin.mjs';

// Relative base so the build works at any GitHub Pages sub-path (user.github.io/<repo>/).
export default defineConfig({
  base: './',
  plugins: [shots()],
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
  test: { environment: 'node' },
});
