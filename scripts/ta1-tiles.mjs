// Lane TA1 (R111): rebuilds the Scape workspace tiles, baked from our own 3D models (stones, wood, caves, decor -> public/gallery/scape/<id>.webp; substrates
// and leaf litter -> public/gallery/substrate/<id>.webp). Usage: node scripts/ta1-tiles.mjs [--sheet] [--only=id,id]
//   --sheet writes seeds 1-4 of every hardscape item to research/screens/TA1/seeds/ (for picking the typical one); the chosen seeds live in scripts/ta1-seeds.json.
// It starts vite, receives the webp files from scripts/ta1-bake.html run in headless Chrome (software GL), and stops both when the page says done.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from 'vite';
const ROOT = path.resolve(import.meta.dirname, '..'), args = process.argv.slice(2), sheet = args.includes('--sheet');
const only = args.find(a => a.startsWith('--only='))?.slice(7);
const SEEDS = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/ta1-seeds.json'), 'utf8'));
const seeds = Object.entries(SEEDS).map(([k, v]) => `${k}:${v}`).join(',');
const OUT = sheet ? path.join(ROOT, 'research/screens/TA1/seeds') : path.join(ROOT, 'public/gallery');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => fs.existsSync(p));
const vite = await createServer({ root: ROOT, server: { port: 5199, host: '127.0.0.1' }, logLevel: 'error' }); await vite.listen();
const url = `http://127.0.0.1:${vite.config.server.port}/scripts/ta1-bake.html?${sheet ? 'sheet=1&' : ''}${only ? 'only=' + only + '&' : ''}seeds=${seeds}${args.includes('--dbg') ? '&dbg=1' : ''}`;
let chrome; const stop = async code => { chrome?.kill(); await vite.close(); srv.close(); process.exit(code); };
const srv = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'POST'); res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.end(); return; }
  const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => {
    res.end('ok');
    const p = decodeURIComponent(req.url.slice(1)), buf = Buffer.concat(chunks);
    if (p === 'done') { console.log('baked', buf.toString()); return stop(0); }
    if (p.startsWith('log/')) { console.warn(p, buf.toString().slice(0, 400)); return; }
    const f = path.join(OUT, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, buf);
  });
}).listen(8799, '127.0.0.1');
chrome = spawn(CHROME, ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=800,600', '--user-data-dir=' + path.join(process.env.TEMP || '/tmp', 'ta1-chrome'), url], { stdio: 'ignore' });
setTimeout(() => { console.error('timeout'); stop(1); }, 15 * 60 * 1000);
