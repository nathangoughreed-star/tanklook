// Builds the expert survey for a calibration round (research/expert-calibration.md section 6): one self-contained HTML file, the
// renders inlined, no network, no install. Answers autosave in the browser; "Export answers" downloads the JSON the fit reads.
// Only what the expert should see goes in: no engine percent, no gate verdict, no engine table.
// Run: node scripts/calib-survey.mjs research/calib/round-1.json   (renders from research/calib/round-1/<id>.png)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const path = process.argv[2] ?? 'research/calib/round-1.json', round = JSON.parse(readFileSync(path, 'utf8'));
const imgDir = path.replace(/\.json$/, ''), out = path.replace(/round-(\d+)\.json$/, 'survey-round-$1.html');
const GAL_L = 3.785;
// as plural() in scene/stocking.ts: a name ending in fish or s is its own plural; ch / sh / x / z take es; the rest s
const pl = name => /(fish|s)$/i.test(name) ? name : /(ch|sh|x|z)$/i.test(name) ? name + 'es' : name + 's';
const tanks = round.scenarios.map(s => {
  const png = `${imgDir}/${s.id}.png`;
  return {
    id: s.id, gal: s.gal, dims: s.dimsIn, litres: Math.round(s.gal * GAL_L), mixed: s.stock.length > 1,
    focal: pl(s.names[s.focal]), focalId: s.focal, others: s.stock.filter(([id]) => id !== s.focal).map(([id]) => pl(s.names[id])),
    stock: s.stock.map(([id, n]) => ({ n, name: n === 1 ? s.names[id] : pl(s.names[id]), cm: +(s.tlMm[id] / 10).toFixed(1) })),
    img: existsSync(png) ? 'data:image/png;base64,' + readFileSync(png).toString('base64') : '',
  };
});

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Stocking survey, round ${round.round}</title>
<style>
:root{--bg:#f6f5f1;--card:#fff;--ink:#1d2329;--mute:#626b73;--line:#dcd9d2;--acc:#1f6f8b;--g:#3e9b5a;--y:#d9a520;--r:#c8463c}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,"Segoe UI",sans-serif}
header{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;padding:10px 16px;border-bottom:1px solid var(--line);background:var(--card);position:sticky;top:0;z-index:2}
header b{font-size:16px}.prog{flex:1;min-width:120px;height:6px;background:#e8e5de;border-radius:3px}.prog i{display:block;height:100%;background:var(--acc);border-radius:3px}
main{display:grid;grid-template-columns:1.45fr 1fr;gap:16px;padding:16px;max-width:1240px;margin:auto}
@media(max-width:820px){main{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
img{width:100%;border-radius:6px;display:block;background:#dfe3e6}
.facts td{padding:3px 10px 3px 0;vertical-align:top}.facts td:first-child{color:var(--mute);white-space:nowrap}
.note{font-size:13px;color:var(--mute);margin-top:8px}
h3{margin:0 0 6px;font-size:15px}.q{margin-bottom:16px}
.opts{display:grid;gap:6px}.opts.row{grid-template-columns:repeat(3,1fr)}
.opts button{font:inherit;text-align:left;padding:8px 10px;border:1px solid var(--line);border-radius:7px;background:#fff;cursor:pointer;color:var(--ink)}
.opts button small{display:block;color:var(--mute);font-size:12px}
.opts button.on{border-color:var(--acc);box-shadow:0 0 0 2px #1f6f8b33;background:#eef6f9}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:7px}
input[type=number],input[type=text]{font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:6px}input[type=number]{width:90px}
textarea{width:100%;height:46px;font:inherit;border:1px solid var(--line);border-radius:6px;padding:6px}
.def{font-size:12.5px;color:var(--mute);border-left:3px solid var(--line);padding-left:8px;margin:0 0 12px}
nav{display:flex;justify-content:space-between;gap:8px;margin-top:10px}
button.b{font:inherit;padding:7px 16px;border-radius:7px;border:1px solid var(--line);background:#fff;cursor:pointer}
button.go{background:var(--acc);color:#fff;border-color:var(--acc)}
.start{max-width:640px;margin:40px auto;padding:0 16px}.start .card p{margin:0 0 10px}
.miss{color:var(--r);font-size:13px}
</style></head><body>
<div id="app"></div>
<script>
const ROUND = ${round.round}, IDEAL = ${round.ideal}, LIMIT = ${round.limit};
const TANKS = ${JSON.stringify(tanks)};
const KEY = 'stocking-survey-round-' + ROUND;
let st = { expert: '', at: -1, answers: {} };
try { st = Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ans = id => st.answers[id] || (st.answers[id] = { id, band: null, ideal: null, limit: null, together: null, note: '', ms: 0 });
const done = t => { const a = st.answers[t.id]; return a && a.band != null && (a.ideal != null || a.idealNa) && (a.limit != null || a.limitNa) && (!t.mixed || a.together); };
let shownAt = Date.now();
const DEF = '<b>Ideal</b>: the stocking experienced keepers would aim for: healthy and comfortable for the long term with ordinary, consistent maintenance.<br><b>Limit</b>: past this, long-term problems become likely (stress, aggression, water quality), even with good care. Between the two: workable, but tread carefully.';

function start() {
  document.getElementById('app').innerHTML = '<div class="start"><div class="card"><h2 style="margin-top:0">Stocking survey, round ' + ROUND + '</h2>' +
    '<p>You will see ' + TANKS.length + ' tanks. For each, judge how stocked it is <b>by room for the animals</b>; assume ample filtration and weekly water changes. You never see the app\\'s own number. A few tanks come up twice on purpose.</p>' +
    '<p class="note">' + DEF + '</p>' +
    '<p>Your name or initials (only to tell answer files apart):<br><input type="text" id="who" value="' + esc(st.expert) + '" style="width:260px"></p>' +
    '<button class="b go" id="go">' + (st.at >= 0 ? 'Continue' : 'Start') + '</button></div></div>';
  document.getElementById('go').onclick = () => { const w = document.getElementById('who').value.trim(); if (!w) return; st.expert = w; if (st.at < 0) st.at = 0; save(); show(); };
}
function head(i) {
  const n = TANKS.filter(done).length;
  return '<header><b>Stocking survey · round ' + ROUND + '</b><span>' + (i < TANKS.length ? 'Tank ' + (i + 1) + ' of ' + TANKS.length : 'Finish') + '</span><div class="prog"><i style="width:' + (100 * n / TANKS.length) + '%"></i></div>' +
    '<span class="note" style="margin:0">' + esc(st.expert) + ' · ' + n + ' answered · saved in this browser</span><button class="b" id="exp">Export answers</button></header>';
}
function show() {
  const i = st.at;
  if (i >= TANKS.length) return finish();
  const t = TANKS[i], a = ans(t.id); shownAt = Date.now();
  const others = t.others.length ? 'Keeping the ' + t.others.join(' and ') + ' as shown, how' : 'How';
  const band = [[0, 'var(--g)', 'At or under ideal', 'comfortable for the long term'], [1, 'var(--y)', 'Past ideal: tread carefully', 'workable, the closer to the limit the more care it needs'], [2, 'var(--r)', 'Not recommended', 'past the limit: long-term problems likely']];
  document.getElementById('app').innerHTML = head(i) + '<main><div><div class="card">' + (t.img ? '<img alt="Front view of the tank" src="' + t.img + '">' : '<p class="note">(no picture)</p>') +
    '<div class="note">Front view at adult sizes. Small or see-through animals (shrimp, otocinclus) can be hard to spot: the list below is what counts.</div></div>' +
    '<div class="card" style="margin-top:12px"><table class="facts"><tr><td>Tank</td><td>' + t.dims.join(' × ') + ' in (' + t.gal + ' gal, ' + t.litres + ' L), filled to the rim</td></tr>' +
    '<tr><td>Animals</td><td>' + t.stock.map(s => s.n + ' ' + esc(s.name) + ' (adult ' + s.cm + ' cm)').join('<br>') + '</td></tr>' +
    '<tr><td>Filtration</td><td>Assume ample filtration and weekly water changes. Judge <b>room</b> only.</td></tr></table></div></div>' +
    '<div class="card"><div class="def">' + DEF + '</div>' +
    '<div class="q"><h3>1. How stocked is this tank, by room for these animals?</h3><div class="opts">' + band.map(b => '<button data-band="' + b[0] + '"' + (a.band === b[0] ? ' class="on"' : '') + '><span class="dot" style="background:' + b[1] + '"></span>' + b[2] + '<small>' + b[3] + '</small></button>').join('') + '</div></div>' +
    '<div class="q"><h3>2. ' + esc(others) + ' many ' + esc(t.focal) + ' would be <u>ideal</u> here?</h3><input type="number" min="0" id="ideal" value="' + (a.ideal ?? '') + '"> &nbsp;<label><input type="checkbox" id="idealNa"' + (a.idealNa ? ' checked' : '') + '> can\\'t say</label></div>' +
    '<div class="q"><h3>3. And how many ' + esc(t.focal) + ' at most, before long-term problems become likely (the <u>limit</u>)?</h3><input type="number" min="0" id="limit" value="' + (a.limit ?? '') + '"> &nbsp;<label><input type="checkbox" id="limitNa"' + (a.limitNa ? ' checked' : '') + '> can\\'t say</label></div>' +
    (t.mixed ? '<div class="q"><h3>4. Would you keep these species together long term?</h3><div class="opts row">' + [['yes', 'Yes'], ['caution', 'With caution'], ['no', 'No']].map(o => '<button data-tog="' + o[0] + '"' + (a.together === o[0] ? ' class="on"' : '') + '>' + o[1] + '</button>').join('') + '</div><div class="note" style="margin-top:4px">If not "Yes", say which pair in the note.</div></div>' : '') +
    '<div class="q"><h3>Note (optional)</h3><textarea id="note">' + esc(a.note) + '</textarea></div>' +
    '<div id="miss" class="miss"></div><nav><button class="b" id="back"' + (i ? '' : ' disabled') + '>← Back</button><button class="b go" id="next">Next →</button></nav></div></main>';
  const num = v => v === '' ? null : Math.max(0, Math.round(+v));
  const keep = () => { a.ideal = num(document.getElementById('ideal').value); a.limit = num(document.getElementById('limit').value); a.idealNa = document.getElementById('idealNa').checked; a.limitNa = document.getElementById('limitNa').checked;
    if (a.idealNa) a.ideal = null; if (a.limitNa) a.limit = null; a.note = document.getElementById('note').value; a.ms += Date.now() - shownAt; shownAt = Date.now(); save(); };
  document.querySelectorAll('[data-band]').forEach(b => b.onclick = () => { a.band = +b.dataset.band; keep(); show(); });
  document.querySelectorAll('[data-tog]').forEach(b => b.onclick = () => { a.together = b.dataset.tog; keep(); show(); });
  document.getElementById('back').onclick = () => { keep(); st.at = Math.max(0, i - 1); save(); show(); };
  document.getElementById('next').onclick = () => { keep();
    if (a.ideal != null && a.limit != null && a.limit < a.ideal) { document.getElementById('miss').textContent = 'The limit is below the ideal: please check the two counts.'; return; }
    if (!done(t)) { document.getElementById('miss').textContent = 'Please answer each question (or tick "can\\'t say").'; return; }
    st.at = i + 1; save(); show(); };
  document.getElementById('exp').onclick = () => { keep(); exportAnswers(); };
}
function finish() {
  const open = TANKS.map((t, i) => done(t) ? null : i).filter(x => x !== null);
  document.getElementById('app').innerHTML = head(TANKS.length) + '<div class="start"><div class="card"><h2 style="margin-top:0">Thank you</h2>' +
    (open.length ? '<p class="miss">' + open.length + ' tank(s) still open: ' + open.map(i => '<a href="#" data-go="' + i + '">' + (i + 1) + '</a>').join(', ') + '</p>' : '<p>All ' + TANKS.length + ' tanks answered.</p>') +
    '<p>Click <b>Export answers</b> and send the downloaded file back. Your answers also stay saved in this browser.</p><button class="b go" id="exp2">Export answers</button> <button class="b" id="back">← Back</button></div></div>';
  document.querySelectorAll('[data-go]').forEach(x => x.onclick = e => { e.preventDefault(); st.at = +x.dataset.go; save(); show(); });
  document.getElementById('exp').onclick = document.getElementById('exp2').onclick = exportAnswers;
  document.getElementById('back').onclick = () => { st.at = TANKS.length - 1; save(); show(); };
}
function exportAnswers() {
  const body = { round: ROUND, expert: st.expert, made: new Date().toISOString(), answers: TANKS.map(t => st.answers[t.id]).filter(Boolean).map(a => ({ id: a.id, band: a.band, ideal: a.ideal, limit: a.limit, together: a.together, note: a.note, ms: a.ms })) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(body, null, 1)], { type: 'application/json' })), el = document.createElement('a');
  el.href = url; el.download = 'round-' + ROUND + '-' + (st.expert || 'expert').replace(/[^A-Za-z0-9_-]+/g, '_') + '.json'; document.body.appendChild(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
st.expert && st.at >= 0 ? show() : start();
</script></body></html>
`;
writeFileSync(out, html);
console.log(`wrote ${out}: ${tanks.length} tanks, ${tanks.filter(t => t.img).length} pictures, ${(html.length / 1e6).toFixed(1)} MB`);
