# TankLook (vivarium visualizer): handoff

Living file. Project state and dated decisions go here; update in place.

## NEXT (Nathan 2026-10-09, closing session 11): 3D sequence

Verdicts: alpha fix approved; pilot passed (geometry generation, NOT yet the final visual-quality test); generic 3D
architecture validated for rollout; head-on marking distortion is now a systematic problem: fix it before the full
rollout; the remaining 34 species are on hold until the merge and the mapping fix. QC list adds: the guppy's broad
tail becomes an edge-on sheet at extreme angles (acceptable for now).
Order, one work unit per chat:
1. DONE 2026-10-09 (session 12): `fix-canvas-alpha` merged into main (`1cd57d6`, local, not pushed). The other
   chats' uncommitted edits on main (middle-drag pan: `pointer.ts`, `viewer.ts`, `style.css`; round-tank spill:
   `lighting.ts`) were stashed for the merge and restored, still uncommitted. No textual overlap; tsc clean, tests 110/110.
2. DONE 2026-10-09 (session 12): the other chats' work committed first (`0ca1ac2` round-tank spill, `92cb931`
   middle-drag pan), then `audit-3d` merged (`5476b2e`): auto-merged, no conflicts (its alpha fix is the same
   change already on main, present once). tsc clean, tests 110/110. Visual spot check on the dev server, straight-on
   view of tiger barb, harlequin, clown loach, GBR, danio, dwarf gourami: all six draw in 3D, flank colours read like
   the cards, no white pectoral blades, no see-through. Main is local only, NOT pushed. Branches `fix-canvas-alpha`,
   `audit-3d` and their worktrees still exist (safe to delete).
3. Head-on marking wrapping: a GENERIC surface-mapping fix (not per species).
4. Verify it on discus, tiger barb, clown loach, harlequin (same four views).
5. Roll 3D out to the remaining fish, flat cards kept as fallbacks until each passes review.

## Muse UX feedback fixes (2026-10-09; uncommitted, checked on the dev server)

- Fish readout: calibration rows (px, measured ratio, d/(d+z), angle off side-on) only with `?debug` in the URL;
  normal users see name, size, depth and "Looks, vs. at the front glass: N % as big".
- Area labels: the canvas header says "288 in² floor" (interior); the Tank panel says "footprint 24.4″ × 12.2″
  outside the glass (298 sq in)". Muse read the two unlabelled numbers as a maths error.
- "New" asks for confirmation when either tank has animals.
- Species rows: name + tag and size on line one, the Latin name on its own line, no wrap, ellipsis.
- First visit (`tanklook.seen` not in localStorage) opens "How to use".
- Still open from that feedback: tick Enforce HTTPS (Pages settings, Nathan; http:// still serves 200 with no
  redirect); shareable scene URLs; a real mobile check.

## HTTPS live (2026-10-09)

The Pages certificate had never been issued (the site served GitHub's `*.github.io` cert, so browsers showed a privacy
error). Provisioning ran from Settings -> Pages once the custom domain was (re)checked; tanklook.com now
serves a Let's Encrypt cert for `tanklook.com` + `www.tanklook.com`. Remaining: tick Enforce HTTPS once GitHub enables it.

## Shuffle button (2026-10-09, Nathan; uncommitted, not yet checked in the browser)

"Shuffle" in the Fish section (next to Delete all) moves every animal to a fresh spot and pose, "a new slice in time";
one undo step, the same seed in every ticked split view. Ids, species, sizes kept. Rules (`src/scene/scatter.ts`
`shuffleFish`, which now also owns `randomPose` / `placeOnLand`): bottom dwellers on the ground, land / amphibious
animals via `placeOnLand`, snails via `spawnSnail` (floor or glass); swimmers in a band of the free water by the new
species field `level` ('top' 0.65-0.98, mid 0.2-0.8, 'low' 0.02-0.4); 3+ of a species with `group` 'school' form a
tight aligned school (heading ±12°), 'shoal' a loose group 2.2× wider (70 % follow the heading); big groups sometimes
split in two; everyone else is spread apart (best of 8 candidates). Data: school = neon, cardinal, ember, rummynose,
harlequin, chili, danio, tiger barb; shoal = cherry barb, livebearers, angel, discus, goldfish, corys, oto, kuhli,
clown loach, both shrimps; top = betta, the gouramis, guppy; low = cherry barb, GBR, Bolivian ram, kribensis.
Tests `test/scatter.test.ts` (117/117 total).

## Species preview tile (2026-10-09, Nathan; committed, ships in the next deploy)

Clicking a species in the Fish picker opens a tile under the list with its painted card (`drawFishCard`, or the
snail's side card), name, adult size, tag and note; clicking another swaps it, × closes it until the next click.
Canvases are cached per species (640 px wide). Shows the 2D card, not the 3D model. `panels.ts` `showPreview`,
markup `#spPreview` in index.html, `.spCard` / `.spHide` in style.css. Tests 114/114.

## Deployed 2026-10-09: build 63 (`e721433`), everything on main incl. the 3D pilot, Edit boxes, cabinet doors

**Version number:** the sidebar header shows "build N" (N = commit count on main, from `scripts/build-info.mjs` via
Vite `define`; CI checks out full history for it); hover shows date + commit. It rises by itself with every push.

## Split view: per-view "Edit" boxes (2026-10-09, Nathan; committed `80379ef`, deployed in build 63)

Replaces "click a view to choose which tank the panel edits". Each split view's tab has an **Edit** checkbox; the
panel's changes go to every ticked tank (one undo step). After a split only B is ticked (as before); at least one box
stays ticked (the last one is disabled). Store: `editOn` (UI state, not saved), `targets`, `isEditing(i)`,
`setEditing(i, on)`, `edit()` loops over targets, `editTank(i)` for direct drags, `cam(fn, i?)`, `nextId()` (one id
free in every tank, so an added fish shares its id and the selection covers both). `scene.active` = the ticked tank
the panel SHOWS; pressing in a ticked view shows it. An unticked view only orbits / zooms / pans (no fish or terrain
drags). Dragging a fish or terrain dot changes only that view's tank. Tank size / shape writes are per-tank (only the
changed dimension is copied); adds use one seeded RNG so both tanks get the same placement. A ticked view's tab
(card) gets the blue border; the viewport itself is not framed (Nathan 2026-10-09). **Panel rule (Nathan 2026-10-09, later):** split, the panel is open exactly while a box
is ticked: unticking the last box closes the panel, ticking one opens it, closing the panel unticks all, the
"› Edit" button re-ticks the tank last shown. `targets` may be empty when split (a single tank is always [0]);
`store.clearEditing()`; panels.ts `keepRule` enforces it after split / undo / load and at startup. Tests 114/114 (split.test updated + 4 new). Checked on dev-5 (port 5243, new in
launch.json): boxes, frames, message, lid / length edits to B only, both, A only; fish add to both.

## Status (2026-10-09, session 11c: alpha fix on `fix-canvas-alpha`; 8-species pilot on `audit-3d`; neither merged)

Nathan 2026-10-09: four fixes accepted; fix the canvas compositing first, kept separate; then an 8-species pilot
(danio, male guppy, dwarf gourami, German blue ram = `gbr`, harlequin, oto, clown loach, goldfish), four views vs
the card, acceptance: side silhouette not worse, 3/4 plausible, head-on recognisable, no egregious wrapping, no
lighting / transparency defects, no species code; record the configuration effort. Do NOT merge `audit-3d` into a
dirty main: reconcile `viewer.ts` / `lighting.ts` with the other chat's changes after it finishes, rerun tests, and
re-check the lighting visually. No more polish on tiger barb / angel / bristlenose. QC list: angel pelvic filaments
splay near head-on, angel dark upper-edge line, bars ringing heads near head-on. Backlog: sucker mouth + bristles as
reusable anatomical features.
- **Alpha fix** (worktree `../Glass-Box-alphafix`, branch `fix-canvas-alpha` = `3d4eb5c` + `49b713d`, launch config
  `alphafix` port 5233): `viewer.ts` only. Verified by reading the drawing buffer after a frame and decoding the
  exported PNG (`shots/_verify.js`): before 10,920 / 10,920 / 88,038 translucent pixels (blue water / frosted white /
  iwagumi stones: plant edges too), after 0 / 0 / 0 in both. Picture `shots/57_alpha_sheet.png` (each export over
  white and over the page colour: before they differ, after identical). Tests 110/110. Ready to merge into main
  once the other chat's `viewer.ts` edit is in (same function; small conflict expected).
- **Pilot** (`audit-3d` `aa68521`): all 8 passed on the FIRST data-only pass: one line each (`thick`; oto also
  `belly 0.8, wide 0.4, noseW 0.5, eye.up 0.3`; clown loach `belly 0.4`), no tuning round, no new code. Sheets
  `shots/58_pilot_A.png` (harlequin, danio, guppy, gourami), `58_pilot_B.png` (GBR, goldfish, oto, clown loach),
  `58_guppy_sheet.png`. Watch items: head-on wrapping of the GBR eye bar, clown loach bars, danio stripes and the
  harlequin patch (same QC item as above); goldfish reads ball-like at 50° (the card is a fancy goldfish, not the
  common one Nathan named). Effort: configuration is minutes per species; the real cost is the four-view review.

## Status (2026-10-09, session 11b: four generic 3D fixes built on branch `audit-3d`, NOT merged)

**Nathan's decisions (2026-10-09, on the audit):** general 3D approach approved. Verdicts: tiger barb pass, kuhli pass
(most important: a radically different length/depth ratio with no special generator), bristlenose conditional
(geometry works; head, eyes, mouth, bristles not pleco enough yet), angelfish needs revision (round body lost the
identity). Do the four generic fixes before any rollout; add the straight-sided outline NOW and redo the angel (target
= the hand-drawn silhouette; angular but with some convexity, narrow peduncle, data-driven, not an angel exception).
Do NOT merge `audit-3d` or mass-convert yet. After the fixes: a production PILOT of 6-8 species spanning body plans,
then the full rollout; flat cards stay as the fallback until each 3D model passes its visual review.
Pre-release checklist item: bars ringing the head at extreme angles (tiger barb, angel). Later: reusable anatomical
features (ventral sucker mouth, snout bristles) for the bristlenose, not a reason to drop the generic geometry.

