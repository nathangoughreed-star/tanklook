// BG1 live check (no window.__gb): reads the Map card's "Eye ... from glass" line + a screenshot diff. URL=https://tanklook.com/ node scripts/bg1-live.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { connect, sleep } from './au1-lib.mjs';
const c = await connect(); await c.size(1400, 900);
await c.send('Page.navigate', { url: process.env.URL ?? 'https://tanklook.com/' }); await sleep(6000);
await c.ev(`try{localStorage.clear()}catch(e){}`); await c.send('Page.navigate', { url: process.env.URL ?? 'https://tanklook.com/' }); await sleep(8000);
await c.ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`);
const eye = () => c.ev(`(document.body.innerText.match(/Eye.*/)||[''])[0]`);
const build = await c.ev(`(document.querySelector('#build')||{}).textContent||''`);
const snap = async n => { const r = await c.send('Page.captureScreenshot', { format: 'png', clip: { x: 700, y: 0, width: 700, height: 900, scale: 0.5 } }); const b = Buffer.from(r.result.data, 'base64'); if (n) writeFileSync(`research/screens/BG1/live-${n}.png`, b); return b; };
const full = async n => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`research/screens/BG1/live-${n}.png`, Buffer.from(r.result.data, 'base64')); };
const mouse = (type, x, y, o = {}) => c.send('Input.dispatchMouseEvent', { type, x, y, button: 'none', buttons: 0, clickCount: 0, ...o });
const drag = async (x, y, dx, dy, button) => { const b = { left: 1, right: 2, middle: 4 }[button]; await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y, { button, buttons: b, clickCount: 1 }); for (let i = 1; i <= 8; i++) await mouse('mouseMoved', x + dx * i / 8, y + dy * i / 8, { button, buttons: b }); await mouse('mouseReleased', x + dx, y + dy, { button, clickCount: 1 }); await sleep(600); };
const click = sel => c.ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e||e.disabled)return false;e.click();return true})()`);
const out = []; const X = 1000, Y = 200;
async function gestures(state) {
  for (const g of ['wheel', 'orbit', 'pan']) {
    const e0 = await eye(), s0 = await snap();
    if (g === 'wheel') { await mouse('mouseMoved', X, Y); await c.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: X, y: Y, deltaX: 0, deltaY: -240 }); await sleep(800); }
    if (g === 'orbit') await drag(X, Y, 120, -40, 'left');
    if (g === 'pan') await drag(X, Y, 80, 60, 'middle');
    const e1 = await eye(), s1 = await snap(`${state}-${g}`);
    const ok = e0 !== e1 || !s0.equals(s1); out.push({ state, g, ok, eyeChanged: e0 !== e1, eye0: e0, eye1: e1, pixelsChanged: !s0.equals(s1) });
  }
  await full(state);
  await c.ev(`(()=>{document.querySelector('[data-reset]')})()`);
}
mkdirSync('research/screens/BG1', { recursive: true });
await gestures('0-no-discover');
const pill = await click('.dq10-pill'); await sleep(500); await gestures('1-card-open');
await click('[data-a=finish]'); await sleep(3000);
for (let k = 0; k < 8 && !(await c.ev(`!!document.querySelector('[data-a=apply]')`)); k++) { if (!(await click('[data-a=relax]'))) await click('[data-a=finish]'); await sleep(3500); }
const prev = await c.ev(`!!document.querySelector('[data-a=apply]')`); await gestures('2-preview-showing');
writeFileSync('research/screens/BG1/live-results.json', JSON.stringify({ build, pill, prev, out }, null, 1));
console.log('build', build, 'pill', pill, 'preview', prev); console.log(out.map(r => `${r.state} ${r.g} ${r.ok ? 'OK' : 'FAIL'} eye:${r.eyeChanged} px:${r.pixelsChanged}`).join('\n'));
c.close();
