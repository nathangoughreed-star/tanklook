// Dev server only: a sheet of fish cards, before (art modules copied to shots/_art_before) vs after (src/art), for the
// audit of the global paint changes. In the browser console:
// `const s = await import('/scripts/card-sheet.js'); await s.sheet('50_cards', ['neon', 'angel', ...])`
// -> shots/50_cards.png (left column before, right after; species names in the margin).
import * as now from '/src/art/placeholder.ts';
import * as was from '/shots/_art_before/placeholder.ts';
import { artMeta as metaNow } from '/src/art/fishgen.ts';
import data from '/src/data/species.json';
const species = data.species;

const W = 420, PAD = 16, BG = '#2c4a52'; // card width on the sheet; background close to the default water tint

const aspectOf = id => { const s = species.find(q => q.id === id); return s.aspect ?? metaNow(s.art)?.aspect ?? 0.4; };

export async function sheet(name, ids, w = W) {
  const rows = ids.map(id => ({ id, art: species.find(q => q.id === id).art, a: aspectOf(id) }));
  const H = rows.reduce((h, r) => h + Math.round(w * r.a) + PAD, PAD + 24);
  const c = new OffscreenCanvas(2 * w + 3 * PAD + 110, H), x = c.getContext('2d');
  x.fillStyle = BG; x.fillRect(0, 0, c.width, c.height);
  x.font = '16px sans-serif'; x.fillStyle = '#e8eef0';
  x.fillText('before (pre-3D art)', 110 + PAD, 18); x.fillText('after (current)', 110 + 2 * PAD + w, 18);
  let y = PAD + 24;
  for (const r of rows) {
    const h = Math.round(w * r.a);
    x.fillStyle = '#e8eef0'; x.fillText(r.id, 8, y + h / 2);
    x.drawImage(was.drawFishCard(r.art, r.a, 1024), 110 + PAD, y, w, h);
    x.drawImage(now.drawFishCard(r.art, r.a, 1024), 110 + 2 * PAD + w, y, w, h);
    y += h + PAD;
  }
  await fetch('/__shot?name=' + name, { method: 'POST', body: await c.convertToBlob({ type: 'image/png' }) });
  return 'ok';
}
