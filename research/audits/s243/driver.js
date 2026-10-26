// S243 figure driver (review only): loaded by research/audits/s243/app.html (a copy of index.html + this script) on the DEV server.
// ?fig=<name> builds a scenario in the real app, draws numbered call-outs over the real UI, and sets document.title = 'READY'.
const q = new URLSearchParams(location.search), fig = q.get('fig') || '';
const w = ms => new Promise(r => setTimeout(r, ms));
const SC = {
  A: { name: 'Scenario A', tank: [30, 12, 12], stock: [['dwarfgourami', 2], ['tigerbarb', 6], ['peapuffer', 1]] },
  G: { name: 'Scenario G', tank: [30, 12, 12], stock: [['neon', 6], ['oscar', 1]] },
  B: { name: 'Scenario B', tank: [20, 10, 12], stock: [['betta', 2], ['pandacory', 6]] },
  H: { name: 'Scenario H', tank: [36, 18, 16], stock: [['demasoni', 8]] },
  C: { name: 'Scenario C', tank: [48, 13, 21], stock: [['discus', 6], ['bristlenose', 2]] },
  D: { name: 'Scenario D', tank: [30, 12, 18], stock: [['oto', 25]] },
};
async function boot() {
  for (let i = 0; i < 100 && !window.__gb; i++) await w(200);
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  const d = await import('/src/scene/defaults.ts'), sc = await import('/src/scene/scatter.ts'), { rng } = await import('/src/art/paint.ts');
  window.__load = (k) => {
    const S = SC[k], s = d.emptyScene(); s.name = S.name; s.units = 'in'; const T = s.tanks[0];
    T.tank = { ...T.tank, L: S.tank[0] * 25.4, D: S.tank[1] * 25.4, H: S.tank[2] * 25.4 }; T.water.on = true; T.water.level = 1; let id = 1;
    T.fish = S.stock.flatMap(([sp, n]) => Array.from({ length: n }, () => ({ id: id++, species: sp, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 })));
    sc.shuffleFish(T, rng(7), undefined, 100); __gb.store.replace(s);
  };
}
/** the smallest element (inside root) whose text matches re */
export function find(root, re) {
  let best = null;
  for (const e of root.querySelectorAll('*')) { const t = (e.textContent || '').trim(); if (re.test(t) && (!best || t.length < best.textContent.trim().length)) best = e; }
  return best;
}
/** numbered badge pinned beside element el (side: 'l' | 'r'), plus a ring around it */
function mark(el, n, color = '#ff3b6b', side = 'l', dx = 0) {
  if (!el) { console.warn('no el for', n); return; }
  const r = el.getBoundingClientRect(), ring = document.createElement('div'), b = document.createElement('div');
  Object.assign(ring.style, { position: 'fixed', left: r.left - 3 + 'px', top: r.top - 3 + 'px', width: r.width + 6 + 'px', height: r.height + 6 + 'px', border: `2px solid ${color}`, borderRadius: '6px', zIndex: 99998, pointerEvents: 'none' });
  Object.assign(b.style, { position: 'fixed', top: r.top + r.height / 2 - 13 + 'px', left: (side === 'l' ? r.left - 34 - dx - (String(n).length > 1 ? 14 : 0) : r.right + 8 + dx) + 'px', minWidth: '26px', height: '26px', padding: '0 5px', boxSizing: 'border-box', borderRadius: '13px', background: color, color: '#fff', font: 'bold 14px sans-serif', display: 'grid', placeItems: 'center', zIndex: 99999, pointerEvents: 'none', boxShadow: '0 1px 4px #0008' });
  b.textContent = n; document.body.append(ring, b);
}
function legend(title, rows, at = 'bl') {
  const d = document.createElement('div');
  Object.assign(d.style, { position: 'fixed', [at[0] === 'b' ? 'bottom' : 'top']: '10px', [at[1] === 'l' ? 'left' : 'right']: '10px', maxWidth: '560px', background: '#fffffff2', color: '#111', font: '13px/1.35 sans-serif', padding: '8px 10px', borderRadius: '8px', zIndex: 100000, boxShadow: '0 2px 10px #0006' });
  d.innerHTML = `<b>${title}</b>` + rows.map(([c, t, x]) => `<div style="margin-top:4px"><span style="display:inline-block;min-width:22px;text-align:center;border-radius:11px;background:${c};color:#fff;font-weight:bold;padding:0 4px;margin-right:6px">${t}</span>${x}</div>`).join('');
  document.body.append(d);
}
const RED = '#ff3b6b', ORG = '#ff8a00', VIO = '#9b5cff', CYN = '#0aa7b8', GRN = '#1f9d63';
window.__mark = mark; window.__find = find;
async function run() {
  await boot();
  if (!fig) return;
  const [k, kind] = fig.split('-'); // e.g. A-tile, A-plan, A-stock
  if (kind === 'tile') { __load(k); await w(2500); }
  if (kind === 'mock') { __load(k); await w(2500); const m = await import('/research/audits/s243/mock.js'); await m.mock(__gb.store.tank, { open: (q.get('open') || '').split(',') }); }
  if (kind === 'plan') { __load(k); await w(1500); const m = await import('/src/ui/planSheet.ts'); m.attachPlanSheet(__gb.store).open(); await w(800); }
  if (kind === 'stock') {
    document.getElementById('startAnimal').click(); await w(1200);
    const tile = id => document.querySelector(`.sgTile[data-id="${id}"]`), S = SC[k];
    tile(S.stock[0][0]).click(); await w(500); document.querySelector('[data-act=mates]').click(); await w(800);
    for (const [id] of S.stock.slice(1)) { const t = tile(id); if (t) { t.removeAttribute('disabled'); t.click(); await w(500); } }
    for (const [id, n] of S.stock) { const b = () => document.querySelector(`[data-act=inc][data-id="${id}"][data-w=n]`); let c = 0; while (c++ < 40) { const el = document.querySelector(`.spPick:has([data-id="${id}"]) .spStep b`); if (!el || +el.textContent >= n) break; b().click(); await w(120); } }
    document.querySelector('[data-act=nomates]')?.click(); await w(500);
    const want = q.get('tank') || '30 gal'; const sizes = [...document.querySelectorAll('[data-act=size]')]; const pick = sizes.find(b => b.textContent.includes(`About a ${want}`)) || sizes[0]; pick?.click(); await w(800);
  }
  if (q.get('dbg')) document.body.setAttribute('data-dbg', JSON.stringify([...document.querySelectorAll('[data-act=size]')].map(b => b.textContent.trim().slice(0, 40))));
  if (kind === 'stock' && k === 'A') {
    const sp = document.querySelector('.sp'), ft = document.querySelector('.ft'), picks = [...sp.querySelectorAll('.spPick')], HOT = '#e0a400';
    mark(ft.querySelector('.ftCompat'), 'A+B', RED, 'r');
    mark(find(ft, /^Dwarf gourami males fight/), 'C', VIO, 'r');
    mark(ft.querySelector('.ftRow[data-row=water]'), 'H', HOT, 'r');
    mark(find(ft, /^The tank is too small for them/), 'H', HOT, 'r');
    mark(find(sp, /^Tank verdict: Too many animals/), 'H', HOT, 'l');
    mark(find(picks[0], /^it would nip this one's feelers \(Tiger barb\)$/), 'A', RED, 'l');
    mark(find(picks[0], /^Also: it would nip this one's feelers \(Pea puffer\)$/), 'B', ORG, 'l');
    mark(find(picks[0], /^Dwarf gourami males fight/), 'C', VIO, 'l');
    mark(find(picks[1], /^would nip its feelers \(Dwarf gourami\)$/), 'A', RED, 'l');
    mark(find(picks[2], /^would nip its feelers \(Dwarf gourami\)$/), 'B', ORG, 'l');
    for (const p of picks) { mark(find(p, /^Group size: .*That is the group only/), 'G', CYN, 'l'); for (const e of p.querySelectorAll('div')) if (/^Also: (it is )?best kept in a species-only/.test(e.textContent.trim())) mark(e, 'F', '#777', 'l'); }
    legend('One tank, one real conflict, stated up to six times', [[RED, 'A', 'Tiger barb nips the dwarf gourami: tile (one box) + gourami row + tiger barb row'], [ORG, 'B', 'Pea puffer nips the dwarf gourami: same tile box + gourami "Also" + puffer row'],
      [VIO, 'C', 'Two male dwarf gouramis fight: tile + gourami row (which then says "Group size: Great")'], [HOT, 'H', 'Too full (106 %): water-column bar + tile sentence + "Tank verdict" + (not shown) "too full" on the size button'],
      [CYN, 'G', '"This tank fails ... see the tank verdict" repeated under every species'], ['#777', 'F', '"species-only tank" repeated on every row']], 'bl');
  }

  if (kind === 'plan' && k === 'A') {
    const pg = document.querySelector('.sheetPage'), li = [...pg.querySelectorAll('.planTruths li')];
    mark(find(pg, /^✕ Dwarf gourami: compatibility: it would nip this one/), 'A', RED, 'l', 10);
    mark(find(pg, /^also: it would nip this one's feelers \(Pea puffer\)$/), 'B', ORG, 'l', 10);
    mark(find(pg, /^✕ Tiger barb: compatibility/), 'A', RED, 'l', 10);
    mark(find(pg, /^✕ Pea puffer: compatibility/), 'B', ORG, 'l', 10);
    mark(find(pg, /^! Water temperature: unchecked/), 'T', '#777', 'l', 10);
    mark(find(pg, /^✓ Temperature: shared range/), 'T', '#777', 'l', 10);
    legend('Plan sheet, same tank: each conflict is said from both sides, and two lines are missing', [[RED, 'A', 'tiger barb / dwarf gourami: two lines (one per animal)'], [ORG, 'B', 'pea puffer / dwarf gourami: two lines'],
      [VIO, 'C+D', 'NOT on this sheet: "two male gouramis fight" and "pea puffer is one to a tank" appear on the tile and stocking screen only'], ['#777', 'T', 'Temperature twice: a green tick for the species and an amber "unchecked" for the tank']], 'bl');
  }
  if (kind === 'tile' && k === 'G') {
    const ft = document.querySelector('.ft');
    mark(ft.querySelector('.ftCompat'), 'P', VIO, 'r');
    mark(ft.querySelector('.ftRow[data-row=water]'), 'S', '#e0a400', 'r');
    mark(ft.querySelector('.ftRow[data-row=min]'), 'M', GRN, 'r');
    for (const e of ft.querySelectorAll('.ftWarn.ft-over:not(.ftCompat)')) mark(e, 'M', GRN, 'r');
    mark(find(ft, /^The tank is too small for them/), 'S', '#e0a400', 'r');
    legend('Oscar and six neons in 18.7 gal', [[VIO, 'P', 'Predation (behaviour): oscar would eat the neons'], ['#e0a400', 'S', 'Fullness 145 %: the oscar alone fills it (two places: bar + sentence)'], [GRN, 'M', 'Tank requirement: "Not assessed", painted red, because the water is shallower than the oscar is long. An unknown shown as a failure, saying the oscar is too big for the tank again']], 'br');
  }
  window.__step2?.();
  await (window.__after?.() ?? w(100));
  document.title = 'READY';
}
run();
