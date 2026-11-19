// Fish painter experiment A: dev-server helper. In the browser console of the dev server:
//   const o = await import('/scripts/overlay.js'); await o.run()
// POSTs three transparent 1024 px cards to /__shot (shots/OVL-*.png): the JSON-driven flame angelfish, RX2's flame angelfish (the
// parameter-built plan before this experiment, kept here as the comparison baseline) and a dump of the model data (OVL-meta.json).
// scripts/overlay.py (python, PIL) then lays them over the scratchpad reference photo.
import { drawFishCard, FISH_ART } from '/src/art/placeholder.ts';
import { PLANS, drawPlan, planMeta } from '/src/art/fishgen.ts';

// RX2's plan, as it was before the JSON migration (git: 8d121b88 src/art/fishgen.ts)
const RX2 = {
  gape: 0.03, gapeDrop: 0.006, scale: 0.016, thick: 0.34, depth: 0.52, pedU: 0.2, ped: 0.07, peak: 0.55, snout: 0.6, mouth: 0.01, angular: 0.2, shade: ['#e8420c', '#f4781a', '#e8522a'], tail: { type: 'round', h: 0.22, tint: '#f0b040', a: 0.8 }, fin: '#e8420c',
    dorsal: { at: 0.78, len: 0.6, h: 0.12, spines: 0.45, nSp: 14, spineH: [0.07, 0.09], notch: 0.1, rake: 0.8, tip: 'round', trail: 0.1, drop: 0.55, tint: '#1a1ab8', a: 1, edge: '#2a40e8' },
    anal: { at: 0.6, len: 0.34, h: 0.12, spines: 0.2, nSp: 3, spineH: [0.07, 0.1], notch: 0.1, rake: 0.8, tip: 'round', trail: 0.1, drop: 0.55, tint: '#1a1ab8', a: 1, edge: '#2a40e8' }, pelvic: { u: 0.62, len: 0.12, tint: '#e8522a' }, pec: { s: 1, v: 0.55 },
    marks: [{ k: 'band', u0: 0.5, u1: 0.78, v0: -1, v1: 1, c: '#f8a018', a: 0.7, f: 0.1 }, { k: 'bars', us: [0.73, 0.62, 0.51, 0.4, 0.29], w: 0.03, c: '#1a0c08', a: 0.9 }, { k: 'band', u0: 0.84, u1: 1, v0: -1, v1: 1, c: '#e8300a', a: 0.6, f: 0.05 }],
    finMarks: [{ k: 'bars', us: [0.18, 0.28, 0.38, 0.48, 0.58, 0.68], w: 0.025, c: '#0a0a30', a: 0.85 }], eye: { r: 0.042, iris: ['#2a1810', '#080402'], u: 0.84, dv: -0.1 } };

const post = async (name, c) => fetch('/__shot?name=' + name, { method: 'POST', body: await c.convertToBlob({ type: 'image/png' }) });
function card(art, W) { // transparent card -> OffscreenCanvas, plus its aspect
  const a = planMeta(art === 'rx2' ? RX2 : PLANS.flameangel).aspect, c = new OffscreenCanvas(W, Math.round(W * a)), x = c.getContext('2d');
  x.drawImage(drawFishCard(art === 'rx2' ? 'flameRX2' : 'flameangel', a, W), 0, 0); return { c, a };
}
export async function run() {
  FISH_ART.flameRX2 = (ctx, P, W) => drawPlan(RX2, ctx, P, W);
  const out = {};
  for (const [id, art] of [['json', 'flameangel'], ['rx2', 'rx2']]) { const { c, a } = card(art, 1024); await post('OVL-' + id, c); out[id] = { aspect: a, h: c.height }; }
  return JSON.stringify(out);
}
