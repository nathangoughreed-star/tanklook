// Builds src/data/bodymass.json: every species' length-weight (mass in g = a * (mm/10)^b) from scripts/lw-sources.json
// (FishBase a, b in cm TL and grams; 'estimate' rows are typical adult masses for shrimp, snails, herps and the like, which FishBase
// does not cover), plus the cross-check against the 3D body's volume (src/data/bodyvolume.json, density 1.02 g/cm3).
// A species whose model mass is off by more than 1.6x either way is flagged, not corrected: the model or the table is wrong.
// Run: node scripts/body-mass.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const src = JSON.parse(readFileSync('scripts/lw-sources.json', 'utf8'));
const vol = JSON.parse(readFileSync('src/data/bodyvolume.json', 'utf8'));
const sp = JSON.parse(readFileSync('src/data/species.json', 'utf8')).species;
const DENSITY = 1.02, FLAG = 1.6, out = {}, flags = [];
for (const s of sp) {
  const r = src[s.id];
  if (!r) throw new Error('no length-weight row for ' + s.id);
  const g = r.a * (s.tl / 10) ** r.b, e = { a: r.a, b: r.b, src: r.src };
  if (r.note) e.note = r.note;
  if (vol[s.id] !== undefined) {
    const model = vol[s.id] * DENSITY, ratio = model / g;
    e.model = +ratio.toFixed(2);
    if (ratio > FLAG || ratio < 1 / FLAG) { e.flag = true; flags.push(`${s.id}: model ${model.toFixed(1)} g vs table ${g.toFixed(1)} g (x${ratio.toFixed(2)})`); }
  }
  out[s.id] = e;
}
writeFileSync('src/data/bodymass.json', JSON.stringify({ doc: 'mass g = a * (tl_mm / 10)^b. model = 3D-body mass / table mass (cross-check); flag = outside 1/1.6..1.6. Rebuilt by scripts/body-mass.mjs.', species: out }, null, 1) + '\n');
console.log(Object.keys(out).length + ' species; flagged ' + flags.length + '\n' + flags.join('\n'));
