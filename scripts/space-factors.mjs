// Writes src/data/spacefactor.ts from research/fit.tsv (id, n, AqAdvisor %, ours %, factor, cat, tl, grams; made by a one-species-at-a-time
// run: GEN_AQSP=1 npx vitest run test/aqspecies.test.ts, node scripts/aq-compare.mjs, then the fit rows). Run: node scripts/space-factors.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const rows = readFileSync('research/fit.tsv', 'utf8').split('\n').map(l => l.split('\t'));
const med = a => [...a].sort((x, y) => x - y)[a.length >> 1];
const fish = r => r[5] === 'fw-fish';
const cls = { tiny: rows.filter(r => fish(r) && r[7] < 2), mid: rows.filter(r => fish(r) && r[7] >= 2 && r[7] < 30), big: rows.filter(r => fish(r) && r[7] >= 30),
  invert: rows.filter(r => r[5] === 'fw-invert'), amphibian: rows.filter(r => r[5] === 'amphibian') };
const classF = Object.fromEntries(Object.entries(cls).map(([k, v]) => [k, +med(v.map(r => +r[4])).toFixed(2)]));
const why = (r, f) => {
  const k = r[5] === 'fw-invert' ? 'invert' : r[5] === 'amphibian' ? 'amphibian' : +r[7] < 2 ? 'tiny' : +r[7] < 30 ? 'mid' : 'big';
  return `${k} body; one-species tank: AqAdvisor ${r[2]}% vs ours ${Math.round(r[3])}% with ${r[1]}`;
};
let t = `// Space factors, FITTED TO AQADVISOR (lane SE2, ${new Date().toISOString().slice(0, 10)}), not a biological claim: for each species the stocking level
// AqAdvisor gave a tank of only that species (55 gal, filter on Choose) over our mass^0.45 space for the same tank. The engine multiplies
// the species' space load by it. Species not listed fall back to the class factor (median of the class below). Rebuild: node scripts/space-factors.mjs.
export const SPACE_FACTOR_CLASS: Record<string, [number, string]> = {
  tiny: [${classF.tiny}, 'fish under 2 g'], mid: [${classF.mid}, 'fish 2 to 30 g'], big: [${classF.big}, 'fish over 30 g'],
  invert: [${classF.invert}, 'shrimp and snails'], amphibian: [${classF.amphibian}, 'aquatic frogs'],
};
export const SPACE_FACTOR: Record<string, [number, string]> = {
`;
for (const r of rows) t += `  ${r[0]}: [${(+r[4]).toFixed(2)}, '${why(r)}'],\n`;
t += '};\n';
writeFileSync('src/data/spacefactor.ts', t);
console.log(classF);
