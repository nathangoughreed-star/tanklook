// PAR guide (Nathan 2026-10-14): a reference chart opened from the Lighting menu. What PAR is, the usual levels for
// planted tanks and for reefs, what grows at each, and whether CO2 / fertiliser (fresh) or dosing (reef) goes with it.
// Self-contained: builds its own dialog and styles, so the only hooks are a button in index.html and one call in main.ts.

interface Tier { par: string; lo: number; hi: number; name: string; rows: [string, string][] }

const FRESH: Tier[] = [
  { par: 'under 15', lo: 0, hi: 15, name: 'Very low', rows: [
    ['Grows', 'Anubias, Java fern, Bucephalandra, Java moss, marimo balls, floating plants near the surface'],
    ['Struggles', 'Almost all stem plants, any carpet; red plants stay green or brown'],
    ['CO2', 'No'],
    ['Fertiliser', 'Very little: fish waste is often enough; an occasional dose of an all-in-one liquid'],
  ] },
  { par: '15–30', lo: 15, hi: 30, name: 'Low', rows: [
    ['Grows', 'The above, plus Cryptocoryne, Amazon sword, Vallisneria, Sagittaria, water sprite, Hygrophila, Ludwigia repens, Rotala rotundifolia (green, slow)'],
    ['Struggles', 'Carpets (Monte Carlo, HC Cuba) thin out or melt; reds stay pale'],
    ['CO2', 'Not needed. A liquid carbon product is optional'],
    ['Fertiliser', 'Lean all-in-one liquid weekly; root tabs under swords and crypts'],
  ] },
  { par: '30–50', lo: 30, hi: 50, name: 'Medium', rows: [
    ['Grows', 'Most stem plants grow well; red tints start (Ludwigia, Rotala); dwarf hairgrass and Monte Carlo spread slowly'],
    ['Struggles', 'Deep reds and dense carpets without CO2; algae if nutrients run short'],
    ['CO2', 'Recommended. Without it, keep the light on 6–7 h a day and dose lightly'],
    ['Fertiliser', 'Full liquid dosing (macro + micro) several times a week, plus root tabs'],
  ] },
  { par: '50–80', lo: 50, hi: 80, name: 'High', rows: [
    ['Grows', 'Carpets (HC Cuba, Monte Carlo, Glossostigma), deep reds (Rotala macrandra, Alternanthera reineckii), fast compact growth'],
    ['Struggles', 'Shade plants: Anubias and Java fern collect algae on their leaves unless shaded'],
    ['CO2', 'Required: injected, about 30 ppm (drop checker lime green)'],
    ['Fertiliser', 'Heavy: full macro + micro dosing (e.g. EI), weekly big water changes, frequent trimming'],
  ] },
  { par: '80+', lo: 80, hi: 150, name: 'Very high', rows: [
    ['Grows', 'Competition / Dutch style; the most demanding species, grown fast and dense'],
    ['Struggles', 'Any imbalance shows as algae within days; more light than most plants can use'],
    ['CO2', 'Essential, closely controlled'],
    ['Fertiliser', 'Heavy and exact; most hobbyists never need this level'],
  ] },
];

const REEF: Tier[] = [
  { par: '25–50', lo: 25, hi: 50, name: 'Fish only', rows: [
    ['Keeps', 'Fish only or fish with live rock (FOWLR); light just for viewing and for the coralline algae on the rock'],
    ['Dosing', 'None beyond water changes'],
  ] },
  { par: '50–150', lo: 50, hi: 150, name: 'Soft corals', rows: [
    ['Keeps', 'Mushrooms and Ricordea (low end, 50–100), zoanthids, leathers, Kenya tree, green star polyps'],
    ['Struggles', 'Mushrooms bleach or shrink under strong light; give them the shaded spots'],
    ['Dosing', 'Little: water changes usually hold calcium and alkalinity; spot-feed some'],
  ] },
  { par: '75–150', lo: 75, hi: 150, name: 'LPS', rows: [
    ['Keeps', 'Hammer, torch and frogspawn, brains, Duncan, Acan, chalices (some take up to 200)'],
    ['Struggles', 'Too much light shows as bleaching or tissue pulling back; place low or mid-rock'],
    ['Dosing', 'Calcium, alkalinity and magnesium tested weekly, dosed as needed; regular feeding'],
  ] },
  { par: '150–400', lo: 150, hi: 400, name: 'SPS and clams', rows: [
    ['Keeps', 'Montipora (150–250), Acropora (250–400+), maxima and crocea clams (300+); derasa and squamosa clams from 150'],
    ['Struggles', 'Unstable water: SPS need steady parameters more than any light level'],
    ['Dosing', 'Daily: two-part or a calcium reactor; strict alkalinity stability; nitrate and phosphate low but not zero'],
  ] },
];

const ABOUT = `<p><b>PAR</b> is the light plants and corals can use: the photons between 400 and 700 nm landing on a
square metre each second (µmol/m²/s). It is not the same as brightness. Lux counts what the eye sees, mostly green and
yellow, so a blue reef light can look dim and still deliver high PAR.</p>
<p>The numbers below are PAR <b>where it matters</b>: at the substrate for plants, at the coral for a reef. PAR falls
fast with distance, so the top of a tall tank can get 3–4x what the bottom gets.</p>`;

