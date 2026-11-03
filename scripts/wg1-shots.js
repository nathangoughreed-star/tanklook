// Dev server only (lane WG1): the default tank on its stand in a finish, grain on or off. Console:
// `const s = await import('/scripts/wg1-shots.js'); await s.shot('oak', true)`. Pictures land in shots/wg1_<finish>_<grain|flat>[_<style>].png.
const wait = ms => new Promise(r => setTimeout(r, ms));
export async function shot(finish, grain, o = {}) {
  const { store, viewer } = window.__gb;
  globalThis.__gbNoGrain = !grain;
  store.edit(t => { t.stand.show = true; t.stand.finish = finish; t.stand.style = o.style ?? 'cabinet'; });
  store.cam(c => { c.az = o.az ?? 22; c.el = o.el ?? 6; c.zoom = o.zoom ?? 1; });
  store.select(null);
  await wait(3000); await viewer.buildNow?.(); await wait(1500);
  const blob = await viewer.exportPNG(1), name = `wg1_${finish}_${grain ? 'grain' : 'flat'}${o.style ? '_' + o.style : ''}`;
  await fetch('/__shot?name=' + name, { method: 'POST', body: blob });
  return name;
}
