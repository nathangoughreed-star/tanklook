// Lane PT (R151): the cost of the plant leaf shaders, for scripts/perf-baseline.mjs --ab (frames alternate).
//  1: glow + relief on (a) vs off (b), same atlas map.  2: everything on (a) vs the old plain vertex-colour shader (b: no map, no fx).
const collect = `const T = (globalThis.__ptT ??= []); for (const vp of __gb.viewer.active) vp.scene.traverse(o => { const m = o.material; if (m && m.userData && m.userData.plantClip && !T.includes(m)) T.push(m); });
globalThis.__ptTex ??= T[0] && T[0].map;`;
const set = (fx, map) => `${collect} { globalThis.__plantFx.on = ${fx}; for (const m of T) { m.map = ${map ? 'globalThis.__ptTex' : 'null'}; m.alphaTest = ${map ? 0.5 : 0}; m.needsUpdate = true; } }`;
export default [
  { name: 'glow + relief shader (a) vs without (b), atlas kept', a: set(true, true), b: set(false, true) },
  { name: 'all of it (a) vs the old plain vertex-colour shader (b)', a: set(true, true), b: set(false, false) },
];
