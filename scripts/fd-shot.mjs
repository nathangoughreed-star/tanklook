// `node scripts/fd-shot.mjs --base http://127.0.0.1:4180/ --out research/fd/shots --name landing [--w 1280 --h 800 --mobile] [--url-suffix "#tank=..."] [--click "Just look around"] [--wait 9000] [--steps "click:Text;wait:2000;shot:name"]`
// FD (2026-11-26): fresh-profile headless Edge, one page load, screenshots at named steps. Steps: click:<visible text or CSS selector>, wait:<ms>, shot:<name>, eval:<js>.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const BASE = opt('base', 'http://127.0.0.1:4180/'), OUT = opt('out', 'research/fd/shots'), NAME = opt('name', 'shot'), W = +opt('w', 1280), H = +opt('h', 800), MOBILE = argv.includes('--mobile');
const SUF = opt('url-suffix', ''), STEPS = opt('steps', 'wait:9000;shot:' + NAME).split(';');
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });
const exe = process.env.BROWSER_EXE ?? ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const profile = mkdtempSync(join(tmpdir(), 'fdshot-'));
const proc = spawn(exe, ['--headless=new', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--no-first-run', '--disable-extensions', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const pf = join(profile, 'DevToolsActivePort'); for (let i = 0; i < 200 && !existsSync(pf); i++) await sleep(100);
const [port, path] = readFileSync(pf, 'utf8').trim().split('\n');
const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId), ev = async e => (await s('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value;
  await s('Page.enable'); await s('Runtime.enable');
  await s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: MOBILE ? 2 : 1, mobile: MOBILE });
  await s('Page.navigate', { url: BASE + SUF });
  for (const st of STEPS) {
    const [k, ...r] = st.split(':'), v = r.join(':');
    if (k === 'wait') await sleep(+v);
    else if (k === 'shot') { writeFileSync(join(OUT, v + '.png'), Buffer.from((await s('Page.captureScreenshot', { format: 'png' })).data, 'base64')); console.log('shot', v); }
    else if (k === 'click') console.log('click', v, await ev(`(() => { const t = ${JSON.stringify(v)}; let el = null; try { el = document.querySelector(t); } catch {} if (!el) el = [...document.querySelectorAll('button,a,[role=button]')].find(b => b.textContent.trim().startsWith(t)); if (!el) return 'NOT FOUND'; el.click(); return 'ok'; })()`));
    else if (k === 'eval') console.log('eval', JSON.stringify(await ev(v)));
  }
} finally { try { await send('Browser.close'); } catch { /* gone */ } proc.kill(); await sleep(800); try { rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ } }
process.exit(0);
