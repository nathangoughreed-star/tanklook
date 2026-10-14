// `npm run sheets`: write every model's review sheet (public/model-sheets/*.jpg + index.html) without opening a
// browser yourself. Starts the dev server, loads review.html?export in headless Edge or Chrome (software WebGL), and
// waits until the page has written the gallery page, which it writes after all the images.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const exe = process.env.BROWSER_EXE ?? BROWSERS.find(existsSync);
if (!exe) { console.error('No Edge or Chrome found; set BROWSER_EXE.'); process.exit(1); }

const INDEX = 'public/model-sheets/index.html', t0 = Date.now();
const server = await createServer({ server: { port: 5413, strictPort: false }, logLevel: 'warn' });
await server.listen();
const url = server.resolvedUrls.local[0] + 'review.html?export';
const profile = mkdtempSync(join(tmpdir(), 'sheets-'));
const browser = spawn(exe, ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', `--user-data-dir=${profile}`, url], { stdio: 'ignore' });

const done = await new Promise(resolve => {
  const t = setInterval(() => {
    if (existsSync(INDEX) && statSync(INDEX).mtimeMs > t0) { clearInterval(t); resolve(true); }
    else if (Date.now() - t0 > 300_000) { clearInterval(t); resolve(false); }
  }, 1000);
});
browser.kill();
await server.close();
try { rmSync(profile, { recursive: true, force: true }); } catch { /* the browser may still hold it */ }
console.log(done ? `Model sheets written to public/model-sheets/ in ${Math.round((Date.now() - t0) / 1000)} s.` : 'Timed out after 5 minutes; no sheets written.');
process.exit(done ? 0 : 1);
