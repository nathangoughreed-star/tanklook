// BG1: Discover must keep wheel zoom, left-drag orbit and right-drag pan in every state. Real CDP mouse input; reads the camera the viewer DRAWS.
// Needs: vite on 5199 (URL env to change) + headless Chrome on 9411 (see scripts/au1-lib.mjs). Screens: research/screens/BG1/<TAG>-*.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { connect, sleep } from './au1-lib.mjs';
const TAG = process.env.TAG ?? 'after';
const c = await connect(); await c.size(1400, 900);
await c.load('');
const drawn = () => c.ev(`(()=>{const v=__gb.viewer;v.draw();const p=v.vps[0].cam.position;const a=__gb.store.scene.tanks[__gb.store.scene.active].camera;const cm=v.vps[0].cam;return {p:[p.x,p.y,p.z,cm.fov,...cm.projectionMatrix.elements.slice(8,10)].map(n=>+n.toFixed(4)),scene:JSON.stringify([a,v.pans])}})()`);
const pt = async () => ({ x: 1000, y: 200 });
const topEl = async (x, y) => c.ev(`(()=>{const e=document.elementFromPoint(${x},${y});return e?e.tagName+'.'+e.className:null})()`);
const mouse = (type, x, y, o = {}) => c.send('Input.dispatchMouseEvent', { type, x, y, button: 'none', buttons: 0, clickCount: 0, ...o });
const drag = async (x, y, dx, dy, button) => { const b = { left: 1, right: 2, middle: 4 }[button];
  await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y, { button, buttons: b, clickCount: 1 });
  for (let i = 1; i <= 8; i++) await mouse('mouseMoved', x + dx * i / 8, y + dy * i / 8, { button, buttons: b });
  await mouse('mouseReleased', x + dx, y + dy, { button, clickCount: 1 }); await sleep(200); };
const results = []; let fail = 0;
async function gestures(state) {
  await c.ev(`__gb.viewer.resetPan()`); await sleep(400);
  const { x, y } = await pt(); const hit = await topEl(x, y);
  for (const g of ['wheel', 'orbit', 'pan']) {
    const a = await drawn();
    if (g === 'wheel') { await mouse('mouseMoved', x, y); await c.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: -240 }); await sleep(250); }
    if (g === 'orbit') await drag(x, y, 120, -40, 'left');
    if (g === 'pan') await drag(x, y, 80, 60, 'middle');
    const b = await drawn(); const moved = JSON.stringify(a.p) !== JSON.stringify(b.p), sceneMoved = a.scene !== b.scene;
    const ok = moved;   // what is DRAWN must change (a stale camera object moves the store but not the picture)
    if (!ok) fail++; results.push({ state, g, ok, moved, sceneMoved, hit });
  }
  for (let k = 0; k < 3; k++) { try { const r = await c.send("Page.captureScreenshot", { format: "png" }); writeFileSync(`research/screens/BG1/${TAG}-${state}.png`, Buffer.from(r.result.data, "base64")); break; } catch (e) { await sleep(3000); } }
}
const click = sel => c.ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e||e.disabled)return false;e.click();return true})()`);
await gestures('0-no-discover');
await click('.dq10-pill'); await sleep(400); await gestures('1-card-open-no-preview');
await click('[data-a=finish]'); await sleep(2500); for (let k = 0; k < 8 && !(await c.ev(`!!document.querySelector('[data-a=apply]')`)); k++) { if (!(await click('[data-a=relax]'))) await click('[data-a=finish]'); await sleep(3500); }
const havePrev = await c.ev(`!!document.querySelector('[data-a=apply]')`);
await gestures('2-preview-showing');
await click('[data-a=regen]'); await sleep(2500); await click('[data-a=regen]'); await sleep(2500); await gestures('3-after-regenerate');
if (await click('[data-a=compare]')) { await sleep(400); await gestures('4-compare-open'); await click('[data-a=uncompare]'); await sleep(300); } else results.push({ state: '4-compare-open', g: '-', ok: false, note: 'no Compare button (needs 2 previews)' }), fail++;
await click('[data-a=apply]'); await sleep(800); await gestures('5-after-apply');
await click('[data-a=close]'); await sleep(400); await gestures('6-card-closed');
writeFileSync(`research/screens/BG1/${TAG}-results.json`, JSON.stringify({ havePrev, results }, null, 1));
console.log(results.map(r => `${r.state} ${r.g} ${r.ok ? 'OK' : 'FAIL'}${r.note ? ' ' + r.note : ''} hit=${r.hit ?? ''}`).join('\n'), '\nhavePreview', havePrev, 'FAILS', fail);
c.close(); process.exit(fail ? 1 : 0);
