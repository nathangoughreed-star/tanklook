// Lane SG: --ab pairs, A = the app's new grit, B = the old hashed grit (B - A > 0 = what the new grit saves). See SG-old-new.mjs.
import { TO_OLD } from './SG-old-new.mjs';
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
const K = 'old';
export default [{ name: 'grit: old hashed (B) vs new baked (A); B - A > 0 = saved', a: `${setup(K, TO_OLD)} for (const [o, m] of __ab.old.list) o.material = m;`, b: `${setup(K, TO_OLD)} for (const [o, m] of __ab.old.list) o.material = __ab.old.alt.get(m);` }];