Built (worktree `../Glass-Box-audit3d` on branch `audit-3d`, commit `1e34b03`; launch config `audit3d`, port 5223;
pictures in that worktree's `shots/`: `55_tigerbarb_lighting.png`, `56_angel_sheet.png`, `56_bristlenose_sheet.png`,
`56_angel_card.png`). Tests 110/110, tsc clean.
1. **Lighting** (`lighting.ts`): fish facing is measured against the flank facing the viewer (`aqFishFacing`, slope
   0.5 both ways), so a side view equals the card under the reference flat light; the old fish "roll-off" boosted
   darks up to 1.7x (that, not the key, washed out the pleco) and is now a shoulder above 0.6; fish saturation = card
   (1.35). Tiger barb flank luminance: card 143, 3D before 161, now 142.
2. **Pectorals**: the "white blades" were a RENDERER bug: the canvas has alpha, and alpha-to-coverage fins wrote
   alpha < 1, so the page (on screen) or the PNG viewer's background (white) showed through every translucent fin,
   cards included. Fix in `viewer.ts`: alpha writes off while the scene draws. Also pectoral tint 35% toward the
   flank colour, softer spine. Candidate to cherry-pick to main on its own (affects live cards' fins too).
3. **Outline**: `Plan.angular` 0..1 (straight lines from peduncle and nose, smooth-min apex), fin shape `swept`
   (straight-edged sails), `pelvic.angle` (thread steepness). Angel: `angular 0.8, peak 0.375`, swept dorsal/anal,
   filament at 68°. Card now close to the hand-drawn one (`56_angel_card.png`).
4. **Eyes**: `Plan.eye.up` 0..1 turns the 3D eye along the section from the flank toward the top of the head
   (`EYE_TOP` 0.5 rad); bristlenose 0.7.
Next: Nathan reviews the three sheets; then the pilot (6-8 species).

## Status (2026-10-09, session 11: species audit (d) done; awaiting Nathan's call on the open points)

Dev server `dev-4` (port 5213) added: other chats held 5173/5183/5193. Card sheets: `scripts/card-sheet.js`
(`sheet(name, ids)`, before = pre-3D art modules copied from `de92c7f` into `shots/_art_before/`, after = `src/art`).
Stress-test sheets: rows card / 3D, same four views. Pictures: `shots/50_cards_{a,b,armour}.png`,
`shots/52_{tigerbarb,bristlenose}_sheet.png`, `shots/54_{angel,kuhli}_sheet.png`, `shots/54_angel_kuhli_card.png`.
Gotcha: the browser pane is 0×0 while hidden, so `exportPNG` fails; `resize_window` 1280×800 first. Bottom fish
leave the frame at high zoom: use zoom 2-2.6, `mult: 4`, small `crop`.
- **1. Card regressions from the paint pass (21 species checked, incl. hand-drawn neon / gourami / angel, shrimp,
  frog):** eyes, patterns, silhouettes and fins all intact. Changes are the intended ones (scale net, tone mottling,
  mouth line). One real regression, fixed ON MAIN: armoured catfish (panda cory, bristlenose, oto) got a fish-scale
  net; now `plates: true`. Minor, not changed: danio stripes slightly muted by the tone multiply; black molly shows the
  scale net strongly.
- **2. 3D stress tests: the loft generalises; the gaps are plan vocabulary + two generic rendering issues.** Species-
  specific CODE needed: none for any of the four (no `if species`). Per species (branch `audit-3d`, not on main):
  - tiger barb (ordinary): `thick: 0.38` only. Convincing.
  - kuhli: `thick: 0.85` + one generic fix ON MAIN: pectoral length capped at 0.75 × body depth (changes only kuhli;
    it had tetra-sized "wings"). Convincing as a striped tube.
  - bristlenose: `thick 1.3, belly 1, wide 0.6, noseW 0.8` (fields from the cory). Shape reads as a flat-bellied
    pleco. Open: eyes sit on the flanks (plecos: on top of the head; needs a generic eye-elevation field); bristles
    and sucker mouth are not 3D (would be species features = new code); paler than its card (see lighting below).
  - angelfish: hand-drawn, so it needed a full Plan (data; replaces the hand-drawn card with generated art) + one new
    generic fin shape `swept`. Loft handles the tall compressed body well. But the generated card is WORSE than the
    hand-drawn one: body is a disc, not the angel's diamond (`profile` can only make convex curves; needs a generic
    straight-flank option), fins still rounder than the hand sails.
  - Generic issues seen on all: (a) the flat-light key in fish mode (`lighting.ts`, `1 + 0.6 n·L`) brightens the
    3D flank ~1.2× and an up-facing back ~1.55× vs the card, so dark, broad-backed fish wash out (bristlenose);
    (b) 3D pectorals read as bright white blades (tiger barb, angel). (c) Bars still ring the head near head-on
    (soft, known).
- **Recommendation:** expand 3D to all species (step 2), after a short generic list: eye elevation, straight-flank
  profile option, key-light normalised to the flank, pectoral brightness. Keep angel hand-drawn (no 3D) until the
  profile option exists.

## Status (2026-10-09, session 10: 3D fish (a) markings + (b) cory shape built, committed, NOT pushed; awaiting Nathan's review)

Deployed first: the other chat's spot-light / size-label commit `305e490` only (pushed `305e490:main`; live on http and
github.io; HTTPS tanklook.com did not connect from here). The 3D fish commits stay local until Nathan approves.
Pictures (same four views, LEFT before = session 9, RIGHT after): `shots/48_discus_sheet.png`, `shots/49_cory_sheet.png`;
cardinal unchanged `shots/48_cardinal_*`. Toggle `__gb.fish3d.fade` (off = session-9 look, for pictures).
- **(a) Discus "eye-bar ring": root cause was the CARD, not the body texture.** The card's painted body rim (outline +
  bar) stuck out past the solid and read as a dark hoop at the head seen at an angle. Fix (all 3D species): the card of
  a 3D fish is cut out (`drawFishCard(..., hollow)`), past the outline where no median fin is rooted, 0.012 inside it
  at the dorsal / anal / adipose / tail roots. Needed `ctx.save/restore` round the art (an art leaves a clip set).
- Also general: on the 3D body, paint fades to a blurred copy (`PLAIN_BLUR` 0.03 W) where the surface turns away from
  the side (`aSide` = |n.z| attribute) and, mildly, where it is seen edge-on (shader, `uPlain`, program key 'p'). Colour
  fields stay (cardinal red holds), narrow bars and bands go soft. A faint far-flank arc remains near head-on (real).
- **(b) Cory**: new optional Plan fields, generic for the audit's stress tests (pleco, kuhli): `belly` (boxier lower
  half), `wide` (section widest low +), `pedT` (thickness at peduncle), `step` (head narrower than trunk from the gill
  cover), `noseW` (thickness kept to the snout: shovel). Cory: 0.9 / 0.5 / 0.28 / 0.18 / 0.4. Surface lookup is now
  numeric (`ringPt`, `thetaAt`, `normalAt`), so eyes and fins follow any section shape. 3D barbels: two tapering pairs
  per side (`barbelMeshes`, from `Plan.barbels`); the card / body texture no longer paints barbels for 3D fish.
  Not done (time-box): cory-specific dorsal (spine), stronger head step, side-profile changes.
- **Review pictures tooling**: dev-only `/__shot` endpoint (`scripts/shots-plugin.mjs`, in vite.config) saves PNGs to
  `shots/`; `scripts/shot-helpers.js` (`views(prefix, species, {zoom, crop, dist, mult})`) shoots the four views
  before/after, crop centred on the fish. Third dev server `dev-3` (port 5193) in launch.json.
- **Next (agreed):** Nathan reviews the two sheets; then (d) the audit: 1. card regressions from the global paint
  changes; 2. (more important) kuhli loach, bristlenose pleco, angelfish in 3D with as little species code as possible.

## AqAdvisor stocking level (2026-10-09, separate chat; LIVE with the proxy)

