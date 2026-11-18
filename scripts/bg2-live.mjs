// BG2 live shots: headless Chrome (own port/profile) against the dev server, one 1280x800 shot per picture background.
// Usage: URL=http://localhost:5174/ node scripts/bg2-live.mjs <outdir> <suffix>
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 9433, URL = process.env.URL ?? 'http://localhost:5174/', [out, suf] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r, rej) => { const i = ++id; const t = setTimeout(() => rej(new Error('timeout ' + method)), 60000); pend.set(i, d => { clearTimeout(t); r(d); }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(e.slice(0, 80) + ' => ' + (r.result.exceptionDetails.exception?.description ?? '')); return r.result.result.value; };
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL }); await sleep(2500); await ev(`try{localStorage.clear()}catch(e){}`);
await send('Page.navigate', { url: URL }); for (let i = 0; i < 90 && !(await ev(`!!window.__gb`).catch(() => false)); i++) await sleep(1000);
await sleep(3000); await ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`);
await ev(`[...document.querySelectorAll('button')].find(b=>/Just look around/.test(b.textContent))?.click()`); await sleep(800);
await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Done')?.click()`); await sleep(1500);
mkdirSync(out, { recursive: true });
for (const bg of ['reefscene', 'riverscene', 'plantscene', 'rockscene']) {
  await ev(`window.__gb.store.edit(t => { t.render.bg = ${JSON.stringify(bg)}; })`); await sleep(2500);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${bg}-${suf}.png`, Buffer.from(r.result.data, 'base64')); console.log('shot', bg);
}
ws.close();
