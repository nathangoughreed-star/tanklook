// Dev server only (lane BP1): bristlenose model pictures. In the console:
// `const b = await import('/scripts/bp1-shots.js'); await b.views('before')` -> shots/bp1_<tag>_{side,top,front,three}.png
const wait = ms => new Promise(r => setTimeout(r, ms));
export async function views(tag, art = 'bristlenose', w = 1100, h = 700) {
  const { SPECIES } = await import('/src/data/species.ts'), { SpeciesPreview } = await import('/src/render/preview3d.ts');
  const sp = SPECIES.find(s => s.id === art || s.look === art), tool = new SpeciesPreview(1);
  const V = { side: [0.0, 0.0], top: [0.0, 1.5], front: [Math.PI / 2, 0.05], three: [0.55, 0.3], low: [0.9, -0.35] };
  tool.load(sp);
  for (const [k, [yaw, pitch]] of Object.entries(V)) {
    tool.yaw = yaw; tool.pitch = pitch; tool.render(w, h);
    const blob = await new Promise(r => tool.canvas.toBlob(r, 'image/png'));
    const c = new OffscreenCanvas(w, h), g = c.getContext('2d'); g.fillStyle = '#9fb7c4'; g.fillRect(0, 0, w, h); g.drawImage(await createImageBitmap(blob), 0, 0);
    await fetch('/__shot?name=bp1_' + tag + '_' + k, { method: 'POST', body: await c.convertToBlob({ type: 'image/png' }) });
  }
  return sp.id;
}
