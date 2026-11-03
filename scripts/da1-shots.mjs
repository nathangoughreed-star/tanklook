// Lane DA1: drive Guided Setup's Animals step in one headless browser / one page and save screenshots. Dev server only.
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/da1-shots.mjs --url http://localhost:6106/ --out shots/da1 [--steps steps.json]
// A step is ["click", "<text>"] (the first visible button / tile whose text contains it), ["pick", "<selector>", "<value>"] (a <select>), ["wait", ms], ["text"] (print the guided dialog's
// text) or ["shot", "<name>"].
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const URL_ = opt('url', 'http://localhost:6106/'), OUT = opt('out', 'shots/da1'), [W, H] = opt('size', '1100x780').split('x').map(Number);
const STEPS = JSON.parse(readFileSync(opt('steps', 'scripts/da1-steps.json'), 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const exe = process.env.BROWSER_EXE ?? ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const profile = mkdtempSync(join(tmpdir(), 'da1-'));
const proc = spawn(exe, ['--headless=new', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-extensions', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const portFile = join(profile, 'DevToolsActivePort');
for (let i = 0; i < 200 && !existsSync(portFile); i++) await sleep(100);
const [port, path] = readFileSync(portFile, 'utf8').trim().split('\n');
const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); const p = m.id && pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => send(m, p, sessionId);
await s('Page.enable'); await s('Runtime.enable');
await s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
const ev = async e => { const r = await s('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)); return r.result?.value; };

try {
  await s('Page.navigate', { url: URL_ }); await sleep(4000);
  for (const st of STEPS) {
    const [k, a, b] = st;
    if (k === 'click') {
      let ok = false;
      for (let t = 0; t < 40 && !ok; t++) { if (t) await sleep(500); ok = await ev(`(() => { const want = ${JSON.stringify(a)}.toLowerCase(), nodes = [...document.querySelectorAll('dialog[open] button, dialog[open] .vd-tile, dialog[open] [data-pick]')].filter(n => n.offsetParent && !n.disabled);
        const n = nodes.find(x => (x.dataset.pick === ${JSON.stringify(a)}) || x.textContent.trim().toLowerCase().startsWith(want)) ?? nodes.find(x => x.textContent.toLowerCase().includes(want)); if (!n) return false; n.click(); return true; })()`); }
      console.log('click', a, ok); if (!ok) { console.log(await ev(`document.querySelector('dialog[open]')?.innerText.slice(0, 1500)`)); throw new Error('no such button: ' + a); }
      await sleep(+(b ?? 500));
    } else if (k === 'pick') {
      console.log('pick', a, b, await ev(`(() => { const e = document.querySelector(${JSON.stringify(a)}); if (!e) return false; const o = [...e.options].find(o => o.textContent.includes(${JSON.stringify(b)}) || o.value === ${JSON.stringify(b)}); if (!o) return 'no option'; e.value = o.value; e.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`));
      await sleep(600);
    } else if (k === 'wait') await sleep(a);
    else if (k === 'text') console.log('---\n' + await ev(`document.querySelector('dialog[open]')?.innerText.slice(0, ${b ?? 2500})`));
    else if (k === 'eval') console.log('eval', JSON.stringify(await ev(a)));
    else if (k === 'shot') {
      // the dialog fills the viewport; capture the page as it is
      writeFileSync(`${OUT}/${a}.png`, Buffer.from((await s('Page.captureScreenshot', { format: 'png' })).data, 'base64')); console.log('saved', `${OUT}/${a}.png`);
    }
  }
} finally {
  try { await send('Browser.close'); } catch { /* gone */ }
  proc.kill(); await sleep(800); try { rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ }
}
process.exit(0);
