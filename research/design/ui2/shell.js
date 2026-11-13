// UI2 mockup helpers: the app header and the rail are the same on every desktop page.
const I = (n, cls = 'i') => `<svg class="${cls}"><use href="#i-${n}"/></svg>`;
const RAIL = [
  ['tank', 'Tank'], ['scape', 'Scape'], ['plants', 'Plants'], ['animals', 'Animals'], ['gear', 'Equipment'],
  '-', ['owned', 'My gear'], ['prefs', 'Preferences'], ['limits', 'Constraints'], '-', ['ideas', 'Discover'], ['print', 'Print'],
];
function rail(active, badges = {}) {
  return `<nav class="rail">${RAIL.map(r => r === '-' ? '<div style="height:1px;background:var(--line);margin:6px 10px"></div>' :
    `<a class="${r[0] === active ? 'on' : ''}"><span class="ic">${I(r[0])}</span>${r[1]}${badges[r[0]] ? ` <span class="badge">${badges[r[0]]}</span>` : ''}</a>`).join('')}
    <div class="sp"></div><a><span class="ic">${I('settings')}</span>Settings</a></nav>`;
}
function apphead(name = 'Planted community') {
  return `<header class="apphead">
    <span class="brand">TankLook</span>
    <span class="proj" title="Click to rename">&middot; ${name} <span class="dot" title="Autosaved"></span></span>
    <span style="flex:1"></span>
    <button class="btn icon ghost" title="Undo (Ctrl+Z)">${I('undo')}</button>
    <button class="btn icon ghost" title="Redo (Ctrl+Y)" disabled>${I('redo')}</button>
    <button class="btn sm" title="Save (Ctrl+S)">${I('save')} Save</button>
    <button class="btn icon ghost" title="New, Open, Save as, Share link, Download">${I('more')}</button>
  </header>`;
}
function toolbar(extra = '') {
  return `<div class="toolbar glass">
    <button class="btn sm">${I('eye')} View &#9662;</button>
    <button class="btn sm">${I('shuffle')} Another moment</button>
    ${extra || `<button class="btn sm">${I('split')} Compare</button>`}
  </div>`;
}
function checkbar(o = {}) {
  const w = o.welfare || ['warn', 'Caution'];
  return `<div class="checkbar glass">
    <div class="check ${o.on === 'habitat' ? 'on' : ''}">Habitat <span class="pill ${w[0]}">${w[1]}</span></div><div class="vsep"></div>
    <div class="check ${o.on === 'cost' ? 'on' : ''}"><b>${o.cost || '$1,264'}</b>${o.full ? ` <span style="color:var(--text-2)">&middot; ${o.mo || '$51/mo'} &middot; ${o.min || '57 min/wk'}</span>` : ''}</div><div class="vsep"></div>
    <div class="check ${o.on === 'water' ? 'on' : ''}">${I('drop')} 75 &deg;F <span class="pill ok">fits</span></div><div class="vsep"></div>
    <div class="check ${o.on === 'notes' ? 'on' : ''}">${I('note')} Notes <span class="pill">${o.notes || 3}</span></div>
  </div>`;
}
