// AU1 audit helper: talks to a long-running headless Chrome on port 9411 (start with scripts/au1-chrome.ps1 style command below).
import { writeFileSync, mkdirSync } from 'node:fs';
export const URL = process.env.URL ?? 'http://localhost:5199/';
const PORT = 9411;
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function connect() {
  const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise((r, rej) => { const i = ++id; const t = setTimeout(() => rej(new Error('timeout ' + method)), 25000); pend.set(i, d => { clearTimeout(t); r(d); }); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 100) + ' => ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
  const shot = async (name, clip) => { mkdirSync('research/screens/AU1', { recursive: true }); const p = { format: 'png' }; if (clip) p.clip = { ...clip, scale: 1 }; let r; for (let k = 0; k < 3; k++) { try { r = await send('Page.captureScreenshot', p); break; } catch (e) { if (k === 2) throw e; await sleep(3000); } } writeFileSync(`research/screens/AU1/${name}.png`, Buffer.from(r.result.data, 'base64')); };
  const size = (w, h, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  const load = async (q = '', clear = true) => { if (clear) { await send('Page.navigate', { url: URL }); await sleep(1500); await ev(`try{localStorage.clear();sessionStorage.clear()}catch(e){}`); } await send('Page.navigate', { url: URL + q }); for (let i = 0; i < 90; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); } await sleep(2500); await ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`); };
  const rect = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()`);
  const click = sel => ev(`document.querySelector(${JSON.stringify(sel)}).click()`);
  return { send, ev, shot, size, load, rect, click, close: () => ws.close() };
}
export async function starter(c, name) {
  await c.click('#openScene'); await sleep(500);
  await c.ev(`[...document.querySelectorAll('dialog[open] button')].find(b=>/starter tank/.test(b.textContent)).click()`); await sleep(700);
  await c.ev(`[...document.querySelectorAll('dialog[open] button, dialog[open] [role=button], dialog[open] li, dialog[open] .card')].find(b=>b.textContent.trim().startsWith(${JSON.stringify(name)}))?.click()`); await sleep(3500);
  await c.ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`);
}
export const clickAt = async (c, x, y) => { for (const t of ['mouseMoved','mousePressed','mouseReleased']) await c.send('Input.dispatchMouseEvent', { type: t, x, y, button: 'left', buttons: t === 'mousePressed' ? 1 : 0, clickCount: 1 }); await sleep(900); };