**State (2026-10-09):** proxy deployed on Nathan's personal Cloudflare (nathangoughreed@gmail.com, workers.dev subdomain
`tanklook`): https://tanklook-aq.tanklook.workers.dev, URL in `.env.production`. Redeploy: `npx wrangler deploy` in
`worker/` (wrangler login done on this PC). Nathan 2026-10-09: the % shows in the size label above the tank
("24 × 12 × 12″, 15 gallons, 288 in² | Stocking 72% (AqAdvisor)", red over 100 %, click = AqAdvisor's full report) and
updates by itself 1 s after the stocking or size settles (no Check button); single-tank view only (split tabs show
differences). Fish panel keeps a readout + "Not counted" note. Panel sections start collapsed on every load.
Same push shipped the approved 3D fish (`f77f791`, `66c69af`). Nathan's fish review (2026-10-09): discus pass, cory
pass for this iteration (still smooth / egg-shaped head-on, weak head-trunk step, generic dorsal; stop there);
**next work unit = the species audit** (kuhli, bristlenose, angelfish + one ordinary species, same multi-angle sheets).
- **Species policy (Nathan 2026-10-09), applies to every future species addition:**
  1. Choose which fish to add next from AqAdvisor's published most-popular list (location not found yet: not linked
     from the calculator, its articles or the report page; ask Nathan for the URL).
  2. Prefer species that are on AqAdvisor; add each new one's AqAdvisor name to `NAMES` in `scripts/aqadvisor-ids.py`
     and rerun it (only new / changed names are requested).
  3. Species not on AqAdvisor: count them as a similar fish in size and type (`STAND_INS` in the same script, flagged
     `standIn`; the Fish panel says "counted as a similar fish"). Now: axolotl = Dojo Loach, fire-bellied newt = Zebra
     Loach, fire-bellied toad = White Cloud Mountain Minnow. Land-only animals (dart frog, White's tree frog) stay
     uncounted.
- AqAdvisor has no API but its form is a stateless GET: `AlreadySelected=<id>:<n>::,...` + tank in inches +
  `FormSubmit=Update` returns "Your aquarium stocking level is N%". Filter choice doesn't change the %. http only, no
  CORS -> needs a proxy. No robots.txt (404).
- `src/data/aqadvisor.json`: 37 TankLook species -> AqAdvisor ids (all aquatic species; the 5 herps aren't in
  AqAdvisor and show as "Not counted"). Rebuilt by `scripts/aqadvisor-ids.py`. Choices: rummy-nose = H. bleheri,
  betta = male, goldfish = fancy, cherry shrimp = Red Cherry (N. heteropoda), nerite = zebra.
- `src/data/aqadvisor.ts`: request per tank (non-rect tanks: depth = floor area / length, so bottom area and volume match the real tank; Nathan: stocking goes by bottom area),
  link URL, `fetchStocking`. Proxy URL from `VITE_AQ_PROXY` (unset = link only, the current production state).
- `worker/aqadvisor-proxy.js`: Cloudflare Worker, only accepts well-formed `/stocking` requests, CORS for tanklook.com
  + localhost, 7-day cache. `worker/dev.mjs` runs it locally (launch configs `aq-proxy` + `dev-aq`, port 5203, with
  `.env.aq.local`). Deploy steps: `worker/README.md` (needs Nathan's own Cloudflare account; Claude can't create it).
- UI: Fish section, "Stocking  [Check]  AqAdvisor ↗"; result "72% (per AqAdvisor)", red with ", overstocked" over
  100 %. Verified in the browser: default tank 72 %, same as aqadvisor.com for the same link. Tests 110/110, tsc clean.

## Status (2026-10-09, session 9: 3D fish style test built, NOT committed; awaiting Nathan's verdict)

Roadmap step 1. Started late in the weekly window by Nathan's choice. `npm test` 104/104, `tsc` clean, checked in the browser
(dev server `dev-alt`, port 5183). Pictures: `shots/46_{discus,cardinal,bronzecory}_sheet.png` (before/after; straight on,
50° right, 25° above, 75° near head-on).
- **`src/render/fish3d.ts`** (new): a solid body lofted from `profile(plan)` (now exported from fishgen) between `pedU` and
  the nose: 40 stations (denser at the nose) × 28-point superellipse rings (exponent 2.4), with a capped peduncle.
  Thickness = `Plan.thick` (new optional field: max thickness / max depth; cardinal 0.42, discus 0.2, bronze cory 0.72)
  × depth, fuller toward the head. UVs = side projection of the existing card texture onto both flanks. Inset 0.006 W
  inside the painted outline, plus a colour-bled copy of the texture (opaque material), so the nose never shows the black
  of empty texels (seen on the first pass). Vertex colours darken the underside slightly. Geometry cached per
  species + bend (0.05 steps), `userData.keep`; material cached per texture.
- **Wiring** (build.ts): the body is a child of the existing card mesh, so the card stays as the fins (its painted body
  sits inside the solid) and picking, selection outline, rest offset and TL are unchanged. Only species in
  `fish3d.species` (the three above) with `thick` set; `fish3d.on` toggles (dev handle `__gb.fish3d`).
- Seen in the pictures: side view identical (as intended); the difference shows from 50° on and is clear near head-on
  (card goes edge-on, body keeps its volume). Artefacts: side projection stretches paint over the back and belly (cory's
  gill line becomes a crease over the top; discus bars wrap onto the front face); the far eye shows past the snout at
  50° on the thin discus; paired fins (pectoral, pelvic) are still painted on the flank, not 3D.
- Not done: bend shape check, a2c vs cutout check, performance with a school.

**Nathan's verdict (2026-10-09): "too cartoony... doesn't match how good and crisp the rest of the model displays."**
The 3D shape is not the problem; the procedural PAINTING is (flat saturated fills, blurred bands, no sheen / scales,
fins as tints). Picture `shots/47_cartoon_cues.png`. Decision pending: how to get realistic texture (see options in the
session 9 chat: photo textures on the 3D body vs a procedural realism pass vs bought models); this reopens the
art provenance policy.
Nathan 2026-10-09: NOT buying models; Meshy (AI image-to-3D) "seemed cool". **Proposed next work unit (fresh chat after the
weekly reset):** a head-to-head on cardinal, discus, bronze cory, same four views as `46_*_sheet`: (a) Meshy GLBs that
Nathan generates himself (Claude cannot make accounts; check Meshy's output licence per plan and that the reference
images are his or CC), loaded with GLTFLoader, scaled to adult TL, compressed by script (gltf-transform, no Blender),
water lighting via `aqPatch`; vs (b) CC-licensed photos (e.g. Wikimedia Commons, credited) projected onto the
session-9 loft. Ask Nathan before each download. Watch: fused or opaque fins in AI meshes; single-file size (about
10-20 MB for 42 Meshy fish vs 0.57 MB now; the website could load them on demand).

**Nathan 2026-10-09: "let's see how well we can refine the models without Meshy."** Realism pass done in session 9
(same three fish, sheets `shots/46_*_sheet.png` regenerated; uncommitted, tests 104/104):
- **Bug found:** the first 3D sheets were wrong. The loft's triangles were wound inward, so FrontSide culled the near
  flank and the pictures mostly showed the flat card. Fixed (`idx` order in `bodyGeometry`). Nathan's "too cartoony"
  verdict was on those broken pictures.
- Shader fish mode (`userData.fish` -> `uFish`, program key 'f'): facing = 1 + 0.6 n·L, Blinn highlight (x0.16), faint
  edge sheen, saturation 1.28, a soft roll-off instead of the hard max clamp (which erased form shading). In flat light
  (the default!) fish get a fixed key from above-front; without it the 3D body had no shading at all.
- Painting (affects every species' card too): eye with a shaded socket, faint rim, dim catchlight; tone multiply over
  markings (darker back / belly + mottling); scale net (`scales`, `Plan.scale`, default 0.024 W, discus 0.014);
  corydoras plates (`Plan.plates`); wavy bands (`band.wave`, discus); mouth line; fins at alpha 0.36 with a2c (cutout
  keeps 0.62; `fishTexture(id, edge)`).
- 3D body uses `fishBodyTexture` (painted with `style.features = false`: no eye / gill / mouth, which smeared over the
  curved head) with the nose tip blurred; real eyes = flattened domes along the surface normal, set in (`eyeSpot`).
- Nathan's review (2026-10-09): "materially closer... first real proof 3D fish can work". Discus best, cardinal good,
  bronze cory weakest (smooth blimp; needs ventral flattening, head structure, barbels, plated feel). Agreed order:
  (1) real fins, (2) contact shadow, (3) stretched markings, (4) species geometry (cory first).
- **(1) + (2) done:** pectoral + pelvic fins are their own membranes on both flanks (`pairedFins` / `drawPairedFin` in
  fishgen, `pairedFinTexture`, `finMeshes` in fish3d: rooted on the surface, pelvic swung 0.6 rad about the body axis,
  pectoral 0.75 rad about a vertical base + 0.25 down), with a dark leading spine; the 3D species' card and body texture
  leave them out (`style.paired`). Pectoral length 0.17 of the body (was 0.12; card too). Contact shadow for EVERY fish
  (build.ts `contactShadow`: soft ellipse on the ground, 0.5 x exp(-lift / 0.8 TL), widens with height). Cory plates
  kept off the back and belly (they ringed the body).
- Nathan's review of fins + shadow (2026-10-09): "credible low-complexity 3D aquarium assets"; remaining issues are
  species-specific polish, not viability. Cory improved most but is still weakest: head-on view too smooth / generic;
  wants a flatter belly, a less symmetric torpedo, a shovel-like head with a clearer head-to-trunk step, a more
  distinct peduncle, a cory-specific dorsal, and visible barbels. Cardinal: broadly convincing (slightly capsule-like
  head-on); don't spend more there yet. Discus: strongest; its eye-bar wrap is the most distracting texture issue.
  **Agreed order:** (a) stretched markings, (b) cory shape + barbels, (c) subtle cues (fin posture, tetra head), then
  (d) a quick audit of a representative subset of the other 34 species, to check the pipeline generalises
  (detail density, fin treatment, art that converts badly to 3D). Not a polish pass.
- **Nathan 2026-10-09 (session 10), plan refined:** validate the general method, don't build three beautiful exceptions.
  - (a) + (b) stay but are TIME-BOXED: fix the discus eye-bar wrap and reshape the cory, no further polish on either.
    Review = the same four views as `46_*_sheet` (straight on, 50° right, 25° above, 75° near head-on), before/after,
    so only those two changes show.
  - (c) subtle cues: deferred until after the audit.
  - (d) audit answers TWO separate questions:
    1. Regressions from the global paint changes on the other species' CARDS: eyes, patterns, scale texture, fin
       visibility, recognisable silhouettes.
    2. **(more important)** Does the 3D loft handle structurally different body plans? Stress tests: **kuhli loach**
       (eel-like), **bristlenose pleco** (flat-bellied, depressed, sucker mouth), **angelfish** (tall, laterally
       compressed, long fins; hand-drawn, may need a plan). Count the species-specific code each needs: convincing
       with little of it = the approach scales; lots of it = rethink parts of the architecture before step 2.
  - The audit's outcome decides: expand the 3D pipeline to all species, or rework the architecture.
- **Next: (3)** stretched markings: side projection smears where the surface turns away from the side (discus eye bar
  rings the head). Then (4) cory geometry. Not checked yet: the global paint changes on the other 34 species' cards.
- **Committed 2026-10-09 (session 10):** the other chat's spot-light pattern / spacing / beam angle and size label as
  `305e490` (split.test updated to the new label), session 9's 3D fish as `f77f791`. Not deployed. Tests 104/104.

**(superseded)** Nathan judges the direction. If yes: fixes for the artefacts above (eye and gill per flank instead of projected,
real pectoral fins), then roadmap step 2 (all 42 species, a `thick` per plan; hand-drawn neon / gourami / angel need plans
or their own loft).

## Status (2026-10-09, session 8: tank shapes phases 1 + 2 deployed `9286b85`)

Built on top of the uncommitted phase 1. `npm test` 104/104 (new `test/table.test.ts`), `tsc` and `vite build` clean,
checked in the browser (dev server `dev` on 5173), shots `shots/28_table_*`.
- **Stand style 'table'** with `stand.table { shape: 'rect' | 'round', L, D, x, z }` (mm; x, z = the tank's offset from
  the table centre, x right, z toward the back). Always present, kept while another style is chosen; older files get
  the default 36″ × 18″ top. No version bump (like `light.rows`).
- **`scene/table.ts`** (new): `fitTable` (run in `store.update` and on load) grows the top to hold the tank's rim
  outline (never shrinks), round keeps D = L, clamps the offset so the outline stays on the top; `tableRange` = slider
  limits; `roomBox` / `wallPlane` = tank glass ∪ table top, used by the wall (build), the orbit limit (`orbit.ts`), the
  person (wall check, and half-width taken from the table's edge too) and the view map.
- Renderer: top (32 mm) + apron set 50 mm in + four square legs (round: at the diagonals), finish colour. Camera
  framing includes the table's corners. View map draws the top under the tank.
- UI (Room): Table option; Rectangular / Round; length + depth (or diameter); tank left/right and front/back sliders;
  Centre / At the back / At the front buttons. Split diff lists table size and tank placement.
- **Deviation from the brief**: tank placement is sliders + buttons only, no drag-to-move mode (the brief allowed
  either). Add drag later if the sliders feel clumsy.
- Not checked: split view with two tables; PNG export with a table.

**NEXT:** roadmap step 1, the 3D fish style test (see "Roadmap (2026-10-09)" below). Tank shapes phase 3 (exact
lighting water path for shaped tanks, layouts tuned per shape) is still open; "layouts tuned per shape" folds into
roadmap step 3, where layouts become starter sets.

## Roadmap (2026-10-09, agreed with Nathan)

Nathan's goals: better-looking fish and plants; custom placement from a large library of hardscape (rock, caves,
wood) and plant species; more animals, including saltwater. **Static render only, still no animation.**

**Decision: fully 3D fish, built from the existing parametric body plan (`src/art/fishgen.ts`), not sourced models.**
- Performance is not a concern: about 2-4 k triangles per fish, so even a 200-fish tank stays under 1 M triangles. Build
  each species' geometry once, cache it and share it (InstancedMesh or a shared BufferGeometry); never regenerate it
  per rebuild (the scene rebuilds on every drag step). The `aqPatch` lighting (`onBeforeCompile` in
  `render/lighting.ts`) applies to any material, so 3D fish get the water lighting unchanged.
- Method: loft a body from the side profile with a width per station (add width to `Plan`); project the painted side
  texture onto both flanks; fins stay thin membranes (a2c, one alpha per fin). Nose-to-tail stays exactly adult TL.
  A static pose (curved body, tilt) becomes possible.
- Rejected: downloaded or bought glTF models (blocked by the art provenance policy, inconsistent style, the single file
  grows from about 0.57 MB to several MB, sourcing every species forever); AI-generated 3D (unclear rights, uneven
  quality).

**Reversal (Nathan 2026-10-09): custom hardscape and plant placement is now wanted** (replaces the 2026-10-08 call
"layouts are presets only").
- Scene items: each rock, wood, cave or plant carries `{kind, variant, seed, position, rotation, scale}`; pick and drag
  like fish, plus rotate and scale. Existing layouts become starter sets that place editable items. This needs a scene
  version bump plus a migration.
- Library = procedural generators with a seed, so variety costs no file size and needs no licence. Stones: seiryu,
  dragon stone, lava, river, slate. Wood: spider, manzanita, mopani, branch. Caves: stone arches, tubes, coconut.
- Plants become real 3D (leaf cards arranged along stems, per species: java fern, anubias, crypts, swords, vallisneria,
  stem plants, carpets), replacing the crossed cards.

**Saltwater last**, since it reuses both systems: a fresh or salt setting on each tank (filters the species list),
marine fish via the 3D generator, live rock and corals (branching, plate, mushroom, soft) as library items,
aragonite sand and clearer blue water presets.

**Order (one work unit per session):**
1. 3D fish style test: three fish, before/after pictures at the default 1200 mm, Nathan judges the direction.
2. Roll 3D out to all 42 species.
3. Placeable scene items + pick/drag/rotate/scale; layouts become starter sets.
4. Hardscape library.
5. 3D plant species.
6. Saltwater.

## Status (2026-10-08, session 7: tank shapes phase 1 built, NOT committed)

Spot-light grid committed as `fda7d88`. Then phase 1 of tank shapes (brief below), uncommitted, `npm test` 98/98,
`tsc` and `vite build` clean, checked in the browser (dev server `dev-alt` on 5183, since another chat held 5173):
- **Scene v8**: `Tank.shape?` 'rect' | 'bow' | 'round' | 'poly', `sides?` (3/5/6), `bowMin?`. A rectangle is stored
  as plain `{L, H, D}` (no shape key), so v7 files and rect tanks are unchanged. `normTank` enforces: round D = L,
  poly D = L x polyRatio(n), bow bowMin between max(20, D - L/2) (arc at most a half circle) and D.
- **`scene/shape.ts`** (new): footprint (walls = flat panes or one curved shell; ring; edges with outward normals),
  inside / insideBy / clampIn, nearestGlass + glassAt (point, smooth normal, arc length), offsetWalls / offsetRing
  (mitred, so rect outer glass is exactly (L+2t) x (D+2t)), clipToFootprint, chord, halfWidth, facingRuns.
  Polygons have a flat face toward the viewer (triangle: point to the back). Front-most point is at depth 0 on the
  centre line for every shape, so the camera / `dist` / orbit needed no change (answer 2).
- **Snails (answer 4)**: `Surface` is now 'floor' | 'glass'; a glass snail's (x, depth) IS its point on the glass
  (deviation from the brief's "wall index + arc length": same information, and no extra fields). v7 'front' etc.
  migrate to 'glass' with the coordinate snapped onto that pane. Rendered at nearestGlass, foot toward the local
  normal; dragging slides over the glass (the drag plane turns with it, so snails round curves and corners).
  spawnSnail weights floor area vs perimeter x wetted height.
- Renderer: panes from the outline (custom prisms, wound outward; EdgesGeometry at 20° so a curved shell shows no facet
  seams), bottom pane, rim rings, background on the glass facing the room wall (wraps round the back of round /
  angled tanks), wall + floor grid, water surface + meniscus, substrate grid clipped to the outline + skirt, terrain
  dots outside the outline hidden, cabinet = extruded outline with doors on the front-facing run (curved on a bow),
  frame stand = legs round the outline, hood warped to the bow, glass lid = one plate for non-rect, person half-width
  from the outline, view map draws the outline. Layout items clamped into the outline (non-rect only, so rect
  layouts are unchanged). Volume = area x H; weight masks the grid and uses outer-minus-inner ring for the glass
  (identical to the old rect formula, tested).
- UI: Shape select, Sides 3/5/6, bowfront End depth slider, labels Diameter / Width / Centre depth, Depth input locked
  for round / poly. Hood and peninsula end buttons disabled for round / poly; switching to those shapes turns a hood
  into a glass top and a peninsula into a back wall.
- Not done (by plan): lighting shader still uses the bounding box for the water path and spill (phase 3); table stand
  + tank placement (phase 2). Not checked: split view with two different shapes, PNG export of a shaped tank.

**NEXT:** Nathan reviews the shapes (`shots/27_*`), then commit + deploy; then phase 2 (table stand).

## Status (2026-10-08, session 6: split-view polish deployed `eee6334`; spot-light grid committed `fda7d88`)

Shipped in `eee6334`: panel collapse button outside the panel; locked views share one image window (equal tanks line
up); person framing from the card's real edges; stocking diff ignores the resize rescale; × on each difference makes
that tank match the other (`DiffItem[2]` = match fn); tab "× Close" hides the tab (☰ chip restores), "Delete" removes
the tank; one viewpoint map per view with its own hide/show; orbit cannot pass through the room wall
(`scene/orbit.ts`, 150 mm clearance, also enforced after edits and on lock); peninsula cabinets get back doors;
renamed "Vivarium Visualizer". After that (not yet committed): spot lights form a count × rows grid
(`light.rows` 1-4, default 1, no version bump). `npm test` 88/88.

**NEXT WORK UNIT: tank shapes + table stands** (Nathan 2026-10-08), ahead of land + semi-aquatic species below.

## Tank shapes + table stands (requested 2026-10-08; phase 1 built 2026-10-08 session 7, phases 2-3 not built)

Request: circular, regular triangle, pentagon, hexagon, bowfront ("model it as a rectangle but just have min and max
widths and have the tool do a smooth curve between them"); stand geometry for each; and a stand that is a table
(rectangular or circular) with the tank movable along its top.

Survey of rectangular assumptions done 2026-10-08 (Explore subagent): about 40 sites. Biggest risks: the glass pane
generator (build.ts addTank 35-78, five BoxGeometry panes), the substrate mesh (addSubstrate 279-315, quad grid +
4 side strips), snail `Surface` enum ('front'|'back'|'left'|'right', physics spawnSnail, build snailMeshes 398-424),
and the lighting shader's axis-aligned water box (lighting.ts uWater/uTankMin/Max, aqWaterPath).

Proposed design (for Nathan to confirm at the start of the work unit):
- **Scene v8** `tank.shape`: 'rect' | 'bow' | 'round' | 'poly' (+ `sides` 3/5/6, + `bowMin` = end depth for 'bow').
  Keep L/H/D as the BOUNDING BOX (bow: D = centre depth; round: L = D = diameter; poly: width across, D derived), so
  the heightfield (u = x/L, v = depth/D), camera, walls, orbit, diff and fish storage keep working.
- One new helper, `footprint(T)`: outline polygon (round ~64 segments, bow front ~32) plus inside / clamp-to-inset /
  area / perimeter. Everything else calls it: clampFish, nearestWater/Land/randomLand, fitFish, spawn, pointer drag,
  volume, tankWeight (mask the grid), water plane + meniscus, substrate (clip the grid to the outline, skirt along it),
  glass (extrude the outline ring; flat panes per edge, curved = one shell), rim, glass lid, view map (polygon),
  person half-width, stand footprint.
- Bowfront curve: back flat; front goes from `bowMin` at the ends to D at the centre along a smooth curve (circular
  arc through three points is the real-world shape; confirm).
- "Eye distance from the front glass" for non-rect shapes = from the front-most point of the outline.
- Hood: rect and bow only; other shapes get open top or glass lid. Peninsula end walls: rect and bow only (or: wall
  sits against the bounding box; confirm).
- Snails on glass: phase 1 only on flat panes of rect/bow/poly (Surface becomes pane index + position); round: floor
  only until curved-glass snails are built.
- Lighting shader: phase 1 keeps the bounding-box water path (small error outside the outline, where there is no
  water to see through); exact prism/cylinder path later if it shows.
- **Stands**: cabinet = footprint extruded (doors on the front-facing flat faces); frame stand = legs at the outline's
  vertices. **Table**: new stand style with its own top (rect L×D or round diameter, thickness, legs) larger than the
  tank; `stand.table { shape, L, D, x, z }` = the tank's offset on the top, clamped so the footprint stays on it.
  Move the tank by dragging it in a "move tank" mode, or with two sliders. Walls and person go relative to the
  table edge when a table is used (confirm).
- **Nathan's answers (2026-10-08), these override the proposals above:**
  1. Bowfront front = a true circular arc through (0, bowMin), (L/2, D), (L, bowMin). Yes.
  2. Eye distance: "whatever is most analogous to how it's done now". Now: `dist` = eye to the centre of the front
     glass, straight on. So for every shape, `dist` = eye to the front-most point of the outline on the tank's
     centre line (round: the front of the circle; bow: the bow's apex; poly: the front vertex or the front face's
     midpoint, whichever is nearer the eye). Orbit stays about the bounding-box centre.
  3. Hood and peninsula end walls: rect and bow only, for now.
  4. Snails on curved glass: build it NOW, not later ("we will have to revisit... easier now"). So the Surface
     model becomes general in this work unit: a glass wall index + position along the outline (arc length) + height,
     for flat panes AND the curved shell (round and bow front), with the snail oriented to the local glass normal.
  5. With a table stand, the wall and the scale person sit relative to the table's edge. Yes.
- Phases: (1) footprint + shapes + glass + water + substrate + fish + snails on any glass (answer 4) +
  volume/weight + view map + cabinet; (2) table + tank placement (answer 5); (3) exact lighting path, layouts tuned
  per shape.

## Status (2026-10-08, session 5: split tanks deployed)

Open next: Nathan's review of the amphibian art + sizes (`shots/26_amphibian_cards`), then climbing.

## Status (2026-10-08, end of session 2)

**Live at tanklook.com** (GitHub Pages, push to `main` = test + deploy in ~1-2 min; last deploy `80a860d`).
Repo: github.com/nathangoughreed-star/tanklook (public; commits use the GitHub no-reply email via repo-local git
config, never the work address). `gh` is not installed. HTTPS: check the Pages certificate, then tick Enforce HTTPS.
**Domain: tanklook.com** (bought by Nathan 2026-10-08 at Namecheap, 1 year; personal learning project).
Phase 1 PoC kept at `reference/aquarium-poc.html`. Vite + TypeScript, see README.md. `npm test` 45/45, build clean.

Shipped by end of session 2: restyled fish art, 37 species (generated body plans), bottom dwellers, snails on
floor/glass, aquascape presets, custom fish sizes, fixed orbit lens, scale person (stays put), viewpoint map,
peninsula wall, room lighting with tank spill, default eye distance 3 m. Details in the sections below.

Verification method for looks: dev page + `window.__gb = {store, viewer}`; `viewer.exportPNG(n)` POSTed to a
throwaway local python sink (port 4199) writing `shots/` (gitignored); pictures sent to Nathan with SendUserFile.
Note: another chat's dev server may already hold port 5173 (same folder, HMR works): open http://localhost:5173.

## Water level + colour + swamp + frame stand: built and deployed (session 3, 2026-10-08)

- **Scene v5** `water { level, color, opacity }`. Deviation from the proposal below: `level` is a **fraction of full**
  (0.1-1; 1 = `WATERLINE_GAP` below the top), not mm, so Tank B and a resized tank keep the same fill (fish map by
  fraction too). `waterY(T, level)` in physics.ts. v4 files load full / clear.
- **Tint** (lighting.ts `aqWaterPath`): every lit material blends toward the lit water colour by
  `1 - exp(-k * path)`, path = length of the eye-to-point sightline inside the water box (slab test), so it works for
  fish, plants, substrate, the background and the room seen through the tank; nothing above the water is tinted.
  `opacity` = share of the colour after 300 mm (`waterK`): physical, so a deeper tank looks more tinted.
- Surface: a faint transparent plane at the level + a meniscus line round the glass (edge-on straight on).
- **Fish in the water**: `scene/water.ts`. `keepInWater` runs after every 'scene' store update and on load (swimmers:
  centre <= surface - half card height; glass snails below the line; bottom dwellers / floor snails untouched).
  The level slider uses `setWaterLevel`, which scales swimmers' heights with the water so schools keep their shape.
  Render also clamps per tank (Tank B). New fish / schools spawn relative to the water; snail spawn takes the line.
- UI: Water section (Level, Tint, colour picker, quick picks Clear / Blackwater #6b3d14 60 % / Green #5d8a2e 50 %;
  picking a colour on clear water sets tint 30 %). Tests 52/52.
- Pictures: `shots/12_water_full_clear` .. `17_blackwater_low_orbit`.
- **Swamp (Nathan 2026-10-08: no preference between layout and terrain setting -> built as the recommended layout
  preset; snails may sit on land too).** `scene/terrain.ts`: `groundHeight(S, T, x, d)` = substrate, or swamp land
  where higher; it replaced `substrateHeight(S.substrate, ...)` everywhere in the renderer. Land ~62 % of H (gentle
  waves, a bit lower at the front), 1-2 elliptical pools with smooth banks; pool 1 always opens onto the front glass.
  Fractions of L/D/H, so Tank B matches. Land is fixed (physical): raising the water floods it. Choosing the layout
  drops the water to 42 % if it is higher. Substrate mesh 72x72 for swamp; front/end faces follow the ground; emerged
  ground tinted soil/moss by vertex colour. Plants: grass, fern, anubias, sword, mud stones on land; stems and grass
  growing out of the pools. Substrate "Show" off still draws swamp land.
- `fitFish` (water.ts) now also keeps swimmers above the ground, and moves any fish over land (or bottom dweller on
  emerged ground) to the nearest spot with enough water for its card (`nearestWater`, 41x41 grid); a fish taller than
  the deepest pool goes to the deepest spot (it then pokes into the bank; seen with an angel in a 16" swamp).
- Pictures: `shots/18_swamp_straight`, `19_swamp_orbit`, `20_swamp_top`.
- **Open metal frame stand (Nathan 2026-10-08)**: `stand.style: cabinet | frame` (scene v5, default cabinet). Frame =
  38 mm square tube legs, top and bottom rails, levelling feet, extra legs every ~90 cm on long tanks; the finish
  colour applies. Picture `shots/21_frame_stand`.
- Tests 55/55. Deployed 2026-10-08 (session 3, `8fddff8`). HTTPS on tanklook.com still serves the github.io
  certificate (curl: wrong principal); http works. Nathan to check Settings -> Pages and tick Enforce HTTPS.

## Custom terrain (Nathan's idea, 2026-10-08; built and deployed session 3, `2e9ce54`)

- **Scene v6** `terrain { on, cols, rows, h[] }`: a grid of ground heights (mm, Tank A, physical like the substrate)
  spread evenly over the floor, corners included. When on it replaces the corner slopes and the swamp land
  (`groundHeight`), so fish, plants, snails and the water rules all follow it. Broken grids load as off.
- Interpolation: bicubic **Catmull-Rom** (passes exactly through every point, smooth across them), clamped to
  0..0.95 H (overshoot near a sharp dip can otherwise go below the floor).
- UI (Substrate): Custom terrain checkbox (first turn-on samples the current floor, so a swamp or slope becomes the
  starting shape; a grid kept from before is reused), Grid slider = points along the length 3-25 (rows follow D/L
  for square cells; changing it RESAMPLES the current surface), Edit points / Done editing, Flatten (all points to
  the average). Corner sliders and slope buttons disabled while on.
- Editing (UI state `viewer.terrainEdit`, not scene data): dots on every grid point in Tank A, drawn over everything,
  faint grid lines on the ground. Drag a dot up/down: height follows the pointer at the dot's on-screen scale
  (works from any angle); one undo step per drag. Verified with real pointer events: 120 px -> +188 mm, undo exact.
- Known: sampling a swamp onto a coarse grid turns round pools into V-notches (raise the Grid first); the layout
  rebuilds on every drag step (fine so far).
- Pictures: `shots/22_terrain_dots`, `23_terrain_pulled`, `24_terrain_result`. Tests 60/60.

## Dry tank / terrarium (Nathan 2026-10-08: "TankLook, not AquariumLook"; built and deployed session 3, `2e9ce54`)

- `water.on` (scene v6, default true; older files load with water). Off: no tint, no surface, water controls disabled,
  fish (everything not a snail) **hidden but kept in the data** and not clamped; Add / Add school disabled for fish
  with a hint; status line says how many are hidden. Snails stay (read as land snails) and may use the whole glass.
- Verified in the dev page: 7 fish hidden, back on water -> 7 shown. Picture `shots/25_dry_terrarium`. Tests 61/61.

## Approximate tank weight (Nathan 2026-10-08; built and deployed session 3, `2e9ce54`)

- `scene/weight.ts` `tankWeight(S)`: water = water depth over the ground integrated on a 60x60 floor grid (so level,
  slopes, terrain and swamp land count; dry = 0); substrate = ground volume x 1.6 kg/L bulk + 0.35 kg/L pore water
  where submerged; glass = the renderer's pane sizes at the actual thickness (`glassThickness`) x 2.5 kg/L, + 4 mm
  lid panels with a glass lid. Not included: stand, rocks, wood, plants, rim trim, equipment.
- Readout under the tank volume: "≈ N lb filled: water, substrate, glass" (kg in cm mode).
- Sanity: standard 55 gal (48x21x13) with 2" gravel = 587 lb (water 406, substrate 88, glass 92 at auto 8 mm);
  the commonly quoted "~625 lb" assumes nominal water and no substrate. A 36x16x18 swamp is mostly land: ~350 lb of
  substrate, little water. Tests 64/64.

## NEXT WORK UNIT: land + semi-aquatic species (Nathan 2026-10-08: "mixed land and water animals in the same tank")

Decided (Nathan 2026-10-08, session 4): sizes are **total length** (nose to tail tip, like the fish); first batch =
**frogs, newts, axolotl** only (dart frog, White's tree frog, fire-bellied toad, fire-bellied newt, axolotl: one
quadruped painter); **climbing is in this unit** (tree frog on glass and branches from the start). Lizards, turtle,
snakes, crabs and inverts come later.

Progress (session 4, 2026-10-08):
- Site title "TankLook: Vivarium Visualizer" (Nathan, 2026-10-08; was "Arium"), tagline "Vivarium visualizer · true-to-scale · beta".
- Single "Add" now randomizes spot, heading, pitch, roll and bend like a school member (`randomPose`, panels.ts).
- **Step 1 done (not pushed):** species `habitat` (resolved; snails 'both', default 'water'). `restsOnGround` (water.ts)
  decides rest vs swim: bottom / land always rest; 'both' rests where the water at its spot is shallower than its
  card height, or in a dry tank. `fitFish`: land animals go to `nearestLand` (terrain.ts; left in place if the tank
  has no land), 'both' swimmers clamp between ground and surface. Dry tank hides only 'water' species. Add / Add
  school blocked with a reason (`blocked`) for fish in a dry tank and land animals with no land; land spawns use
  `randomLand`, amphibians land half the time. Drag slides resting animals along the ground; list tags land /
  amphibious. Five species in species.json (sizes provisional, Nathan to review with pictures): dart frog 45, White's
  tree frog 100, fire-bellied toad 45, fire-bellied newt 90, axolotl 230 (water, bottom). Art keys exist but have no
  painter yet. Tests 68/68.
- **Step 2 first pass (not pushed):** `art/herps.ts` paints sitting frogs (`drawFrog`, one design frame scaled by
  aspect) and newts / axolotl (`drawSal`: tail to u = 0, splayed legs, axolotl tail fin + external gills), limbs as
  tapered tubes, far legs darker. `herpMeta` gives aspect + rest (= ground line). Picture `shots/26_amphibian_cards`.
  Awaiting Nathan's review of looks and sizes.
- **Bare bottom (Nathan 2026-10-08):** the hidden Substrate "Show" checkbox became a "Bare bottom (no substrate)"
  choice at the top of the substrate list (still `substrate.show = false`; the last type is kept). Depth sliders
  disabled while bare. The tan backing plane under the substrate is no longer drawn on a bare bottom, so the stand
  top or the room shows through the bottom pane (picture `shots/27_bare_bottom`).
- **Substrate back face (Nathan 2026-10-08):** the substrate mesh had front and end faces only, so from behind (clear back
  glass in a peninsula) you saw into it and onto the tan backing. Back face added. Picture `shots/28_terrain_from_back`.
- **Peninsula end is the user's choice again (Nathan 2026-10-08, reversing session 3):** `wall.side` = back | left |
  right; Room buttons Behind / Left end / Right end. Session-3 files with 'peninsula' load as 'right'. Background plane,
  grid lines, person placement, wall and view map all follow the chosen end. Picture `shots/29_peninsula_left`. Tests 69/69.
- **Orbit framing (Nathan 2026-10-08: "tank and person should be centred"):** the lens SIZE still comes from the
  straight-on view (unchanged decision), but the image window is re-centred at every orbit angle on tank + stand +
  person (`frameBox` at the current camera). Zoom no longer pulls toward a point between tank and person: `windowCentre`
  (camera.ts) keeps the bounds centre but moves just enough to keep the tank itself whole while it fits, so zooming crops
  the room first. Picture `shots/35_framing_sheet` (straight-on 1.5x, 54 deg right, 50 deg left + 20 up, 54 deg at 1x).
- **View map shows the real framing (Nathan 2026-10-08):** the map drew the cone symmetric about the eye-to-tank-centre
  line, ignoring the lens shift, so it claimed "centred" when the picture was not. It now unprojects the image's left /
  right edges and centre from the actual camera (shift included). Nathan's split-view screenshot (42x17x15, 57 deg
  right) was the OLD frozen-shift framing; with the re-centring above, single and split views both centre tank +
  person (picture `shots/44_map_matches_view`).
- Dev-server gotcha: the shared Vite server sometimes keeps serving a stale module after an edit; `touch` the file.
- **Light height (Nathan 2026-10-08):** `light.height` (mm above the tank top, 20-900, default 50 = the old fixed
  `LAMP_Y`; older files load 50). Lighting is normalised with the fixture at 50 mm, so raising it dims the tank
  (falloff) and evens it out (wider footprint); the room spill source extends up to the fixture and grows up to 1.8x
  at 450 mm+. Above 110 mm the fixture hangs on thin cables to the ceiling (room height 2700 mm). Hood: fixed inside
  the hood, slider disabled. Lighting slider "Height". Picture `shots/38_light_height_compare` (50 vs 450 mm). Tests 71/71.
- **Collapsible panel (Nathan 2026-10-08):** every panel section is a `details.sec`, closed by default; open sections and
  the hidden-panel state are per-viewer prefs (`localStorage['tanklook.ui']`). Selecting an animal opens Fish. The
  panel hides with the ‹ button (top right of the panel); "› Edit" (top right of the view) brings it back.
- Next: revise art per Nathan, then sizes review, then climbing.

## Split tanks: built and deployed (session 5, 2026-10-08)

As built (the design notes below still hold, with these specifics):
- **Scene v7** `{ name, units, tanks: TankSetup[1..2], active, camLock }`; `TankSetup` = everything one tank has (`tank`
  dims, camera, render, light, substrate, layout, terrain, water, lid, stand, wall, person, fish). Fish live in their own
  tank's mm (no more Tank A space / `mapToTank` at render). `render.edge` stays inside each setup but is an app
  preference: the Edge control and load keep it equal in every tank. v6 files: one tank, or (compare on) a second copy
  at Tank B's size with fish mapped by fraction; v6 `tankB` is dropped when compare was off.
- Every scene helper (water, terrain, weight, build, layouts, viewmap) takes a `TankSetup`; `rescaleTankA` -> `rescaleTank`.
- Store: `store.tank` (active setup), `edit(fn)` (active tank), `cam(fn)` (mirrors to both while locked), `setActive`,
  `splitTank` (copy, new one active), `closeTank(i)`, `setCamLock` (re-lock copies tanks[0]'s camera). Undo keeps each
  tank's current camera and the lock; split/close are undoable. Selection stays when switching tanks if the same fish
  id exists there (true right after a split).
- UI: Compare section = "Split tank" button (Tank B size box removed; the Tank section sizes the active tank). Panel shows
  "Editing Tank A/B". Pressing (or wheeling) in a view activates it first; the active view gets an accent frame.
  Padlock button on the divider (SVG, shackle swings open when unlocked; the tab refresh key includes `camLock`, which
  it first forgot, so the icon lagged a toggle). Locked = one shared FOV; unlocked = each view frames itself.
- **Viewport tabs (Nathan 2026-10-08):** `ui/diff.ts` `tankDiff(a, b, units)` lists only differing SETTINGS (a size
  change alone does not list auto glass or a full tank's depth); numbers for dimension-like values, "X A" / "X B" for
  details (Stocking, Water tint, Wall colour, Terrain, Arrangement, Substrate slope). Nothing different = no labels,
  only the close button. Items wrap; "× Close" sits at the bottom of the tab. Tabs sit in each view's TOP-RIGHT corner and
  the panel's "› Edit" button is TOP-LEFT (Nathan 2026-10-08); Tank A's tab keeps 80 px clear of Edit when the panel is hidden.
  Each difference is its own quiet box (faint fill + hairline border). Single tank: the size label carries a
  "⧉ Split to compare" button (same action as Compare -> Split tank).
- **Deselect (Nathan 2026-10-08):** a plain click on empty space (under 4 px of movement) clears the selection; Esc did
  already. A drag still orbits and keeps it. Single tank: the plain size label as before.
- The readout's "Same fish in Tank B" row is gone (the tanks are independent now).
- **Saving (Nathan 2026-10-08):** autosave (localStorage `tanklook.scene`) and Save… hold the WHOLE scene (both tanks;
  the file reopens split). Each split tab also has **Save** (left of × Close): that tank alone as an ordinary single-tank
  file named "<scene> - Tank A/B".
- Verified in a dev page (own port 5175, so Nathan's 5173 scene was not touched): tabs, frame, lock, independent orbit,
  re-lock snap, close either tank, undo. Tests 81/81 (new `test/split.test.ts`).

### Original design notes (split tanks)

Nathan: "the comparison is strongest when you can compare literally any variable. Let the user split their current tank
and then edit them separately by selecting either viewport, which changes which is being edited on the left." And:
"have a tab at the top of each viewport that the user can choose to exit that tank from."
Today Tank B is only a size (`tankB`); it mirrors Tank A's contents at the same relative positions.
Design so far:
- **Split** copies the current tank into a second, independent tank. Clicking a viewport makes it the active one (clear
  highlight); the whole left panel edits the active tank. Fish drags act on the tank they are in.
- **Each viewport gets a tab at the top** (its name / size, e.g. "A · 36x16x18") with an x to close that tank; closing one
  leaves the other as the single tank. (Answers the "which tank stays" question.)
- **Fully independent tanks (Nathan 2026-10-08):** "two totally independent tanks; let the user change whatever they want
  between them." Every setting is per tank: size, hardware, stand, room (wall, person, room light), contents AND the
  camera. Only app preferences stay global (units, quality / edge mode).
- **Camera lock toggle (Nathan 2026-10-08):** orbit + zoom are linked between the two views today ("cool") but must be
  switchable: an on/off lock button overlaid on the divider between the two views (padlock style; default locked).
  Locked: dragging / zooming either view moves both (same az, el, dist, zoom). Unlocked: each view has its own camera.
  Keep the one-FOV rule while locked so sizes stay directly comparable; when unlocked each view frames itself.
  Re-locking after the views were moved apart snaps the second tank's camera (orbit angle, eye distance, zoom) to the
  ORIGINAL tank's (the one that existed before the split, `tanks[0]`), not to whichever view is active (Nathan 2026-10-08).
- **Difference labels (Nathan 2026-10-08):** the label at the top of each viewport (today "Tank A: 42 × 17 × 15" (L×H×D)")
  lists the variables that differ between the two tanks. Numbers are shown for dimension-like values (size, stand
  height, eye distance, water level, light height...); finer details get a name per side only: "Stocking A" vs
  "Stocking B", "Gravel: black sand" vs "Gravel: white sand", "Water tint A" vs "Water tint B". Built from a
  `tankDiff(a, b)` over two setups (one entry per differing setting, label for each side). Assumed until Nathan says
  otherwise: size is always shown (it names the tank), the rest only when it differs; the label sits in the viewport
  tab with the close x; a long list wraps. Today Tank B can only differ in size, so this lands with split tanks.
- Data: scene v7 `tanks: [TankSetup, TankSetup?]` + `active` + `camLock`, each setup holding its own camera; migrate v6 (tankA + global contents; tankB + compare ->
  a second setup copied from A at tankB's size, fish mapped by fraction as today). Everything that reads `S.tankA` /
  global contents (panels, physics helpers, water.ts, terrain.ts, weight.ts, build.ts, pointer.ts, validate.ts, tests)
  takes a tank setup instead. Undo stays one stack over the whole scene.
- Open: does the old "same setup, different size" mirror mode survive (e.g. a "linked" toggle)? Recommended: no; split
  is a copy, and editing one leaves the other alone.
- Lesson (session 4): editing index.html makes Vite do a full page reload, which drops the undo stack. Before
  test edits in Nathan's dev scene, copy `localStorage['tanklook.scene']` to a file (not a page variable) and
  restore it from there afterwards.

Original proposal:
- species.json `habitat: 'water' | 'land' | 'both'` (default water; snails 'both'). Land animals rest on ground
  above the water line (any ground when dry), like bottom dwellers (rest offset, drag slides along the ground);
  'both' (frogs, newts, turtles, crabs) may be on land or in the water. Add the rule to `fitFish` / `nearestWater`
  (a `nearestLand` twin) and the spawners.
- Starter list (~15, sizes need Nathan's review like the fish): leopard gecko, crested gecko, bearded dragon, corn
  snake, dart frog, White's tree frog, fire-bellied toad, axolotl (water), fire-bellied newt, musk turtle, red-claw
  crab, fiddler crab, isopods, millipede, praying mantis, tarantula. Length convention to decide (snout-vent vs total).
- Art: fishgen body plans do not fit. New painters: quadruped side view (lizard / frog / newt / turtle), snake
  (side view lying in curves, or a ground decal), arthropod. Same style rules as the fish (no outlines, soft shading).
- Later: climbing (geckos / tree frogs on glass and branches, like glass snails), terrarium hardscape (cork bark
  background, mesh lid, heat lamp / UVB fixture), and the site tagline "aquarium visualizer" -> "tank visualizer".

## Next work unit: water level + water colour (requested by Nathan 2026-10-08)

Nathan: "Water level, as well as water color. Be able to create swampy tanks with land rising above the water level
creating pocket(s) of water. This restricts where fish spawn to the actual water. Default water level 'full' with a
slider to bring it down. Colour: default = clear water, plus an opacity slider and a continuous colour picker."

Proposed design (confirm the open points with Nathan, with pictures, before building):
- **Scene v5** `water: { level: number (mm above the tank floor; default = full), color: '#rrggbb', opacity: 0..1 }`.
  "Full" = interior height minus a small gap (reuse `WATERLINE_GAP` = 25 mm, which snails already use). Slider in
  the user's units; migration: older files get full / clear.
- **Render:**
  - water surface: a horizontal plane at the level, seen from above or when orbiting;
  - tint below the level: a colour mix in the lighting shader for in-tank materials (`vAqP.y < level`), stronger
    with distance through water (front glass to the point), scaled by opacity;
  - the glass above the line stays clear; a faint meniscus line on the panes;
  - default "clear" = barely visible blue-green at opacity ~0.
- **Fish:** spawn and drag clamp to the water: fish y + half card height <= level. Where land rises above the water,
  add / add school / drag must pick spots with water above the substrate (sample x/depth where
  `substrateHeight < level - fish height`). Bottom dwellers only on submerged substrate. Snails: glass spawning
  bounded by the water line (pass the level into `spawnSnail` instead of `WATERLINE_GAP`); decide whether snails
  may sit on emerged land (real snails do).
- **Swamp terrain (the big open point):** the substrate today is 4 corner depths, bilinear, capped at 60 % of H; it
  cannot make pockets. Options:
  (a) a new **layout preset "Swamp / paludarium"**: a noise heightfield with land masses above the water and 1-2
      water pockets, seeded + Shuffle like the other layouts (fits "no custom hardscape design yet");
  (b) a **substrate heightfield** setting ("terrain: flat slope | islands | bank"), independent of layouts.
  Recommendation: (a), and make the substrate mesh and `substrateHeight()` read a heightfield so fish placement and
  bottom dwellers follow it. Emerged land needs its own look (moss, soil, emersed plants) vs submerged gravel.
- Open: does the light fixture move down with the level (no, it sits on the tank); colour presets (tannin/blackwater,
  green) as quick picks next to the picker?
- Tests to add: v4->v5 migration, fish clamping to the level, spawn never on land / above the line, heightfield
  `substrateHeight` matches the mesh.

## Fish art style (done 2026-10-08)

Problem (Nathan): fish read as cartoons next to the tank render. Goal: not photoreal, but matching the tank's style
(no outlines, textures, soft shading, muted natural colour).

Cartoon cues in `src/art/placeholder.ts`: thick black outlines (wider than a neon's stripe at adult size), flat
fills with hard colour blocks, big white-ringed eyes, solid opaque fins.

**Step 1 (do this): restyle the three procedural fish in code** as a style test:
- no black outline, or a thin edge one shade darker than the local body colour;
- countershading: darker back to lighter belly, soft gradients that round the body;
- soft-edged internal colour bands (keep the SILHOUETTE crisp: cards use alpha-test cutout);
- small realistic eyes (dark pupil, metallic/coloured iris, no white ring);
- fins as faint tinted membranes with fine rays (consider alpha-to-coverage for partial fin alpha);
- keep nose/tail tips exact: card width == adult TL is the size calibration.
Deliver before/after pictures of each fish in the tank at the default 1200 mm distance (per working rules: pictures
with any question about the look), then ask Nathan to judge the direction.

**Step 1 status (2026-10-08): direction approved by Nathan; polish pass done.** `src/art/placeholder.ts` rewritten:
body on its own layer (countershading gradient, markings painted source-atop so the silhouette never changes, soft
inner rim + thin edge at 20 % dark), fins as separate membranes (alpha 0.62 so they survive the 0.5 alpha test,
rays fan from a root), small eyes (iris gradient, forward pupil, tiny catchlight). Nose/tail 'c' tips unchanged at
u = 1 / u = 0. Angel dorsal/anal and gourami dorsal/anal are now separate fin shapes, not part of the body outline.
Pictures: `shots/` (gitignored): 1_tank, 2_angelfish, 3_pearl_gourami, 4_neon_tetra, 5_fin_modes. In cutout mode
fins render opaque (any alpha >= 0.5 is solid), so fin tints were darkened to read as translucent; alpha-to-coverage
shows real see-through fins.
- **Default edge mode is now alpha-to-coverage (Nathan, 2026-10-08)**: fins see-through. Files that stored `cutout`
  keep it; a missing/invalid edge falls back to the default. UI lists the a2c option first.
- **Rule learned: no smooth alpha gradients in fin art.** a2c has only a few coverage levels (MSAA samples), so an
  alpha fade shows as hard stripes. Keep each fin at one alpha; vary colour, not alpha.
- Angel body is now a sloped diamond (forehead runs straight up to the dorsal origin) reaching into the fin bases,
  so body + fins read as one shape. Pictures 6_tank_v2, 7_angelfish_v2 in `shots/`.
Capture method: dev page + `window.__gb`, `viewer.exportPNG(4)` POSTed to a throwaway local sink (python, port 4199).

**Step 2 (later, needs a decision): image-based fish** if more realism is wanted or the species list grows to 25-30.
Side-view cutout PNGs, scaled so nose-to-tail == TL; `species.json` already has an `art` field, extend it to accept
an image path. Blocked on the art provenance policy: own photos / Creative Commons (attribution) / commissioned
illustrator / AI-generated (murkier reuse rights).
Alternative considered: one parametric shaded "body plan" generator (scales better than hand-coding each species,
no licensing, but stays illustrated).

## Species, layouts, snails, custom sizes (2026-10-08; pushed for dogfooding, sizes table still to review)

- **37 species** (`src/data/species.json` v2): 33 fish/shrimp + 4 snails, typical adult TL in aquaria (snails: crawling
  length). Scale anchors tested (neon 35, chili 18, angel 150, oscar 300). Clown loach 200 mm with a note (to 30 cm).
  The size table needs Nathan's eye: these are the tool's main promise.
- **Art: parametric body-plan painter** (`src/art/fishgen.ts`), the "alternative considered" in Step 2 below: profile
  (depth, peak, back share, snout, mouth), tail type (fork/notch/round/veil/lyre/double/sword), dorsal/anal shapes, pelvic,
  adipose, barbels, markings (band/bars/spots/blob/poly) on body and fins. Card aspect and resting offset are computed
  from the plan (`planMeta`), so species.json needs no aspect for generated art. Shrimp have a custom painter. Neon,
  pearl gourami, angel keep their hand-drawn art. Shared helpers moved to `src/art/paint.ts`.
- **Bottom dwellers** (`zone: 'bottom'`): corys, bristlenose, oto, kuhli, clown loach, SAE, both shrimp. Always rest on
  the substrate (centre = surface + rest x TL; stored y ignored); drag slides along the floor; Y slider disabled.
- **Snails** (`kind: 'snail'`, Fish.surface floor|front|back|left|right): spawn area-weighted over the substrate and the
  inside of the four panes below the water line (`spawnSnail`, tested: every point equally likely, so each surface in
  proportion to its area; Nathan said "equally likely on any surface", flagged as an interpretation). Floor: upright
  side-view card. Glass: two one-sided cards back to back, foot toward the glass (seen through that pane), shell toward
  the tank; yaw = heading in the pane; drag stays in the pane.
- **Layouts replace the sample plant (scene v4)**: `layout {id, seed}`: none / stones / driftwood / planted / iwagumi,
  with Shuffle (new seed). Generated from tank size, physical sizes (bigger tank = more pieces, not bigger ones).
  Stones = displaced icosphere (smooth, or faceted for iwagumi), driftwood = tapered tube limbs, both with baked
  vertex shading; plants = crossed cards (`src/art/plants.ts`: stem, red stem, grass, sword, java fern, anubias,
  carpet). Built groups cached by (layout, seed, tank, substrate, edge) and cloned per rebuild. v3 files: shown
  plant -> 'planted', hidden -> 'none'. Default scene: planted.
- Drag step cost measured in the (hidden, emulated) preview pane: 51 ms with no layout, +0-20 ms with a layout.
  The baseline was already there; worth profiling in a real browser before schools get big.
- **Custom sizes (Nathan, 2026-10-08)**: `Fish.tl` optional mm override (juveniles or big individuals), absent =
  adult; validated to 15-130 % of adult and dropped when equal to adult. "New fish size" slider (default Adult)
  applies to Add / Add school / snails; selected fish has a Size slider + Adult / Half / Quarter. Same art scaled
  (juvenile proportions such as bigger eyes are not modelled). Verified: 40 % angel measures exactly 0.4x on screen.
- Pictures: `shots/8_species_scale`, `9_layouts`, `10_orbit_driftwood`, `11_snails`.
- Weak spots: discus fins read as separate flaps; cherry shrimp is crude; stem plants still a bit regular.

## Decisions made (2026-10-08)

- **Rendering: Three.js, fish as flat textured cards ("planes") in a simple 3D box tank.** Not a 2D canvas with
  hand-rolled projection, and not Konva. Reason: perspective, occlusion, camera moves, picking and export come free;
  the custom-2D route re-implements a mini 3D engine.
- **Perspective rule:** the eye is a fixed physical distance from the front glass (default 3000 mm since 2026-10-08, was 1200; range 400-5000), the same for every
  tank; zoom only changes field of view (crop), never perspective. Comparison view uses one FOV for both tanks so pixel
  sizes are directly comparable. Verified: measured on-screen ratio = d / (d + z) exactly, straight-on.
- **Units:** all scene data in mm. Coordinates: x along length 0..L, y up 0..H, depth z = mm behind the front glass
  (three.js z = -depth). Tank L/H/D are **interior** dimensions; glass is added outside.
- **Scene data is the source of truth**, serialisable JSON with a `version` field; the renderer rebuilds from it.
- **Card edges:** alpha-test cutouts (hard silhouettes). Art rule: clean outlines, transparent background, no soft glows
  or baked shadows. Alpha-to-coverage is the smoother option.
- **Camera:** free orbit by dragging empty space (pivot = tank centre, radius chosen so straight-on eye distance is exact).
  Proposed release limits still ±30° left/right, 0-25° from above (sliders flag beyond). Not yet decided whether to enforce.
- **Orbit keeps the lens (Nathan, 2026-10-08):** FOV and lens shift come from the straight-on framing
  (`frameStraightOn`) and stay fixed while orbiting; only the angle changes. Before, each angle was re-framed, and the
  stand/person near the eye widened the lens so the tank shrank as if the viewer stepped back. Zoom (0.5-4x) is the
  only lens control.
- **Scale person stays put + viewpoint map (Nathan, 2026-10-08):** the person has one fixed spot in the room
  (`personSpot`), chosen from the straight-on view: beside the tank on the chosen side, as far from that eye as the
  tank centre; the open side if the chosen one is behind the wall. A first version followed the orbit to keep the
  scale constant, but it jumped sides when the wall got in the way; at the 3 m default the scale swing is ~1.3x. Viewpoint map: top-down inset (tank, wall, person, eye, view cone,
  distance/angles), DOM overlay so never in PNG exports, toggle in Display (browser storage, not scene data).
- **Wall: back | peninsula (Nathan, 2026-10-08).** Left/right end merged into one 'peninsula' (right end against
  the wall; old left/right saves load as peninsula). In a peninsula the background panel and grid move to the wall
  end and the long back glass is clear.
- **Default viewing distance 3 m (Nathan, 2026-10-08)**, max raised to 5 m. Fish look smaller until zoomed; less perspective distortion; the room reads as Nathan wanted.
- **Room light lights the room (Nathan, 2026-10-08):** wall, floor, stand, hood and person are room surfaces
  (`userData.room`): brightness = `roomLevel(room)` (0 at 0, full from 0.3, eased; default 0.15 = 0.75) + light
  spilling from the tank (nearest point of the tank box, falloff over `spillReach`, facing term, fixture colour x
  brightness; fades as the room brightens). The void beyond the room dims too. At 0 the tank is the only light.
- **Fish drag plane follows the view:** front-ish = parallel to glass; >45° from above = floor plan (sets depth);
  side-on = side plane.
- **Substrate:** four corner depths, bilinear surface, physical thickness (not scaled between tanks), mm-sized grain;
  anti-tiling = two rotated texture samples blended by value noise + soft brightness patches.
- **Glass:** auto thickness by interior height (<=13" 5 mm, <=17" 6, <=21" 8, <=25" 10, <=30" 12, else 15); standard
  (green edge) or low-iron. Rimmed / rimless.
- **Lighting:** custom shader injection into MeshBasicMaterial (not three.js lights; those leave edge-on cards black).
  Emitters above water: spot (cone), tube (line segment), LED array (grid). Normalised so every fixture type has the
  same mean brightness at mid-height; colour temperature via Kelvin to RGB at unit luminance; room-light ambient.
  Cards take the light level at their position (no facing term). Saturation lift 1.35 on cards, hue-preserving clamp.
- **Hosting goal (Nathan, 2026-10-08):** a publicly hosted website.
- **Phase 2 stack (Nathan, 2026-10-08):** Vite + plain TypeScript (no React); GitHub Pages via GitHub Actions;
  **public** repo. Only procedural placeholder art is committed until the art provenance policy is settled.

## Still open

Release camera limits; species sizes review (list built, 37); art pipeline + provenance policy;
whether lighting ships in v1; hardscape scope (now: roadmap steps 3-5); React vs plain TS for the UI layer (see Phase 2 plan).

## Phase 2 build decisions (2026-10-08)

- Scene format v2: `glass` is `'auto' | number` (v1 stored a string); `edge` is `cutout | a2c` (the PoC's "soft"
  demo mode was dropped and migrates to cutout); added `name`. Unknown species are skipped on load with a warning.
- One `Store` owns scene + selection + history; every mutation goes through `store.update()`. UI re-syncs all
  controls from the scene on every change (one `sync()`), so undo, file open and pointer drags refresh identically.
- Readout is computed right after the synchronous draw (fixes the PoC's one-frame lag).
- Lighting in compare view: checked, works (uniforms are set per viewport before each render).
- Removed PoC test aids: depth ladder, "what to test" list. Kept the perspective readout (it is the proof).
- Autosave key `tanklook.scene` in localStorage, debounced 400 ms and flushed on `pagehide`.
- **Room + lid (Nathan, 2026-10-08), scene v3** (v2 files load with these off/open):
  - `stand {show, height 12-48 in (default 30), finish black|white|oak}`: same footprint as the outer glass, from the
    floor up to the tank underside (`tankUnderside()` / `floorY()` in physics.ts).
  - `wall {show, side back|left|right, color}`: room wall 50 mm off the glass; left/right = peninsula. One-sided, so
    it vanishes when orbiting behind it. A plain floor is drawn whenever stand or wall is on.
  - `lid open|glass|hood`: glass = two 4 mm panels + hinge strip (on the rim lip, or on the panes if rimless);
    hood = low-profile moulded lid (38 mm back, 22 mm rounded front, feeding hatch) after Nathan's reference photo;
    with a hood the light fixture is not drawn (it is inside) but its light still applies.
  - `person {show, height 0.9-2.1 m (default 1.75), side left|right}`: neutral flat silhouette for scale, standing on
    the floor 250 mm beside the tank at mid-depth; turns to face the viewer (billboard about the vertical axis).
    Placeholder art, same pipeline as the fish cards.
- **Framing:** bounds now include the stand; the image window is shifted (lens shift via `setViewOffset`) so the
  bounds are centred. Eye point unchanged, so perspective and the d/(d+z) rule hold (tested). The shift fades as
  zoom rises (`offset / zoom`), so zooming closes on the tank, not the cabinet.
- **Glass edges:** every pane gets an outline (light on dark backgrounds, dark on light); low-iron edge tint made
  stronger. Thin glass edge faces are sub-pixel, outlines are always at least 1 px.
- Checked, not a bug: from steep angles the black top rim hides a strip of the interior behind the front glass
  (pixel readback confirmed the sightline passes through the rim).
- **Single-file build (Nathan, 2026-10-08):** `npm run build:single` -> `dist-single/tanklook.html` (~560 kB), made by
  `scripts/build-single.mjs`, which inlines dist/'s script and CSS (no plugin). Opens from disk with no install;
  verified self-contained (served alone: one request, no errors). Gitignored; attach or share the file.
- Dev server exposes `window.__gb = {store, viewer}` for debugging (dev only, not in the production build).
- Bundle is ~520 kB (137 kB gzip), almost all three.js. Fine for now.

## Phase 2 plan (approved 2026-10-08, built as above)

1. Repo + hosting skeleton first: Vite + TypeScript, GitHub repo, auto-deploy (GitHub Pages or Vercel/Netlify).
   Deploy a "hello tank" on day one so hosting risk is retired early.
2. Port the PoC into modules: `scene/` (types + JSON versioning + validation), `render/` (tank, substrate, glass,
   lighting shader, cards), `interact/` (pick, drag, orbit), `ui/` (panels), `data/species.json`.
3. Then the Phase 2 feature list from the original spec: species search, add/drag/duplicate/delete, save/load
   (localStorage + JSON file), PNG export, undo/redo.
Each module is a separable unit, so subagents can build in parallel once the types in `scene/` exist.

## Known gaps

- Illustrated (generated) art for 34 of 37 species; image-based art still blocked on the provenance policy.
- Layouts are presets only; custom placement is now planned (roadmap step 3, Nathan 2026-10-09).
- Scene rebuilds fully on every change, including each drag step; fine at hundreds of fish, revisit if schools get big.
