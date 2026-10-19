# Plan: guided start, tank and kit catalogs (draft, 2026-10-19)

Status: DRAFT for discussion. Nothing built. Decisions below are Nathan's, from the 2026-10-19 chat.

## Goal
Work out what the user wants and how close they are to it, then bridge them over what remains.
Gate what makes a tank fail; leave everything cosmetic free.

## Decisions so far
- Kit = hard constraint (fixes tank and light). Upgrading is always possible; the tool prices it and says plainly when it means replacing nearly everything.
- Light: find type (LED, tube) and wattage; estimate level from those plus tank depth; label "estimated"; user can override. Filter and heater are assumed adequate (class only, no exact models; may refine the render later).
- Prices: hand-edited JSON, shown "as of <date>", with a "check current price" link. The user knows they are estimates.
- Styles are shown, not described: representative tiles, several generated examples per style, gated by cost and maintenance.
- Tank picker: toggle Bare tanks / Kits, grouped by size band (under 15 gal, 15-40, 40-75, 75+, ...).
- Tank catalog: real outer dimensions; kits reference a tank by id. Shapes bow/corner/hex/cube/cylinder already render.
- AI layer: last, optional, deterministic gates stay the source of truth.
- Left sidebar revamp (windows and submenus): acknowledged, separate track. The start wizard is its own window, so it does not wait on the revamp.
- First release = tank catalog + kit catalog + light estimate + start wizard feeding the existing editor.

## Front door (stage detection)
Three entries, one question: "Where are you?"
1. **New / curious.** Real beginner-friendly setups, rendered. Strict gates on what causes failure (stock level, size vs species, light vs plants, cycling, heater); free choice of gravel colour, hardscape layout, background colour; plants and animals free within the gate.
2. **I have a tank or gear.** Pick a kit or bare tank (size bands), then equipment QA and "what can I do with this" (later phase).
3. **I know what I want.** Straight into today's editor to visualise a scape change; gates advisory, not blocking.
Gate strictness is a mode (Guided / Free) set by the stage, switchable at any time.

## Lanes (parallel, one coordinator)
- **L0 Audit** (small): read lightneeds / lightcheck / lightout / plantfit / defaults; write the tank, kit and light-spec schema. Gates everything else.
- **A Tank catalog**: ~45 tanks, nano to monster; check script (name gallons vs computed volume). Replaces TANK_PRESETS.
- **B Kit catalog** (research): ~25 kits, 4-5 brands, cheap to plant/reef-focused. Tank id, light type and wattage, price + as-of date, source link.
- **C Light estimator**: type + wattage + depth -> low/med/high, "estimated" flag, override; feeds the existing light gate.
- **D Start wizard**: stage question, bare/kit toggle with size bands, upgrade-path summary. Needs A, B, C schema.
- **E Beginner setups and gate mode**: curated rendered beginner tanks; Guided vs Free gate strictness.
- **F Style tiles**: per-style tiles with several seeded examples, filtered by cost and maintenance.
- **Later**: G costs and budget (one-time vs recurring), H existing-equipment QA, I sidebar revamp (design first), J AI layer.

## Order
L0 -> (A, B, C in parallel) -> D -> (E, F in parallel). G, H, I, J after the first release.

## Demand profile (idea under discussion, 2026-10-19)
Replace a single "beginner" notion with several demand axes (money upfront, money ongoing, weekly time/work, know-how, risk of failure). Each item in the build contributes to them; the user sets a tolerance per axis (beginner = a preset of tolerances); a breakdown shows what drives each axis and what swap lowers it. Failure-causing rules stay hard gates; tolerances only warn. Money buys down effort and risk (bigger tank, better gear, hardy plants). Skip button: returning users go straight to building.

