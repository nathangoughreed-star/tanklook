// Bakes the animal gallery's stills (src/ui/stockGallery.ts) into public/gallery/<look>.webp, so the gallery loads pictures instead of
// drawing ~84 3D models on open. Re-run after adding an animal or changing a model; an animal with no file is still drawn live.
//   1. node scripts/bake-gallery.mjs          (listens on 127.0.0.1:8799 and writes what the page sends it)
//   2. open the dev server, paste BAKE (printed below) into the browser console, wait for "baked N"
//   3. Ctrl+C here, commit public/gallery
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(import.meta.dirname, '../public/gallery');
fs.mkdirSync(OUT, { recursive: true });

const BAKE = `(async () => {
  const { SPECIES } = await import('/src/data/species.ts'), { SpeciesPreview } = await import('/src/render/preview3d.ts');
  const tool = new SpeciesPreview(1), looks = new Map(); for (const s of SPECIES) if (!looks.has(s.look)) looks.set(s.look, s);
  let n = 0;
  for (const [look, sp] of looks) {
    tool.snapshot(sp, 480, 300);
    const src = tool.canvas, w = src.width, h = src.height, c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(src, 0, 0);
    const a = g.getImageData(0, 0, w, h).data; let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { console.warn('empty still', look); continue; }
    const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.05);
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
    o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
    const blob = await new Promise(r => o.toBlob(r, 'image/webp', 0.85));
    await fetch('http://127.0.0.1:8799/' + encodeURIComponent(look) + '.webp', { method: 'POST', body: blob }); n++;
  }
  console.log('baked', n);
})()`;

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  const name = decodeURIComponent(path.basename(req.url ?? ''));
  if (req.method !== 'POST' || !/^[\w~.@-]+\.webp$/.test(name)) return res.writeHead(400).end();
  const parts = []; req.on('data', d => parts.push(d));
  req.on('end', () => { fs.writeFileSync(path.join(OUT, name), Buffer.concat(parts)); res.writeHead(200).end(); });
}).listen(8799, '127.0.0.1', () => console.log(`Writing to ${OUT}. Paste into the browser console:\n\n${BAKE}\n`));
