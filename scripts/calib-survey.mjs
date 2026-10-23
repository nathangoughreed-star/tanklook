// Builds the expert survey for a calibration round (research/expert-calibration.md sections 6 and 10): one self-contained HTML file,
// no network, no install. Survey v2 (Nathan 2026-10-23): text only, no render (camera, decor and substrate biased round 1); room
// asked per dimension (floor, water column, overall) the way the engine measures it; what limits the room; big enough per species;
// focal and tankmate counts; together; confidence; plants. Answers autosave in the browser; "Import answers" restores or carries a
// file (an earlier round's answers ride along in the export); "Export answers" downloads the JSON the fit reads.
// Only what the expert should see goes in: no engine percent, no gate verdict, no engine table.
// survey-round-1.html (with renders) is the frozen output of the first version of this script.
// v2.1 (2026-10-23, after a dogfood answer from ChatGPT): decor stated as furnished for the species (habitat never the limit), "no count
// works as described", overall asks room only, the zone in the uses tag, a bare-tank question instead of a planted one, who is answering.
// Run: node scripts/calib-survey.mjs research/calib/round-2.json
import { readFileSync, writeFileSync } from 'node:fs';

const path = process.argv[2] ?? 'research/calib/round-2.json', round = JSON.parse(readFileSync(path, 'utf8'));
const out = path.replace(/round-(\d+)\.json$/, 'survey-round-$1.html');
if (out === path) throw new Error('expected a research/calib/round-N.json path');
if (round.round === 1) throw new Error('round 1 is frozen (survey-round-1.html, with renders); this builds survey v2 from round 2 on');
const GAL_L = 3.785;
// as plural() in scene/stocking.ts: a name ending in fish or s is its own plural; ch / sh / x / z take es; the rest s
const pl = name => /(fish|s)$/i.test(name) ? name : /(ch|sh|x|z)$/i.test(name) ? name + 'es' : name + 's';
const tanks = round.scenarios.map(s => ({
  id: s.id, gal: s.gal, dims: s.dimsIn, litres: Math.round(s.gal * GAL_L), floorSqIn: s.dimsIn[0] * s.dimsIn[1], mixed: s.stock.length > 1,
  focal: s.focal, mate: s.mate ?? null, noLimit: !!s.noLimit,
  stock: s.stock.map(([id, n]) => ({ id, n, name: s.names[id], pl: pl(s.names[id]), cm: +(s.tlMm[id] / 10).toFixed(1), floor: s.uses[id].floor, zone: s.zone?.[id] ?? 'middle' })),
}));

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Stocking survey, round ${round.round}</title>
<style>
:root{--bg:#f6f5f1;--card:#fff;--ink:#1d2329;--mute:#626b73;--line:#dcd9d2;--acc:#1f6f8b;--g:#3e9b5a;--y:#d9a520;--r:#c8463c}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.4 system-ui,"Segoe UI",sans-serif}
header{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:8px 14px;border-bottom:1px solid var(--line);background:var(--card);position:sticky;top:0;z-index:2}
header b{font-size:15px}.prog{flex:1;min-width:100px;height:6px;background:#e8e5de;border-radius:3px}.prog i{display:block;height:100%;background:var(--acc);border-radius:3px}
main{display:grid;grid-template-columns:0.9fr 1fr 1fr;gap:12px;padding:12px 14px;max-width:1400px;margin:auto}
@media(max-width:1100px){main{grid-template-columns:1fr 1fr}main>div:first-child{grid-column:span 2}}
@media(max-width:700px){main{grid-template-columns:1fr}main>div:first-child{grid-column:auto}}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px}
h2{font-size:14px;margin:0 0 6px}h3{margin:0 0 4px;font-size:13.5px}
table{border-collapse:collapse;width:100%}td,th{padding:3px 6px 3px 0;text-align:left;vertical-align:top;font-size:13px}th{color:var(--mute);font-weight:500;border-bottom:1px solid var(--line)}
.k td:first-child{color:var(--mute);white-space:nowrap;width:70px}
.tag{display:inline-block;font-size:11.5px;padding:1px 6px;border-radius:9px;white-space:nowrap}
.tag.b{background:linear-gradient(90deg,#f3eadb 50%,#e3eef5 50%)}.tag.w{background:#e3eef5}
.note{font-size:12px;color:var(--mute)}
.q{margin-bottom:10px}.r3,.r2{display:grid;gap:5px}.r3{grid-template-columns:repeat(3,1fr)}.r2{grid-template-columns:repeat(2,1fr)}
button.o{font:inherit;font-size:12.5px;text-align:left;padding:5px 7px;border:1px solid var(--line);border-radius:7px;background:#fff;cursor:pointer;color:var(--ink)}
button.o.on{border-color:var(--acc);box-shadow:0 0 0 2px #1f6f8b33;background:#eef6f9}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}
input[type=number]{font:inherit;width:66px;padding:3px 6px;border:1px solid var(--line);border-radius:6px}input[type=text]{font:inherit;padding:5px 8px;border:1px solid var(--line);border-radius:6px}
.alt{margin:4px 0 2px;font-size:12px;color:var(--mute)}.alt button.o{font-size:12px;padding:3px 7px;border-style:dashed;margin-left:4px}
.cnt{display:flex;align-items:center;gap:6px}.cnt.off input{opacity:.45}
.sub{color:var(--mute);font-size:12px;margin:-2px 0 4px}
.yn td{padding:2px 6px 2px 0}
textarea{width:100%;height:40px;font:inherit;border:1px solid var(--line);border-radius:6px;padding:5px}
nav{display:flex;justify-content:space-between;margin-top:6px}
button.b{font:inherit;padding:5px 14px;border-radius:7px;border:1px solid var(--line);background:#fff;cursor:pointer}button.go{background:var(--acc);color:#fff;border-color:var(--acc)}
.sec{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--mute);margin:0 0 6px}
.start{max-width:680px;margin:40px auto;padding:0 16px}.start p{margin:0 0 10px}
.miss{color:var(--r);font-size:12.5px}
</style></head><body>
<div id="app"></div><input type="file" id="imp" accept=".json,application/json" style="display:none">
<script>
const ROUND = ${round.round}, TANKS = ${JSON.stringify(tanks)};
const KEY = 'stocking-survey-round-' + ROUND;
let st = { expert: '', kind: '', at: -1, answers: {}, carried: [] };
try { st = Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const KINDS = [['keeper', 'A fishkeeper'], ['professional', 'A professional (store, breeder, aquarist)'], ['ai', 'An AI model']];
const BANDS = [['var(--g)', 'Ideal or under'], ['var(--y)', 'Caution'], ['var(--r)', 'Problems']];
const DEF = '<b>Ideal</b>: what experienced keepers would aim for, comfortable long term. <b>Caution</b>: workable, tread carefully. <b>Problems</b>: past this, long-term problems become likely even with good care.';
const blank = t => ({ id: t.id, floor: null, water: null, overall: null, limits: null, bigEnough: {}, focal: { ideal: null, limit: null, status: {} }, mate: t.mate ? { id: t.mate, ideal: null, status: {} } : null, together: null, confidence: null, bare: null, note: '', ms: 0 });
const ans = t => st.answers[t.id] || (st.answers[t.id] = blank(t));
const hasFloor = t => t.stock.some(s => s.floor > 0), hasWater = t => t.stock.some(s => s.floor < 1);
const countOk = (c, k) => c[k] != null || !!c.status[k];
// what is still open on a tank, named, so the Next message says which (Nathan 2026-10-23: a page that looked complete would not continue)
function missing(t) {
  const a = st.answers[t.id]; if (!a) return ['everything'];
  return [[hasFloor(t) && a.floor == null, 'floor room'], [hasWater(t) && a.water == null, 'water column room'], [a.overall == null, 'overall room'],
    [a.limits == null, 'what limits'], [!t.stock.every(s => a.bigEnough[s.id] != null), 'big enough'], [!countOk(a.focal, 'ideal'), 'ideal count'],
    [!t.noLimit && !countOk(a.focal, 'limit'), '"at most" count'], [a.mate && !countOk(a.mate, 'ideal'), 'second ideal count'],
    [t.mixed && !a.together, 'keep together'], [a.confidence == null, 'how sure'], [a.bare == null, 'bare tank']].filter(x => x[0]).map(x => x[1]);
}
const done = t => missing(t).length === 0;
let shownAt = Date.now();
function head(i) {
  const n = TANKS.filter(done).length;
  return '<header><b>Stocking survey · round ' + ROUND + '</b><span>' + (i < TANKS.length ? 'Tank ' + (i + 1) + ' of ' + TANKS.length : 'Finish') + '</span><div class="prog"><i style="width:' + (100 * n / TANKS.length) + '%"></i></div>' +
    '<span class="note">' + esc(st.expert) + ' · ' + n + ' answered · saved in this browser' + (st.carried.length ? ' · ' + st.carried.length + ' earlier file(s) carried' : '') + '</span><button class="b" data-imp>Import answers</button><button class="b" data-exp>Export answers</button></header>';
}
function wire() {
  document.querySelectorAll('[data-imp]').forEach(b => b.onclick = () => document.getElementById('imp').click());
  document.querySelectorAll('[data-exp]').forEach(b => b.onclick = () => { if (st.at >= 0 && st.at < TANKS.length) keep(); exportAnswers(); });
}
document.getElementById('imp').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  let j; try { j = JSON.parse(await f.text()); } catch (err) { alert('That file is not an answer file.'); return; }
  importFile(j);
};
function importFile(j) {
  if (!j || !Array.isArray(j.answers)) { alert('That file is not an answer file.'); return; }
  if (j.round === ROUND) {
    let n = 0; for (const a of j.answers) { const t = TANKS.find(x => x.id === a.id); if (t && !done(t)) { st.answers[a.id] = a; n++; } }
    if (!st.expert && j.expert) st.expert = j.expert; alert('Restored ' + n + ' answer(s) for this round.');
  } else {
    if (!st.carried.some(c => c.round === j.round && c.expert === j.expert && c.made === j.made)) st.carried.push(j);
    alert('Kept the round ' + j.round + ' answers (' + j.answers.length + ' tanks): they go out with this round\\'s export.');
  }
  save(); st.expert && st.at >= 0 ? show() : start();
}
function start() {
  document.getElementById('app').innerHTML = '<div class="start"><div class="card"><h2 style="font-size:17px">Stocking survey, round ' + ROUND + '</h2>' +
    '<p>' + TANKS.length + ' tanks, each described in words (no picture: camera and decor change how full a tank looks). Judge <b>room</b> for the animals: the filter is always strong enough, and the tank is always furnished as the species need, so neither is the limit. Compatibility goes in "keep together". You never see the app\\'s own number. One tank comes up twice on purpose, and two pairs hold the same animals in tanks of the same gallons but another shape.</p>' +
    '<p class="note">' + DEF + '</p>' +
    '<p>Your name or initials (only to tell answer files apart):<br><input type="text" id="who" value="' + esc(st.expert) + '" style="width:260px"></p>' +
    '<p>Answering as:</p><div class="r3" style="margin-bottom:10px">' + KINDS.map(([v, l]) => '<button class="o' + (st.kind === v ? ' on' : '') + '" data-kind="' + v + '">' + l + '</button>').join('') + '</div>' +
    '<p><button class="b go" id="go">' + (st.at >= 0 ? 'Continue' : 'Start') + '</button> <button class="b" data-imp>Import answers</button> <span class="note">(a file you exported before, this round or an earlier one)</span></p></div></div>';
  wire();
  document.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => { st.expert = document.getElementById('who').value.trim(); st.kind = b.dataset.kind; save(); start(); });
  document.getElementById('go').onclick = () => { const w = document.getElementById('who').value.trim(); if (!w || !st.kind) return; st.expert = w; if (st.at < 0) st.at = 0; save(); show(); };
}
// where it swims, so experts see who shares which part of the water (ChatGPT's dogfood note: hatchetfish and honey gouramis share the surface)
const usesTag = s => s.floor >= 1 ? '<span class="tag b">floor + water</span>' : s.floor > 0 ? '<span class="tag b">water + floor, half the time</span>' : '<span class="tag w">' + (s.zone === 'top' ? 'water, near the surface' : 'water column') + '</span>';
const band = (k, a) => '<div class="r3">' + BANDS.map((b, i) => '<button class="o' + (a[k] === i ? ' on' : '') + '" data-set="' + k + '" data-v="' + i + '"><span class="dot" style="background:' + b[0] + '"></span>' + b[1] + '</button>').join('') + '</div>';
const choice = (k, a, opts, cls = 'r3') => '<div class="' + cls + '">' + opts.map(([v, l]) => '<button class="o' + (a[k] === v ? ' on' : '') + '" data-set="' + k + '" data-v="' + esc(v) + '">' + l + '</button>').join('') + '</div>';
// no dropdowns (Nathan 2026-10-23): a screenshot must show every option, so the two non-count answers are buttons on their own line, dashed, picked instead of a number
const countRow = (label, who, k, c) => '<div class="cnt' + (c.status[k] ? ' off' : '') + '">' + label + ' <input type="number" min="0" data-num="' + who + '.' + k + '" value="' + (c[k] ?? '') + '"></div>' +
  '<div class="alt">or, instead of a number:' + [['cant-say', 'Can&#39;t say'], ['no-valid-count', 'No count works as described']].map(([v, l]) => '<button class="o' + (c.status[k] === v ? ' on' : '') + '" data-stb="' + who + '.' + k + '" data-v="' + v + '">' + l + '</button>').join('') + '</div>';
function keep() {
  const t = TANKS[st.at], a = ans(t), num = v => v === '' || v == null ? null : Math.max(0, Math.round(+v));
  for (const el of document.querySelectorAll('[data-num]')) { const [who, k] = el.dataset.num.split('.'); a[who][k] = num(el.value); if (a[who][k] != null) delete a[who].status[k]; }
  const n = document.getElementById('note'); if (n) a.note = n.value;
  a.ms += Date.now() - shownAt; shownAt = Date.now(); save();
}
function show() {
  const i = st.at; if (i >= TANKS.length) return finish();
  const t = TANKS[i], a = ans(t); shownAt = Date.now();
  const sp = id => t.stock.find(s => s.id === id), others = t.stock.filter(s => s.id !== t.focal), floorers = t.stock.filter(s => s.floor > 0), swimmers = t.stock.filter(s => s.floor < 1);
  const keepTxt = list => list.length ? 'Keeping the ' + list.map(s => s.pl.toLowerCase()).join(' and ') + ' as shown: how' : 'How';
  const L = '<div><div class="card"><h2>The tank</h2><table class="k"><tr><td>Size</td><td>' + t.dims.join(' × ') + ' in, ' + t.gal + ' gal (' + t.litres + ' L), full</td></tr>' +
    '<tr><td>Floor</td><td>' + t.dims[0] + ' × ' + t.dims[1] + ' in = ' + t.floorSqIn + ' sq in</td></tr>' +
    '<tr><td>Filter</td><td>Canister rated for twice this tank, weekly 30 % changes: <b>never the limit</b></td></tr><tr><td>Decor</td><td>Furnished as these species need (plants, cover, sight breaks): <b>never the limit</b></td></tr></table></div>' +
    '<div class="card" style="margin-top:10px"><h2>The animals (adults)</h2><table><tr><th>count</th><th>species</th><th>adult</th><th>uses</th></tr>' +
    t.stock.map(s => '<tr><td>' + s.n + '</td><td>' + esc(s.name) + '</td><td>' + s.cm + ' cm</td><td>' + usesTag(s) + '</td></tr>').join('') + '</table>' +
    '<p class="note" style="margin:6px 0 0">"Uses" is how the app counts each animal. ' + DEF + '</p></div></div>';
  let M = '<div class="card"><p class="sec">Room, as shown</p>';
  if (floorers.length) M += '<div class="q"><h3>Floor room for the bottom dwellers</h3><div class="sub">' + floorers.map(s => esc(s.pl) + (s.floor < 1 ? ' (half the time)' : '')).join(', ') + '</div>' + band('floor', a) + '</div>';
  if (swimmers.length) M += '<div class="q"><h3>Water column room for the swimmers</h3><div class="sub">' + swimmers.map(s => esc(s.pl)).join(', ') + '</div>' + band('water', a) + '</div>';
  M += '<div class="q"><h3>Overall room, as shown</h3><div class="sub">Room only: compatibility goes in "keep together", habitat in "what limits"</div>' + band('overall', a) + '</div>';
  M += '<div class="q"><h3>What limits this tank\\'s room first?</h3>' + choice('limits', a, [...t.stock.map(s => [s.id, esc(s.pl)]), ['not-room', 'Not room: habitat or compatibility decides it']], 'r2') + '</div>';
  M += '<div class="q"><h3>Is the tank big enough for each species at all?</h3><table class="yn">' + t.stock.map(s => '<tr><td>' + esc(s.name) + '</td><td><div class="r2" style="width:120px">' +
    [[true, 'yes'], [false, 'no']].map(([v, l]) => '<button class="o' + (a.bigEnough[s.id] === v ? ' on' : '') + '" data-big="' + s.id + '" data-v="' + v + '">' + l + '</button>').join('') + '</div></td></tr>').join('') + '</table></div></div>';
  let R = '<div class="card"><p class="sec">Counts</p><div class="q"><h3>' + esc(keepTxt(others)) + ' many ' + esc(sp(t.focal).pl.toLowerCase()) + '?</h3>' +
    countRow('ideal', 'focal', 'ideal', a.focal) + (t.noLimit ? '' : '<div style="margin-top:8px">' + countRow('at most', 'focal', 'limit', a.focal) + '</div>') + '</div>';
  if (a.mate) R += '<div class="q"><h3>' + esc(keepTxt(t.stock.filter(s => s.id !== t.mate))) + ' many ' + esc(sp(t.mate).pl.toLowerCase()) + ' would be ideal?</h3>' + countRow('ideal', 'mate', 'ideal', a.mate) + '</div>';
  R += '<p class="sec">About your answers</p>';
  if (t.mixed) R += '<div class="q"><h3>Would you keep these species together long term?</h3>' + choice('together', a, [['yes', 'Yes'], ['caution', 'With caution'], ['no', 'No']]) + '</div>';
  R += '<div class="q"><h3>How sure are you of the counts?</h3>' + choice('confidence', a, [[0, 'Low'], [1, 'Medium'], [2, 'High']]) + '</div>';
  R += '<div class="q"><h3>In a bare tank (no plants or cover), your counts would be</h3>' + choice('bare', a, [[0, 'The same'], [1, 'A little lower'], [2, 'A lot lower']]) + '</div>';
  R += '<div class="q"><h3>Note (optional)</h3><textarea id="note">' + esc(a.note) + '</textarea></div><div id="miss" class="miss"></div><nav><button class="b" id="back"' + (i ? '' : ' disabled') + '>← Back</button><button class="b go" id="next">Next →</button></nav></div>';
  const K = st.kind ? '' : '<div class="card" style="margin:10px 0 0"><h3>Answering as</h3><div class="r3">' + KINDS.map(([v, l]) => '<button class="o" data-kind="' + v + '">' + l + '</button>').join('') + '</div></div>';
  document.getElementById('app').innerHTML = head(i) + K + '<main>' + L + M + R + '</main>';
  wire();
  const typed = v => /^\\d+$/.test(v) ? +v : v;
  document.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { keep(); a[b.dataset.set] = typed(b.dataset.v); save(); show(); });
  document.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => { keep(); st.kind = b.dataset.kind; save(); show(); });
  document.querySelectorAll('[data-stb]').forEach(b => b.onclick = () => { keep(); const [who, k] = b.dataset.stb.split('.'), c = a[who]; if (c.status[k] === b.dataset.v) delete c.status[k]; else { c.status[k] = b.dataset.v; c[k] = null; } save(); show(); });
  document.querySelectorAll('[data-big]').forEach(b => b.onclick = () => { keep(); a.bigEnough[b.dataset.big] = b.dataset.v === 'true'; save(); show(); });
  document.getElementById('back').onclick = () => { keep(); st.at = Math.max(0, i - 1); save(); show(); };
  document.getElementById('next').onclick = () => { keep();
    const m = document.getElementById('miss');
    if (a.focal.ideal != null && a.focal.limit != null && a.focal.limit < a.focal.ideal) { m.textContent = 'The "at most" count is below the ideal: please check the two counts.'; return; }
    if (!st.kind) { m.textContent = 'Please pick who you are answering as (top of the page).'; return; }
    if (!done(t)) { m.textContent = 'Still to answer: ' + missing(t).join(', ') + ' (for a count, a number or one of the buttons under it).'; return; }
    st.at = i + 1; save(); show(); };
}
function finish() {
  const open = TANKS.map((t, i) => done(t) ? null : i).filter(x => x !== null);
  document.getElementById('app').innerHTML = head(TANKS.length) + '<div class="start"><div class="card"><h2 style="font-size:17px">Thank you</h2>' +
    (open.length ? '<p class="miss">' + open.length + ' tank(s) still open: ' + open.map(i => '<a href="#" data-go="' + i + '">' + (i + 1) + '</a>').join(', ') + '</p>' : '<p>All ' + TANKS.length + ' tanks answered.</p>') +
    '<p>Click <b>Export answers</b> and send the downloaded file back. Your answers also stay saved in this browser.</p><button class="b go" data-exp>Export answers</button> <button class="b" id="back">← Back</button></div></div>';
  wire();
  document.querySelectorAll('[data-go]').forEach(x => x.onclick = e => { e.preventDefault(); st.at = +x.dataset.go; save(); show(); });
  document.getElementById('back').onclick = () => { st.at = TANKS.length - 1; save(); show(); };
}
function exportAnswers() {
  const body = { round: ROUND, survey: 2, picture: false, expert: st.expert, expertKind: st.kind, made: new Date().toISOString(), answers: TANKS.map(t => st.answers[t.id]).filter(Boolean), carried: st.carried };
  const url = URL.createObjectURL(new Blob([JSON.stringify(body, null, 1)], { type: 'application/json' })), el = document.createElement('a');
  el.href = url; el.download = 'round-' + ROUND + '-' + (st.expert || 'expert').replace(/[^A-Za-z0-9_-]+/g, '_') + '.json'; document.body.appendChild(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
st.expert && st.at >= 0 ? show() : start();
</script></body></html>
`;
writeFileSync(out, html);
console.log(`wrote ${out}: ${tanks.length} tanks, ${(html.length / 1e3).toFixed(0)} kB`);
