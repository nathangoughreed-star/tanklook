// Performance-ladder A/Bs for scripts/perf-baseline.mjs --ab (lane P1, 2026-10-19). No src/ edit: every rung is applied in the
// page, A = the app as it ships, B = the rung, alternate frames, GPU timer query. B - A < 0 saves. Run at DPR 2 (a high-DPI
// laptop, where the cost is) and DPR 1:
//   node scripts/perf-baseline.mjs --sizes desktop2x --views planted,iwagumi,reef,split --no-edits --no-prod --frames 5 \
//     --breakdown planted,iwagumi,reef --no-buckets --pairs 30 --ab research/efficiency/P1-ab-rungs.mjs --out research/efficiency/P1-rungs-2x.json
// Feature rungs that REMOVE something (plants, fin cards) are upper bounds on what a cheaper version of it could save.
const meshesOf = flag => `(() => { const l = []; for (const vp of __gb.viewer.active) vp.scene?.traverse(o => { const m = o.material && [].concat(o.material)[0]; if (o.isMesh && m?.userData?.${flag}) l.push(o); }); return l; })()`;
const hide = flag => ({ a: `for (const o of ${meshesOf(flag)}) o.visible = true;`, b: `for (const o of ${meshesOf(flag)}) o.visible = false;` });
const dpr = r => ({ a: `__gb.viewer.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));`, b: `__gb.viewer.renderer.setPixelRatio(${r});` });
// the frosted film as a plain translucent sheet (the swap render/ar.ts already makes for AR): no transmission pass
const FROST_SET = on => `for (const o of ${meshesOf('frost')}) { const m = o.material; window.__frost ??= new Map(); if (!__frost.has(m)) __frost.set(m, { t: m.transmission, tr: m.transparent, op: m.opacity });
  const s = __frost.get(m); ${on ? 'm.transmission = 0; m.transparent = true; m.opacity = 0.75;' : 'm.transmission = s.t; m.transparent = s.tr; m.opacity = s.op;'} m.needsUpdate = true; }`;
const pair = (name, p) => ({ name: `${name}; B - A < 0 saves`, ...p });
export default [
  pair('pixel ratio 2 -> 1.5', dpr(1.5)),
  pair('pixel ratio 2 -> 1.25', dpr(1.25)),
  pair('pixel ratio 2 -> 1', dpr(1)),
  pair('pixel ratio 2 -> 0.75', dpr(0.75)),
  pair('frosted film -> plain translucent sheet', { a: FROST_SET(false), b: FROST_SET(true) }),
  pair('UPPER BOUND: plants hidden', hide('plantClip')),
  pair('UPPER BOUND: fish fin cards hidden', hide('fishCard')),
  pair('UPPER BOUND: hardscape hidden', hide('solid')),
];
