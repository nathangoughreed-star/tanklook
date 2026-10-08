// Inline the Vite build (dist/) into one self-contained HTML file that opens straight from disk (file://).
// Inline scripts are not subject to the module-script CORS block that stops dist/index.html working from disk.
// Usage: npm run build:single  ->  dist-single/tanklook.html
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist', OUT_DIR = 'dist-single', OUT = join(OUT_DIR, 'tanklook.html');
let html = readFileSync(join(DIST, 'index.html'), 'utf8');
const read = href => readFileSync(join(DIST, href.replace(/^\.\//, '')), 'utf8');
let scripts = 0, styles = 0;

// <script type="module" crossorigin src="./assets/index-xxxx.js"></script>
html = html.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g, (_, src) => {
  scripts++;
  // a literal "</script" inside the code would end the inline tag early
  return `<script type="module">\n${read(src).replace(/<\/script/gi, '<\\/script')}\n</script>`;
});
// <link rel="stylesheet" crossorigin href="./assets/index-xxxx.css">
html = html.replace(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g, (_, href) => {
  styles++;
  return `<style>\n${read(href).replace(/<\/style/gi, '<\\/style')}\n</style>`;
});
// module preload hints point at files that no longer exist
html = html.replace(/<link\b[^>]*\brel="modulepreload"[^>]*>\s*/g, '');

const left = html.match(/(?:src|href)="\.?\/?assets\/[^"]+"/g);
if (left) { console.error('Unresolved asset references:', left); process.exit(1); }
if (!scripts) { console.error('No script found in dist/index.html; run vite build first.'); process.exit(1); }

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, html);
console.log(`${OUT}: ${(Buffer.byteLength(html) / 1024).toFixed(0)} kB (${scripts} script, ${styles} stylesheet inlined)`);
