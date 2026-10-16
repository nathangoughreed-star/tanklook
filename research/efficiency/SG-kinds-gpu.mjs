// Lane SG: steady GPU cost of the grit per kind, for scripts/perf-baseline.mjs --ab (alternate frames; see E1-ab-grit.mjs).
// B = the hardscape material with gritK() returning 1 for the kinds named; B - A < 0 = what that kind's grit costs.
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
const pair = (name, key, edit) => ({ name, a: `${setup(key, edit)} for (const [o, m] of __ab[${JSON.stringify(key)}].list) o.material = m;`, b: `${setup(key, edit)} for (const [o, m] of __ab[${JSON.stringify(key)}].list) o.material = __ab[${JSON.stringify(key)}].alt.get(m);` });
const off = (lo, hi) => `s => s.replace('float gritK() {', 'float gritK() { { int tt = int(vGrit.w + 0.5); if (tt >= ${lo} && tt <= ${hi}) return 1.0; }')`;
export default [
  pair('stone 1-5 off', 'off15', off(1, 5)),
  pair('stone cracks off', 'offCr', `s => s.replace('float e = gEdge(q)', 'float e = 1.0')`),
  pair('wood 6 + 9 off', 'off69', `s => s.replace('float gritK() {', 'float gritK() { { int tt = int(vGrit.w + 0.5); if (tt == 6 || tt == 9) return 1.0; }')`),
  pair('clay/coconut 7-8 off', 'off78', off(7, 8)),
  pair('cork/plain wood 10 off', 'off10', off(10, 10)),
  pair('coral 11 off', 'off11', off(11, 11)),
  pair('moss/soft 12 off', 'off12', off(12, 12)),
  pair('all grit off', 'offAll', `s => s.replace('diffuseColor.rgb *= gritK();', '')`),
];
