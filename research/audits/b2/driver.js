// B1 figure driver (review only): 2 oscars, 30 x 12 x 12 in, ?fig=a (inferred gear) or ?fig=b (explicit hang-on filter). Dev server on :5173.
const q = new URLSearchParams(location.search), fig = q.get('fig') || 'a';
const w = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  for (let i = 0; i < 100 && !window.__gb; i++) await w(200);
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  const d = await import('/src/scene/defaults.ts'), sc = await import('/src/scene/scatter.ts'), { rng } = await import('/src/art/paint.ts');
  const s = d.emptyScene(); s.units = 'in'; const T = s.tanks[0];
  T.tank = { ...T.tank, L: 30 * 25.4, D: 12 * 25.4, H: 12 * 25.4 }; T.water.on = true; T.water.level = 1;
  T.fish = [1, 2].map(id => ({ id, species: 'oscar', x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
  sc.shuffleFish(T, rng(7), undefined, 100);
  if (fig === 'b') T.tech = { rows: { filter: 'hob', heater: 'one' }, preset: 'custom' };
  __gb.store.replace(s); await w(2500);
  const ft = document.querySelector('.ft'); ft?.querySelectorAll('.ftRow').forEach(r => r.classList.add('open'));
  await w(500); document.title = 'READY';
})();
