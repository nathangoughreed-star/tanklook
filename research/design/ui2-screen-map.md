# UI2: the new UI on paper (lane UI2, 2026-11-13, request R27 step 2; Coordinator 24)

Design only, no app code. Built from `research/design/ui1-inventory.md` (UI1, build 1922; "#N" below = UI1's row N), Nathan's 2026-11-05 single-home answers (`research/design/sandbox-start-and-single-home.md`) and requests R6, R13-R17, R26. Mockups: `research/design/ui2/*.html` (static HTML, open in any browser), screenshots `research/screens/UI2/`. Mockup tokens and components: `research/design/ui2/tokens.css` (the new shell copies it).

**Nathan reads: §1, the §2 summary, the four PNGs, §9.**

| Shot | What it shows |
|---|---|
| `research/screens/UI2/01-editor-desktop.png` | Main editor, 1600 x 900: header, rail, Tank section open (a commercial tank: its size is read-only), view controls top middle, check bar along the bottom |
| `research/screens/UI2/02-editor-phone.png` | Same at 390 x 844: tank on top, check strip, Animals as a bottom sheet, tab bar |
| `research/screens/UI2/03-split-desktop.png` | Compare: two tanks, one shared control cluster over the seam, "Editing A / B / Both" in the panel, each tank its own check bar |
| `research/screens/UI2/04-constraints-and-cost.png` | Constraints section open (the one home of every limit; Experience shown as an optional constraint, off) with the Cost and time drawer open on the right |
| `research/screens/UI2/05-equipment-heater.png` | Equipment > Heater: **I own** and **Buy** groups, one item locked "Use this one for sure" (Nathan 11-13) |
| `research/screens/UI2/06-tank-picker.png` | Tank > Choose a tank: **Custom tanks** and **Commercial tanks** groups, both closed at first (Nathan 11-13); `06b-tank-picker-open.png` = the same with both open |
| `research/screens/UI2/07-custom-tank-maker.png` | Custom tank maker as **its own workspace**: an empty tank on a plain floor (real render), dimension labels, gallons and filled weight, price estimate with "how" and your own price; the setup is untouched until Save |
| `research/screens/UI2/08-print-shopping-list.png` | Print section: three presets (Shopping list selected; Build plan dropped 11-13), part ticks, Print / .txt / .csv, live paper preview with the **Already owned** group at $0 (decision 5) |

## 1. Who and what for

**The user (Nathan 11-13, `research/design/w1-ab-context.md` "Nathan's answers"):** "anyone who owns or is interested in aquariums", at **every** experience level. The app adapts so a brand-new hobbyist and someone with 20 tanks both feel at home and both get something useful (how: §1a). It offers what an AI chatbot cannot: a true-to-life design you can change, with checks and costs worked out on it.

**The jobs (everything on screen serves one):**

| Job | One line |
|---|---|
| **Plan** | Design a tank that fits my needs, preferences and limits, and that I like: start from anything, change anything, see it drawn true. |
| **Evaluate** | Know whether it works: good for the animals and plants, what it asks of me ($ set-up, $ / month, minutes / week), against my limits; two versions side by side. |
| **Explore** | Be inspired: ideas I would not have had (Discover, starters, the A/B "this or that" screen). |
| **Learn** | Understand aquariums through my own design: every grey, warning and number says why (light, water, space, tankmates). |
| **Best fit** | Find the best tank for me: the size, setup and stocking that suit my room, taste and limits (picker, Suggest, Discover). |
| **Money** | An accurate budget; deal sweeps; cheaper gear that does the same job; start from, or convert to, a bundle when it saves money. Ends in the shopping list. |

**Out of scope (Nathan 11-13):** care and build-plan guidance (how to cycle, when to add animals, how to look after fish). So: the **Build plan** print preset and the Build plan sheet are dropped (§2b row 18), the Coach stays dropped, and the Notes drawer keeps verdicts on the design (fits / does not fit, and why) but no how-to-care text. Time per week and "can be left N days" stay: they evaluate the design, they are not care instructions.

### 1a. How the UI adapts to the user's level (no separate beginner mode)

One interface; it adapts through **defaults, what is shown first, and memory**, never by hiding features behind a mode. (1) **Defaults help the new user and cost the expert nothing:** "Fits this tank" is on in the Animals and Plants lists, the equipment preset ladder fills sensible gear, and a new tank shows the 5-tick **Get started** checklist, which can be dismissed for good. (2) **Summary first, detail one click away:** every group folds to a one-line summary (shot 01), the check bar shows verdict pills while the numbers live in the drawers (shots 01, 04), and advanced groups (Terrain, Light map / PAR, glass, custom substrate blends) start closed. (3) **The app remembers what you open:** groups and filters stay as you left them (per browser), so someone who always works in Terrain or the light map opens them once. (4) **Fast paths for experienced users:** typed values on every slider, search in every library, multi-select, keyboard shortcuts, the custom tank maker, "I own" lists. (5) **Experience is an optional constraint, off by default** (§3; shot 04): someone who wants a lower chance of failure turns it on and lists grey by their level; someone who wants a hard tank leaves it off and nothing is gated. (6) **Every grey and warning says why in one line** (shots 02, 03: "tight with 2"), which teaches the beginner and confirms the expert.

## 2. Screen map

**Summary.** One editor screen, always the same shape: **header** (name, Undo / Redo / Save, file menu) over a **rail** of section icons; one **panel** showing one section at a time; the **viewer** with one shared control cluster at the top middle and one **check bar** at the bottom (Habitat, Cost, Water, Notes); clicking a check opens a **drawer** on the right that pushes the view aside instead of covering the tank. Plus one Start screen, a few dialogs and one Print screen. Today's 8-9 menu sections + ~60 overlays become 9 sections, 4 drawers, 1 Start screen, 4 dialogs, 1 Print screen. Of UI1's 56 rows: 28 KEEP (most moved), 19 MERGE, 4 HIDE, 5 CUT.

### 2a. The new screens

| New surface | Job | How you get there | Holds |
|---|---|---|---|
| **Start** | Plan, Explore | first visit; header ... > New | four doors: Blank tank (kind, then the tank picker in your room), Starters and kits (starters, deals and bundles as tabs), Open saved, From an animal I want |
| **Editor** | all | after Start; resume | header + rail + panel + viewer + check bar + drawer |
| Header | Plan | always (top of the panel column) | TankLook, project name (click to rename), saved dot, Undo, Redo, Save, `...` = New / Open / Save as / Share link / Download |
| Rail | all | always, also when the panel is folded | Tank, Scape, Plants, Animals, Equipment / Preferences, Constraints / Discover, Print / Settings (bottom): 9 sections + Settings |
| Section **Tank** | Plan, Best fit | rail | **Tank model**: either a **commercial tank** (catalogue product; shape, size, glass and rim fixed, shown read-only) or a **custom tank** (yours, from the custom tank maker). The picker (docked in the panel, live in the room) has two groups, Custom tanks and Commercial tanks, **both closed at first** (each header shows what is inside), plus New custom tank; any tank row can carry the Owned pill and the "Use this one for sure" lock, as in Equipment. To change a product's size: "Make a custom tank from this" (a copy), never an edit of the product. **Stand** with I own / Buy groups. Then Sits on (floor / stand / my own furniture), Lid and top, Background, **Room** (wall, ceiling, person) |
| **Custom tank maker** (own workspace) | Plan | Tank > New custom tank, Edit on a custom tank, "Make a custom tank from this" on a commercial one | full-window workspace over the editor: an **empty tank on a plain floor** (no stand, gear, scape or room), dimension labels, gallons, filled weight, footprint. Name, shape, size, glass, rim, Price (estimate + one-line "how" + **Use my own price**), I own this tank. Cancel / Save to my tanks / Save and use in this setup; optional **Preview in my setup** (shows it in your room for a moment, then returns; recommended so the size can be judged against the room). The current setup is not edited while the maker is open |
| Section **Scape** | Plan | rail | Substrate (type, blend, brush), Terrain (slopes, corners), Hardscape and Decor library, placed pieces |
| Section **Plants** | Plan, Learn | rail | library (grayed by light), placed plants, growth over time |
| Section **Animals** | Plan, Learn | rail | search, filters ("Fits this tank" on by default in Guided), stocking list with counts, Water look (level, tint) |
| Section **Equipment** | Plan, Money | rail | preset ladder (Walstad ... high-tech) at the top; then one **sub-menu per category** (Filter, Heater, Light, CO2, Air, UV, ... ; saltwater adds its own). Each category: the item in use now, then two groups, **I own** (your items, add your own, $0) and **Buy** (catalogue products), and on every item an independent **Use this one for sure** lock. Light also holds Lighting details, Light map / PAR |
| Section **Preferences** | Plan, Best fit | rail | looks you like (cards, browse looks), don't-want list (R26 split) |
| Section **Constraints** | Evaluate, Best fit, Money | rail; every "limit" line elsewhere links here | Money and time (incl. **No new equipment**: a spending limit), Space, Experience, Your home (room temp, water, electricity), If it does not all fit, "Fill in what I left open" (Suggest) |
| Section **Discover** | Explore, Best fit | rail; "Ideas for ..." button in each section header opens it scoped to that section | Finish my setup / fill this section / remix; preview in the viewer; Apply / Keep |
| Section **Print** | Money, Plan | rail | one page builder with presets: Shopping list, Setup sheet, Full report (Build plan dropped: care guidance is out of scope); tick parts; Print / .txt / .csv. The shopping list has an **Already owned** group ($0) apart from what to buy |
| **Settings** | - | rail bottom | US / Metric, Rules (Guided / Sandbox), Graphics, Help, Scene data (JSON) |
| Viewer cluster | Plan, Evaluate | always, top middle | View (camera, show, viewpoint map, export PNG), Another moment, Compare / Views linked / End compare |
| Check bar | Evaluate, Learn | always, bottom of each view | Habitat (verdict pill), Cost ($ set-up, $/mo, min/wk), Water (deg F, fits), Notes (count) |
| Drawers | Evaluate, Learn, Money | click a check; click an item in the tank | **Habitat check**, **Cost and time**, **Water**, **Notes**, **Selection** (selected animal / piece: numbers, sex, copies, delete). One open at a time. |
| Dialogs | Plan | as needed | Save as / Share, Replace this project?, Guardrail-off list (inside Constraints, not a dialog), Sump size (inside Equipment) |
| Toasts | Plan, Money | after an edit | price notice (edit lost a sale price, Undo), owned gear no longer fits (link to that Equipment category) |

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
| 13 | Choose a tank (docked picker) | KEEP | Tank section, docked in the panel, live preview; two groups, Commercial tanks / Custom tanks |
| 14 | Guardrails dialog (checks off) | MERGE | Constraints: each limit has its own on / off switch |
| 15 | My equipment dialog | MERGE | into the **I own** group of each Equipment category (and Tank / Stand in the Tank section); "No new equipment" moves to Constraints. Nathan 11-13 replaced the 11-05 "separate menu" with this |
| 16 | Setup sheet | MERGE | Print > Setup sheet preset |
| 17 | Report | MERGE | Print > Full report preset |
| 18 | Plan sheet / Build plan sheet | CUT | care / build-order guidance is out of scope (Nathan 11-13); the Plan sheet's shopping part is the Shopping list preset |
| 19 | Suggest a setup | KEEP | Constraints > "Fill in what I left open" (limits read from Constraints, no own fields) |
| 20 | Why-not card | KEEP | inside Suggest results |
| 21 | Setup brief card | MERGE | its lines become the group summaries of Preferences and Constraints |
| 22 | Header strip | KEEP | Header; units and Guided / Sandbox move to Settings; Discover moves to the rail; "How to use" to Settings > Help |
| 23 | Tank section | KEEP | Tank section, groups folded to one-line summaries. Shape, L / H / D, bow / pie / bowl dims, glass and rim move into the **Custom tank maker** (new); for a commercial tank they are read-only |
| 24 | Room around the tank | MERGE | Tank > Room group |
| 25 | Substrate | MERGE | Scape section |
| 26 | Hardscape | MERGE | Scape section (+ Decor, DS1/DS2) |
| 27 | Plants | KEEP | Plants section |
| 28 | Animals | KEEP | Animals section; selected-animal box moves to the Selection drawer |
| 29 | Water (under Animals) | KEEP | Animals > Water look; water numbers live in the Water drawer |
| 30 | Constraints and preferences | KEEP | two sections, Preferences and Constraints (R26) |
| 31 | Equipment | KEEP | Equipment section with a sub-menu per category; each category's "I own one" tab becomes its **I own** group |
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
| 53 | A/B Discover (`?ab=1`) | KEEP | Nathan 11-13: "a very old feature and definitely should stay". Lives as **Discover > This or that** (two habitats side by side, Prefer A / B, Make A mine), no `?ab=1` needed. Open: whether it feeds the automated best-fit search (decision 15) |
| 54 | Coach / Guide me (dormant) | CUT | decision 4: the checklist replaces it |
| 55 | Animal-first stocking (dormant) | HIDE | decision 4: Start > "From an animal I want" |
| 56 | Sandbox flags bar | CUT | flag already off; rules switch is in Settings |

Count: KEEP 28, MERGE 19, HIDE 4, CUT 5 = 56. HIDE = row 43 (viewpoint map behind a switch) and the dormant rows 51, 52, 55, which get the doors decision 4 approved (11-13).

## 3. One home per setting

Rule (Nathan 2026-11-05, kept): **a shortcut may open the home; it may not hold its own copy of the control.**

| Setting | Editors today | ONE home | Shown read-only in |
|---|---|---|---|
| Set-up budget | quick prefs, Your limits, cost Guardrails, Suggest (4) | Constraints > Money and time | Cost drawer (limit line on the bar), Suggest, Print |
| Upkeep $ / month, time / week | same 4 | Constraints > Money and time | Cost drawer |
| Space (W x D x H) | Your limits, Habitat "Set my space", cost panel, Suggest (4) | Constraints > Space | Habitat drawer, tank picker (filters by it), Suggest |
| Experience | **two settings that can disagree:** (a) brief `preferences.experience` 0-2 (Your limits; drives `layout.expertise` animal graying, starter / Another moment stocking via `whyAnimal`, Suggest ranking and `experienceNote`); (b) profile `UserProfile.skill` per area, fundamentals / fish / planted / salt (+ terrarium), 0-2 (cost panel Your situation; drives the difficulty bar `skillMul`, `whyAnimal` warnings `demand/engine.ts:201`, monthly losses `engine.ts:269`); plus hidden Care level | Constraints > Experience, an **optional constraint, off by default** (Nathan 11-13: "a possible constraint that the user can set if they choose to"). **Off:** nothing is gated by experience; the difficulty bar and expected losses are shown for an average keeper ("Some") and say so. **On:** per-area levels (fundamentals, fish, planted, salt; terrarium hidden in aquarium scope), each New to it / Some / Experienced; one answer sets every area, "More detail" sets each. It gates **animals, plants and gear** (grey with a one-line why; Discover / Suggest leave gated items out), and the difficulty bar and losses use the real levels. Stored once per browser (about the person, not the tank) | Cost drawer (difficulty), Animals / Plants / Equipment lists (graying when on), Suggest notes |
| Room temperature | Equipment `#tRoom`, Your limits; **stored twice** (`tech.roomC`, brief) | Constraints > Your home | Equipment heater row ("room 70 deg F, edit"), Water drawer. Engine: store once in the brief, migrate old saves (step P5) |
| Water source, hardness, pH | cost panel, Your limits | Constraints > Your home | Water drawer |
| Electricity $/kWh | cost panel | Constraints > Your home | Cost drawer |
| Limit on / off (guardrails) | cost Guardrails, `#guardDlg` | Constraints: a switch on each limit | Cost drawer shows "not checked" |
| Kind (fresh / salt) | New cards, Tank buttons, Suggest radios, Water link (4) | Start (first step) and Tank section (same field; Start is the first visit to it) | Water drawer, Animals filter |
| Owned gear | 7 doors | the **I own** group of each category (Equipment; Tank / Stand in Tank) | Print "Already owned" group; Cost drawer counts it $0. Owning does not mean the plan uses it |
| Use this one for sure (lock) | Discover Keep / lock, owned flags (mixed) | one lock per item, on the item's row, owned or not | the row shows it (lock icon); Discover / Suggest / the generator must use a locked item; an owned unlocked item is a free option they prefer when it fits |
| No new equipment | Constraints `#cnNoNew`, My equipment `#ownNoNew` (2) | Constraints > Money and time | Equipment shows a note on the Buy groups while it is on |
| Light power | two sliders 8 rows apart | Equipment > Light | - |
| Look / style direction | quick prefs (2), hidden Style select | Preferences | Discover uses it; the scene's own materials stay hand edits in their sections (a different thing: what is built, not what you like) |
| Tank shape, size, glass, rim | picker, L / H / D boxes, shape buttons, glass and rim rows (today editable on any tank, products included) | **Custom tank maker** (only for custom tanks; a commercial tank's are fixed) | Tank model card (read-only spec line), header name, Print |
| Which tank | picker, Suggest space, Set my space | Tank section > Tank model (Commercial / Custom) | Suggest (filters by Constraints > Space) |
| Custom tank price | engine estimate only (`demand/engine.ts:107-109`: catalogue price of a stock tank this size, else a per-gallon band) | Custom tank maker > Price: estimate shown with its "how"; **Use my own price** (quote / DIY cost) saved with the custom tank | Cost bar and drawer, shopping list, Print: the user's price wins everywhere, marked "your figure" |
| Camera | View sliders, Lighting "Look from above / Straight on", double-click | View (and double-click in the tank) | - |
| Units, rules mode, graphics | header, header, View popover | Settings | - |

## 4. The built-but-doorless features

| Feature | Lines | Recommend | Why |
|---|---:|---|---|
| Guided setup (World / Equipment / Limits / Starting point) | 755 | **MERGE** into a "Get started" checklist at the top of the panel for a new tank: 5 ticks (tank, scape, plants, animals, gear), each opens the real section | Nathan 11-05: "Guided setup becomes the tool walking you through the EXISTING menus"; a wizard is a second home for every setting |
| Visual Discovery (browse looks grid) | 513 | **MERGE** into Preferences > Browse looks | already agreed 11-05 (folded into Quick Setup's browse view) |
| Explore Complete Setups | 623 | **MERGE** into Discover > "Whole tank" | same job as Discover's "Finish my setup" with a gallery view |
| A/B Discover screen (`?ab=1`) | 1,123 | **KEEP** (Nathan 11-13) as Discover > "This or that" | an old feature he wants kept; whether its picks feed the automated best-fit search is decision 15 |
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
| Card (plain, media, selected) | gear, species, library item, suggestion, build. The picture is a **generic tile**: the item's catalogue picture (`public/gallery/*.webp` for animals; the same for plants, decor, gear) on one neutral tile, never a crop of the item in the tank (Nathan 11-13) | 22 card classes |
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

**Phone (< 700 px):** header (icons only), viewer on top (about 35 % height), a check strip under it (scrolls sideways), the open section as a bottom sheet (drag between half and full), tab bar: Tank, Scape, Plants, Animals, More (More = Equipment, Preferences, Constraints, Discover, Print, Settings). Drawers open as full sheets. Compare on phone: stacked A over B, one tank's check strip at a time.

## 7. Migration order

The new shell lives beside the old one behind `?ui=2` (own `index2.html` entry, own `src/ui2/`, own stylesheet built from the tokens). Both use the same `Store`, `Viewer` and engine. Old shell untouched until the flip.

**P. Pull logic out first (no visible change; each with tests, each a lane; P8-P10 added 11-13 for the own / buy / lock model, custom tanks and one experience model):**

| Step | Out of | Into | Size |
|---|---|---|---|
| P1 Tank edit rules (`setTank`, `setKind`, shape dims, flat-end, lid / door locks, table geometry) | `panels.ts` 494-724, 838 | `scene/tankEdit.ts` | L |
| P2 Stocking edits and picker fit (`setCount`, `dropSpecies`, `fitsFor` / `animalGate` / `refineFits`, `removeMisfits`, `readout`) | `panels.ts` 771-1106 | `scene/stockEdit.ts` + `ui/logic/animalPicker.ts` | L |
| P3 Item / plant edits and plant gate | `panels.ts` 1620-1950 | `scene/itemEdit.ts`, `ui/logic/plantGate.ts` | M |
| P4 Gear choice application and conversions | `techMenu.ts` | `scene/techEdit.ts`; one `units.ts` for every `toF` / `fromUnits` / `fmtHeight` | L |
| P8 Gear model: per category an owned list (in the brief), the item in use, and a "use for sure" lock per item; Discover / Suggest / generator read the lock (must use) and the owned list (preferred, $0). Folds `ownedGear.ts` `applyOwned` / `syncEquipment` and the owned flags on scene gear into it; old saves migrate | `ownedGear.ts`, `scene/tech`, Discover locks | `scene/gearOwn.ts` | M |
| P9 Custom tank library: a custom-tank spec (shape, L / H / D, shape dims, glass, rim, name) saved per browser across setups (LS `tanklook.customTanks`, like the scene library); a setup holds its own copy plus the library id and version. Library edit: setups keep their copy and show "Updated in my tanks: use the new version?". Library delete: setups keep their copy ("Save to my tanks again"). Share link / file carry the copy. Product tanks become read-only (P1's rules apply only in the maker). **Migration:** a saved scene whose dimensions differ from its product, or that has no product, gets an auto-named custom tank on load (e.g. "Custom 36 x 18 x 16 in (from Aqueon 40 breeder)"), added to the library and referenced. **Maker:** its own workspace with its own scratch scene (empty tank, plain floor); the setup's Store is not touched until Save, Cancel discards the scratch scene; Preview swaps the tank into the setup's view without an undo entry and swaps back. **Price:** the spec carries an optional `priceUsd` (the user's own price); the demand engine uses it as the tank row price when present (marked as the user's figure), otherwise today's estimate. **Engine follow-up (not now):** the estimate should count glass thickness, low-iron, rimless and shape (bow, corner, ...), not just gallons | `panels.ts` `setTank` / `shapeDims`, `tankPick.ts`, `scene/` tank | `scene/customTank.ts` | M |
| P5 One home per limit in the data: profile from LS `tanklook.demand` into the brief (except experience, which stays per browser: P10); room temp stored once; migrate old saves | `demandPanel.ts`, `scene/tech.ts`, brief | `scene/brief.ts` | M |
| P10 One optional experience constraint: an on / off switch (off by default) plus per-area `skill`; delete brief `preferences.experience` and `layout.expertise` as stored values; every consumer (`whyAnimal` gating, starter / Another moment stocking, Suggest ranking, `experienceNote`, `skillMul`, losses) reads one `experienceOf(area)` that returns "no gate" when off. **Gating data:** animals have it (`data/care.ts` `care: 1-3` per species). Plants have only a tank-fit check (`scene/plantfit.ts` `whyNot`: light band, CO2 / fertiliser need vs the tank's tech level); **missing:** a per-plant keeper difficulty 1-3 (e.g. carpets, red stems, crypt melt), one value per plant. Gear has **no** difficulty data; **missing:** a small table per gear kind / type (e.g. pressurised CO2, sump, canister, RO/DI, auto top-off, dosing pump, chiller), not per product. Both tables are estimates like `care.ts`. **Migration:** a saved profile with any non-zero `skill` keeps it and turns the constraint on; otherwise a scene's `preferences.experience` > 0 sets every area and turns it on; else off. Old share links read `preferences.experience` as a fallback for one release | `scene/brief.ts`, `scene/layout`, `demand/engine.ts`, `demand/suggest.ts`, `demandPanel.ts`, `scene/plantfit.ts`, gear catalogue | `demand/experience.ts` + `data/plantCare.ts`, `data/gearCare.ts` | M (+ S per data table) |
| P6 Habitat helpers (`bar`, `topBy`, `tileState`, ...) | `fullnessTile.ts` | `ui/logic/habitat.ts` | S |
| P7 File ops (library, open example / shared, save / save as) | `panels.ts` 168-494 | `ui/logic/files.ts` | M |

The old shell is switched to call these as they land, so both shells share one copy.

**Then the new shell, in this order (usable from step 2):**

| # | Step | Size | Needs |
|---|---|---|---|
| 1 | Skeleton: header (Undo / Redo / Save), rail, panel host, viewer, check bar + the four drawers (read-only) | M | P6 |
| 2 | Start, open, save, share, resume | M | P7 |
| 3 | Tank section + docked picker (Commercial / Custom) + Custom tank maker + Room | L | P1, P9 |
| 4 | Animals + Water look + Selection drawer | L | P2 |
| 5 | Constraints, Preferences, Suggest | M | P5, P10 |
| 6 | Equipment (category sub-menus, I own / Buy, lock) + Lighting + light map | L | P4, P8 |
| 7 | Scape + Plants + brush / group bars | L | P3 |
| 8 | View, Settings (units, rules, graphics), Print | M | - |
| 9 | Compare (split) | L | `sideStore` as is |
| 10 | Discover (incl. the A/B "This or that" mode) + checklist + animal-first door | M | - |
| 11 | Phone and tablet pass | M | built mobile-aware from step 1; this is the check |
| 12 | Flip default to the new shell; `?ui=1` keeps the old for 2 weeks; then delete `index.html` markup, `panels.ts`, old `style.css`, dropped dormant code | M | Nathan's OK |

**Tests.** The 28 markup-reading tests (`dx7`, `uiids`, `cssvars`, `gw2`, `hm2`, ...) keep pointing at the old `index.html` / `panels.ts` until step 12 and are deleted with them. The new shell has no id contract (it builds its DOM in code), so it needs no `uiids` twin. Each step adds: node tests for its pure logic (P-steps and view-model functions), and a headless screenshot script (like `scripts/ui1-*.mjs`) saving shots to `research/screens/<lane>/` as the proof. Whether to add a DOM test environment is decision 7.

## 8. Freeze list (once this is approved)

**Pause** requests to the old shell's: left menu layout and section structure; panel, card, button and overlay styling; overlay positions (habitat tile, cost chip, Notes, Water chip, map: R10 folds into the new shell); header; View popover layout; split view chrome after HM3 (R15) lands; phone layout; start and save dialogs; new doors for dormant features.

**Keep going:** engine, render, models, data, gear catalogue, styles / Decor (DS1 / DS2), scene logic, welfare and cost maths; bugs that block using the old shell (smallest fix); anything inside a section's controls that is really engine (e.g. a new tank shape) lands in the engine first so both shells get it.

## 9. Decisions for Nathan

| # | Decision | Recommendation | Status |
|---|---|---|---|
| 1 | The user and the jobs in §1 | (was: one planner persona, 5 jobs) | **ANSWERED 11-13**: anyone interested in aquariums, every level, the UI adapts (§1a); jobs Plan / Evaluate / Explore / Learn / Best fit / Money; care guidance out of scope. §1 rewritten |
| 2 | Layout: rail + one section at a time + check bar at the bottom + right drawer that pushes the view (shots 01, 04)? | Yes. | APPROVED 11-13 |
| 3 | The single homes in §3, incl. room temperature stored once and the cost panel's Guardrails / Your situation fields moving to Constraints? | Yes. | APPROVED 11-13 |
| 4 | Dormant features: Guided -> checklist (merge), Visual Discovery -> Preferences (merge), Explore -> Discover (merge), A/B screen (drop), Coach (drop), Animal-first (carry, Start door)? | Yes to all six. | APPROVED 11-13 except the A/B screen: Guided -> checklist, Visual Discovery -> Preferences, Explore -> Discover, drop Coach, keep Animal-first; **A/B taste screen KEPT** (Nathan 11-13: "definitely should stay"), as Discover > This or that |
| 5 | Four printable pages become one Print section with presets (now three: Build plan dropped, care guidance out of scope)? | Yes. | **APPROVED 11-13** (shot 08, "Approve"); the Build plan preset was since dropped by decision 1 |
| 6 | Build the new shell with a small UI library (Preact, about 4 KB) instead of hand-wired DOM? It replaces the 420-line `sync()` with components that redraw from the Store. | Yes, Preact; vanilla TS is the fallback if you prefer no new dependency. | APPROVED 11-13 |
| 7 | Add a DOM test environment (happy-dom) for the new shell, or keep node-only tests + screenshot proof per step? | Node-only + screenshots (keeps test runs light on this machine). | APPROVED 11-13 |
| 8 | Compare: one "Editing A / B / Both" switch in the panel instead of an Edit tick per tab (shot 03)? | Yes. | APPROVED 11-13 |
| 9 | Viewpoint map off by default (a switch in View)? | Yes. | APPROVED 11-13 |
| 10 | Order: engine pulls P1-P10 first, then shell steps 1-12 (P1-P10); freeze old-shell UI requests from approval (§8)? | Yes. | APPROVED 11-13 |
| 11 | R7, the Habitat check name: keep "Habitat check" in the new check bar? | Keep; the drawer title can carry the longer "Habitat check: is it good for the animals?". | APPROVED 11-13 |
| 12 | Own / buy / lock (Nathan 11-13, shot 05): "I own" and "Buy" groups per category, an independent "Use this one for sure" lock, no My gear tab, "No new equipment" in Constraints. Confirm the shot matches what you meant? | Yes (already his call; the shot is the check). | APPROVED 11-13 |
| 13 | Tanks (Nathan 11-13, shots 01, 06, 07): commercial tanks fixed; picker groups start closed; custom tanks from a maker that opens as **its own workspace** with an empty tank (setup untouched until Save; Cancel leaves everything as it was), with "Preview in my setup" as an optional step; custom tank price = estimate with a "how" line, or your own price used everywhere; library saved across setups, each setup keeps its own copy; old scenes with hand-edited product dims become auto-named custom tanks? | Yes to all, including Preview in my setup (the empty-tank view cannot show whether it suits the room). | APPROVED 11-13 |
| 14 | Experience (Nathan asked what it affects): today two settings (brief 0-2: animal graying, starter stocking, Suggest; profile per area: difficulty bar, animal warnings, monthly losses) that can disagree. Merge into **per-area levels** set by one answer in Constraints ("More detail" for per-area), stored per browser, read by every consumer? | Yes: per-area keeps the real difference between keeping fish, plants and saltwater; one answer keeps it a single click for most people. | APPROVED 11-13; **revised 11-13**: experience is an OPTIONAL constraint, off by default, gating animals, plants and gear when on (§3, P10) |
| 15 | A/B "This or that": should its picks feed the automated best-fit search (Suggest / Discover ranking), or stay a manual taste tool? | Keep it manual for now; once the best-fit search is designed, feed A/B picks in as a preference signal (they say what you like, not what fits). | **OPEN** (Nathan 11-13: "still up in the air") |
| 16 | Plant and gear difficulty data for the experience constraint (P10): add `plantCare` (1-3 per plant) and `gearCare` (1-3 per gear kind) as estimates like the animal table? | Yes; the gate does nothing for plants and gear without them. | open |

Lane note: HANDOFF.md not edited (brief: commit only this lane's files); the coordinator adds the dated line.