Update 2026-10-19 (Nathan): consolidate to 2-3 categories; they are global live values, always visible in an existing collapsible panel on the main viewing screen; the user can gate any of them ("under $200 setup, upkeep near free, 30 min a week - build me a tank I'll love"). Proposed: Money (setup $ and upkeep $/month, two gates), Time (minutes/week), Risk (failure chance for the user's declared experience; absorbs know-how). Shuffle/Quick Setup should respect the limits.

Decisions 2026-10-19 (Nathan): time = weekly average including everything (even yearly jobs). Risk is relative to declared experience, kept PER DOMAIN (freshwater fish, planted, saltwater, probably terrarium), since skills do not transfer fully. User declares a water source (tap / well / bought RO / own RO) and electricity rate; upkeep is computed from kit wattage x hours plus per-item consumables.

## Locked 2026-10-19
- Money limit: a single "$X" = setup only; upkeep is a separate optional chip (near free / low / flexible) mapped to $/month.
- Skill domains: fundamentals (shared) + freshwater fish, planted, saltwater, terrarium.
- Scope: freshwater (and existing terrarium) first; saltwater/reef follows, but the data model carries a saltwater multiplier from day one.
- Care-tier slider stays as a shortcut that sets all limits at once.
- Added lane K (demand model: per-item $, upkeep, minutes, risk by domain; live calc; collapsible panel with three bars; Shuffle respects limits). It shares item data with the kit/tank catalogs, so L0 designs them together.

## Open
- Nothing blocking; next step is the L0 audit (schema for tanks, kits, light spec, per-item demand data).
- Kit research cost: measure one brand first, quote per-kit cost before fanning out.

---

# L0 audit and schema (2026-10-19)

Read: lightneeds, lightcheck, lightout (tech table, wattsOf), plantfit, growtime, data/care, types (Tank, LightSettings, TankSetup),
setupsheet/weight/water headers. No code changed.

## What already exists (reuse, do not rebuild)
- **Light model.** `LightSettings` = `type` (flat/spot/tube/led), `tech` (13 lamp types: led-white, led-planted, led-reef, t5-refl,
  t5-bare, t8, t12, led-tube, cfl, led-bulb, halogen, mh, mh-20k), `count`, `watts`, optional `par` ("measured or published PAR;
  set, the estimate is scaled to match"). PAR is computed from watts x photon efficacy (ppe) x fixture loss (eta) through the tank
  geometry; each tech carries an uncertainty (LED +-30 %, the rest +-50 %). **So "type + wattage -> estimated PAR, user can override"
  is already built: a kit only has to fill `type`, `tech`, `count`, `watts` (and `par` when a manufacturer publishes it).**
  `wattsOf()` is the one watts reader (tubes take W from the lamps, pendants from bulbW, LED bars default to ~1 W/inch if unset).
- **Light tiers and plant needs.** `FRESH_TIERS` (Very low .. Very high), `NEEDS[variant]` = band + co2 + ferts demand (+ own PAR
  range), `minPar`, `outcomeOf` -> thrive / ok / struggle with severity. `FIT_PAR` maps the three wizard levels (low/medium/high)
  to 25/40/65 PAR fresh, 75/110/250 reef. `plantfit.fitItems` already swaps unsuitable plants for ones that fit.
- **Care.** Plants/corals: `GrowFeed` low / ferts / co2 (the "care tier"). Animals: `CARE[id]` = care 1-3 (Beginner/Intermediate/Expert),
  minL, temper 0-2, temp range, prey, solo/fam, slow, nip. Plants have NO expertise number; difficulty is derivable from NEEDS
  (co2 required = hard, band high = hard, floaters/epiphytes = easy).
- **Growth speed.** `PLANT3D[].grow.speed` slow/medium/fast gives trimming effort.
- **Geometry.** `Tank` = interior L/H/D in mm, shape rect/bow/round/poly/bowl/pie (+ sides, bowMin, pieDeg...); `volume()` (litres,
  gallons), `glassThickness()`, `tankWeight()`; `lid` open/glass/hood/mesh; `stand`; `water.salt` (the only salt/fresh flag).
- **Setup sheet** (`scene/setupsheet.ts`) is already a pure-data shopping list built from the scene. It has NO prices: the natural
  home for the cost table and totals.
- **Tank presets** are `TANK_PRESETS` in `scene/defaults.ts:56`: 9 aquaria + 10 terrariums as [label, L, H, D] in inches.

## Gaps
1. No price, upkeep, minutes or risk data anywhere. 2. No equipment items (heater, filter, CO2, salt mix, RO) beyond the light and lid.
3. No plant expertise level. 4. No notion of kit, water source, electricity rate, user experience or limits. 5. Catalog dimensions:
`Tank` is INTERIOR mm with glass added outside, and `glassThickness()` is derived from interior height, so storing only outer
dimensions is circular. The catalog must store outer dims + glass mm + (derived) interior, and a check script must round-trip them.

## Schema (TypeScript sketch; data files under src/data/, JSON + typed loader like species.json)

```ts
// tanks.json
interface TankModel {
  id: string;                     // 'g29', 'g40b', 'bow72'
  name: string;                   // '29 gallon', '40 breeder', '72 bowfront'
  ratedGal: number;               // what the label says; check script compares to computed volume
  shape: TankShape; sides?: number; bowMin?: number; pieDeg?: number;
  outer: { L: number; H: number; D: number };   // mm, as sold (glass included)
  glassMm: number;                // measured/typical thickness; replaces the auto value
  rimless?: boolean;
  band: 'nano' | 'small' | 'mid' | 'large' | 'monster';   // picker groups: <15 / 15-40 / 40-75 / 75+ gal
  tags?: string[];                // 'desktop', 'cube', 'corner'
  note?: string;
}
// kits.json
interface KitModel {
  id: string; brand: string; name: string;
  tank: string;                   // TankModel.id
  water: 'fresh' | 'salt';
  light: { type: LightType; tech: LightTech; count: number; watts: number; par?: number; spec: 'published' | 'listing' | 'guess' };
  lid: LidType; stand?: boolean;
  filter: { kind: 'hob' | 'canister' | 'sponge' | 'internal'; rating?: number; cartridgeNeeded?: boolean };   // class only
  heater?: { watts: number };     // class only; absent = none included
  tier: 'budget' | 'mid' | 'plant' | 'reef';
  price: { usd: number; asOf: string; url: string };
}
// equipment.json (upgrades, replacements, consumables; also what the QA lane inspects later)
interface GearModel {
  id: string; kind: 'light' | 'heater' | 'filter' | 'co2' | 'dosing' | 'chiller' | 'ro' | 'stand' | 'lid';
  name: string; fits?: { minGal?: number; maxGal?: number }; watts?: number; hoursPerDay?: number;
  price: { usd: number; asOf: string; url: string }; lifeMonths?: number;   // replacement, annualised into upkeep
  light?: KitModel['light'];      // when kind = 'light'
  demand: DemandAdd;
}
// ONE demand shape for every contributor (tank, kit, gear, plant, animal, hardscape, consumable)
interface DemandAdd {
  setupUsd?: number;
  upkeepUsdMo?: number;           // consumables only; electricity is computed = watts x hours x rate
  minPerWeek?: number;            // averaged over the year, yearly jobs included
  risk?: number;                  // 0-10, before the user's skill scaling
  riskDomain?: 'fish' | 'planted' | 'salt' | 'terrarium';
}
// user profile (scene or app prefs)
interface UserProfile {
  skill: { fundamentals: 0 | 1 | 2; fish: 0 | 1 | 2; planted: 0 | 1 | 2; salt: 0 | 1 | 2; terrarium: 0 | 1 | 2 };   // new/some/experienced; unset = 0
  waterSource: 'tap' | 'well' | 'bought-ro' | 'own-ro';
  kwhUsd: number;                 // default US average, user can edit
  limits: { setupUsd?: number; upkeep?: 'free' | 'low' | 'flex'; minPerWeek?: number; risk?: 'safe' | 'moderate' | 'any' };
  mode: 'guided' | 'free';
}
```

## How the demand numbers are produced (little new model code)
- **Setup $**: sum of tank/kit/gear/plant/animal/hardscape prices (the setup sheet already enumerates the items).
- **Upkeep $/mo**: electricity (`wattsOf` + gear watts x hours x kWh rate) + consumables (cartridges, ferts, CO2 refills, food,
  conditioner, RO/salt per gallon of water changed) + annualised replacements (lifeMonths) + expected livestock/plant replacement.
  Water changes use `volume()` and the water-source cost per gallon. A saltwater multiplier lives in the data from day one, unused
  until the reef release.
- **Minutes/week**: water change (volume x stocking factor), trimming (sum over plants of growth speed x size), feeding, testing,
  filter cleaning, yearly jobs / 52. Unit rates are data, not code.
- **Risk**: sum of item risk scaled by the user's skill in that item's domain, plus REAL signals the scene already computes: number and
  severity of `outcomeOf` 'struggle' plants, animal-fit warnings (`animalfit`, care level vs skill), tank size vs stocking (small =
  less stable), cycling not done. Scale 0-10 shown as safe / moderate / demanding.
- **Light for kits**: `spec` records how trustworthy the numbers are ('published' PAR, 'listing' wattage only, 'guess' = tier default);
  the panel shows "estimated" unless published.

## Build consequences
- Lane A (tanks): data + typed loader + round-trip check script; migrate TANK_PRESETS to read from it.
- Lane B (kits): research one brand first (cost check), then fan out; fills KitModel including `light`.
- Lane C (light): NOT a new estimator. Wire kit.light into LightSettings, add the "estimated / published" label and a per-kit default
  when wattage is missing. Smaller than planned.
- Lane K (demand): per-item DemandAdd tables, the live calc, the three-bar panel, limits, Shuffle respecting limits.
- Plant expertise: derive from NEEDS (rule table), do not hand-label about 50 plants.

## Open for Nathan
1. Animals already have care 1-3 in `care.ts`; derive plants from NEEDS. OK?
2. Risk 0-10 and the safe / moderate / demanding cut points: propose after lane K reads the data.
3. Which existing collapsible window holds the three-bar panel?

---

## Amendments 2026-10-19 (Nathan)

### Tank dimensions: OUTER is the source of truth
People measure and buy by outer glass dimensions, so the catalog and any custom-tank entry take outer L/H/D. The app's interior `Tank`
is derived once from them: interior L and D = outer minus 2 x glass; interior H = outer H minus the bottom pane. Glass thickness comes
from the catalog entry (no circularity); for a custom tank typed by the user, solve it with a short fixed-point loop on
`glassThickness()` (converges in 2-3 steps). The check script still round-trips outer -> interior -> outer and compares computed gallons
with the rated gallons. Consider letting the custom-tank form take outer dimensions too (today it takes interior).

### Costs are distributions, not numbers
Every contributor carries a range, and the totals are an expected value with bounds.
- Per item: `{ lo, mode, hi }` (triangular, cheap to author). Mean = (lo + mode + hi) / 3; variance =
  (lo^2 + mode^2 + hi^2 - lo*mode - lo*hi - mode*hi) / 18. Applies to setup $, upkeep $/mo and minutes/week.
- Sources of spread: price range across stores and sales; price age (widen the band the older `asOf` is); electricity rate; water
  source; livestock and plant losses (this is where RISK feeds money: higher risk for the user's skill = a fatter upper tail on upkeep
  and on replacement setup cost).
- Totals: sum of means is the expected cost. Variance is NOT a plain sum because items move together (one price level, one electricity
  rate, one loss rate). Use a few shared factors with partial correlation, evaluated by Monte Carlo (about 2000 draws x ~60 items, a few
  ms, run when the tank settles rather than every frame), or analytically with a single correlation rho as the first version.
- Report the 10th-90th percentile ("likely range"), not min and max: "$180 expected, $150-$240 likely".
- Show what drives the spread (each item's share of total variance), next to the existing "what drives it" breakdown, so a user can
  see which choice makes the number uncertain and swap it.
- A limit ("$200 at setup") is checked against a chosen percentile. Default proposal: the 80th percentile, i.e. an 80 % chance of
  staying under budget. Needs Nathan's call.
- Schema change: in `DemandAdd`, `setupUsd`, `upkeepUsdMo` and `minPerWeek` become `Range3 = { lo: number; mode: number; hi: number }`
  (a plain number is allowed and means no spread). Shared factors live in one `factors.json` (price level, kWh rate band, loss rate by
  domain and skill).

### Budget meaning: ask the user (Nathan 2026-10-19)
When the user sets a $ limit (setup or upkeep), ask once: "Is this what you expect to spend, or the most you can spend?"
- "Expect to spend": checked against the expected value.
- "Most I can spend" (absolute cap): checked against the 85th percentile (range 80-90; pick one default, tune later).
The choice is stored with the limit in UserProfile.limits (budgetMode: expected or cap). The bar shows the checked number and the full likely range on hover.

## Decision 2026-10-19 (Nathan): one expected-cost number
No percentiles, no ranges, no cap mode. The user is asked one question: "What do you want your expected cost to be?" and every limit is checked against the expected value. Supersedes the 80th / 85th percentile and "likely range" text above (lane DS removes it from the engine and panel).
