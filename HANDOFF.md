# TankLook (vivarium visualizer): handoff

Living file. Project state and dated decisions go here; update in place.

## Start here (trimmed 2026-10-16)
This file holds only what a new chat needs: the lane rules, the coordinator protocol, the CURRENT lanes, and the open
items. Every finished lane / feature section was moved verbatim to **HANDOFF-archive.md** (index below); search it by
heading when you need a subsystem's history. Add your own dated section under "Lane sections" here, and when your lane
is done the coordinator moves it to the archive.

**Lane rules:** Rules: touch another lane's file only for a one-line hook, and say so in your section. No scene version bump without
asking Nathan. Shipping: in the worktree `git fetch` + `git merge origin/main`, tsc + tests + browser check, then
`git push origin HEAD:main` and `git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main`. HANDOFF.md
conflicts on merge: keep both sections. Each lane adds its own dated section under "Lane sections (current)" below.

**Coordinator protocol (Nathan 2026-10-13):** the coordinator chat is session `local_f068e2c9-f5e4-4bb9-ae20-3c37e545df0b`
("Lanes coordinator 3", took over 2026-10-16 from `local_d0390f66`). Every lane messages it (send_message to that id) when its work is pushed to main, when it is done,
and at any milestone that unblocks another lane (A: plants pushed; D: shots/audit/AUDIT.md written). The message says
what landed (commit), what is still open, and which files are now free. The coordinator then sends Nathan the prompts
for any chats that can start now. If a prompt is still waiting when another lane opens, it sends all waiting prompts again
in one new message. Every new lane prompt includes this protocol. When a lane is done it stops its own preview servers (preview_stop): the app allows only five
per folder, and finished lanes holding them blocked lane G on 2026-10-14. Questions for Nathan stay in the lane's own chat.
New since 2026-10-16: lane prompts are one line ("You are lane X. Read prompts/lane-X.md and follow it."); a lane
whose chat gets long hands off to a fresh chat at a work-unit boundary (write its state into its HANDOFF section
first); dev servers are swept when a lane reports done and on "check" (no hourly sweep).

**Current lanes** (coordinator "Lanes coordinator 3", `local_f068e2c9`):
| Lane | Worktree / branch | Port | Owns | State |
|---|---|---|---|---|
| BP ball python (roadmap R2) | `../Glass-Box-python` / `python` | 5673 | new `render/snake3d.ts`, `art/snakes.ts`; one-line hooks in `render/herp3d.ts`, `art/herps.ts`, animal() in `render/build.ts`, `scene/scatter.ts`, `data/species.json` / `species.ts` | ready to open (prompt `prompts/lane-BP-ball-python.md`) |
| Queued (Nathan 2026-10-16, roadmap re-rank) | - | - | after T1-T4: starter styles batch 2 (biotopes, marine sub-styles, terrestrial starters); multi-select / duplicate + scatter brush; PNG import; LAST: build.ts / panels.ts splits; clownfish host in the bubble-tip anemone DONE 2026-10-16 (see its section) | queued |
| W Android app | `../Glass-Box-android` / `android` | 5543 (`android`, `--host` for phone tests) | landscape @media in `style.css`, view-map `narrow` in `ui/panels.ts`, new manifest / icons / SW in `public/`, their tags in `index.html`, new `android/` | Steps 1-3 DONE (layout, PWA, TWA APK works on S24+); PAUSED 2026-10-14 by Nathan before step 4 (Play material) and 5 (low-end check); files free, preview servers stopped |

Gotcha: the dev server reads the build number at start-up; restart it after merging main and before pressing Record.

## Lane sections (current)

