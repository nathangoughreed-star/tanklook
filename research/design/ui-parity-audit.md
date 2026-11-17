# PA1: old UI vs new shell parity audit (lane PA1, 2026-11-17; Nathan's "yes" to a full old-versus-new audit; research only, nothing built)

Old UI = `index.html` + `src/ui/*` (`?ui=1`). New shell = `src/shell/*` (default since UF1). Both opened live on `localhost:5183` with the "Planted community" starter (36 x 18 in, 40 animals) at 1280 x 800 and every rail section, group, tab, drawer and the View menu dumped control by control; plus four scripts (below). Branch base = 6046cacb (WR1 and BG1 already in, so "water range bars" and "3D background" count as PRESENT).

**Status words:** PRESENT (same thing, same place or equivalent), MOVED (same control, new home; UI2 screen map said so), CHANGED (still there, behaves or looks different; "worse" marked), MISSING (not in the shell and not on the UI2 cut list), CUT (UI2 §2b dropped it on purpose, Nathan 11-13; listed so it is not re-found as a "bug"). **Confidence:** V = seen in the live DOM or read in source on both sides; i = inferred from the UI2 map or name-grep only (flagged in the note).

Read first: section 1 (counts), section 2 (ranked gaps). Section 3 is the full table. Section 4 is method and what could not be checked.

## 1. Counts

Rows are control GROUPS (one row = the controls that do one job), not the 608 raw ids.

| Section | PRESENT | MOVED | CHANGED | MISSING | CUT |
|---|---:|---:|---:|---:|---:|
| Header and files | 5 | 4 | 1 | 1 | 0 |
| Start | 7 | 1 | 1 | 0 | 0 |
| Tank | 11 | 6 | 1 | 8 | 0 |
| Water | 4 | 0 | 0 | 1 | 0 |
| Scape | 12 | 1 | 0 | 0 | 0 |
| Plants | 3 | 0 | 1 | 1 | 0 |
| Animals | 8 | 0 | 2 | 2 | 0 |
| Constraints | 5 | 5 | 4 | 5 | 0 |
| Preferences | 2 | 0 | 1 | 2 | 1 |
| Equipment | 6 | 3 | 0 | 2 | 0 |
| Lighting | 5 | 1 | 0 | 2 | 1 |
| Print | 2 | 2 | 0 | 0 | 1 |
| View | 4 | 6 | 0 | 1 | 0 |
| Drawers | 4 | 2 | 3 | 6 | 0 |
| Selection | 2 | 0 | 0 | 0 | 0 |
| Compare | 1 | 0 | 1 | 0 | 0 |
| Discover | 3 | 1 | 1 | 0 | 0 |
| Other | 3 | 0 | 0 | 0 | 0 |
| **Total (169 groups)** | **87** | **32** | **16** | **31** | **3** |

## 2. Ranked gaps (MISSING, and CHANGED for the worse)

Rank = how much Nathan would care: planning numbers, ranges, warnings and charts first, then whole features, then single controls. Size S = under a day of wiring on logic that exists, M = new panel plus some logic, L = logic has to be extracted first. Old refs are `file:line` in the old UI; "host" is where the shell would put it.

