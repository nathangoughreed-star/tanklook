// Lane PT (R151): the cost of the plant leaf atlas, for scripts/perf-baseline.mjs --ab (frames alternate: a = every plant
// material with its atlas `map` + alphaTest as shipped, b = the same materials without them, i.e. the shader as it was).
const collect = `const T = (globalThis.__ptT ??= []); for (const vp of __gb.viewer.active) vp.scene.traverse(o => { const m = o.material; if (m && m.userData && m.userData.plantClip && !T.includes(m)) T.push(m); });
globalThis.__ptTex ??= T[0] && T[0].map;`;
export default [{
  name: 'plant atlas map + alphaTest (a) vs plain vertex colours (b)',
  a: `${collect} for (const m of T) { if (m.map !== globalThis.__ptTex) { m.map = globalThis.__ptTex; m.alphaTest = 0.5; m.needsUpdate = true; } }`,
  b: `${collect} for (const m of T) { if (m.map) { m.map = null; m.alphaTest = 0; m.needsUpdate = true; } }`,
}];
