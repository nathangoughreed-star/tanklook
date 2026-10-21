import { defineConfig } from 'vitest/config';
import { BUILD } from './scripts/build-info.mjs';
import { modelVersions } from './scripts/model-versions-plugin.mjs';
import { shots } from './scripts/shots-plugin.mjs';

// Relative base so the build works at any GitHub Pages sub-path (user.github.io/<repo>/).
// Two pages: the app (index.html) and the model review sheet (review.html).
// `vite build --mode single` is the zero-install file's own pass (scripts/build-single.mjs inlines it): the app entry only,
// every dynamic import folded into one script and every asset (the example thumbnails) inlined as a data: URL, so nothing
// is left to fetch from disk. A second entry (review.html) is what
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
      ...(single ? { outDir: 'dist-single/.build', emptyOutDir: true, modulePreload: false, assetsInlineLimit: 1e8 } : {}),
      rollupOptions: { input, ...(single ? { output: { codeSplitting: false } } : {}) },
    },
    // Discovery: only this checkout's test/ (local runs also saw .claude/worktrees/* and aquascape/*, which CI never has).
    // Timeouts: the scene-building tests take seconds on a quiet machine and 5 s default timed out under load (2-core CI runner).
    // Per-test/describe timeouts are NOT set in the files: a lower one (60 s / 30 s) silently overrode this and flaked under full-suite load (growth, reef, snake, spider).
    test: { environment: 'node', include: ['test/**/*.test.ts'], exclude: ['**/node_modules/**', '.claude/**', 'aquascape/**', 'dist*/**'], testTimeout: 120000, hookTimeout: 60000 },
  };
});
