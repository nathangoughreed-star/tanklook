// CM3 dev-server helper: a contact sheet of one species in every colour (and fin) form, males left, females right.
// Browser console: `const s = await import('/scripts/cm3-sheet.js'); await s.sheet('betta')` -> shots/CM3-<id>.png
import { drawFishCard } from '/src/art/placeholder.ts';
import { speciesOf, getSpecies } from '/src/data/species.ts';
const BG = '#2c4a52';
export async function sheet(id, o = {}) {
  const sp = getSpecies(id), F = sp.forms, w = o.w ?? 300, cols = o.cols ?? 4;
  const items = o.items ?? [...F.colour.map(c => ({ form: c.id, n: c.name })), ...F.fin.map(c => ({ finForm: c.id, n: c.name }))];
  items.unshift({ n: 'standard' });
  const cells = [];
  for (const it of items) for (const sex of sp.female ? [undefined, 'f'] : [undefined]) cells.push({ it, sex });
  const per = sp.female ? 2 : 1, perRow = Math.max(1, Math.floor(cols / per));
  const h = Math.round(w * Math.max(...cells.map(c => speciesOf({ species: id, sex: c.sex, form: c.it.form, finForm: c.it.finForm }).aspect))) + 22;
  const rows = Math.ceil(items.length / perRow), c = new OffscreenCanvas(perRow * per * w, rows * h), x = c.getContext('2d');
  x.fillStyle = BG; x.fillRect(0, 0, c.width, c.height); x.font = '14px sans-serif'; x.fillStyle = '#e8eef0';
  cells.forEach((cell, i) => {
    const k = Math.floor(i / per), cx = (k % perRow) * per * w + (i % per) * w, cy = Math.floor(k / perRow) * h;
    const s = speciesOf({ species: id, sex: cell.sex, form: cell.it.form, finForm: cell.it.finForm });
    x.drawImage(drawFishCard(s.art, s.aspect, 700), cx, cy + 20, w, Math.round(w * s.aspect));
    if (!cell.sex) x.fillText(cell.it.n, cx + 6, cy + 14);
  });
  await fetch('/__shot?name=CM3-' + (o.name ?? id), { method: 'POST', body: await c.convertToBlob({ type: 'image/png' }) });
  return 'ok ' + items.length;
}
