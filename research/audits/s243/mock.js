// S243: the smallest change to reach the target, as a pure view-model over what the engine already returns (no engine change),
// drawn in the real Fullness tile's own classes. categorize(S) is the proposed mapping; mock(S) renders it into the tile.
export async function categorize(S) {
  const [SP, AF, TR, CN, TM, ST, TT, SL, GZ, PH, FT] = await Promise.all(['/src/data/species.ts', '/src/scene/animalfit.ts', '/src/scene/temprange.ts', '/src/data/careNeeds.ts', '/src/scene/tankMin.ts', '/src/scene/stocking.ts', '/src/scene/territory.ts', '/src/ui/stockPlanLogic.ts', '/src/data/grazers.ts', '/src/scene/physics.ts', '/src/ui/fullnessTile.ts'].map(m => import(m)));
  const sp = [...new Set(S.fish.map(f => f.species))].map(SP.getSpecies).filter(s => s && s.habitat !== 'land'), by = { social: [], env: [], behav: [], req: [] };
  const add = (c, level, text, also) => by[c].push({ level, text, also });
  // behaviour / environment from the pairwise care gates (the engine's own reasons, each pair said once)
  const seen = new Set();
  for (const s of sp) for (const o of sp) {
    if (o === s) continue;
    const ws = AF.whysAnimal(s, Infinity, 3, [o]), blocked = ws.some(w => !w.concern && !w.temp);
    for (const w of ws) {
      if (w.concern && blocked) continue;
      const t = w.text.replace(/^compatibility: /, '');
      if (w.kind !== 'compat' || w.temp || /^it /.test(t) || (/^water (chemistry|hardness)/.test(t) && s.id > o.id)) continue;
      const key = s.id + '|' + o.id + '|' + t;
      if (seen.has(key)) continue;
      seen.add(key);
      const env = /^water (chemistry|hardness)|dry enclosure/.test(t);
      add(env ? 'env' : 'behav', w.concern ? 'warn' : 'bad', `${s.name} with ${o.name}: ${t.replace(/ \([^)]*\)$/, '')}`);
    }
  }
  // fighting counts and pair rules (territory.ts crowdWarnings): behaviour; an unpaired-pair line is a social need
  for (const t of TT.crowdWarnings(S)) add(/unpaired|not set|established/i.test(t) ? 'social' : 'behav', 'warn', t.replace(/\.$/, ''), /fight/.test(t) ? 'cover limits fighting: see Environment' : undefined);
  // group size and sex ratio (stockPlanLogic.notesOf): social
  const nOf = id => S.fish.filter(f => f.species === id).length;
  for (const s of sp) {
    const nt = SL.notesOf({ id: s.id, n: nOf(s.id) }, 'in');
    if (nt.band === 'avoid') add('social', 'warn', `${s.name}: ${nt.line.replace(/^Group size: /, 'group of ' + nOf(s.id) + ': ')}`);
  }
  // temperature of the whole stocking (temprange.ts) and what the tank has set: environment
  const sh = TR.sharedRange(sp);
  if (sh.state === 'none' || sh.state === 'single') add('env', 'bad', TR.rangeLine(sh));
  else if (sh.state === 'narrow') add('env', 'warn', 'Shared temperature range ' + sh.range.join('-') + ' C: a narrow margin');
  else if (sh.state === 'unknown') add('env', 'unk', 'No recorded temperature range for some of these animals');
  if (!S.tech) add('env', 'unv', 'Species share a temperature range; the tank temperature is not set, so conditions are unverified');
  for (const t of TT.coverAdvice(S)) add('env', 'warn', t.replace(/\.$/, ''), 'it also limits fighting: see Behaviour');
  for (const s of sp) for (const n of CN.needsOf(s.id)) add('env', 'unk', `${s.name}: ${n.text} (the tool cannot check this)`);
  const litres = PH.volume(S.tank).litres;
  for (const s of sp) {
    const g = GZ.grazerShort(s.id, nOf(s.id), litres);
    if (g) add('env', GZ.grazerLevel(s.id, nOf(s.id), litres) === 'severe' ? 'bad' : 'warn', `${s.name}: ${g.replace(/^algae: /, 'food: ')}`);
  }
  // tank requirements (tankMin.ts): the species' own minimum
  for (const w of FT.minWarnings(TM.tankMinimum(S), 'in')) add('req', w.level === 'over' ? 'bad' : 'warn', w.text);
  // species with no minimum on record: not a pass
  for (const s of sp) if (!TM.minDataOf(s.id)?.red) add('req', 'unk', `${s.name}: no tank minimum on record`);
  const status = a => a.some(x => x.level === 'bad') ? 'Problem' : a.some(x => x.level === 'warn') ? 'Caution' : a.some(x => x.level === 'unk') ? 'Not enough information' : a.some(x => x.level === 'unv') ? 'Compatible, unverified' : 'Compatible';
  return { by, status: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, status(v)])), stocking: ST.stockingMemo(S) };
}
const CHIP = { Compatible: '#2e9e6a', 'Compatible, unverified': '#4f8f78', Caution: '#d99a1e', Problem: '#d8432f', 'Not enough information': '#6b7686' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export async function mock(S, opts = {}) {
  const { by, status, stocking: r } = await categorize(S), G = await import('/src/ui/gauge.ts'), pct = Math.round(Math.min(r.spacePercent, 999));
  const ft = document.querySelector('.ft'), bars = ft.querySelector('.ftBars');
  const row = (key, label, sub) => {
    const items = by[key], st = status[key];
    return `<details class="mk" ${opts.open?.includes(key) ? 'open' : ''}><summary><span class="mkL">${label}</span><span class="mkC" style="background:${CHIP[st]}">${st}</span></summary>`
      + `<div class="mkSub">${sub}</div>` + (items.length ? `<ul>${items.map(x => `<li class="${x.level}">${esc(x.text)}${x.also ? ` <em>(${esc(x.also)})</em>` : ''}</li>`).join('')}</ul>` : '<ul><li class="ok">Nothing found against it.</li></ul>') + '</details>';
  };
  const css = document.createElement('style');
  css.textContent = '.mkBig{font:700 34px/1 sans-serif;margin:2px 0 0}.mkBig small{font:12px sans-serif;color:var(--muted);margin-left:6px}.mk{border-top:1px solid var(--line);padding:5px 0}.mk summary{display:flex;justify-content:space-between;gap:8px;cursor:pointer;font-weight:600}.mkC{color:#fff;border-radius:9px;padding:0 8px;font-weight:600;font-size:12px;white-space:nowrap}.mkSub{color:var(--muted);font-size:11px;margin:2px 0}.mk ul{margin:3px 0 2px 16px;padding:0;font-size:12px}.mk li.bad{color:#ff8a7a}.mk li.warn{color:#f0b24a}.mk li.unk,.mk li.unv{color:#aab3c2}.mk li em{color:var(--muted)}';
  document.head.append(css);
  const size = `Tank ${Math.round(S.tank.L / 25.4)} x ${Math.round(S.tank.D / 25.4)} in, ${(r.capacity.litres / 3.785).toFixed(1)} gal of water`;
  bars.innerHTML = `<div class="ftWhy ftSize">${esc(size)}</div><div class="mkBig">${pct}%<small>full · limited by ${r.spaceBy === 'floor' ? 'floor' : 'swimming room'}</small></div>`
    + `<div class="ftTrack gauge" style="${G.gaugeStyle(r.spacePercent)};margin:4px 0 8px"><i></i></div>`
    + row('social', 'Social needs', 'group size, sex ratio, pairs') + row('env', 'Environment', 'temperature, pH, hardness, cover, food, fixtures') + row('behav', 'Behaviour', 'who eats, nips or fights whom') + row('req', 'Tank requirements', 'smallest tank each species is kept in');
  ft.querySelector('.ftHead .ftTitle').textContent = 'Stocking summary';
  ft.querySelector('.ftPill').textContent = pct + '%';
  for (const e of ft.querySelectorAll('.ftN, .ftSpace, .ftForm')) e.style.display = 'none';
  ft.style.width = '330px';
  ft.style.maxHeight = 'none';
  window.__mockData = by;
}
