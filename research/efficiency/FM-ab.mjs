// Lane FM A/B for scripts/perf-baseline.mjs --ab: steady draw with each 3D fish's parts one mesh per part (A, the old
// build) vs merged per material (B, fish3d mergeShared), alternate frames on the same scene. Setup (once per view):
// (started by the warm-up frames, done before the timed pairs) rebuild with fish3d.merge off, then give every fish group a merged twin; each side swaps the twins in.
// window.__abApplied.fm = draw calls per frame on each side (renderer.info) and how many groups were twinned.
//   node scripts/perf-baseline.mjs --sizes desktop --views planted --no-edits --no-prod --frames 3 --no-buckets --pairs 40 \
//     --breakdown planted,split,iwagumi,paludarium --ab research/efficiency/FM-ab.mjs
const setup = `window.__fmP ??= (async () => {
  const f3 = await import('/src/render/fish3d.ts'), v = __gb.viewer;
  f3.fish3d.merge = false; v.rebuild(); v.build(); f3.fish3d.merge = true;
  const twins = [];
  for (const vp of v.active) vp.scene?.traverse(o => {
    if (!o.isGroup || !o.parent?.isMesh || o.parent.userData.id === undefined) return;
    const c = o.clone(); f3.mergeShared(c); twins.push([o.parent, o, c]);
  });
  const calls = () => { const i = v.renderer.info; v.draw(); return i.render.calls; };
  const put = k => { for (const t of twins) { const p = t[0], i = p.children.indexOf(t[k === 1 ? 2 : 1]); if (i >= 0) { p.children[i] = t[k]; t[k].parent = p; } } };
  put(1); const a = calls(); put(2); const b = calls(); put(1);
  (window.__abApplied ??= {}).fm = { groups: twins.length, callsA: a, callsB: b };
  window.__fm = { put };
})();`;
export default [{ name: 'fish merge: B - A < 0 saves', a: `${setup} window.__fm?.put(1);`, b: `window.__fm?.put(2);` }];