const FRESH_NOTE = `<p class="hint"><b>Light, CO2 and nutrients have to match.</b> More light raises the plants'
demand for the other two; whichever runs short limits growth, and algae use the light the plants cannot. If in doubt,
less light is easier. Run the lights 6–8 hours a day; longer mostly grows algae.</p>`;
const REEF_NOTE = `<p class="hint"><b>Bring new corals up slowly.</b> A coral used to a dimmer tank bleaches under
sudden strong light: start it low in the rock or with the light at about half, and raise it over 2–4 weeks. Run the
lights 8–10 hours a day, with a ramp up and down.</p>`;

const STYLE = `
.parDlg { width: min(720px, calc(100vw - 32px)) }
.parDlg .libhead { position: sticky; top: -12px; background: var(--panel); z-index: 1 }
.parTabs { display: flex; gap: 6px; margin: 4px 0 8px }
.parTabs button[aria-selected="true"] { background: var(--accent); color: #fff; border-color: var(--accent) }
.parScale { position: relative; height: 34px; margin: 6px 0 14px }
.parScale .seg { position: absolute; top: 0; height: 16px; border-radius: 3px; display: flex; align-items: center;
  justify-content: center; padding: 0 3px; box-sizing: border-box; font-size: 10.5px; color: #fff; overflow: hidden; white-space: nowrap; text-overflow: ellipsis }
.parScale .tick { position: absolute; top: 19px; font-size: 10.5px; color: var(--muted); transform: translateX(-50%) }
.parTier { border: 1px solid var(--line); border-left-width: 5px; border-radius: 6px; padding: 6px 10px; margin: 0 0 8px }
.parTier h4 { margin: 0 0 4px; font-size: 13px }
.parTier h4 span { font-weight: normal; color: var(--muted) }
.parTier dl { display: grid; grid-template-columns: 6.5em 1fr; gap: 2px 8px; margin: 0; font-size: 12px }
.parTier dt { color: var(--muted) }
.parTier dd { margin: 0 }
@media (max-width: 480px) { .parTier dl { grid-template-columns: 1fr } .parTier dd { margin-bottom: 4px } }
`;

// green ramp for plants, blue ramp for reef: readable white text on each in both themes
const FRESH_COL = ['#5f7f5a', '#4c8a3f', '#2f8f3a', '#1f7a4a', '#145c4a'];
const REEF_COL = ['#5a6f8a', '#3f6fb0', '#2b5fc8', '#3a3fb8'];

function scale(tiers: Tier[], cols: string[], max: number, ticks: number[]) {
  // a square-root scale, so the low tiers (where most planted tanks sit) are wide enough to read
  const x = (v: number) => (Math.sqrt(Math.min(v, max) / max) * 100).toFixed(2) + '%';
  const segs = tiers.map((t, i) => `<div class="seg" style="left:${x(t.lo)};width:calc(${x(t.hi)} - ${x(t.lo)} - 2px);background:${cols[i]}" title="${t.name}: ${t.par} µmol">${t.name}</div>`);
  const tick = ticks.map(v => `<span class="tick" style="left:${x(v)}">${v}</span>`);
  return `<div class="parScale">${segs.join('')}${tick.join('')}</div>`;
}

function tierCards(tiers: Tier[], cols: string[]) {
  return tiers.map((t, i) => `<div class="parTier" style="border-left-color:${cols[i]}"><h4>${t.name} <span>· ${t.par} µmol PAR</span></h4><dl>${
    t.rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></div>`).join('');
}

/** Wires the Lighting menu's "PAR guide" button; `isSalt` picks which tab opens first. */
export function attachParGuide(isSalt: () => boolean) {
  const btn = document.getElementById('lParGuide');
  if (!btn) return;
  const css = document.createElement('style'); css.textContent = STYLE; document.head.append(css);
  const dlg = document.createElement('dialog');
  dlg.className = 'libdlg parDlg'; dlg.setAttribute('aria-labelledby', 'parTitle');
  // the reef scale skips the overlapping soft/LPS split: soft corals' bar runs 50–75, LPS from 75 (cards give the full ranges)
  const reefBars = REEF.map((t, i) => (i === 1 ? { ...t, hi: 75 } : t));
  dlg.innerHTML = `<form method="dialog" class="libhead"><h2 id="parTitle">PAR guide</h2><button value="close" aria-label="Close">✕</button></form>
    ${ABOUT}
    <div class="parTabs" role="tablist"><button type="button" role="tab" data-t="fresh">Planted freshwater</button><button type="button" role="tab" data-t="reef">Reef (saltwater)</button></div>
    <div data-p="fresh">${scale(FRESH, FRESH_COL, 150, [0, 15, 30, 50, 80, 150])}${tierCards(FRESH, FRESH_COL)}${FRESH_NOTE}</div>
    <div data-p="reef">${scale(reefBars, REEF_COL, 400, [0, 25, 50, 75, 150, 250, 400])}${tierCards(REEF, REEF_COL)}${REEF_NOTE}</div>
    <p class="hint">Typical hobby ranges, not hard limits: species, CO2 and flow shift them. To know your own tank's PAR,
    use a PAR meter or your light maker's PAR-at-depth chart.</p>`;
  document.body.append(dlg);
  const show = (t: string) => {
    dlg.querySelectorAll<HTMLButtonElement>('[data-t]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === t)));
    dlg.querySelectorAll<HTMLElement>('[data-p]').forEach(p => { p.hidden = p.dataset.p !== t; });
  };
  dlg.querySelectorAll<HTMLButtonElement>('[data-t]').forEach(b => { b.onclick = () => show(b.dataset.t!); });
  btn.onclick = () => { show(isSalt() ? 'reef' : 'fresh'); dlg.showModal(); dlg.scrollTop = 0; };
}
