// BG2: re-bake the picture-scene tank tiles (VT1 pipeline) in headless Chrome on port 9433 against a dev server on 5181.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tabs = await (await fetch('http://127.0.0.1:9433/json')).json();
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r, rej) => { const i = ++id; const t = setTimeout(() => rej(new Error('timeout ' + method)), 120000); pend.set(i, d => { clearTimeout(t); r(d); }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(e.slice(0, 80) + ' => ' + (r.result.exceptionDetails.exception?.description ?? '')); return r.result.result.value; };
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:5181/' }); for (let i = 0; i < 90 && !(await ev(`!!window.__gb`).catch(() => false)); i++) await sleep(1000);
await sleep(3000);
for (const k of ['reefscene', 'riverscene', 'plantscene', 'rockscene', 'reefpaint', 'riverpaint', 'plantpaint', 'rockpaint'])
  console.log(await ev(`(async()=>{const m=await import('/scripts/vt1-shot.ts');return await m.bake({only:'bg-${k}',wait:2500})})()`));
ws.close();
