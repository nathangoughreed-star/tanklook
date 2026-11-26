# Brief 7 for Fable: how should TankLook animals behave, and how should that show?

Evidence packet, 2026-11-25, written from origin/main. Observations only; the judgment is yours.
Media: `research/fable/7-alive/` (6 contact sheets, described in section 5).

## THE QUESTION

"In this category users love fish animation that looks like a real tank and relaxing ambient viewing, and their top complaint is that every fish behaves the same (tetras that don't school, angelfish that aren't aggressive); Fish Game is praised for species-accurate behavior with a live 'what is it doing' status. Given how TankLook animates animals today, what behavior model should it adopt (e.g. classes such as shoal, school, hover, perch, bottom-forage, hide, graze, territorial vs per-species AI), how should behavior surface to the user (status, watch mode, planning signals like 'this fish will hide all day in this scape'), and what is the smallest build that makes the tank feel alive, ranked by perceived aliveness per unit of effort and frame-time cost?"

## 0. Product context (so you can answer cold)

TankLook / YourArium (https://tanklook.com) is a free, no-account, browser 3D aquarium and vivarium planner (Vite, TypeScript, three.js) for every experience level. Its value is planning (real tanks, real gear, stocking verdicts, priced shopping list), not a game. Fish are drawn by "build B" photo-wrapped models (`src/data/fishLive.json` lists 45 live species ids) or older procedural models. Animals move in a free-roam sim that Nathan can switch off; the placed spot is the saved truth and nothing the sim does is saved. Nathan's stated product vision: anyone, any level; plan, evaluate, inspire, learn.

## 1. Competitor evidence

All from `research/competitors/` (researched 2026-11-25; Steam review samples are small, confidence medium).

**The complaint (SUMMARY.md s2, line 33):** "Uniform, unrealistic fish behavior. Tetras that don't school, angelfish that aren't aggressive: 06, 07. Fish Game (16) is praised precisely because it gets this right."
- Behind Glass (06-behind-glass.md, Complaints): "all species move alike; angelfish not aggressive, tetras not schooling or skittish; 'screensaver or sandbox' rather than a simulator. Still repeated in a Nov 30, 2025 review (tetra motion unrealistic)." Also "Hard to see fish in the default lighting", and a wish for "better species-specific behavior and a beginner mode".
- Aquarium Designer (07-aquarium-designer.md line 28): "Fish AI: species swim and school alike, bottom dwellers roam high." Its idea list: "Species-specific swim and schooling behaviour; their reviewers call uniform AI a top flaw, so keep ours distinct."
- chatgpt-report-delta.md line 15: Behind Glass users ask for "shy fish that hide in caves, stem and floating plants, colour variants". Line 25 lists the proposed vocabulary: "shoal, school, hover, perch, bottom-forage, hide, graze, territorial (vs full per-species AI). Matches R154."

**The praise (SUMMARY.md s3, lines 43-46):** "Visuals and fish animation that look like a real tank (06, 16, 07)"; "Relaxing, ambient viewing; some use the tank as wall art (06, 07, 15)"; "Species-accurate behavior, with live 'what is it doing' status (16)". Behind Glass: some users run it as "wall art" with the simulation off (06, What users love).

**Fish Game (16-fish-game.md):** "130+ fish species with personalities and evolving relationships; schooling, chasing, fighting, carnivory" (line 12). Praise: "Realistic fish behavior, needs and health, and visible live status of what fish are doing ... runs on modest hardware" (line 20). Wishes: "Wallpaper or second-monitor mode; filter sound without music" (line 38), "an aggression-off setting" (line 39). Its ideas list: "Visible live 'what is this fish doing / feeling' status on tap" (line 46) and "Wallpaper / ambient screen mode" (line 49). Threat level low: a toy, Windows only.

**Underglass (04-underglass.md line 12):** brand new iOS planner (v1.0 on Nov 12, 2026): "fish school and keep to their own water level." That is a phone-first 3D planner shipping school + water-level behavior as a feature.

**Ranking in our own research (SUMMARY.md s6 and s7):** gap 1 of YourArium's gaps: "Live species-specific behavior and visible 'what is it doing' status (06, 07, 16: top complaint or top praise)." Top-10 idea 3: species-specific swim, schooling and aggression behavior; idea 7: ambient watch mode (hide UI, calm audio, second screen).

## 2. Requests on file (research/requests.md)

- **R154** (11-25, line 57): "species-specific swim, schooling and aggression behaviour (uniform fish AI is the top complaint in Behind Glass / Aquarium Designer; Fish Game is praised for getting it right). Related R145." Status: needs a lane brief.
- **R158** (11-25, line 61): ambient "watch mode": hide the UI, calm audio, second-screen / wallpaper use. Status: needs a lane brief.
- **R145** (11-24, line 48): which species gulp air at the surface, then add it; "The swim sim has none today". Candidates: bichir, bettas and gouramis, corydoras, kuhli, plecos. Lane not started.
- Older, mostly shipped (the sim already carries them): R76 discuss animating fish (idle life, real swimming, schooling); R88 gouramis too fast (per-species pace); R90 shrimp and snails crawl; R93 African dwarf frog mostly still with air trips; R105 kuhli burrow, fish that hold still and fan fins; R106 danios pulse-and-coast; R118 (FB3) homes, range, posture for marine fish and mbuna; R150 yellow labs rolled onto their sides (fixed: the belly-to-rock roll had no hardscape check).

## 3. How animals move today

All plain-number sims, no three.js inside; the render side applies poses each frame.

**Free-roam swim sim, `src/scene/swimSim.ts` (663 lines) with contract `src/scene/swimTypes.ts`.** One `SwimmerSpec` per fish: length, `zone` ('bottom' or 'water'), a preferred water-column `band`, `pace`, optional `hover`, `style`, `rest`, `dig`, `habit`, `group`. Each fish keeps a heading turned at a limited rate toward a desired direction made of a goal, flocking, avoidance and a slow meander; a hard projection keeps it out of anything solid. Fish alternate swim and rest timers, pick new goals, and a bottom dweller alternates rest, short foraging trips and rare hops. Typed arrays, no allocation per step. The viewer clamps dt to 0.2 s (`src/render/roam.ts` line 46); internal substeps are 1/30 s.

**Schooling and shoaling (swimSim.ts about lines 404-440).** `Species.group` is 'school' (tight, aligned) or 'shoal' (loose); the key is the species id, so a species school is one group. Members get a cohesion pull toward the group centre (radius about 1.5 body lengths + sqrt(count)*0.45 for a school, 4 + sqrt(count)*1.6 for a shoal), a heading-alignment term (weight 1 school, 0.35 shoal), a faster catch-up when they stray, and a species-sized separation rule. A school switches style together every 5-15 s; a hovering shoal stops together. A shoal fish may take its own goal for 10-25 s then rejoin. Other-species fish get only separation (0.8 of the summed lengths), no attraction or avoidance. Current counts in `src/data/species.json` (205 entries, 175 water fish): 21 school, 31 shoal.

**Water-column level.** `Species.level` is 'top' or 'low' (absent = mid); `BANDS` in `src/scene/scatter.ts` line 41 maps to fractions of free water height: top 0.65-0.98, mid 0.2-0.8, low 0.02-0.4. The sim steers each swimmer toward its band. Counts: 9 top, 18 low, 33 'bottom' zone (graze the substrate).

**Per-species behavior tables, `src/scene/fishBehavior.ts` (176 lines), the sim never reads species ids.** `build.ts` line 1847 resolves them into the spec:
- `HOVER` (66 species): share of time hovering, pectoral fan width, tail beat kept. Labyrinth fish, angels, discus, dwarf cichlids, hatchets, puffers hover most; schoolers a little.
- `STYLE` (21): burst-and-coast (danio, tetras, rasboras, livebearers, barbs, pencilfish, puffer): pulses per second, glide decay, heading change per pulse, and a [pulse-glide, slow cruise, hover] time mix.
- `BENTHIC` (15): share of time a bottom dweller sits nearly still breathing (corys 0.8-0.85, loaches 0.75, watchman goby 0.88).
- `DIG` (10): burrow or sift events per minute by bed grain (kuhli, corys, clown and yoyo loaches), with a share that instead hide under rock, wood or plants for 10-120 s; digging is more frequent in a dark tank.
- `HABIT` (34): home type (crevice, bolt-hole, burrow, host, open), posture (mid, perch, hoverLow, hug), leash in body lengths, belly-to-rock orientation, and rates for dart-in-and-peek, peck, patrol, flick, hop. Covers marine fish, mbuna, kribs, cockatoo, rams, rainbow and red-tail shark, a few cichlids. `src/scene/swimHome.ts` picks an anchor (rock, cave, host, patch) per fish, spreading fish over the least-used anchors. Design doc: `research/design/fish-habits.md`, which lists as not built: startle (a shared alarm), sift, a real dorsal flick, cave interiors, and habits for bristlenose, synodontis, peacock, goldfish, angel.
- `src/scene/swimPace.ts`: a speed multiplier, listed only for the gouramis (0.35-0.4).

**Non-fish animals.**
- Crawlers, `src/scene/crawlSim.ts` (237 lines), table `src/scene/crawlPace.ts`: 5 shrimp (walk 0.18-0.25 in/s, stopped 88% of the time), 4 crabs and crayfish, 5 snails (walk 0.1-0.3 in/s, graze 30-40%), and the African dwarf frog (rests 98%, a breathing trip to the surface about every 18 minutes). They walk the ground or a flat glass pane against the same collision field. Viewer side: `src/render/crawl.ts`.
- Lizards, snakes, tarantulas, frogs on land: static poses chosen by Shuffle (`src/scene/scatter.ts`, using `src/data/arthBehavior.ts`: share that take a hide, share on the glass, hide size). Nothing animates them over time except the dwarf frog above. `arthBehavior.ts` itself says its behavior text is "shown nowhere".

**Collision field, `src/render/swimField.ts`:** glass, floor, surface, hardscape, plants; anchors for rocks, hosts and plants. Built once per tank change, queries allocation-free.

**Species-data fields that exist and are NOT read by the animation** (grep of `swimSim.ts`, `swimHome.ts`, `roam.ts`, `swim.ts`, `crawlSim.ts` for them returns nothing):
- `care.ts` `temper` (0 peaceful, 1 territorial or pushy, 2 aggressive) and `nip`, `slow` (long fins), `feelers`, `alone`, `solo`/`fam`, `guard` (breeding territory area, cm2), `cover` ('plants' or 'cave'), `prey` (what it eats, up to a length), `group` (minimum count for the compatibility check). All feed compatibility verdicts in `src/scene/animalfit.ts` (for example "too aggressive for it") and nothing in motion.
- Nocturnal or shy: appears only as text (careNeeds.ts, for example pajama cardinal "a shy, nocturnal fish"); there is no field. The sim reads only a single `dark` flag, for digging.
- `Species.pair` (clownfish, banggai), `note`, `sex` and `forms`.
- Species `group` is binary; the compat engine's numeric group size ("neons stress under 8") never changes how the school moves (no skittish or hiding when under-stocked, though careNeeds says so: "stays shy and stressed below six").
- Air gulping, feeding, startle, chasing, fighting, day/night rhythm: none exist in the sim.
- No behavior is shown to the user: no status line, no label, no planning signal; behavior tables are invisible to the Fits / Habitat / Compatible chips.

**Coverage gap in tables (counted from the tables against `species.json`):** of the 175 water-habitat, non-snail species, 83 appear in at least one of HOVER, STYLE, HABIT, BENTHIC or DIG; the other 92 fall back to the default free-roam (goal-picking over the whole tank in the mid or low band, with the school / shoal / level flags if they have them). Of the 52 species flagged school or shoal, 40 are in a table and 12 are not. That default is the "every fish behaves the same" case. (research/species-onboarding-baseline.json, R142, separately counts 42 behavior rows against about 100 older species.)

**User controls today:** a setting turns free roam on or off; a Reset button puts fish back at their placed spots; View > "Full screen" (browser fullscreen, every panel hidden) and "Tank only" (clean view inside the window) exist (`src/shell/logic/fullscreen.ts`, FS1 2026-11-17). No audio, no auto-camera, no time-of-day.

## 4. Frame-time budget

- No measurement of the swim sim step itself exists in `research/efficiency/` or `research/benchmark-baseline.md` (the latter is stocking verdicts, not performance). Evidence is structural: `swimSim.ts` allocates nothing per step and does a brute-force pairwise separation loop with early-out on |dx|, |dz|, |dy| (comment: "n is tens"); the cap is `LIMITS.maxFish = 500` (`src/scene/validate.ts` line 61), so a fully stocked tank is O(n^2) in the worst case.
- Render side (research/efficiency/E1-perf-baseline.md, E2-code-audit.md item 9): "3D fish are 10-20 meshes each, so 40 fish are 400-800 draw calls"; fin cards cost 2.3-4.2 ms CPU and 1.3-2 ms GPU per draw on planted and split examples; every example draws in 1.2-11 ms GPU and 2.6-12 ms CPU at 1050x850, and "At DPR 2 (high-DPI laptops) GPU roughly doubles to 9.8-17.8 ms, close to a 60 Hz frame on planted, reef and the wall." So the frame budget is dominated by drawing fish and plants, not by steering. A behavior feature that only changes the numbers the sim already computes costs little; one that adds draw calls, particles or per-fish raycasts does not.
- Proposed fix on file (E1 item 5): merge each fish's fin cards, saves about 2-4 ms CPU.

## 5. What it looks like, live site

Captured 2026-11-25 from https://tanklook.com in headless Chrome (Chrome DevTools protocol, GPU rendering, 1400x800, "Tank only" view; scenes loaded from share links built from the repo's own `planted` and `reef` examples). Screenshot cost was about 0.2 s, so frame gaps are 1.0 s or 6.0 s (labels are nominal; the sim steps at real frame rate in headless). Each sheet is 6 frames, 1210 px wide. Tank: 36 x 18 x 16 in (45 gal), planted, 3 plant clumps right of centre, 2 rocks left of centre, bare left third.

| File | Scene | Gap |
|---|---|---|
| `7-alive/1-school-tetras-1s.png` | 14 neon tetra + 9 harlequin rasbora, nothing else | 1 s |
| `7-alive/4-school-tetras-6s.png` | same | 6 s, to 30 s |
| `7-alive/2-community-1s.png` | planted example (14 neon, 9 harlequin, 2 honey gourami, 6 bronze cory, 3 oto, 4 amano shrimp, 2 trumpet snail) plus 2 angelfish added | 1 s |
| `7-alive/5-community-6s.png` | same | 6 s, to 30 s |
| `7-alive/3-reef-1s.png` | reef example (bow-front 48 x 22 x 18 in): 2 ocellaris, royal gramma, firefish, watchman goby, cleaner shrimp, 2 turbo snails, 3 hermit crabs | 1 s |
| `7-alive/6-reef-6s.png` | same | 6 s, to 30 s |

What the frames show (facts, not verdicts):
- **Schooling tank (sheets 1, 4).** The harlequins move as one tight, roughly aligned group of 9 in the mid-upper band, changing direction together between frames (in sheet 4 the group drifts from centre-top at 0 s to centre-right at 6-12 s, then back to centre at 18 s). The 14 neons are a looser group in the upper band; in several frames they overlap the harlequins' space and sit in front of the right-hand plants. In 30 s neither group visited the left third of the tank (the rocks and carpet) and neither came below mid-height. So species do school and stay in a band, but they use roughly the right 60% of a 36 in tank, and different species cluster into one cloud in the same space.
- **Community tank (sheets 2, 5).** Two angelfish drift slowly through the upper-mid band, often next to each other without any visible chasing or posturing, and overlap the harlequin school's volume; in 2 of the 6 frames of sheet 5 an angel is at the very top of the frame, partly at the tank rim. The neons and harlequins read as two loose shoals that cross the angels' path with no reaction (no avoidance or flight visible). The 6 bronze corys stay along the bottom as small shapes near the carpet. The honey gouramis are mid-height and sit mostly still.
- **Reef tank (sheets 3, 6).** The two ocellaris swim in open water on opposite sides of the tank for most of 30 s rather than staying near each other or a host; a small purple-and-yellow fish (royal gramma, HABIT row) works around the rocks and a red-and-white one (firefish, HABIT row) sits at the left rock face in the 18-30 s frames; both stay near rock, which is the HABIT table at work. The watchman goby and cleaner shrimp are barely visible at this scale. Large parts of the open water above the rock are empty.
- Motion between 1 s frames is smooth and fish turn gradually (limited turn rate). The overall impression in stills is "plausible, calm", not "alive": nothing reacts to anything else in any frame.
- Caveats: stills, not video; one random seed per scene; I did not try other species (mbuna, bettas, kuhli). Did not test the setting-off path.

## 6. Open questions this evidence leaves to you

1. The sim already has per-species tables for hover, pulse-coast, rest, dig and habit (10 to 66 species each). Is the right move to widen those tables (per-species AI by data), or to add interaction classes on top (reaction between animals) that none of those tables express?
2. Interaction is the most visible missing thing: no animal reacts to another species, to the user, to light, or to food. `temper`, `nip`, `slow`, `guard`, `prey` already exist as data.
3. Surfacing: nothing about behavior is shown now. Compatibility verdicts already say "too aggressive for it" in text.
4. Cost: steering changes are cheap; anything new that draws is not.

## 7. What a good answer looks like

Aim for a short, decisive recommendation I can hand to a coordinator as lane briefs. It should contain:

**(a) A behavior-class table** (about 8 classes) mapped to existing species-data fields, with the new field named where one is missing. Suggested columns: class; example species; steering rule (cohesion, band, leash, rest share); existing source field (`group`, `level`, `zone`, HOVER / STYLE / BENTHIC / DIG / HABIT row, `care.temper`, `care.nip`, `care.slow`, `care.cover`, `care.guard`, `care.prey`) or "new: X"; how many of the 175 water fish it would cover by default if derived from fields that exist today (a derivation rule, not hand-tuning each species). The answer should say which classes already exist in the sim under another name (school, shoal, hover, perch, hug, hide-in-dig, bottom-forage are all there) and which are genuinely new (for example territorial chase, startle and flee, group-size skittishness, night rest), and whether a per-species override table stays as the exception.

**(b) UI surfaces**, each with a keep / defer verdict and why: a live "what is it doing" label on tap or hover (state names drawn from the sim's real state: swimming, schooling, hovering, resting, foraging, hiding, guarding, chasing); a watch / ambient mode (building on the existing Tank only and Full screen; does it need sound, an auto camera, a day/night cycle?); and planning signals (for example "will spend most of the day hidden in this scape" next to a species, a tank-level "activity" or "use of space" readout, a hiding-cover warning from `care.cover`), saying whether any of these should reach the stocking verdict chips or stay as flavor text. Say what should NOT be surfaced.

**(c) A phased build plan** ordered by perceived aliveness per unit of effort and frame-time cost. Each phase: what ships, files touched (roughly), effort (days), frame-time cost (steering-only: near zero; new draws: state it), what could go wrong, and how to check it on screen. For example, a reasonable order to challenge or replace: (1) derive classes for the uncovered species from existing fields and make schools use the whole tank; (2) a shared startle and flee reaction; (3) temper-driven chase and guard using `temper` and `guard`; (4) the status label; (5) watch mode; (6) planning signals; (7) air gulping and day/night. State the smallest phase that would change a first-time viewer's reaction, and what to measure (counts of species still on the default roam, fraction of tank volume visited in 60 s, steering step time at 50 and 200 fish).

**(d) A verdict on per-species AI vs classes**, and a one-line risk list (for example realism claims we cannot source, aggression that kills the relaxing feel, a status label that exposes sim state the user cannot trust, performance on phones).

Restating the question: given how TankLook animates animals today (a data-driven sim with partial per-species tables, schooling and bands, no interaction, no surfaced behavior), which behavior model, which surfaces, and which smallest build, ranked by perceived aliveness per unit of effort and frame-time cost?

## Files cited (15)

`research/competitors/SUMMARY.md`; `research/competitors/06-behind-glass.md`; `research/competitors/07-aquarium-designer.md`; `research/competitors/16-fish-game.md`; `research/competitors/04-underglass.md`; `research/competitors/chatgpt-report-delta.md`; `research/requests.md`; `src/scene/swimSim.ts`; `src/scene/swimTypes.ts`; `src/scene/fishBehavior.ts`; `src/scene/crawlPace.ts`; `src/data/care.ts`; `research/design/fish-habits.md`; `research/efficiency/E1-perf-baseline.md`; `src/render/build.ts` (line 1847, where the spec is assembled).
