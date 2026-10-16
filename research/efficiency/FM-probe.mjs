// Lane FM: per-fish mesh census for scripts/perf-baseline.mjs --ab (stored in window.__abApplied.census; no timing).
//   node scripts/perf-baseline.mjs --sizes desktop --views planted --no-edits --no-prod --frames 3 --breakdown planted,iwagumi,paludarium,split --no-buckets --pairs 1 --ab research/efficiency/FM-probe.mjs
const census = `(() => {
  const out = {};
  for (const vp of __gb.viewer.active) vp.scene?.traverse(o => {
    if (!o.isMesh || o.userData.id === undefined || o.parent !== vp.scene) return;
    const by = {}; let n = 0;
    o.traverse(c => { if (!c.isMesh && !c.isLineSegments) return; n++; const m = [].concat(c.material)[0], u = m.userData ?? {};
      const k = c === o ? 'card' : m.type === 'ShaderMaterial' ? 'hull' : u.fishCard ? 'fin' : u.fish ? 'body:' + (m.map ? 'map' : 'col') : m.type; by[k] = (by[k] ?? 0) + 1; });
    const key = Object.entries(by).sort().map(([k, v]) => k + v).join(' ');
    (out[key] ??= 0); out[key]++;
  });
  (window.__abApplied ??= {}).census = out; window.__abApplied.calls = __gb.viewer.renderer.info.render.calls;
})()`;
export default [{ name: 'census', a: census, b: '' }];
