// GS3 (2026-11-16): shots of the tiered thickness list and the edge finish in the custom tank maker. Dev server URL in URL; -> research/screens/GS3.
// Reuses gs2-shots.mjs's harness by copying its top; run: OUT=research/screens/GS3 URL=http://localhost:5175/ node scripts/gs3-shots.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('scripts/gs2-shots.mjs', 'utf8');
const head = src.slice(0, src.indexOf('const sizeTo ='));
const body = `
const sizeTo = (w, h, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
const dims = async (l, d, h) => { await setNum('Length (in)', l); await setNum('Depth (in)', d); await setNum('Height (in)', h); await sleep(1500); };
async function run(tag, w, h, mobile) {
  await sizeTo(w, h, mobile); await open(BASE + '?ui=2', true);
  phase = tag; if (mobile) { await click('.tabbar button', 'Tank'); await sleep(800); } await click('.tankcard .btn', 'Change').catch(() => {}); await sleep(500); await click('.picker .btn', 'New custom tank'); await sleep(3000);
  await dims(48, 18, 22);
  // open the thickness list as a visible listbox (a native popup does not screenshot) and scroll to the Glass and rim group
  await ev("(() => { const s = document.querySelector('select[aria-label=\\"Glass thickness\\"]'); s.size = 18; s.style.height = 'auto'; s.scrollIntoView({ block: 'start' }); return true })()");
  await shot(tag + '-thickness-list', 800);
  await ev("(() => { const s = document.querySelector('select[aria-label=\\"Glass thickness\\"]'); s.size = 1; return true })()");
  await click('.mform button', 'Set per pane').catch(() => {}); await sleep(400);
  await ev("(() => { document.querySelector('.mform select[aria-label=\\"Ends edge finish\\"]').scrollIntoView({ block: 'center' }); return true })()");
  await shot(tag + '-edge-finish', 800);
}
if (!process.env.ONLY || process.env.ONLY === '1280') await run('1280', 1280, 900, false);
if (!process.env.ONLY || process.env.ONLY === '390') await run('390', 390, 844, true);
console.log('errors', errors); ch.kill(); process.exit(0);
`;
writeFileSync('scripts/gs3-run.mjs', head + body); // then: OUT=research/screens/GS3 URL=<dev server> node scripts/gs3-run.mjs (delete gs3-run.mjs after)
