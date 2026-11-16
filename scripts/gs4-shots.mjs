// GS4 (2026-11-16; R110): shots of "where it fails" and the deflection view, a safe and a failing tank, at 1280 and 390.
// Generates scripts/gs4-run.mjs from gs2-shots.mjs's harness; run: OUT=research/screens/GS4 URL=<dev server> node scripts/gs4-run.mjs (delete gs4-run.mjs after)
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('scripts/gs2-shots.mjs', 'utf8');
const head = src.slice(0, src.indexOf('const sizeTo ='));
const body = `
const sizeTo = (w, h, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
const dims = async (l, d, h) => { await setNum('Length (in)', l); await setNum('Depth (in)', d); await setNum('Height (in)', h); await sleep(1500); };
const toFail = () => ev("(() => { document.querySelector('.failview').scrollIntoView({ block: 'start' }); return true })()");
async function run(tag, w, h, mobile) {
  await sizeTo(w, h, mobile); await open(BASE + '?ui=2', true);
  phase = tag; if (mobile) { await click('.tabbar button', 'Tank'); await sleep(800); } await click('.tankcard .btn', 'Change').catch(() => {}); await sleep(500); await click('.picker .btn', 'New custom tank'); await sleep(3000);
  await pick('.mform .seg button', 'Safety factor'); await sleep(800);
  for (const [name, L, D, H] of [['safe', 36, 18, 12], ['fail', 36, 18, 18]]) {
    await dims(L, D, H); await sleep(1500);
    await toFail(); await shot(tag + '-' + name + '-stress', 700);
    await pick('.failview .seg button', 'Deflection'); await sleep(500); await toFail(); await shot(tag + '-' + name + '-deflection', 700);
    await pick('.failview .seg button', 'Stress'); await sleep(300);
  }
  // the 3D overlay (tank is the failing one): both modes; on a phone the view is at the top of the page, so scroll there
  const top = () => ev("(() => { window.scrollTo(0, 0); [...document.querySelectorAll('*')].filter(e => e.scrollTop > 0).forEach(e => { e.scrollTop = 0; }); return true })()");
  for (const [m, name] of [['Stress', 'stress'], ['Deflection', 'deflection']]) {
    await pick('.failview .seg button', m); await sleep(1500);
    if (mobile) await top(); else await toFail();
    await shot(tag + '-fail-3d-' + name, 1200);
  }
  await pick('.failview .seg button', 'Stress');
}
if (!process.env.ONLY || process.env.ONLY === '1280') await run('1280', 1280, 900, false);
if (!process.env.ONLY || process.env.ONLY === '390') await run('390', 390, 844, true);
console.log('errors', errors); ch.kill(); process.exit(0);
`;
writeFileSync('scripts/gs4-run.mjs', head + body);