| Rank | Gap | What it did in the old UI | Old ref | Shell host | Size |
|---:|---|---|---|---|---|
| 1 | **Habitat check: "What counts" load table and the nitrogen (ammonia) budget** | Per-species share of the bio-load with grams each and the space multiplier ("6 Bronze corydoras: 26% of the load, 7 g each, counted 0.6x"); the "Where the ammonia goes, per day" block: feeding select (light / normal / heavy), tap nitrate ppm, animals' N, plants' share, filter bacteria vs capacity, filter load with / without plants, nitrate-only water change %, plus crowd warnings and cover advice | `src/ui/fullnessTile.ts:18` (`nitrogenRows`), `:39` (What counts), `:8` (`crowdWarnings`, `coverAdvice`), `:165` (`water.tapNitrate`) | Habitat drawer (`src/shell/drawers.tsx`), under Spatial fullness; feeding + tap nitrate as one row each | M |
| 2 | **Cost drawer: three builds, kit "Show as Tank B", owned-heater deal, animals' share** | "Same look, three builds: Budget $1,308 / As designed $1,360 / Luxury $1,512" with rock lines and Budget-vs-Luxury compare buttons (opens Tank B); "Swap for a kit or sale" with **Show as Tank B** / Not now; "On sale, your heater ... Price it"; "With 40 animals; without them: $1,092, $21/mo" | `src/ui/tierBox.ts:51,77`; `src/ui/demandPanel.ts:124,208`; `src/ui/dealMatch.ts:4` | Cost drawer (shell has costs-most + swaps + bundle line only) and `compare.tsx` for Tank B | M |
| 3 | **Open-top / lid warning with the one-click fix** | "Malaysian trumpet snail can get out of an open top, so the tank needs a lid ... Add a glass top (about $39)"; lid-free pros and cons (heat lost vs escape) | `src/ui/panels.ts:1955` (`openTopProblem`, `lidFreeProsCons`, `setLidFree`), `src/data/lidNeed.ts` | Notes drawer (as a "Fix these" row like NF1) and a line in Tank > Lid and top | S-M |
| 4 | **Heater / chiller hold-the-temperature warnings** | Equipment menu warns when the heater cannot hold the tank's range against the room, when the measured temp is outside the shared range, and when the room is warmer than the tank should be ("a chiller, or ...") | `src/ui/techMenu.ts:422-423` (`operatingCheck`, `holdCheck`, `measuredCheck`, `offerChiller`), `src/scene/temprange.ts` | Equipment > Temperature Control row, or Notes | M (i: the engine may already feed Notes; not seen there on this tank) |
| 5 | **Constraints: whole fields the brief still has** | Set-up hours range; tank size range in gal; hardness (dGH) and pH of the tap water; "What I want from it" (watch, grow plants, breed, centerpiece, relax, learn, kids); "If it does not all fit" as a setting (keep my plan / open to changes); min-max ranges instead of one cap; Target vs Firm maximum on cost and upkeep; Sales tax / buy in phases | `src/ui/welcomeGuard.ts:29-34`, `src/ui/limitsPanel.ts:21`, `src/ui/quickPrefs.ts:18` (Target / Firm), `src/ui/setupBrief.ts:30,71,73` | Constraints section (`constraints.tsx`, `logic/constraints.ts`) | M |
| 6 | **Light map: aquascape shading, dark spots, expected plant outcomes** | "Account for the aquascape" (shade from rock and plants), "Dark spots: where the water is too dim" with a threshold slider, "Show expected plant outcomes" | `src/ui/panels.ts:1126-1129` (`light.mapShade`, `mapShells`, `mapDark`, `light.outcomes`), `render/lightShells` | Equipment > Light > Light map group (`lighting.tsx` `LightLayoutGroup`) | S |
| 7 | **Preferences: size slider, Avoid state on looks, "A CO2 system" and "No live plants" exclusions** | Size range slider (<=5 to 150+ gal); looks are Like / Avoid / clear; Don't-want list has 5 items | `src/ui/quickPrefs.ts:9`, `src/ui/startMode.ts` | Preferences section (`prefs.tsx`) | S-M (i: shell has avoid in logic; the live dump showed only Snails, Shrimp, Large fish) |
| 8 | **Water condition (algae look) slider** | "Condition: how long since the tank was cleaned" (Pristine / A few weeks / Overdue / Neglected), algae on glass and rock; changes the render only | `src/ui/panels.ts:1082` (`s.condition.level`) | Tank > Water group (next to tint) | S |
| 9 | **Tank screen set BG1 named: background pictures, round-tank arc, glass outline lines** | Add up to 4 pictures per side with fit mode; background arc on round tanks; "Glass outlines: Shown / Hidden" (`render.edges`) | `src/ui/panels.ts:627` (`bgPicAdd`), `:612` (`bgArc`), `:600` (`edgesY`) | Tank > Background group (`tank.tsx`); outlines next to the GS3 edge finish in the maker | S-M each (pictures M: image store `scene/images`) |
| 10 | **Furniture table: tank position and Centre / Back / Front buttons; stand finish** | Table "Tank left / right", "front / back" sliders and the three placement buttons; stand Finish select | `src/ui/panels.ts:724` (`tableX`, `tableZ`, `tableCentre`), `:703` (`standFinish`) | Tank > Sits on group | S |
| 11 | **Delete all animals** | One button empties the stock (plants and hardscape have Remove all) | `src/ui/panels.ts:924` (`delAll`) | Animals section footer | S |
| 12 | **Young-fish growth line and plant light caption in the stocking list** | `growthCheck` adds "will outgrow in N months" style lines; `fitCaption` per-plant light verdict text | `src/ui/panels.ts:1898` (`growthCheck`) | Animals stocking list / Plants cards | S (i) |
| 13 | **AR view button** | Opens the tank in AR on phones that support it | `src/ui/panels.ts:1266`, `src/render/ar.ts` | View menu (shown only when supported) | S |
| 14 | **Equipment: filterless toggle and generic gear cards' limits / stats** | `setFilterless`; generic card shows its price, watts, limits and stat block | `src/ui/fullnessTile.ts` (`setFilterless`), `src/ui/genericGearCard.ts` | Habitat drawer / Equipment generic rows | S-M (i) |

