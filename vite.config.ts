import { defineConfig } from 'vitest/config';
import { BUILD } from './scripts/build-info.mjs';
import { modelVersions } from './scripts/model-versions-plugin.mjs';
import { shots } from './scripts/shots-plugin.mjs';

// Relative base so the build works at any GitHub Pages sub-path (user.github.io/<repo>/).
// Two pages: the app (index.html) and the model review sheet (review.html).
export default defineConfig({
  base: './',
  plugins: [shots(), modelVersions()],
  define: { __BUILD__: JSON.stringify(BUILD) },
  build: { target: 'es2022', chunkSizeWarningLimit: 900, rollupOptions: { input: { main: 'index.html', review: 'review.html' } } },
  test: { environment: 'node' },
});
