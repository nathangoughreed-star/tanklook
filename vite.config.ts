import { defineConfig } from 'vitest/config';
import { BUILD } from './scripts/build-info.mjs';
import { modelVersions } from './scripts/model-versions-plugin.mjs';
import { shots } from './scripts/shots-plugin.mjs';

// Relative base so the build works at any GitHub Pages sub-path (user.github.io/<repo>/).
// Two pages: the app (index.html) and the model review sheet (review.html).
// `vite build --mode single` is the zero-install file's own pass (scripts/build-single.mjs inlines it): the app entry only,
// every dynamic import folded into one script, so nothing is left to fetch from disk. A second entry (review.html) is what
// split three.js into shared chunks and broke the single file at d67ac73.
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  const input: Record<string, string> = single ? { main: 'index.html' } : { main: 'index.html', review: 'review.html' };
  return {
    base: './',
    plugins: [shots(), modelVersions()],
    define: { __BUILD__: JSON.stringify(BUILD) },
    build: {
      target: 'es2022', chunkSizeWarningLimit: single ? 3000 : 900,
      ...(single ? { outDir: 'dist-single/.build', emptyOutDir: true, modulePreload: false } : {}),
      rollupOptions: { input, ...(single ? { output: { codeSplitting: false } } : {}) },
    },
    test: { environment: 'node' },
  };
});