## Lane MS: multi-select, duplicate, controlled variation (2026-10-16; branch `multiselect`, port 5683; pushed to main, awaiting Nathan's verdict on the pictures)
Scope: roadmap section 5 P0. Scatter brush is NOT here (waits on T1's render/scatter.ts). Built:
- **Selection** (`scene/store.ts`): the lead (`selId` / `selItem`, as before) plus `extraFish` / `extraItems`; `store.group` (ids that still exist), `groupCount`, `toggle`, `selectGroup`, `addToGroup`, `lead`, `multi` flag. Plain `select` / `selectItem` clear the group. No scene field: a group is UI state, never saved.
- **Select**: shift / ctrl / cmd + click toggles an animal or piece (any menu, not only the open one); the **Multi** button (view toolbar, touch) makes plain taps toggle and an empty drag draw a box (shift + drag on empty water on a computer); the box takes what its middle covers (`boxPickIn` in interact/pointer.ts). Highlights: `render/build.ts` takes a `Sel` (id or set), the viewer passes the group's sets (one-line hooks in build.ts / viewer.ts).
- **Act on the group** (`scene/duplicate.ts`, pure, tested in test/duplicate.test.ts): dragging any member moves all (items: the others ride like riders, keeping their height; animals: same delta); Shift + wheel / R turn about the group centre (positions and yaw); + / - resize about the centre (pieces, spacing, animal lengths 15-130 %); Delete; Esc. Keys in ui/group.ts take precedence over the single-selection keys when 2+ are selected.
- **Duplicate / Copies** (`ui/group.ts`, bar `#groupBar` over the view, also opened from "Copies..." in the item and animal boxes): `copyGroup(S, group, {n, angle, scale, spacing, reshape, seed, support}, ids)`. Pieces in a row beside the group (side with more room, wrapping in depth); animal-only groups = a cloud around the originals (a school stays a school). Each copy: whole-copy turn +/- angle, scale +/- %, step offset +/- %, members a third as much again; `reshape` gives each copied piece a new shape seed. Species and sex kept; animals go through clampFish / fitFish, clingers (snails, shrimp, plecos) through `placeNew` like new animals; a copied piece rests on the piece under it that is not in the group (viewer raycast, `supportLift` exported from pointer.ts) else the ground. The jitter is rolled once from a fresh seed and stored as plain positions (saves, shares and undoes like any edit; no scene version bump, no new field). One undo step per action.
- Hooks in others' files: render/build.ts (Sel type, 5 lines), render/viewer.ts (`sel` getter, 2 call sites), main.ts (attachGroupBar), index.html (Multi button, #groupBar, Copies buttons), style.css (group bar). panels.ts untouched.
- Open: the panel's item sliders still edit only the lead piece when a group is selected (the bar says "N pieces"); a copied plant that lands on another piece's side is not nudged off it (pieces may overlap, as before); no "save as reusable group" (roadmap P1). Pictures before / after sent to Nathan (school, rock cluster, plant row); verdict pending.

## Lane JS: regal jumping spider, first arthropod body plan (2026-10-16; branch `spider`, port 5673; opened by coordinator 3, not started)
Scope: new render/spider3d.ts + art/spiders.ts (8 eyes, chelicerae, palps, abdomen pattern, 8 IK legs with hair), poses via scene/anchors.ts (floor, glass / wall, branch, alert), male + female, species.json entries. Pattern: archive Lane G1. Keep IK / hair in a shared helper for the ball python and tarantula lanes that follow. State: nothing built yet.

## Lane BP: ball python, serpentine body plan (2026-10-16; branch `python`, port 5673; built + tested, committed on the branch, NOT pushed: pictures sent to Nathan, awaiting his verdict)
- **Body plan** (new `render/snake3d.ts`, data `art/snakes.ts`; a limbless body, not an adapted lizard): unit = total length. The SPINE is 280 steps of exactly 1/280 (length constant in every pose, tested within 1 %): a path of headings on the surface (plane, or a cylinder = a limb), each segment lifted over the earlier coils it crosses (a chain of spheres resting on each other, 8 passes) so no coil passes through another. Ball = a spiral over a sphere (radius solved by bisection so the length is 1), the head diving into the middle. Body = loft round the spine: rounded-triangle section (flat belly, low dorsal ridge), thin short tail, neck narrower than the head, head with its own mesh and texture (broad skull, narrower lower jaw, cream upper labials with sutures, 11 heat pits per side, nostrils, vertical elliptical pupil in a gold eye: real ball pythons have vertical-elliptical pupils, not round as the prompt said; easy to change in `eyeParts`). Paint is analytic (`skinFn`: tan blotches that hold a dark spot, flecks, cream belly with plates), two DataTextures (body 2048x384, head 384x384); over it a tiled scale layer (alpha, zero on the belly) and an unlit additive sheen; coil occlusion baked into vertex colours. First build of the paint ~0.4 s, each pose ~40 ms; 24 poses cached (LRU).
- **Poses** ride in `Fish.bend` (no new field, no version bump): index = round((bend+1)*2): floor / ledge / cork top 0 `ball`, 1 `extended`, 2 `coiled` (head laid on the coils), 3 `alert` (loose coil, neck raised in an S), 4 `serpentine`; the remainder mirrors / varies it. On a branch (anchor `limb`): `wrap` (loose helix round the limb), `wrapalert` (head raised), `drape` (along the top); a limb thinner than 0.012 of the length drapes. On the top of a rock or ledge (not a limb) only ball / coil are used (long poses hang over the edge). Card is unbent, belly on the surface (no -1 mm sink).
- **Sizes**: one entry `ballpython` (tl 1200, one sex; no spur), `cling: hardscape`, `body: "snake"`. `SNAKE_STAGES` hatchling 25 / juvenile 50 / sub-adult 80 / adult 120 cm; Shuffle gives a snake with no size of its own the largest stage <= the tank length (`snakeStageFor`; `f.tl` stored). The existing size slider covers hand-set sizes; a hatchling has a relatively larger head and eye (`babyOf`).
- **Shuffle** (scene/scatter.ts): on the floor a pose family (ball .25 / extended .2 / coiled .3 / alert .15 / serpentine .1) and a heading chosen so the pose's whole footprint (`SNAKE_FOOT`) fits the tank, centre clamped inside; on hardscape (`PERCH_SNAKE` 1.5 weight) wrap .45 / alert .25 / drape .15 / serpentine. Extra rng draws only for snakes: anchorbase fixture unchanged.
- **Hooks in others' files (one-liners):** render/herp3d.ts (isHerp3D / herpBody gets `bend`), art/herps.ts (SNAKE_ART, herpMeta), render/build.ts animal() (isSnake: unbent card, no -1 mm, bend passed), scene/scatter.ts (above), data/species.json (+ballpython), data/species.ts (`body` field), test/scene.test.ts (max tl 400 -> 1500 for snakes).
- **Tests** `test/snake.test.ts` (40): length, spheres clear, on the ground line, footprints, head broader than neck, thin tail, alert raises the head, limbs (nothing inside the bark, a wrap winds >1 turn), stages, Shuffle sizes / poses / save-load identical, branch, floor, paludarium.
- **Pictures:** shots/BP_sheet1_floor_poses.jpg, BP_sheet2_close.jpg, BP_sheet3_branch.jpg (worktree only; made in the app with scripts/bp-shots.js `scene` / `focus` / `closeup` and scripts/bp-sheet.py; untracked `snake-lab.html` is a no-lighting test page).
- **Open:** a snake that rests on uneven ground (cork slab edge) lies on the highest point under its card (rigid pose); hardscape spawns do not avoid other animals (two snakes can share a ledge); the limb frame is the local straight cylinder (a sharply bent limb is not followed); `wrap` leaves the tail lying straight along the limb, past its end on a short limb; the lighting pass raises saturation of fish materials, so authored colours are muted; no tongue; no life-stage picker in the animal panel (size slider only); nothing in starters / examples places a snake yet.

## Lane W: Android app (2026-10-14; OPENED same day, Nathan: "start work on the android app"; prompt `prompts/lane-W-android-app.md`)
- **Route: Trusted Web Activity (TWA)** around https://tanklook.com/ (Bubblewrap or PWABuilder). Real Chrome, so WebXR
  AR keeps working and pushes to main update the app with no store release. **Not Capacitor**: Android WebView has no
  WebXR (AR would need a native ARCore plugin); revisit only if offline use beats AR. Estimate: 1-2 days of code; the
  calendar time is Play's 14-day / 12-tester closed test that new personal accounts must run before production.
- **Missing today:** no web manifest, no service worker, no `/.well-known/assetlinks.json`.
- **Landscape gap (found 2026-10-14, not fixed):** the layout only switches on width (`style.css` `max-width: 760px`).
  Sideways, phones wider than 760 px get the desktop layout (menu left, 350 px, ~40 % of the width): roughly right.
  Phones 760 px or narrower in landscape stay stacked at ~180 px per half: unusable. Fix: a short-landscape rule that
  always puts the panel on the left at ~260-280 px. The view map's phone default reads the width once at load.
- **Step 1 DONE (2026-10-14, Nathan approved the pictures):** `style.css` `(orientation: landscape) and (max-height: 500px)`
  rule after the narrow one: panel left at 280 px (row / nudge / flabel columns narrowed to fit), view fills the rest,
  toast over the panel, sticky Add row, map 140x105. View-map default (`panels.ts` `narrow`) counts a sideways phone as a
  phone but is still read once at load (rotating never flips the viewer's map). Fixed on the way: the sticky `#addRow`
  floated 40 px (the panel's bottom padding) above the bottom on portrait phones too, with list rows showing under it;
  now `bottom: -40px`. Pictures: `shots/landscape/W1-W4` (worktree only); taken by a CDP script (touch emulated).
- **Step 2 DONE (2026-10-14): installable PWA.** `public/manifest.webmanifest` (standalone, orientation any, colours
  #15181e = dark --bg), `public/icons/` (any 192/512, maskable 192/512, apple-touch 180; placeholder art = the favicon's
  tank + fish, drawn by PIL; replace before the store listing if wanted), link + theme-color tags in `index.html`, and
  `public/sw.js` registered from `main.ts` (PROD only, one line). SW: the app page network-first (pushes show on the
  next open), `assets/` cache-first capped at 120, other same-origin network-first, other origins (aqadvisor proxy)
  untouched. Lazy chunks are cached only once loaded, so offline covers what the visitor has already opened. Checked
  on `android-prod` (vite preview, 5544): SW active and controlling, the app opens with the server stopped,
  `Page.getInstallabilityErrors` = none. Not yet checked: the install prompt on a real phone (needs the live https site).
- **Step 3 in progress (2026-10-14): TWA project in `android/`** (Bubblewrap 1.x, `twa-manifest.json` written by hand,
  then `bubblewrap update`): package `com.tanklook.app`, host tanklook.com, orientation default (follows the phone),
  target/compile SDK 36, min 21, version 1.0.0 (code 1). Toolchain on this PC (not in the repo): Bubblewrap CLI (npm -g),
  Temurin JDK 17.0.11 and Android cmdline-tools 6609375 in `%USERPROFILE%\.bubblewrap` (config.json points there).
  Upload key: `C:\Users\nreed\keys\tanklook-upload.jks`, alias `upload`; Nathan makes it and keeps the passwords,
  never in the repo (`android/.gitignore` blocks *.jks / *.aab / build output). Nathan runs `bubblewrap build` himself
  (it asks for the passwords and for the Android SDK licences). Then: its `assetlinks.json` goes to
  `public/.well-known/assetlinks.json`; after Play App Signing is on, ADD Play's app-signing SHA-256 too (from Play
  Console > App integrity), or the store build shows the browser bar.
- **Step 3 built (2026-10-14):** `android/app-release-signed.apk` + `app-release-bundle.aab` (git-ignored), signed with
  the upload key, SHA-256 `EB:FB:F5:12:...:FA:DC:2E` (full value in `public/.well-known/assetlinks.json`, served at
  tanklook.com/.well-known/assetlinks.json). minSdk raised to 24 (androidbrowserhelper 2.7.4 needs it). Gotchas for the
  next build: (1) Bubblewrap installed a 32-bit JDK on Windows (Gradle's 1.5 GB heap fails); config.json now points at
  64-bit Temurin 17 in `%USERPROFILE%\.bubblewrap\jdk\x64`. (2) PowerShell blocks `bubblewrap.ps1`: run `bubblewrap.cmd`.
  (3) The app's terminals set `NoDefaultCurrentDirectoryInExePath=1`, so `gradlew.bat` is "not recognized": clear it
  first. Build line: `cd C:/Users/nreed/Glass-Box-android/android; $env:NoDefaultCurrentDirectoryInExePath = $null;
  bubblewrap.cmd build`. To ship an update to the shell only: bump appVersionCode / appVersionName in twa-manifest.json.
- **Step 3 DONE (2026-10-14):** Nathan installed the APK on his S24+: "it works". Google's asset-links check = linked.
  Next: step 4, Play listing material; Nathan opens the developer account (14-day / 12-tester closed test).
- **Order:** landscape layout, PWA manifest + SW, TWA shell + asset links, Play listing material (Nathan does the account
  and submissions), low-end phone performance check.


## Model review sheet + model versions (2026-10-14, Nathan: "keep it where it can be updated with version number every time a model is updated")
- `review.html` (live at tanklook.com/review.html; second Vite page, `src/review/`): every species look (females too)
  from Side, 3/4, Front, Top, each in the preview tile's flat light and in the default tank's LED bar + water. Filter,
  "Needs work" tick + note per model (this browser only), "Copy flagged list" puts them on the clipboard as text.
- Versions: `src/data/model-versions.json` holds, per look, a fingerprint (geometry on a 1/500 grid, 24 px texture
  thumbnails at 3 bits, material colours, art/tl/aspect), `v`, and the build it shipped in. A model whose fingerprint
  no longer matches shows "changed since" (orange); "Changed only" filters to them.
- **Rule for any chat that changes a model** (art/, fish3d, snail3d, herp3d, species.json sizes): open
  `/review.html` on your dev server, wait for it to render, press "Record N changed models", commit
  `src/data/model-versions.json` and `public/model-sheets/` with the change. The button only exists on the dev server (plugin
  `scripts/model-versions-plugin.mjs`); it stamps build = current commit count + 1, i.e. the commit you are about to make.
- All 68 looks recorded as v1 at build 217 (stamped 216; another chat committed first, so check the number after pushing). Fingerprints held across reloads and at phone size in the app's browser.
- **Anatomy audit v1** (2026-10-14, ChatGPT from the model sheets; `reference/model-anatomy-audit-v1.md`): 6 P0
  (rebuild: cherry/amano/cleaner shrimp = fish tail + leg spikes; mystery/ramshorn/turbo snail = open shell sector,
  shell floats over a slab foot), 26 species P1 (fin layout: median fins drawn as short rear paddles, two-dorsal species
  merged into one, livebearer gonopodia, frog/newt limbs), 25 P2 (proportions). Spot-checked turbo + cherryshrimp
  sheets: findings hold. Its "keep" list (gourami feelers, angel streamers, barbels, axolotl 3 gill pairs, puffer
  fins) and constraints are binding for the fix lanes. Not started; Nathan to pick lane order.
- **Pre-rendered sheets for reviewers without WebGL** (2026-10-14: ChatGPT's cloud browser has WebGL disabled and saw
  nothing): `public/model-sheets/` = one labelled JPEG per look (title, sci name, id, size, version; 4 views x 2 lights,
  1710 x 556) + a static `index.html` gallery, live at tanklook.com/model-sheets/. review.html links to it and, with
  no WebGL, says so and points there. Record writes the changed models' sheets + the gallery too, so commit
  `public/model-sheets/` with the versions. `npm run sheets` rewrites every sheet headlessly (Vite + headless
  Edge/Chrome with SwiftShader, ~80 s; `scripts/export-sheets.mjs`), no dev-server slot needed. JPEG 0.9: 4.7 MB the set
  (PNG was 18 MB).

## Feature to add: plant / coral light-and-feeding advice (2026-10-16, Nathan asked; NOT started)

Today there is only static advice: the PAR guide (`src/ui/parGuide.ts`, Lighting menu: freshwater and reef tiers with
what grows, CO2 and fert / dosing level), the light hover (PAR, lux, depth) and the growth feed setting
(`src/scene/growtime.ts`, speed only). Nothing checks the tank: no per-species light need in `LIBRARY`
(`src/scene/items.ts`), no per-item or tank-level warning, nothing in `validate.ts`.
Plan:
1. Add to each plant and coral variant a light band (low / medium / high, from the PAR guide tiers) and a CO2 / fert
   demand (none, recommended, required; reef: dosing level).
2. Sample the PAR at each item's position (the light hover already does this) and compare with its band.
3. Show a small badge on the item (too dim / too bright / fine) and a tank summary, e.g. "medium light with stems and
   carpets: CO2 recommended, full ferts", "Acropora at 90 PAR: too dim", "reef with SPS: daily dosing".

Auto-populate from the tank's setup (Nathan 2026-10-16, the headline use of the data above): the user states the light
level (or it is read from the fixture's PAR at the substrate) and the care they will give (`GrowFeed`: low-tech /
ferts / CO2 + ferts, already in `growtime.ts`); `starterItems` (`items.ts`) then scapes only plants whose band and
demand fit, with the same layout quality either way:
- Low care / low light: a beautiful scape from the undemanding set (anubias, java fern, crypts, mosses, swords,
  floaters), placed on wood and rock the way the existing styles do.
- High care / high light: full freedom, stems, reds, carpets, with CO2 where the plants need it.
- Reef: the same idea with PAR band deciding soft, LPS or SPS corals.
Needs: 29 plant variants tagged with band and demand (step 1), a plant-pick filter in `starterItems`, two clear
controls (light level, care level) in the starter-set UI, and a one-line caption saying what was chosen and why.
Open for Nathan: does "care" also set the dosing advice shown, and do we offer a "stretch" slider (one tier above the
tank's means, with a warning)?

Step 0, scape shading in the light map (Nathan 2026-10-16): today PAR (`lightout.ts` `bandsAt`, the light-map shader
in `render/lighting.ts` and the hover readout) is open water; plants and hardscape block nothing. Add a toggle in
Light map mode, "Account for the aquascape" (off = today's numbers, so the fixture-only view stays available):
- Floaters: per-species transmission at full cover (salvinia, water lettuce, frogbit, red root, duckweed; sources to
  be checked, my first guesses were 70-95 % blocked) times the patch's cover from its spread and density, soft edges.
- Canopy: stems reaching the surface, broad leaves (sword, lily), overhanging wood.
- Hardscape: stone and wood shadow, a shadow-casting pass from the fixture's emitters.
- The JS and the shader must stay in step (the shader is a port); the hover must honour the toggle too.
- The badges and auto-populate below read the shaded PAR when the toggle is on, so a frogbit-covered tank counts as
  low light underneath.

Advice only, never a hard gate. Keep the tier numbers in one place so the guide and the checks cannot drift.

## Still open (rewritten 2026-10-14, lane D)

Review pack R1-R12 (`shots/review/REVIEW.md`) decided 2026-10-14 (Nathan: "go ahead with the models, take the
recommendation for the rest"); all done by lane D in `models-fix`:
- R1 frogs: thighs = tucked teardrops with smooth normals, eyes set deeper with a lid mound (`250f4d7`; 5 herps v2,
  build 287). The far eye still shows over the head at 50°: accepted as anatomy (frog eyes bulge above the skull).
- R2 / R3 fish (`6176008`, versions `66d2dba` build 309): honey gourami soft breast, discus bands cleaner head-on,
  betta median fins drape (`Plan.drape`, `drapedCard`, one-line hook in build.ts; the card is not fingerprinted, so
  the betta's version did not bump), harlequin `Plan.sharp`; generic: outline thins on fish small on screen (1 px
  floor), fish texture anisotropy 16. Accepted as is: ember / chili head-on (a 40 px fish blown up 7x by the sheet,
  not a model fault), harlequin patch (foreshortened, roughly true).
- R4 `drawTetra` / `drawGourami` deleted (`352f441`). R7 sexes, R10 sizes: pass.
- R8 hardscape (`250f4d7`): coconut doorway a clean ragged rim with shell thickness; chunkier driftwood trunks and limb
  roots; worn tapered limb tips. Example thumbnails re-shot (betta bowl, terrarium, paludarium).
- R9 wall spill: NOT built (lane D's call). The broad wash stands in fairly for real room spill (mostly bounce off the
  water and substrate); with the light hung high the beams mostly miss a wall 50 mm behind the tank; and it would mean
  editing K2's lighting.ts. Revisit only if the wash looks wrong beside the light map.
- R12 shareable scene URLs: recommended as its own small lane (deflate the ~9 KB scene with CompressionStream,
  base64url in the `#` = ~3-4 KB; Share button, decode on load, "opened a shared tank" note with Undo; ui + scene
  files). The most useful thing for showing the tool to people.
  DONE by lane N (`0d0b85a`), see its section.
- R5 shrimp, R6 snails: rebuilt by lanes M and L. R11: http already 301-redirects to https.
- Leftover (not done, cheap): `shrimpMarksCanvas` (fishgen) and fish3d's `p.glass` branch may be dead now that shrimp
  have their own builder; check `Plan.glass` users before pruning.
First-visit audit: `shots/audit/AUDIT.md`, 53 findings (4 S1, 20 S2, 29 S3) with shots; fix lane G works from it.
The S1s: water level piles every fish at x = 12 mm; phone label overflow widens the page; aquascape drag erratic in the
straight-on view; first visit is an empty box (no pointer to Examples / Animals).
Not decided, low priority: camera limits (orbit already clamps elevation -20..85; "release" never defined); fish ignore
rocks (a bottom dweller can sit inside a stone); tank weight ignores hardscape.

Settled since this list was first written (2026-10-08), kept here so nobody reopens them: plain TypeScript, no React
(Phase 2 stack); lighting shipped (spot / tube / LED, light map, beams); art is procedural generators only (Nathan
rejected bought / AI models, repo is public), so the provenance question is moot; hardscape steps 3-4 shipped, step 5
(3D plants) shipped as lane A, corals + live rock as lane E.

## Known gaps (rewritten 2026-10-14, lane D)

- Every one of the 57 species (12 salt) draws in 3D from a generator (fish PLANS incl. shrimp, `HERP3D`, snail shells;
  11 with a female look); flat cards remain only as the fallback / picking target. Watch items are R1-R6 above.
- Mobile: usable but rough (audit S1 #2, S2 #6-8): no pinch zoom, page overflow from the tank label, half-screen panel.
- No stocking guidance for salt tanks (AqAdvisor's marine calculator is broken on their side; Nathan: leave it off).
- Moving / turning / resizing one fish or item, selection and the colour sliders patch the scene in place (lane J);
  geometry changes (water level, tank size, stand, substrate, terrain, Split, opening a file) still rebuild fully.
- Examples (Open…) are plain scene files: re-save them when art changes (see Lane F).
- Many "uncommitted" / "not pushed" notes in the dated sections below 2026-10-12 are stale: all that work is on main.
## Archive index (sections in HANDOFF-archive.md, newest first)
- Lane T1: dry ground, terrestrial substrates + leaf litter (2026-10-16; branch `dry-ground`, port 5633; Nathan: "leaf litter looks great", ship; pushed to main)
- Lane TA: tarantula, large arachnid body plan (2026-10-16; branch `tarantula`, port 5683; built + tested, committed on the branch, NOT pushed: pictures sent to Nathan, awaiting his verdict)
- Lane SW: swamp land as editable terrain (2026-10-16; worktree `agitated-lumiere-a79eba`, port 5663; side session of T1)
- Lane JS: regal jumping spider, first arthropod body plan (2026-10-16; branch `spider`, port 5673; built + tested, committed on the branch, NOT pushed: pictures sent to Nathan, awaiting his verdict)
- Lane MS: multi-select, duplicate, controlled variation (2026-10-16; branch `multiselect`, port 5683; pushed to main, awaiting Nathan's verdict on the pictures)
- Lane SH: setup sheet / shopping list (2026-10-16; branch `setup-sheet`, port 5683; built, waiting on Nathan's look at the 3 example sheets before push)
- Lane PP: plant polish (2026-10-16; branch `plant-polish`, port 5673; Nathan approved the pictures; pushed to main)
- Lane G1: lizard body plan, crested gecko + leopard gecko (2026-10-16; branch `gecko`, port 5663; Nathan approved the pictures, "ship it"; pushed to main)
- Clownfish host in the bubble-tip anemone (2026-10-16; worktree `musing-snyder-0e96c4`, port 5693 `clown-host`; Nathan approved the pictures; pushed to main)
- Lane T3: dry hardscape pieces + surface anchors, tree frogs perch (2026-10-16; branch `dry-hardscape`, port 5663; Nathan approved the pictures; pushed to main)
- Lane FM: fish parts merged per material (2026-10-16; branch `fish-merge`, no preview server; Nathan approved shipping the few changed edge pixels, phase 2 skipped; pushed to main)
- Lane T2: terrestrial plants (2026-10-16; branch `terra-plants`, port 5653; batches 1 + 2 and vines on wood approved by Nathan and pushed; DONE)
- Lane T4: aquatic roster (2026-10-16; branch `aqua-roster`, port 5673; DONE: fish batches 1-2 and reef P1 + P2 approved by Nathan and pushed)
- Lane SG: stone grain from baked tables, first visit about halved (2026-10-16; branch `stone-grain`, port 5653; Nathan approved the pictures; pushed to main)
- Lane PL: progressive first load, the tank builds part by part (2026-10-15; branch `progressive-load`, port 5633; Nathan approved the look; pushed to main)
- Lane SS: scape styles, Composition picker, Quick aquascape setup (2026-10-15; branch `scape-styles`, port 5663; DONE: Nathan approved the styles and the menu; pushed to main)
- Lane LA: algae on plant leaves + bowl glass film (2026-10-15; branch `leaf-algae`, port 5673; Nathan approved the pictures; pushed to main)
- Lane EF1: shader link time, first visit 35-87 s -> 10-13 s (2026-10-15; branch `shader-link`, port 5633; DONE, pushed to main)
- Lane CC: unreachable 2D card fallbacks deleted (2026-10-15; E2 audit item 14, Nathan: "we can delete those"; pushed to main)
- Edit speed: water colour and light power (2026-10-15; lane EF2, branch `edit-speed`, port 5643; pushed to main)
- Lane SF: single-file build fixed (2026-10-15; branch `single-fix`; DONE, pushed to main)
- First download: examples on demand (2026-10-15; lane EF3, branch `download-size`, port 5653; pushed to main)
- Plants against the glass, roots at the glass (2026-10-15; main)
- Drag-in, plant list, clumps on slopes (2026-10-15; branch `drag-place`, port 5613; pushed to main)
- Efficiency review (2026-10-15; Nathan: the features are in and look right, so review for efficiency; lanes E1 + E2 OPEN, measure / audit only)
- Lane SD: scape density sliders (2026-10-15; branch `scape-density`, port 5603; DONE, pushed to main)
- Lane X2: fish leftovers from X and F2 (2026-10-15; branch `fish-x2`, port 5583; Nathan approved all four steps; pushed to main)
- Plant growth (2026-10-15; design agreed in chat; lane GR1 DONE: branch `plants3d`, port 5283, pushed to main; GR3 DONE (`plant-time`, 5593); GR2 DONE (pushed); GR4 DONE (GPU reveal + worker prebuild, pushed))
- 3D back wall (2026-10-15; main checkout; Nathan chose "3D panel inside" over a flat printed sheet; pushed to main)
- Aquascape menu split into Hardscape and Plants (2026-10-14; Nathan asked; pushed to main)
- Lane Z: corals sit on the rock (2026-10-14; branch `coral-seat`, port 5563; Nathan approved; pushed to main)
- Lane F2: harder fish, new shapes (2026-10-14; branch `fish-hard`, port 5573; Nathan approved all four; pushed to main)
- Lane X: anatomy audit P2, freshwater mid-water fish (2026-10-14; branch `fish-fins`, port 5503; Nathan approved both sheets; pushed to main)
- Lane Y: anatomy audit P2, bottom dwellers + marine fish (2026-10-14; branch `fish-p2b`, port 5533; Nathan approved both batches; pushed to main)
- Lane V: zoom out further (2026-10-14; branch `zoom-out`, port 5523; Nathan approved option (b) and the pictures; pushed to main)
- Lane S2: anatomy audit P1, fish batch 4 (2026-10-14; branch `fish-fins-b4`, port 5513; Nathan approved the sheets; pushed to main)
- Lane T: AR view on iPhone, AR Quick Look (2026-10-14; branch `ar-view`, port 5483; pushed to main, HIDDEN behind `?ar=ios`)
- Background pictures (2026-10-14; main checkout, pushed to main)
- Lane P: final polish, FINAL.md items 1-6 (2026-10-14; branch `final-fixes`, port 5473; Nathan approved via the coordinator; pushed to main)
- Lane S: anatomy audit P1, fish fins (2026-10-14; branch `fish-fins`, port 5503; DONE: batches 1-3 approved and pushed; batch 4 is lane S2's)
- Lane R: anatomy audit P2, axolotl + zebra nerite (2026-10-14; branch `p2-small`, port 5493; Nathan approved both sheets; pushed to main)
- Lane N: shareable scene links (2026-10-14; branch `share-url`; review item R12; pushed to main)
- Lane O: anatomy audit P1, non-fish animals (2026-10-14; branch `herps-p1`, port 5463; Nathan approved all five sheets; pushed to main)
- Lane Q: AR view, WebXR (2026-10-14; branch `ar-view`, port 5483; DONE, phone-tested; Nathan's idea: the tank at real size in his room)
- Final check before showing (2026-10-14; main `fe28ad3`; no src/ edits)
- Lane I: reef polish + example refresh (2026-10-14; branch `reef-polish`; Nathan approved rock C and reef option B; pushed to main)
- Lanes L + M: anatomy audit P0 fixes (2026-10-14; opened, run in parallel)
- Lane J2: performance leftovers (2026-10-14; branch `perf`, port 5373; pushed to main)
- Lane K2: light output follow-ups (2026-10-14; branch `light-output`, port 5383)
- Lane J: edit performance, audit #52-53 (2026-10-14; branch `perf`, port 5373; pushed to main)
- Lane A2: plant library (2026-10-14; branch `plants3d`, port 5283; crypt + 9 species + Spread / Stems pushed to main)
- Lane K: light output (2026-10-14; branch `light-output`, port 5383; DONE, all 4 steps pushed)
- Light output: watts -> PAR / lux (2026-10-14; draft only, no src/ edits)
- Lane G: audit fixes, UI share (2026-10-14; branch `audit-fixes`; batches 1 + 2 pushed to main, DONE)
- Lane G2: core audit fixes (2026-10-14; branch `core-fixes`, port 5363; owns src/interact, src/scene, src/render minus lane I's files)
- Lane D: first-visit audit + review pack (2026-10-14; no src/ edits)
- African dwarf frog (2026-10-14; Nathan: "can we add an african dwarf frog model?"; branch `adf-frog`, port 5553)
- Tree frogs climb the glass (2026-10-14; Nathan: "like otos and snails cling to the glass")
- Lane A: 3D plants (2026-10-14; Nathan approved the style test "looks good, roll out"; pushed to main)
- Lane H: AqAdvisor for salt tanks (2026-10-14; Nathan: leave it off; pushed to main)
- Lane AL: condition / algae view (2026-10-15; branch `algae`; Nathan approved v2; pushed to main)
- Lane E: live rock + corals (2026-10-14; branch `corals`; Nathan approved the style test, live rock salt only; pushed to main)
- Lane C: marine species (2026-10-13; Nathan approved the sheets, hermit "fine for now"; pushed to main)
- Lane F: example tanks (2026-10-13; branch `examples`, shipped to main)
- Lane B: fresh or salt tank (2026-10-13; branch `salt-tank`, shipped to main)
- Parallel lanes (2026-10-13, Nathan: fill the gaps before showing other people)
- Pan stays put (2026-10-13)
- Fish stand out (2026-10-13)
- Custom substrate: grain, colour, blends (2026-10-13)
- Optimized spot pattern (2026-10-13)
- Hardscape surface grit (2026-10-13)
- Pie slice tank shape (2026-10-13)
- Light beam overlay (2026-10-13)
- Aquascape Shuffle rolls a style (2026-10-13)
- Male / female fish (2026-10-13; DEPLOYED `23633f2`)
- Hardscape placement: yaw / pitch / roll, resize, free move, cut off by the glass (2026-10-12)
- Bowl tank shape (2026-10-12; DEPLOYED: pushed to origin/main `84595e5`, merged with main's background sides / arc)
- NEXT (Nathan 2026-10-09, closing session 11): 3D sequence
- Hardscape system: roadmap steps 3 + 4 built (2026-10-09, session 13; committed and pushed, checked in the browser)
- Muse UX feedback fixes (2026-10-09; uncommitted, checked on the dev server)
- HTTPS live (2026-10-09)
- Stocking list replaces per-fish chips (2026-10-09, Nathan; uncommitted, checked on the dev server)
- Shuffle button (2026-10-09, Nathan; uncommitted, not yet checked in the browser)
- Species preview tile (2026-10-09, Nathan; committed, ships in the next deploy)
- Deployed 2026-10-09: build 63 (`e721433`), everything on main incl. the 3D pilot, Edit boxes, cabinet doors
- Split view: per-view "Edit" boxes (2026-10-09, Nathan; committed `80379ef`, deployed in build 63)
- Status (2026-10-09, session 11c: alpha fix on `fix-canvas-alpha`; 8-species pilot on `audit-3d`; neither merged)
- Status (2026-10-09, session 11b: four generic 3D fixes built on branch `audit-3d`, NOT merged)
- Status (2026-10-09, session 11: species audit (d) done; awaiting Nathan's call on the open points)
- Status (2026-10-09, session 10: 3D fish (a) markings + (b) cory shape built, committed, NOT pushed; awaiting Nathan's review)
- AqAdvisor stocking level (2026-10-09, separate chat; LIVE with the proxy)
- Status (2026-10-09, session 9: 3D fish style test built, NOT committed; awaiting Nathan's verdict)
- Status (2026-10-09, session 8: tank shapes phases 1 + 2 deployed `9286b85`)
- Roadmap (2026-10-09, agreed with Nathan)
- Status (2026-10-08, session 7: tank shapes phase 1 built, NOT committed)
- Status (2026-10-08, session 6: split-view polish deployed `eee6334`; spot-light grid committed `fda7d88`)
- Tank shapes + table stands (requested 2026-10-08; phase 1 built 2026-10-08 session 7, phases 2-3 not built)
- Status (2026-10-08, session 5: split tanks deployed)
- Status (2026-10-08, end of session 2)
- Water level + colour + swamp + frame stand: built and deployed (session 3, 2026-10-08)
- Custom terrain (Nathan's idea, 2026-10-08; built and deployed session 3, `2e9ce54`)
- Dry tank / terrarium (Nathan 2026-10-08: "TankLook, not AquariumLook"; built and deployed session 3, `2e9ce54`)
- Approximate tank weight (Nathan 2026-10-08; built and deployed session 3, `2e9ce54`)
- NEXT WORK UNIT: land + semi-aquatic species (Nathan 2026-10-08: "mixed land and water animals in the same tank")
- Split tanks: built and deployed (session 5, 2026-10-08)
- Next work unit: water level + water colour (requested by Nathan 2026-10-08)
- Fish art style (done 2026-10-08)
- Species, layouts, snails, custom sizes (2026-10-08; pushed for dogfooding, sizes table still to review)
- Decisions made (2026-10-08)
- Phase 2 build decisions (2026-10-08)
- Phase 2 plan (approved 2026-10-08, built as above)

