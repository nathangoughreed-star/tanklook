// Lane E1 A/Bs for scripts/perf-baseline.mjs --ab: steady GPU cost of two edits to the hardscape grit shader
// (render/items.ts GRIT / gritK). No src/ edit: in the page, every hardscape mesh (material userData.solid) gets a copy of
// its material whose fragment source is edited (own program cache key); A = the app's material, B = the copy, alternate
// frames. window.__abApplied says whether each edit matched the source (the harness records it).
//   node scripts/perf-baseline.mjs --sizes desktop --views terrarium --no-edits --frames 5 --no-prod \
//     --breakdown iwagumi,research/efficiency/E1-variants/planted-rockwall.json --ab research/efficiency/E1-ab-grit.mjs
const setup = (key, editSrc) => `window.__ab ??= {}; window.__ab[${JSON.stringify(key)}] ??= (() => {
  const edit = ${editSrc};
  const list = [], alt = new Map();
  for (const vp of __gb.viewer.active) vp.scene?.traverse(o => {
    const m = o.material; if (!o.isMesh || !m || Array.isArray(m) || !m.userData?.solid) return;
    if (!alt.has(m)) {
      const c = m.clone(); c.userData = { ...m.userData }; c.clippingPlanes = m.clippingPlanes;
      c.onBeforeCompile = function (sh) { m.onBeforeCompile.call(this, sh); const f = edit(sh.fragmentShader); (window.__abApplied ??= {})[${JSON.stringify(key)}] = f !== sh.fragmentShader; sh.fragmentShader = f; };
      c.customProgramCacheKey = function () { return m.customProgramCacheKey.call(this) + '|' + ${JSON.stringify(key)}; };
      alt.set(m, c);
    }
    list.push([o, m]);
  });
  return { list, alt };
})();`;
const ONE_STONE = String.raw`s => s.replace(/  if \(t == 1\) k = gStone[\s\S]*?\n  \}\n  else if \(t == 6\)/, '  if (t >= 1 && t <= 5) {\n    float rough = t == 1 ? 0.25 : t == 2 ? 0.6 : t == 3 ? 1.1 : t == 4 ? 1.4 : 0.4, cracks = t == 1 ? 0.3 : t == 2 ? 1.0 : t == 3 ? 0.6 : t == 4 ? 0.35 : 0.5;\n    k = gStone(q, px, rough, cracks);\n    if (t == 5) { float e = abs(gN(vec3(p.x * 0.02, p.y * 0.35, p.z * 0.02)) * 2.0 - 1.0), m = smoothstep(0.4, 0.6, gN(p * 0.03 + 4.0)); k *= 1.0 - 0.55 * gLine(e, 0.05) * m; }\n  }\n  else if (t == 6)')`;
// the crack network (gEdge: 27 cells x 3 hashes, plus 3 noise lookups for its warp) only where its mask is above 0;
// the same picture except where fwidth(e) straddles the mask edge, where the crack weight m is ~0 anyway
const CRACKS_MASKED = String.raw`s => s.replace('  vec3 q = p * 0.026 + 0.7 * vec3(gN(p * 0.07), gN(p * 0.07 + 3.1), gN(p * 0.07 + 7.7));\n  float e = gEdge(q), m = smoothstep(0.5, 0.68, gN(p * 0.02 + 13.0)) * smoothstep(0.3, 0.55, gN(p * 0.06 + 21.0)) * cracks, c = gLine(e, 0.03) * m;', '  float m = smoothstep(0.5, 0.68, gN(p * 0.02 + 13.0)) * smoothstep(0.3, 0.55, gN(p * 0.06 + 21.0)) * cracks, e = 1.0;\n  if (m > 0.0) { vec3 q = p * 0.026 + 0.7 * vec3(gN(p * 0.07), gN(p * 0.07 + 3.1), gN(p * 0.07 + 7.7)); e = gEdge(q); }\n  float c = gLine(e, 0.03) * m;')`;
const pair = (name, key, edit) => ({ name, a: `${setup(key, edit)} for (const [o, m] of __ab[${JSON.stringify(key)}].list) o.material = m;`, b: `${setup(key, edit)} for (const [o, m] of __ab[${JSON.stringify(key)}].list) o.material = __ab[${JSON.stringify(key)}].alt.get(m);` });
export default [
  pair('grit: one gStone call (same picture); B - A < 0 saves', 'oneStone', ONE_STONE),
  pair('grit: crack search only under the crack mask; B - A < 0 saves', 'cracksMasked', CRACKS_MASKED),
];