Also MISSING, lower value (rows in section 3): Glass solver is new (not a gap). "Set-up time" is MISSING as a limit (rank 5). Equipment-warning toast and price-notice toast exist (see section 3, i).

**Deliberately cut by the UI2 map (not gaps):** Plan sheet / Build plan sheet, Coach, Quick Setup block (style Shuffle moved into Discover Remix), 2nd "Total Power" slider, Open... chooser, Guardrails dialog (now the On switch on each limit), Sandbox flags bar.

## 3. Control table

| # | Section | Old control (ref) | Where in the shell | Status | Conf | Note |
|---:|---|---|---|---|---|---|
| 1 | Header and files | Undo / Redo (`#undo`,`#redo`) | header Undo / Redo, Ctrl+Z | PRESENT | V |  |
| 2 | Header and files | Guided / Sandbox rules switch (`rulesSwitch.ts`) | Settings > Rules | MOVED | V | UI2 §2b row 22 |
| 3 | Header and files | US / Metric (`#uIn`,`#uCm`) | Settings | MOVED | V |  |
| 4 | Header and files | New / Open / Save / Save as / Download / Share link | header Save + File menu, `files.tsx` | PRESENT | i | read in source |
| 5 | Header and files | Scene name rename (`#sceneName`) | header project name | PRESENT | V |  |
| 6 | Header and files | Autosaved indicator (`#saveState`) | saved dot in header | PRESENT | i |  |
| 7 | Header and files | How to use (button) | Settings > Help | MOVED | V |  |
| 8 | Header and files | Scene data JSON (`#jsonCopy`) | Settings > Scene data (Download, Copy) | PRESENT | V |  |
| 9 | Header and files | Discover header button | rail Discover + "Ideas for X" in each header | MOVED | V |  |
| 10 | Header and files | Build tag on screen | not shown | MISSING | i | tag is in the old header only; low |
| 11 | Header and files | Hide / Edit panel (3 controls) + resize grip | click open rail icon to fold; panel width drag | CHANGED | V | UI2 §2b row 38 (3 into 1); grip not looked for |
| 12 | Start | Welcome home (New / Starters / Open) | `start.tsx` | PRESENT | i |  |
| 13 | Start | New Setup Freshwater / Saltwater | Start > Blank tank | PRESENT | i |  |
| 14 | Start | Starter / example setups (6 cards) | Start > Starters | PRESENT | i |  |
| 15 | Start | Deals and bundles (On sale / Bundles tabs) | Start tab | PRESENT | i |  |
| 16 | Start | Animal I want (animal-first) | Start door | PRESENT | i | `stockPlanLogic` reused |
| 17 | Start | Open file from computer / saved library | `files.tsx` | PRESENT | i |  |
| 18 | Start | Quick preferences dialog (size slider, looks, limits, don't want) | Preferences section; Start step | CHANGED | V | size slider and Avoid state missing, see section 2 rank 7 |
| 19 | Start | Replace this project? (Cancel / Save copy / Replace) | `files.tsx` | PRESENT | i | `projectStart` reused |
| 20 | Start | "This replaces your current scape" confirm | Discover Apply / "Revert this visit" | MOVED | V |  |
| 21 | Tank | Kind Freshwater / Saltwater | Tank > Water group | PRESENT | V |  |
| 22 | Tank | Choose a tank picker (search, bands, live preview, Choose) | Tank model > Change…, `tank.tsx` | PRESENT | V | plus Custom / Commercial groups |
| 23 | Tank | Product line, included-gear note (`#prodIncl`) | Tank model card | PRESENT | V |  |
| 24 | Tank | Presets… button | Tank model > Change… | MOVED | V |  |
| 25 | Tank | Sits on Floor / Stand / My own furniture | Tank > Sits on | PRESENT | V |  |
| 26 | Tank | Stand style + height | Tank > Sits on (Stand) | PRESENT | V |  |
| 27 | Tank | Stand Finish select (`#standFinish`) | not shown | MISSING | V | `panels.ts:703` |
| 28 | Tank | "No stand yet" prompt (`standAsk`) | not shown | MISSING | i | low |
| 29 | Tank | Table: Rectangular / Round, length, depth, height | Tank > Sits on (Furniture) | PRESENT | V |  |
| 30 | Tank | Table: tank left/right, front/back, Centre / Back / Front | not shown | MISSING | V | `panels.ts:724` |
| 31 | Tank | Shape select + sides 3/5/6, L/H/D, bow / pie / bowl dims | Tank maker workspace | MOVED | i | UI2 decision 13; not opened live |
| 32 | Tank | Rimmed / Rimless | Tank maker | MOVED | i |  |
| 33 | Tank | Glass thickness / type | Tank maker + `glassSolve.tsx` | CHANGED | i | better (solver) |
| 34 | Tank | Glass edge outlines Shown / Hidden (`render.edges`) | not shown (GS3 has edge finish raw/polish/bevel) | MISSING | V | `panels.ts:600` |
| 35 | Tank | Volume and weight lines | Tank model card, maker labels | PRESENT | V |  |
| 36 | Tank | Lid Open / Glass / Mesh / Hood | Tank > Lid and top | PRESENT | V |  |
| 37 | Tank | Lid-free pros/cons, no-hood note, open-top warning + Add a glass top | not shown | MISSING | V | section 2 rank 3 |
| 38 | Tank | Front doors None / Hinged / Sliding | Tank > Lid and top (terrarium only) | PRESENT | V | `tank.tsx:180` |
| 39 | Tank | Background kind (select), colour, sides Back / Left / Right / Front | Tank > Background | PRESENT | V |  |
| 40 | Tank | Background pictures (Add picture, per side, fit) | not shown | MISSING | V | BG1 list; `panels.ts:627` |
| 41 | Tank | Background arc (round tanks) | not shown | MISSING | V | BG1 list; `panels.ts:612` |
| 42 | Tank | 3D background kind / Shuffle / depth | Tank > Background | PRESENT | V | BG1 restored |
| 43 | Tank | Room: wall (behind/left/right/corner, colour, distance), ceiling, person | View menu > Room | MOVED | V | VM1 |
| 44 | Tank | Sump picker (`#tankDlg`) | Equipment > Sump | MOVED | V |  |
| 45 | Tank | Equipment warning popup (owned gear stops fitting) | toast (`maker.tsx` hit) | MOVED | i |  |
| 46 | Tank | Price notice (edit loses a sale price, Undo) | not found in shell | MISSING | i | grep: no `priceNotice` in `src/shell` |
| 47 | Water | Water level, tint, colour, presets | Tank > Water | PRESENT | V |  |
| 48 | Water | Condition slider (algae look) | not shown | MISSING | V | `panels.ts:1082` |
| 49 | Water | Misfit remove on kind change (`#wMisfitDel`) | kind change handled in `logic/tank.ts` | PRESENT | i |  |
| 50 | Water | Water chip: temperature, pH, agreement | check bar > Water drawer | PRESENT | V |  |
| 51 | Water | Per-species range bars (temperature, pH; tolerable + comfortable) | Water drawer | PRESENT | V | WR1 restored; humidity bars terrarium only |
| 52 | Scape | Substrate type list, Custom blend, Roughness | Scape > Substrate tab | PRESENT | V |  |
| 53 | Scape | Custom grain / second grain / share / mixing | Substrate > Custom blend | PRESENT | i | not opened |
| 54 | Scape | Corner rise (4), Level / slope presets | Substrate tab | PRESENT | V |  |
| 55 | Scape | Custom terrain Edit / Flatten / Grid | Substrate tab (Custom terrain) | PRESENT | i |  |
| 56 | Scape | Pools (add, remove, across, width, length, bank) | `scape.tsx` pools | PRESENT | i |  |
| 57 | Scape | Leaf litter kind / density / Shuffle | Scape > Objects tab | PRESENT | V |  |
| 58 | Scape | Scatter brush toggle + brush bar | Scape > Objects, viewer float | PRESENT | V |  |
| 59 | Scape | Hardscape library (stones, wood, caves, decor), search | Scape > Objects | PRESENT | V |  |
| 60 | Scape | Multi-select toggle | Scape tray | PRESENT | i | `multi-select` found in source |
| 61 | Scape | Placed-piece list, Remove all | Scape tray (`scape.tsx:76`) | PRESENT | V |  |
| 62 | Scape | Selected piece: size / yaw / pitch / roll / lift / x / depth / duplicate / copies / delete | Selection drawer + Scape tray | PRESENT | i |  |
| 63 | Scape | Selected piece: new shape, drop to ground | Selection drawer | PRESENT | i |  |
| 64 | Scape | Hardscape / Plants "Discover" + Keep | "Ideas for X", lock on item | MOVED | V |  |
| 65 | Plants | Plant library, search, categories, per-plant cards | Plants section | PRESENT | V |  |
| 66 | Plants | Show only plants that suit the tank (gate) | Plants (toggle) | PRESENT | V |  |
| 67 | Plants | Per-plant light verdict caption | Plants card `c.light`, grey with reason | PRESENT | V |  |
| 68 | Plants | Growth over time: Time slider, Feeding, Keep / Undo | Plants > Growth over time, "Now" | CHANGED | V | Keep/Undo become one undo step (S7) |
| 69 | Plants | Remove all plants | not seen in the Plants dump | MISSING | i | Scape tray has it for pieces |
| 70 | Animals | Search, category tabs, species list greyed by fit | Animals section | PRESENT | V |  |
| 71 | Animals | Species preview card + sex pick | details + Add | CHANGED | V | preview card is "details" |
| 72 | Animals | Add / drag species into the tank | Add button, drag | PRESENT | V |  |
| 73 | Animals | Another moment (toolbar + Animals copy) | view bar | PRESENT | V | UI2: Animals copy CUT |
| 74 | Animals | Delete all animals | not shown | MISSING | V | `panels.ts:924` |
| 75 | Animals | New animal size + life stage buttons | Selection drawer "Size, % of adult" + Life stage | PRESENT | V |  |
| 76 | Animals | Stocking list with counts | Animals section | PRESENT | V |  |
| 77 | Animals | AqAdvisor check + link | Animals (aqrow) | PRESENT | V |  |
| 78 | Animals | Selected animal: sex / pair / flip / duplicate / copies / delete | Selection drawer | PRESENT | V |  |
| 79 | Animals | Selected animal readout numbers | Selection drawer | PRESENT | i |  |
| 80 | Animals | Young-fish growth line (`growthCheck`) and herp check | not found | MISSING | i | `panels.ts:1898`; herp is terrarium |
| 81 | Animals | Care level text under species | reason lines | CHANGED | i |  |
| 82 | Constraints | Setup brief card (what is set / open, Clear the brief) | group summaries in Preferences / Constraints | MOVED | V | UI2 §2b 21 |
| 83 | Constraints | Upfront, monthly, time-per-week caps | Constraints > Money and time (with On switches) | CHANGED | V | one cap each; ranges and Target/Firm gone |
| 84 | Constraints | Space (footprint W x D x H) | Constraints > Space (Width, Depth) | CHANGED | V | height missing |
| 85 | Constraints | Tank size range in gal | not shown | MISSING | V | `welcomeGuard.ts` |
| 86 | Constraints | Set-up time hours (min / max) | not shown | MISSING | V | `limitsPanel.ts:21` |
| 87 | Constraints | Room temperature | Constraints > Your home | PRESENT | V |  |
| 88 | Constraints | Water source Tap / Well / RO | Your home | PRESENT | V |  |
| 89 | Constraints | Hardness (dGH), pH of tap water | not shown | MISSING | V | `welcomeGuard.ts:32` |
| 90 | Constraints | Electricity $/kWh | Your home | MOVED | V | from cost panel |
| 91 | Constraints | "What I want from it" (7 wishes) | not shown | MISSING | V | `setupBrief.ts:71` |
| 92 | Constraints | "If it does not all fit" policy | only "Fill in what I left open" button | CHANGED | V | policy choice gone |
| 93 | Constraints | Experience (optional) + per-area levels | Constraints > Experience | PRESENT | V | P10 |
| 94 | Constraints | Difficulty / care effort guardrails | "How much risk is fine" select | CHANGED | V | care-effort advice select not seen |
| 95 | Constraints | Guardrails per-limit on / off | On switch on each limit | MOVED | V |  |
| 96 | Constraints | No new equipment | Constraints > Money and time | MOVED | V |  |
| 97 | Constraints | Owned tank / gear in limits | Equipment "I own" groups | MOVED | V |  |
| 98 | Constraints | Sales tax, buy in phases | not shown | MISSING | i | brief items `taxPct`, `phased` |
| 99 | Constraints | Suggest a setup + cards | Constraints > "Fill in what I left open" | PRESENT | V |  |
| 100 | Constraints | Why-not card (four paths) | inside Suggest results (`discover.tsx`) | PRESENT | i |  |
| 101 | Preferences | Looks cards, Browse looks | Preferences > Looks, Browse looks | PRESENT | V |  |
| 102 | Preferences | Looks Avoid state | Preferences (`avoid` in code) | PRESENT | i | not driven |
| 103 | Preferences | Size preference slider | not shown | MISSING | V | `quickPrefs.ts:9` |
| 104 | Preferences | Practical limits Target / Firm | not shown | MISSING | V | `quickPrefs.ts:18` |
| 105 | Preferences | Don't-want list (Snails, Shrimp, CO2 system, Large fish, No live plants) | Do not want (3 shown: Snails, Shrimp, Large fish) | CHANGED | V | CO2 and no-plants chips missing |
| 106 | Preferences | Quick Setup: Style select, Shuffle, densities, plant care, composition, care gates | Discover Remix | CUT | V | UI2 §2b row 35 |
| 107 | Equipment | Equipment preset ladder (Walstad ... high-tech) | Equipment top row (saltwater: FOWLR / Soft coral / LPS / SPS) | PRESENT | V |  |
| 108 | Equipment | Gear rows per category (filter, heater, CO2, air, UV, RO/DI, ATO, ...) | Equipment groups | PRESENT | V |  |
| 109 | Equipment | Gear card: price, upkeep, time, fit | equipment rows with fit pills | PRESENT | V |  |
| 110 | Equipment | I own one tab / My equipment dialog (7 doors) | "I own" group per category | MOVED | V |  |
| 111 | Equipment | Use this one for sure (lock) | per item | PRESENT | V |  |
| 112 | Equipment | Sump, overflow, skimmer, flow, dosing, salinity, salt mix | Equipment "More equipment" | PRESENT | V |  |
| 113 | Equipment | Room temp in Equipment (`#tRoom`) | Constraints > Your home | MOVED | V |  |
| 114 | Equipment | Heater / chiller hold-the-range warnings, "room warmer than tank" | not found | MISSING | V | section 2 rank 4 |
| 115 | Equipment | Swap per gear row (`gearSwapsFor`) | Cost drawer swaps (`logic/checks.ts`) | MOVED | i |  |
| 116 | Equipment | Filterless toggle, generic gear limits | not found | MISSING | i |  |
| 117 | Equipment | Integrated kit "includes" note | Tank model card | PRESENT | i |  |
| 118 | Lighting | Fixture, type, count, rows, pattern, spacing, beam, height, mount, hood LED, front-back, Optimize | Equipment > Light (`lighting.tsx`) | PRESENT | V |  |
| 119 | Lighting | Bulb, Total power, PAR measured, brightness, colour temp | Light group | PRESENT | V |  |
| 120 | Lighting | Look from above / Straight on | View menu presets (Straight on / From above / left / right) | MOVED | V |  |
| 121 | Lighting | Light map units, layer height, contour step | Light map group | PRESENT | V |  |
| 122 | Lighting | Map: aquascape shading, dark spots + threshold | not shown | MISSING | V | `panels.ts:1126-1128` |
| 123 | Lighting | Show expected plant outcomes | not shown | MISSING | V | `panels.ts:1127` |
| 124 | Lighting | PAR guide chart | reused `parGuide.ts` | PRESENT | i |  |
| 125 | Lighting | Light hover readout / contours | reused `lightHover`, `lightContours` | PRESENT | V | `boot.tsx` |
| 126 | Lighting | Second "Total Power" slider | dropped | CUT | V | UI2 §2b row 32 |
| 127 | Print | Report parts + Generate | Print > Full report | MOVED | V |  |
| 128 | Print | Setup sheet | Print > Setup sheet | MOVED | V |  |
| 129 | Print | Plan sheet / Build plan sheet | Print > Shopping list | CUT | V | UI2 decision 1 (care guidance out of scope) |
| 130 | Print | Print / .txt / .csv | Print buttons | PRESENT | V |  |
| 131 | Print | Shopping list "Already owned" group | Print | PRESENT | i | new |
| 132 | View | Camera: distance, left/right, from above, zoom, Re-centre | View menu | PRESENT | V |  |
| 133 | View | Room light slider + Auto | View menu "Room light" | PRESENT | V | Auto button not seen |
| 134 | View | Show animals / plants / hardscape / equipment | View menu | PRESENT | V |  |
| 135 | View | Split tank | Compare button | MOVED | V |  |
| 136 | View | Fish edges, Fish stand out | Settings | MOVED | V |  |
| 137 | View | Graphics settings (performance + effect toggles) | Settings > Graphics | MOVED | V |  |
| 138 | View | Viewpoint map | View menu "Top view of where you stand" | MOVED | V |  |
| 139 | View | Plants sway, fish swim and roam, Reset fish | Settings | MOVED | V |  |
| 140 | View | Hide light fixture, grid | Settings | MOVED | V |  |
| 141 | View | Export PNG 1x / 2x / 4x | View menu | PRESENT | V |  |
| 142 | View | AR button | not found | MISSING | V | `panels.ts:1266` |
| 143 | Drawers | Habitat check: five category rows, water column / floor bars, tank minimum, verdict | Habitat drawer | PRESENT | V |  |
| 144 | Drawers | Habitat: "What counts" load table | not shown | MISSING | V | section 2 rank 1 |
| 145 | Drawers | Habitat: ammonia / nitrogen budget, feeding select, tap nitrate, nitrate water-change | not shown | MISSING | V | section 2 rank 1 |
| 146 | Drawers | Habitat: crowd warnings, cover advice | not shown (topic "Compatible" rows only) | MISSING | i |  |
| 147 | Drawers | Habitat: "1 check had no data for this species" | water chip "no data" | CHANGED | V |  |
| 148 | Drawers | Set my space editor | Constraints > Space | MOVED | V |  |
| 149 | Drawers | Cost: set-up / upkeep / time, difficulty bar, rhythm, can be left N days | Cost drawer | PRESENT | V | rhythm shown when data exists |
| 150 | Drawers | Cost: costs most, swaps that lower it, bundle line | Cost drawer | PRESENT | V |  |
| 151 | Drawers | Cost: three builds Budget / As designed / Luxury + compare | not shown | MISSING | V | section 2 rank 2 |
| 152 | Drawers | Cost: kit "Show as Tank B" | bundle line, no Tank B button | CHANGED | V | worse |
| 153 | Drawers | Cost: owned-heater sale deal "Price it" | not shown | MISSING | V |  |
| 154 | Drawers | Cost: "With N animals; without them" line | not shown | MISSING | V |  |
| 155 | Drawers | Cost: Guardrails and Your situation | Constraints | MOVED | V |  |
| 156 | Drawers | Notes strip (advice + more notes) | Notes drawer | PRESENT | V |  |
| 157 | Drawers | Equipment / price toasts, busy hints, status line | `say()` toasts | CHANGED | i |  |
| 158 | Selection | Group bar (duplicate, copies, turn, size, delete, clear) | viewer float | PRESENT | i |  |
| 159 | Selection | Brush bar and patch bar | viewer float | PRESENT | i |  |
| 160 | Compare | Split tank, A/B tabs, diff list, Views linked, Fit Both, per-side tiles | Compare strip, `compare.tsx` | PRESENT | i | not driven |
| 161 | Compare | Per-side Edit tick | Editing A / B / Both | CHANGED | i | UI2 decision 8 |
| 162 | Discover | Discover card (finish, fill, remix, refine, explore) | Discover section | PRESENT | V |  |
| 163 | Discover | Keep / Like / Dislike | lock on item; feedback in `logic/workspace.ts` | PRESENT | i |  |
| 164 | Discover | A/B this or that | Discover > This or that | PRESENT | V |  |
| 165 | Discover | Explore complete setups | Discover > Whole tank | MOVED | V |  |
| 166 | Discover | Guided setup / Visual Discovery | Get started checklist, Browse looks | CHANGED | V | UI2 decision 4 |
| 167 | Other | Keyboard shortcuts (F flip, Delete, arrows) | `App.tsx`, `drag.ts`, shared `pointer.ts` | PRESENT | i |  |
| 168 | Other | Right-click / double-click camera | `drag.ts`, shared pointer | PRESENT | i |  |
| 169 | Other | Phone layout | `shell.css` | PRESENT | i | S11 |

## 4. Method, scripts, and what I could not check

Scripts (all in `scripts/`, outputs in `research/design/`):
- `pa1-old-controls.mjs` -> `ui-parity-controls.csv`: every one of the 608 ids in `index.html` with tag, type, label, handler file:line and state keys written near the handler.
- `pa1-coverage.mjs` + `pa1-groups.json` -> `ui-parity-coverage.json`: 141 old control groups, each with a regex searched in `src/shell`. 17 had zero hits, 26 had one file. Zero-hit groups were all checked by hand (some were false alarms: e.g. Show animals / plants / hardscape / equipment IS in View).
- `pa1-fields.mjs` -> `ui-parity-fields.md`: 99 scene paths the old UI writes; 80 have their leaf name in the shell; the 19 that do not are listed (`light.mapShade`, `light.mapShells`, `light.mapDark`, `light.outcomes`, `render.bgArc`, `water.condition`, `water.tapNitrate`, `layout.comp / careSet / gateStock / gateAnimals`, quick-prefs arch keys; the layout ones are the CUT Quick Setup block).
- `pa1-engine-outputs.mjs` -> `ui-parity-engine.md`: 329 engine symbols the old UI imports that the shell never names. Most are noise (the shell reaches the same engine through `ui/logic/*`, `scene/*Edit`); the real ones are ranked in section 2.
- Live dumps: shell rail sections + groups + tabs, View menu, four drawers, Print, Settings, Equipment, Constraints; old UI `?ui=1` Habitat tile (opened, What counts and ammonia blocks opened), cost panel, Constraints and Preferences sections, Limits.

Not checked (be careful with the table where marked i):
- The shell was driven only on a freshwater planted tank and a saltwater empty tank. Terrarium (`?scope=all`) controls were not looked at. Conditional controls on a bow, pie, bowl, polygon tank (Tank maker workspace) and the custom-blend / custom-terrain / pools sub-panels in Scape were not opened; rows say i where I relied on source.
- Compare (split) was checked by code and the UI2 map only, not driven.
- Start, Files, Save dialogs: read from `files.tsx`, not clicked through; the Start "From an animal I want" door and Deals tabs are marked i.
- Keyboard shortcuts and right-click: only `drag.ts` / `App.tsx` / `fullscreen.tsx` were read.
- Phone layout: not checked here (S11 covered it).
- Before / after pictures could not be taken through the app's browser pane (hidden, screenshots time out); they are made with a headless Chrome script, see `research/screens/PA1/`.
