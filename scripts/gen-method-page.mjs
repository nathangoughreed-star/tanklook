// Lane HV unit 2: writes public/how-we-calculate.html, the static "How we calculate" page, from research/source-baseline.json (the value counts) and the
// engine's published constants (kept in step by test/hvMethodPage.test.ts, which regenerates this page in memory and compares it with the file).
// Run: node scripts/gen-method-page.mjs      Test: npx vitest run test/hvMethodPage.test.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ENGINE = { schoolRef: 10, schoolExp: 0.72, idealMax: 75, tinyExpert: 0.8, tinyGrams: 2, fitMedianRatio: 1.01, fitCases: 31, fitHigher: 8, fitLower: 11, fitWithin: 12, noRedAudited: false, expertLists: 37, expertMedianPct: 74 };
// the worked example (test/hvMethodPage.test.ts re-runs the engine and asserts these)
export const EXAMPLE = { tank: '36 × 18 × 16 in, 44.9 gal', ten: 27, forty: 73, fortyCountsAs: 27, aqTen: 29 };

const n = x => x.toLocaleString('en-US');
const pct = (x, tot) => `${Math.round(x / tot * 100)}%`;
export function methodPageHtml(baseline) {
  const b = baseline.byStatus, t = baseline.total;
  const sourced = b.cited, estimated = b.derived + b.fitted + b.researched, judgment = b.claimed + b.assumption + b.unsourced;
  const E = ENGINE, X = EXAMPLE;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>How we calculate · TankLook</title>
<meta name="description" content="How TankLook checks a tank: fixed rules, the room-used number in plain words, and how sure we are of each rule.">
<style>
:root { --bg: #fbfaf7; --fg: #1d2330; --dim: #5d6676; --line: #ddd8cc; --card: #fff; --ok: #1f7a4d; --warn: #9a5b00; --accent: #1b5fb4; }
@media (prefers-color-scheme: dark) { :root { --bg: #15181f; --fg: #e8eaf0; --dim: #9aa3b5; --line: #2c3240; --card: #1c2029; --ok: #5ccf97; --warn: #f0b24a; --accent: #7aa7ff; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 42rem; margin: 0 auto; padding: 24px 16px 64px; }
h1 { font-size: 1.7rem; line-height: 1.2; margin: 8px 0 4px; } h2 { font-size: 1.2rem; margin: 2rem 0 .4rem; } h3 { font-size: 1rem; margin: 1.2rem 0 .2rem; }
p, li { max-width: 40rem; } .dim { color: var(--dim); } a { color: var(--accent); }
.claim { background: var(--card); border: 1px solid var(--line); border-left: 4px solid var(--accent); padding: 12px 14px; border-radius: 6px; margin: 16px 0; }
.meter { position: relative; height: 8px; border-radius: 4px; background: var(--line); margin: 14px 0 4px; }
.meter i { position: absolute; inset: 0 auto 0 0; background: var(--ok); border-radius: 4px; }
.meter s { position: absolute; left: 75%; top: -4px; bottom: -4px; width: 2px; background: var(--dim); }
.zones { display: flex; justify-content: space-between; font-size: .8rem; color: var(--dim); }
table { border-collapse: collapse; width: 100%; margin: .6rem 0; font-size: .95rem; } th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: top; } td.num, th.num { text-align: right; white-space: nowrap; }
.tbl { overflow-x: auto; }
footer { margin-top: 3rem; font-size: .85rem; color: var(--dim); }
</style>
</head>
<body>
<main>
<p class="dim"><a href="./">← Back to TankLook</a></p>
<h1>How we calculate</h1>
<p class="dim">What the Habitat check does, in plain words, and how sure we are of each part.</p>

<div class="claim"><b>Calculated by fixed rules; no AI model runs when you use TankLook; sources were gathered with AI assistance.</b>
The same tank gives the same answer every time, and every line the check shows comes from a rule you can read here. The rules and their numbers were collected from published care guides and stocking lists, and an AI model helped gather and sort those sources. We do not claim the rules were reviewed by a panel of experts.</div>

<h2>What the check looks at</h2>
<ul>
<li><b>Tank minimums:</b> the smallest tank each animal is kept in, from the sources we found.</li>
<li><b>Social needs:</b> group size, the mix of males and females, pairs.</li>
<li><b>Environment:</b> temperature, water chemistry, cover, lid, and the gear the animals need: a heater and a filter.</li>
<li><b>Behavior:</b> who eats, nips or fights whom.</li>
<li><b>Spatial fullness:</b> how much of the room is used, below.</li>
</ul>
<p>The verdict word (Compatible, Caution, Problem) is the worst of the checks that ran. A check that could not run, because an input is missing, is shown as <i>not checked</i> and never turns the verdict grey. A heater or filter the animals need but the tank does not have is a Caution with a Fix it button; it is never shown as green.</p>

<h2>Room used</h2>
<p>One number, labelled for what it is: how much of the tank's swimming room (or floor, for bottom dwellers) the animals use. It is <b>not</b> the verdict and it does not include filtration, temperature or behavior, which are checked separately.</p>
<div class="meter" aria-hidden="true"><i style="width:${X.ten}%"></i><s></s></div>
<div class="zones" aria-hidden="true"><span>Comfortable (under ${E.idealMax}%)</span><span>Full · Over past 100%</span></div>
<ol>
<li>Each animal takes room by its body size: bigger and more active animals need more. Body size comes from published length and weight data.</li>
<li>Schooling fish share room. Up to ${E.schoolRef} animals each count in full. Past ${E.schoolRef}, every extra animal adds less: n animals count as ${E.schoolRef} × (n ÷ ${E.schoolRef})<sup>${E.schoolExp}</sup>.</li>
<li>Taller water gives swimmers more room, with diminishing returns. Bottom dwellers are judged by floor area instead.</li>
<li>The total is divided by the room the tank has. ${E.idealMax}% is where experienced keepers tend to stop, 100% is the limit.</li>
</ol>
<p>The constants were fitted to ${E.fitCases} AqAdvisor answers (our number divided by theirs has a middle value of ${E.fitMedianRatio}), then animals under ${E.tinyGrams} g were eased to ${Math.round(E.tinyExpert * 100)}% of that room so that ${E.expertLists} published expert stocking lists read about ${E.expertMedianPct}% at their stated maximum. That is a judgment, and it is tagged as one below.</p>

<h3>Worked example: 10 cardinal tetras in a 40 gallon breeder</h3>
<div class="tbl"><table>
<tr><th>Tank</th><td>${X.tank}</td></tr>
<tr><th>10 cardinal tetras</th><td><b>Room used ${X.ten}%</b>, Comfortable. AqAdvisor reads <b>${X.aqTen}%</b> for the same tank.</td></tr>
<tr><th>40 cardinal tetras</th><td>Room used ${X.forty}%: the 40 count as ${X.fortyCountsAs} for room, so they read about 2.7 times the 10, not 4 times.</td></tr>
</table></div>
<p>On common cases we land close to AqAdvisor. We do not claim to be looser or stricter than other calculators; they use different data and on some tanks they read higher or lower than we do. What we add is that we show the working: what is counted, how much it counts as, and how many more of the same animal fit before 75% and 100%.</p>
<p>The same 10 cardinals with no heater are a <b>Caution</b>, not green: cardinals want 73–84 °F and a room-temperature tank would sit near 70 °F. Room used says nothing about that; the Environment check does.</p>

<h2>How sure we are of each rule</h2>
<p>Every number and rule behind the check carries a label for where it came from. Across ${n(t)} recorded values:</p>
<div class="tbl"><table>
<tr><th>Label</th><th class="num">Values</th><th class="num">Share</th><th>What it means</th></tr>
<tr><td><b>Sourced</b></td><td class="num">${n(sourced)}</td><td class="num">${pct(sourced, t)}</td><td>A published page states it, and we name the page.</td></tr>
<tr><td><b>Estimated</b></td><td class="num">${n(estimated)}</td><td class="num">${pct(estimated, t)}</td><td>A sourced number run through our formula, fitted to published lists, or a page that states a figure without its conditions.</td></tr>
<tr><td><b>Our judgment</b></td><td class="num">${n(judgment)}</td><td class="num">${pct(judgment, t)}</td><td>Our reading of a source, an assumption, or no source yet.</td></tr>
</table></div>
${E.noRedAudited ? '<p>A rule that rests only on our judgment is shown as a Caution at most, never as a red Problem. Every rule has been checked against that.</p>' : '<p>A line that raises a red Problem must rest on sourced or fitted data. Where the rule behind it rests on our judgment alone, it is shown as a Caution instead. This is checked, for every pair of animals in the catalogue, for the rules about who eats or harasses whom, aggression, water chemistry, tank minimums and terrarium air ranges. A heater or filter that is simply not chosen yet, and a rule that depends on something we cannot see (the sex of your animals, a room temperature you did not enter), are Cautions too. Two kinds of red line are not yet audited: the open-top lid rule and the nitrate water-change line. This page will say so plainly when that is finished.</p>'}
<p>A rule that depends on something we cannot see, such as the sex of your animals or your room temperature, says what it depends on, and stays a Caution until you state it.</p>

<h2>What it does not do</h2>
<ul>
<li>It does not measure your water. Temperatures are expected from the heater and the room you enter (70 °F is assumed if you do not), never measured.</li>
<li>It does not count feeding, water-change habits or how long the tank has run, except where a line says so.</li>
<li>It is a guide, not a promise. On the ${E.fitCases} AqAdvisor tanks we compared against, our room number was more than 10% above theirs on ${E.fitHigher}, more than 10% below on ${E.fitLower}, and within 10% on ${E.fitWithin}. Treat Caution as a reason to read the line, and ask a keeper you trust.</li>
</ul>

<footer>Counts on this page are generated from the project's source audit (${n(t)} values). TankLook is a personal learning project; prices and stock lists are guides, not offers.</footer>
</main>
</body>
</html>
`;
}

const here = dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const baseline = JSON.parse(readFileSync(join(here, '..', 'research', 'source-baseline.json'), 'utf8'));
  writeFileSync(join(here, '..', 'public', 'how-we-calculate.html'), methodPageHtml(baseline));
  console.log('wrote public/how-we-calculate.html');
}
