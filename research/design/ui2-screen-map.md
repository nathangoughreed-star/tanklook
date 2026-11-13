# UI2: the new UI on paper (lane UI2, 2026-11-13, request R27 step 2; Coordinator 24)

Design only, no app code. Built from `research/design/ui1-inventory.md` (UI1, build 1922; "#N" below = UI1's row N), Nathan's 2026-11-05 single-home answers (`research/design/sandbox-start-and-single-home.md`) and requests R6, R13-R17, R26. Mockups: `research/design/ui2/*.html` (static HTML, open in any browser), screenshots `research/screens/UI2/`. Mockup tokens and components: `research/design/ui2/tokens.css` (the new shell copies it).

**Nathan reads: §1, the §2 summary, the four PNGs, §9.**

| Shot | What it shows |
|---|---|
| `research/screens/UI2/01-editor-desktop.png` | Main editor, 1600 x 900: header, rail, Tank section open, view controls top middle, check bar along the bottom |
| `research/screens/UI2/02-editor-phone.png` | Same at 390 x 844: tank on top, check strip, Animals as a bottom sheet, tab bar |
| `research/screens/UI2/03-split-desktop.png` | Compare: two tanks, one shared control cluster over the seam, "Editing A / B / Both" in the panel, each tank its own check bar |
| `research/screens/UI2/04-constraints-and-cost.png` | Constraints section open (the one home of every limit) with the Cost and time drawer open on the right |

## 1. Who and what for

**The user:** someone planning a real home aquarium (first tank, or a hobbyist planning the next one) who wants to see it true to life in their own room, know the animals will be well, and know what it costs in money and time before buying anything. I found no sentence of Nathan's naming the user; this is read from what he has asked for (room and person in the scene, finished price per size, owned gear, limits, welfare checks). Decision 1 asks him to confirm or correct it.

**The jobs (everything on screen serves one):**

| Job | One line |
|---|---|
| J1 Start | Get to a tank on screen fast: a ready-made, a kit, a blank tank of my size in my room, or a tank built round an animal I want. |
| J2 Build | Change anything by hand (tank, stand, scape, plants, animals, gear) and see it drawn true. |
| J3 Check | Know whether it is good for the animals and what it asks of me ($ set-up, $ / month, minutes / week), against my limits. |
| J4 Compare | Put two versions side by side and see what differs (budget vs luxury, my idea vs a suggestion). |
| J5 Take away | Save, share, and print what to buy and how to set it up. |

Ideas (Discover, Suggest) are not a job of their own: they are a faster way to do J1 and J2, so they sit inside them.

## 2. Screen map

**Summary.** One editor screen, always the same shape: **header** (name, Undo / Redo / Save, file menu) over a **rail** of section icons; one **panel** showing one section at a time; the **viewer** with one shared control cluster at the top middle and one **check bar** at the bottom (Habitat, Cost, Water, Notes); clicking a check opens a **drawer** on the right that pushes the view aside instead of covering the tank. Plus one Start screen, a few dialogs and one Print screen. Today's 8-9 menu sections + ~60 overlays become 10 sections, 4 drawers, 1 Start screen, 4 dialogs, 1 Print screen. Of UI1's 56 rows: 28 KEEP (most moved), 19 MERGE, 4 HIDE, 5 CUT.

### 2a. The new screens

| New surface | Job | How you get there | Holds |
|---|---|---|---|
| **Start** | J1 | first visit; header ... > New | four doors: Blank tank (kind, then the tank picker in your room), Starters and kits (starters, deals and bundles as tabs), Open saved, From an animal I want |
| **Editor** | all | after Start; resume | header + rail + panel + viewer + check bar + drawer |
| Header | J5 | always (top of the panel column) | TankLook, project name (click to rename), saved dot, Undo, Redo, Save, `...` = New / Open / Save as / Share link / Download |
| Rail | J2 | always, also when the panel is folded | Tank, Scape, Plants, Animals, Equipment / My gear, Preferences, Constraints / Discover, Print / Settings (bottom) |
| Section **Tank** | J2 | rail | Tank model (picker opens docked in the panel, live in the room), shape and size, Sits on (floor / stand / my own furniture), Top and rim, Glass, Background, **Room** (wall, ceiling, person) |
| Section **Scape** | J2 | rail | Substrate (type, blend, brush), Terrain (slopes, corners), Hardscape and Decor library, placed pieces |
| Section **Plants** | J2 | rail | library (grayed by light), placed plants, growth over time |
| Section **Animals** | J2 | rail | search, filters ("Fits this tank" on by default in Guided), stocking list with counts, Water look (level, tint) |
| Section **Equipment** | J2 | rail | preset ladder (Walstad ... high-tech), one row per gear kind (filter, heater, light, CO2, ...), Lighting details, Light map / PAR |
| Section **My gear** | J2/J3 | rail; "I own one" on any gear row opens it at that item | what you already own (tank, stand, light, heater, ...), "No new equipment" |
| Section **Preferences** | J1/J2 | rail | looks you like (cards, browse looks), don't-want list (R26 split) |
| Section **Constraints** | J3 | rail; every "limit" line elsewhere links here | Money and time, Space, Experience, Your home (room temp, water, electricity), If it does not all fit, "Fill in what I left open" (Suggest) |
| Section **Discover** | J1/J2 | rail; "Ideas for ..." button in each section header opens it scoped to that section | Finish my setup / fill this section / remix; preview in the viewer; Apply / Keep |
| Section **Print** | J5 | rail | one page builder with presets: Shopping list, Setup sheet, Full report, Build plan; tick parts; Print / .txt / .csv |
| **Settings** | - | rail bottom | US / Metric, Rules (Guided / Sandbox), Graphics, Help, Scene data (JSON) |
| Viewer cluster | J2/J4 | always, top middle | View (camera, show, viewpoint map, export PNG), Another moment, Compare / Views linked / End compare |
| Check bar | J3 | always, bottom of each view | Habitat (verdict pill), Cost ($ set-up, $/mo, min/wk), Water (deg F, fits), Notes (count) |
| Drawers | J3 | click a check; click an item in the tank | **Habitat check**, **Cost and time**, **Water**, **Notes**, **Selection** (selected animal / piece: numbers, sex, copies, delete). One open at a time. |
| Dialogs | J1/J5 | as needed | Save as / Share, Replace this project?, Guardrail-off list (inside Constraints, not a dialog), Sump size (inside Equipment) |
| Toasts | J2 | after an edit | price notice (edit lost a sale price, Undo), owned gear no longer fits (link to My gear) |

### 2b. Where each of today's surfaces goes (every UI1 row)

| # | Today | Fate | Where / why |
|---|---|---|---|
| 1 | Welcome | KEEP | Start screen (four doors) |
| 2 | New Setup: Freshwater / Saltwater | MERGE | Start > Blank tank, first step (kind) |
| 3 | Quick preferences dialog | MERGE | Preferences section; Start shows it once as an optional step |
| 4 | Starter / Example setups | KEEP | Start > Starters and kits |
| 5 | Open existing | KEEP | Start > Open saved, and header `...` > Open |
| 6 | Deals and bundles | MERGE | tab in Start > Starters and kits |
| 7 | Start a new project? | KEEP | dialog, unchanged |
| 8 | Open... chooser | CUT | Start screen already offers saved vs starter |
| 9 | Save dialog | MERGE | Save button saves; `...` > Save as |
| 10 | Save as / download / share | KEEP | one dialog from `...` |
| 11 | "This replaces your current scape" | MERGE | Discover's Apply confirm (Shuffle moves there) |
| 12 | Tank sizes / Sump size modal | MERGE | Sump: a row in Equipment; tank: picker #13 |
| 13 | Choose a tank (docked picker) | KEEP | Tank section, docked in the panel, live preview |
| 14 | Guardrails dialog (checks off) | MERGE | Constraints: each limit has its own on / off switch |
| 15 | My equipment dialog | KEEP | becomes the **My gear** section (Nathan 11-05: "a totally separate existing-equipment menu") |
| 16 | Setup sheet | MERGE | Print > Setup sheet preset |
| 17 | Report | MERGE | Print > Full report preset |
| 18 | Plan sheet / Build plan sheet | MERGE | Print > Build plan preset |
| 19 | Suggest a setup | KEEP | Constraints > "Fill in what I left open" (limits read from Constraints, no own fields) |
| 20 | Why-not card | KEEP | inside Suggest results |
| 21 | Setup brief card | MERGE | its lines become the group summaries of Preferences and Constraints |
| 22 | Header strip | KEEP | Header; units and Guided / Sandbox move to Settings; Discover moves to the rail; "How to use" to Settings > Help |
| 23 | Tank section | KEEP | Tank section, groups folded to one-line summaries |
| 24 | Room around the tank | MERGE | Tank > Room group |
| 25 | Substrate | MERGE | Scape section |
| 26 | Hardscape | MERGE | Scape section (+ Decor, DS1/DS2) |
| 27 | Plants | KEEP | Plants section |
| 28 | Animals | KEEP | Animals section; selected-animal box moves to the Selection drawer |
| 29 | Water (under Animals) | KEEP | Animals > Water look; water numbers live in the Water drawer |
| 30 | Constraints and preferences | KEEP | two sections, Preferences and Constraints (R26) |
| 31 | Equipment | KEEP | Equipment section; "Open My equipment" becomes the My gear rail door |
| 32 | Lighting | MERGE | Equipment > Light row and its details; second "Total Power" control CUT (same field shown twice) |
| 33 | Report section | MERGE | Print section |
| 34 | Discover / Keep in section headers | MERGE | one "Ideas for ..." button per section header; Keep / lock stays on the item |
| 35 | Quick Setup (hidden) | CUT | style -> Preferences; Shuffle and densities -> Discover "Remix"; care level -> Constraints > Experience |
| 36 | View popover | KEEP | viewer cluster > View; Graphics settings move to Settings > Graphics |
| 37 | Another moment | KEEP | viewer cluster only (Animals copy CUT) |
| 38 | Hide / Edit panel (3 controls) | MERGE | one: click the open section's rail icon to fold the panel to the rail |
| 39 | Cost chip + cost panel | KEEP | check bar > Cost and time drawer; Guardrails and Your situation fields move to Constraints |
| 40 | Habitat check tile | KEEP | check bar > Habitat drawer; "Set my space" moves to Constraints > Space |
| 41 | Notes / Checks strip | KEEP | check bar > Notes drawer |
| 42 | Water chip + "Where this comes from" | KEEP | check bar > Water drawer |
| 43 | Viewpoint map | HIDE | View > "Viewpoint map" switch, off by default |
| 44 | Group / brush / patch bars | KEEP | float at the bottom of the viewer above the check bar while a selection or brush is active |
| 45 | Light map, PAR guide | KEEP | Equipment > Light; map draws in the viewer |
| 46 | Split / compare | KEEP | Compare in the viewer cluster; "Editing A / B / Both" at the top of the panel; per-side check bars |
| 47 | Discover card | KEEP | Discover section |
| 48 | Equipment warning, price notice | MERGE | toasts |
| 49 | Busy hints, status line | KEEP | toasts and a thin progress line under the header |
| 50 | Phone layout | KEEP | redesigned (§6) |
| 51 | Guided setup (dormant) | HIDE | decision 4: becomes a "Get started" checklist in the panel that opens the real sections |
| 52 | Explore Complete Setups (dormant) | HIDE | decision 4: merge into Discover "Whole tank" |
| 53 | A/B Discover (`?ab=1`) | CUT | decision 4: Compare covers it |
| 54 | Coach / Guide me (dormant) | CUT | decision 4: the checklist replaces it |
| 55 | Animal-first stocking (dormant) | HIDE | decision 4: Start > "From an animal I want" |
| 56 | Sandbox flags bar | CUT | flag already off; rules switch is in Settings |

Count: KEEP 28, MERGE 19, HIDE 4, CUT 5 = 56. The three dormant HIDE rows (51, 52, 55) get a door only if Nathan says yes (decision 4).

## 3. One home per setting

Rule (Nathan 2026-11-05, kept): **a shortcut may open the home; it may not hold its own copy of the control.**

| Setting | Editors today | ONE home | Shown read-only in |
|---|---|---|---|
| Set-up budget | quick prefs, Your limits, cost Guardrails, Suggest (4) | Constraints > Money and time | Cost drawer (limit line on the bar), Suggest, Print |
| Upkeep $ / month, time / week | same 4 | Constraints > Money and time | Cost drawer |
| Space (W x D x H) | Your limits, Habitat "Set my space", cost panel, Suggest (4) | Constraints > Space | Habitat drawer, tank picker (filters by it), Suggest |
| Experience | cost panel + 4 "Your situation" selects, Your limits, hidden Care level (3) | Constraints > Experience (one answer; the 4 detail questions under "more detail") | Cost drawer (difficulty), Animals filter |
| Room temperature | Equipment `#tRoom`, Your limits; **stored twice** (`tech.roomC`, brief) | Constraints > Your home | Equipment heater row ("room 70 deg F, edit"), Water drawer. Engine: store once in the brief, migrate old saves (step P5) |
| Water source, hardness, pH | cost panel, Your limits | Constraints > Your home | Water drawer |
| Electricity $/kWh | cost panel | Constraints > Your home | Cost drawer |
| Limit on / off (guardrails) | cost Guardrails, `#guardDlg` | Constraints: a switch on each limit | Cost drawer shows "not checked" |
| Kind (fresh / salt) | New cards, Tank buttons, Suggest radios, Water link (4) | Start (first step) and Tank section (same field; Start is the first visit to it) | Water drawer, Animals filter |
| Owned gear | 7 doors | My gear section | Equipment rows: "Owned" pill; "I own one" opens My gear at that item. "No new equipment" lives only in My gear |
| Light power | two sliders 8 rows apart | Equipment > Light | - |
| Look / style direction | quick prefs (2), hidden Style select | Preferences | Discover uses it; the scene's own materials stay hand edits in their sections (a different thing: what is built, not what you like) |
| Tank size | picker, L / H / D, Suggest space, Set my space | Tank section (picker + size rows) | header name, Print |
| Camera | View sliders, Lighting "Look from above / Straight on", double-click | View (and double-click in the tank) | - |
| Units, rules mode, graphics | header, header, View popover | Settings | - |

## 4. The built-but-doorless features

| Feature | Lines | Recommend | Why |
|---|---:|---|---|
| Guided setup (World / Equipment / Limits / Starting point) | 755 | **MERGE** into a "Get started" checklist at the top of the panel for a new tank: 5 ticks (tank, scape, plants, animals, gear), each opens the real section | Nathan 11-05: "Guided setup becomes the tool walking you through the EXISTING menus"; a wizard is a second home for every setting |
| Visual Discovery (browse looks grid) | 513 | **MERGE** into Preferences > Browse looks | already agreed 11-05 (folded into Quick Setup's browse view) |
| Explore Complete Setups | 623 | **MERGE** into Discover > "Whole tank" | same job as Discover's "Finish my setup" with a gallery view |
| A/B Discover screen (`?ab=1`) | 1,123 | **DROP** (delete at the flip) | Compare (split) does two tanks side by side with the real editor |
| Coach / Guide me | 353 | **DROP** | the checklist does its job without a second voice |
| Animal-first stocking ("An animal I want") | 386 + 5 files | **CARRY** as Start > "From an animal I want" and Animals > "Plan around this animal" | a real way people start a tank; logic is pure and tested (`stockPlanLogic`, 25 tests) |
| Quick Setup block (Style, Shuffle, densities, care gates) | in `panels.ts` | **DROP** the block; parts move (row 35) | each part has a better home |

## 5. Component set

All in `research/design/ui2/tokens.css`. One style each; nothing outside the tokens.

**Tokens.** Surfaces `--bg-app #14181f`, `--bg-panel #1b2029`, `--bg-raised #242a35`, `--bg-hover #2c3340`, `--bg-sunken #11151b`, `--line #2f3644`; text `--text #e8ebf1`, `--text-2 #a4adbd`, `--text-3 #6e7789`; meaning `--accent #4f8cff` (selected, primary, focus), `--ok #3fb68b`, `--warn #e3a33a`, `--bad #e5565b` (each with a `-weak` tint); `--glass` for overlays on the 3D view; `--paper` / `--paper-ink` for print only. Type: one family, 5 sizes (11 / 12 / 13 / 15 / 20 px). Space: 4 px grid (`--s1` 4 ... `--s5` 24). Sizes: control 30 px, small 24 px, row 36 px, rail 64 px, panel 380 px (drag 320-520), drawer 340 px, header 48 px. Radius: 6 (controls), 10 (cards, panels), pill. Six z-layers (view, overlay, panel, pop, dialog, toast).

| Component | Use | Replaces (UI1 §3 counts) |
|---|---|---|
| Button: primary / secondary / ghost / danger, md 30 / sm 24, icon-only | every action | 10 button families + 63 button classes + 256 bare buttons |
| Segmented | every 2-5 way choice (Floor / Stand / Furniture, kind, lid) | `seg` groups, lid buttons vs selects, kind buttons vs radios |
| Toggle | every on / off | checkboxes, `<details>` used as on / off |
| Field row, slider row | label + control + value + unit | per-section row styles |
| Input, select | numbers, lists | as today, one style |
| Pill (ok / warn / bad / accent / neutral) | read-only status | 29 pill / chip / tag / badge classes (with Chip) |
| Chip | filters, removable tags | |
| Card (plain, media, selected) | gear, species, library item, suggestion, build | 22 card classes |
| Tile | picker grids (looks, starters, tanks) | start-mode cards, qp-cards, library cards |
| Panel, section head, group (folds to a one-line summary) | the left column | 24 panel / box / float classes |
| Drawer | the right inspector | cost panel, habitat tile, water chip, notes, selected-animal box |
| Glass bar | toolbar and check bar over the view | each overlay's own float style |
| Dialog, popover, toast | modal, View menu, notices | 16 dialog / sheet classes |
| Sheet (paper) | print pages | 4 printable pages' styles |

One expand / collapse glyph (`▸` / `▾`) everywhere; one icon set (24 px stroke, `research/design/ui2/icons.js`).

## 6. Layout

**Desktop (>= 1100 px wide):** `[rail 64][panel 380, drag 320-520][viewer][drawer 340 when open]`. Header sits on top of rail + panel only, so the viewer runs full height. The drawer pushes the viewer narrower; it never floats over the tank. Clicking the open section's rail icon folds the panel: rail + viewer only (today's 3 hide controls become 1). Esc closes the drawer, then the panel.

**Split (Compare):** the viewer splits in two (one tank each; 3+ not planned). One cluster at the top middle over the seam (View, Another moment, Views linked, End compare: R15). Each half: a tab top-outer corner (A / B, name, "N diffs" with the list on hover: R17) and its own check bar at the bottom (R6). The panel gets one strip at its top, **Editing A / B / Both**, replacing the Edit tick on each tab. Drawers open for the tank whose check you clicked, with its letter in the title.

**Tablet (700-1099 px):** rail + viewer; the panel opens over the viewer's left side as a sheet; drawer opens over the right.

**Phone (< 700 px):** header (icons only), viewer on top (about 35 % height), a check strip under it (scrolls sideways), the open section as a bottom sheet (drag between half and full), tab bar: Tank, Scape, Plants, Animals, More (More = Equipment, My gear, Preferences, Constraints, Discover, Print, Settings). Drawers open as full sheets. Compare on phone: stacked A over B, one tank's check strip at a time.

## 7. Migration order

The new shell lives beside the old one behind `?ui=2` (own `index2.html` entry, own `src/ui2/`, own stylesheet built from the tokens). Both use the same `Store`, `Viewer` and engine. Old shell untouched until the flip.

**P. Pull logic out first (no visible change; each with tests, each a lane):**

| Step | Out of | Into | Size |
|---|---|---|---|
| P1 Tank edit rules (`setTank`, `setKind`, shape dims, flat-end, lid / door locks, table geometry) | `panels.ts` 494-724, 838 | `scene/tankEdit.ts` | L |
| P2 Stocking edits and picker fit (`setCount`, `dropSpecies`, `fitsFor` / `animalGate` / `refineFits`, `removeMisfits`, `readout`) | `panels.ts` 771-1106 | `scene/stockEdit.ts` + `ui/logic/animalPicker.ts` | L |
| P3 Item / plant edits and plant gate | `panels.ts` 1620-1950 | `scene/itemEdit.ts`, `ui/logic/plantGate.ts` | M |
| P4 Gear choice application and conversions | `techMenu.ts` | `scene/techEdit.ts`; one `units.ts` for every `toF` / `fromUnits` / `fmtHeight` | L |
| P5 One home per limit in the data: profile from LS `tanklook.demand` into the brief; room temp stored once; migrate old saves | `demandPanel.ts`, `scene/tech.ts`, brief | `scene/brief.ts` | M |
| P6 Habitat helpers (`bar`, `topBy`, `tileState`, ...) | `fullnessTile.ts` | `ui/logic/habitat.ts` | S |
| P7 File ops (library, open example / shared, save / save as) | `panels.ts` 168-494 | `ui/logic/files.ts` | M |

The old shell is switched to call these as they land, so both shells share one copy.

**Then the new shell, in this order (usable from step 2):**

| # | Step | Size | Needs |
|---|---|---|---|
| 1 | Skeleton: header (Undo / Redo / Save), rail, panel host, viewer, check bar + the four drawers (read-only) | M | P6 |
| 2 | Start, open, save, share, resume | M | P7 |
| 3 | Tank section + docked picker + Room | L | P1 |
| 4 | Animals + Water look + Selection drawer | L | P2 |
| 5 | Constraints, Preferences, My gear, Suggest | M | P5 |
| 6 | Equipment + Lighting + light map | L | P4 |
| 7 | Scape + Plants + brush / group bars | L | P3 |
| 8 | View, Settings (units, rules, graphics), Print | M | - |
| 9 | Compare (split) | L | `sideStore` as is |
| 10 | Discover + checklist (+ animal-first if yes) | M | - |
| 11 | Phone and tablet pass | M | built mobile-aware from step 1; this is the check |
| 12 | Flip default to the new shell; `?ui=1` keeps the old for 2 weeks; then delete `index.html` markup, `panels.ts`, old `style.css`, dropped dormant code | M | Nathan's OK |

**Tests.** The 28 markup-reading tests (`dx7`, `uiids`, `cssvars`, `gw2`, `hm2`, ...) keep pointing at the old `index.html` / `panels.ts` until step 12 and are deleted with them. The new shell has no id contract (it builds its DOM in code), so it needs no `uiids` twin. Each step adds: node tests for its pure logic (P-steps and view-model functions), and a headless screenshot script (like `scripts/ui1-*.mjs`) saving shots to `research/screens/<lane>/` as the proof. Whether to add a DOM test environment is decision 7.

## 8. Freeze list (once this is approved)

**Pause** requests to the old shell's: left menu layout and section structure; panel, card, button and overlay styling; overlay positions (habitat tile, cost chip, Notes, Water chip, map: R10 folds into the new shell); header; View popover layout; split view chrome after HM3 (R15) lands; phone layout; start and save dialogs; new doors for dormant features.

**Keep going:** engine, render, models, data, gear catalogue, styles / Decor (DS1 / DS2), scene logic, welfare and cost maths; bugs that block using the old shell (smallest fix); anything inside a section's controls that is really engine (e.g. a new tank shape) lands in the engine first so both shells get it.

## 9. Decisions for Nathan

| # | Decision | Recommendation |
|---|---|---|
| 1 | The user and the 5 jobs in §1: right? | Yes as written; correct the user line if you see it differently. |
| 2 | Layout: rail + one section at a time + check bar at the bottom + right drawer that pushes the view (shots 01, 04)? | Yes. |
| 3 | The single homes in §3, incl. room temperature stored once and the cost panel's Guardrails / Your situation fields moving to Constraints? | Yes. |
| 4 | Dormant features: Guided -> checklist (merge), Visual Discovery -> Preferences (merge), Explore -> Discover (merge), A/B screen (drop), Coach (drop), Animal-first (carry, Start door)? | Yes to all six. |
| 5 | Four printable pages become one Print section with four presets? | Yes. |
| 6 | Build the new shell with a small UI library (Preact, about 4 KB) instead of hand-wired DOM? It replaces the 420-line `sync()` with components that redraw from the Store. | Yes, Preact; vanilla TS is the fallback if you prefer no new dependency. |
| 7 | Add a DOM test environment (happy-dom) for the new shell, or keep node-only tests + screenshot proof per step? | Node-only + screenshots (keeps test runs light on this machine). |
| 8 | Compare: one "Editing A / B / Both" switch in the panel instead of an Edit tick per tab (shot 03)? | Yes. |
| 9 | Viewpoint map off by default (a switch in View)? | Yes. |
| 10 | Order: engine pulls P1-P7 first, then shell steps 1-12; freeze old-shell UI requests from approval (§8)? | Yes. |
| 11 | R7, the Habitat check name: keep "Habitat check" in the new check bar? | Keep; the drawer title can carry the longer "Habitat check: is it good for the animals?". |

Lane note: HANDOFF.md not edited (brief: commit only this lane's files); the coordinator adds the dated line.
