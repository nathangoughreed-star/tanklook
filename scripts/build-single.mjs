// Inline the single-file Vite pass (`vite build --mode single` -> dist-single/.build/) into one self-contained HTML file that
// opens straight from disk (file://). Inline scripts are not subject to the module-script CORS block that stops
// dist/index.html working from disk, so nothing may be left to fetch: the single pass folds every dynamic import (the lazy
// example scenes, the AR exporters) into one script and inlines the thumbnails as data: URLs, the plant prebuild worker becomes a data: URL, and the guard at the end fails the build on any leftover .js file.
// Usage: npm run build:single  ->  dist-single/tanklook.html
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join('dist-single', '.build'), OUT_DIR = 'dist-single', OUT = join(OUT_DIR, 'tanklook.html');
const fail = (...msg) => { console.error('build-single:', ...msg); process.exit(1); };
if (!existsSync(join(SRC, 'index.html'))) fail(`no ${SRC}/index.html; run vite build --mode single first.`);
let html = readFileSync(join(SRC, 'index.html'), 'utf8');
const read = href => readFileSync(join(SRC, href.replace(/^\.\//, '')), 'utf8');
let scripts = 0, styles = 0, workers = 0;

// new Worker(new URL(`plantWorker-xxxx.js`, import.meta.url)) -> a data: URL of the worker's own (self-contained) code.
// A file:// page can fetch neither a worker script nor a Blob URL ("Refused to cross-origin redirects of the top-level
// worker script", Chrome/Edge), but it can start a worker from a data: URL.
const inlineWorkers = code => code.replace(/new URL\((["'`])([\w.-]+\.js)\1,\s*import\.meta\.url\)/g, (m, _, file) => {
  const path = join(SRC, 'assets', file);
  if (!existsSync(path)) return m;
  const src = readFileSync(path, 'utf8');
  if (/^\s*import\b|\bimport\s*\(|from\s*["'`]\.\.?\//m.test(src)) fail(`worker ${file} imports another chunk; it cannot run from a data: URL.`);
  workers++;
  return `new URL("data:text/javascript;base64,${Buffer.from(src).toString('base64')}")`;
});

// <script type="module" crossorigin src="./assets/main-xxxx.js"></script>
html = html.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g, (_, src) => {
  scripts++;
  // a literal "</script" inside the code would end the inline tag early
  return `<script type="module">\n${inlineWorkers(read(src)).replace(/<\/script/gi, '<\\/script')}\n</script>`;
});
// <link rel="stylesheet" crossorigin href="./assets/main-xxxx.css">
html = html.replace(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g, (_, href) => {
  styles++;
  return `<style>\n${read(href).replace(/<\/style/gi, '<\\/style')}\n</style>`;
});
// module preload hints, the web manifest and the home-screen icon point at files that do not travel with the single file
html = html.replace(/<link\b[^>]*\brel="(?:modulepreload|manifest|apple-touch-icon)"[^>]*>\s*/g, '');

// Guard: the file must not reference anything it would have to fetch from disk. Lane E2 found it importing
// ./three.module-*.js for two days after a second entry made Vite split chunks (d67ac73); this makes that a build failure.
const left = [
  ...html.matchAll(/(?:src|href)="(?!data:|https?:|#|\$\{)[^"]+"/g),                               // tags pointing at local files
  ...html.matchAll(/(?:from\s*|import\s*\(\s*)["'`][^"'`]+\.m?js["'`]/g),                          // static / dynamic imports
  ...html.matchAll(/new URL\(\s*["'`][^"'`]+\.m?js["'`]\s*,\s*import\.meta\.url/g),                // workers, chunk URLs
  ...html.matchAll(/["'`](?:\.\/)?assets\/[^"'`]+["'`]/g),                                          // emitted files (images)
].map(m => m[0]);
if (left.length) fail('the single file still references external files:', [...new Set(left)]);
if (!scripts) fail(`no script found in ${SRC}/index.html.`);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, html);
rmSync(SRC, { recursive: true, force: true });
console.log(`${OUT}: ${(Buffer.byteLength(html) / 1024).toFixed(0)} kB (${scripts} script, ${styles} stylesheet, ${workers} worker inlined)`);
