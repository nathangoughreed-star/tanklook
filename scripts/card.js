// Fish painter dev helper (dev server console): `const c = await import('/scripts/card.js'); await c.card('koletang', 'koletang-new')`
// POSTs the species' transparent 1024 px card to /__shot (shots/OVL-<name>.png) and returns [aspect, pixel hash]: the hash is the regression check
// (the tailspot blenny's must not change while the painter gains new marks).
import { drawFishCard } from '/src/art/placeholder.ts';
import { PLANS, planMeta } from '/src/art/fishgen.ts';
export async function card(art, name, W = 1024) {
  const a = planMeta(PLANS[art]).aspect, c = new OffscreenCanvas(W, Math.round(W * a)), x = c.getContext('2d');
  x.drawImage(drawFishCard(art, a, W), 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data; let h = 5381; for (let i = 0; i < d.length; i += 7) h = ((h << 5) + h + d[i]) | 0;
  await fetch('/__shot?name=OVL-' + name, { method: 'POST', body: await c.convertToBlob({ type: 'image/png' }) });
  return [a, h];
}

/** The previous parameter plan of one of the four fish in scripts/oldplans.js, posted as shots/OVL-<name>.png; returns [aspect, mouth, pedU]. */
export async function oldCard(art, name, W = 1024) {
  const { OLD } = await import('/scripts/oldplans.js'), { FISH_ART } = await import('/src/art/placeholder.ts'), { drawPlan } = await import('/src/art/fishgen.ts');
  const p = OLD[art], a = planMeta(p).aspect; FISH_ART['old_' + art] = (ctx, P, w) => drawPlan(p, ctx, P, w);
  const c = new OffscreenCanvas(W, Math.round(W * a)), x = c.getContext('2d'); x.drawImage(drawFishCard('old_' + art, a, W), 0, 0);
  await fetch('/__shot?name=OVL-' + name, { method: 'POST', body: await c.convertToBlob({ type: 'image/png' }) });
  return [a, p.mouth ?? 0, p.pedU];
}
