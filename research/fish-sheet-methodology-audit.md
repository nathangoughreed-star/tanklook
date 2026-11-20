# Fish models from one generated reference sheet: audit and experiment plan

Written 2026-11-20. This is a snapshot of where the sheet-to-3D-model work stands, followed by proposed experiments.

**Scope:** the whole chain.
1. The prompt sent to the image generator (outside Claude).
2. The reference photos attached to that prompt, or none.
3. What Claude does to turn the sheet into the model.

**Sources:**
- Five method chats:
  - dottyback: `local_c983905a`
  - flame angel and the method doc: `local_049cae99`
  - clownfish, and the oscar prompt: `local_5562a031` and `local_cae3e6f1`
  - sheet open problems: `local_3a97b19d`
  - oscar, pleco, knifefish, shark: `local_b3b83a73`
- Earlier painter chats: `local_262607c0`, `local_e1a91ac6`, C27 and C28.
- The branches listed in section 1.

The living method stays in `research/fish-model-sheet-method.md`. This file is the audit and the plan for improving that method.

## 1. Where the work is (the first thing to fix)

| Location | What it holds |
|---|---|
| `origin/main` | The first method doc (313 lines). No scripts, no loader, no species. |
| `claude/trusting-borg-830b25` (newest code) | `fish-build.py` + `research/fish-specs/*.json`, the generic `src/art/photofish.ts` loader, and projection layers (`projart.ts`). Species: oscar, flame angel (strict sheet), pleco (in progress), clown knifefish, bamboo shark. Method-doc rows 24-29. Includes the `flameangel-photoart` and `inspiring-mendeleev` branches. |
| `claude/charming-tesla-cf37bb` | Method doc with the new sheet audit, the variant B prompt, and the label map dropped. Also a 307-line `scripts/fish-sheet-audit.py`. |
| `claude/fishpainter-d` | The earlier hand-annotated painter. It is the old path, not the sheet method. |
| `C:\Users\nreed\fish-sheets\`, `Downloads\` | The sheets themselves (kept out of the repo on purpose). |

**Collisions that need a hand merge:**
- **The method doc.** The borg and tesla copies both forked from main and neither contains the other. Borg still lists the label map as a stage; tesla dropped it.
- **`scripts/fish-sheet-audit.py`.** The two copies at the same path differ. Borg's is 39 lines and fails a sheet when the front and top widths disagree. Tesla's is 307 lines, fits the front envelope, checks that the tail is edge-on, and reports front vs top width as information only.
- **The flame angel specs.** Two JSONs for the same strict sheet carry different projection constants.

Until these are in one place, no experiment has a fixed baseline. That is why it is experiment E0 below.

## 2. What has been tried

### 2a. Before the sheet method (all rejected except where noted)

| Approach | Species | Verdict | Lesson |
|---|---|---|---|
| Procedural painted fish (flat fills, bands) | many | "too cartoony", rejected twice (Oct 8-9) | It must match the crisp tank render. |
| Drawn from memory | Endler's female | Flat and drab | Every model starts from real photos. |
| RX1 / RX2: redrawn by eye from photos | 23 species | Only the tailspot blenny was good | Shapes from eyeballed outlines were consistently wrong. An IoU of 0.99 against the annotation proved only that the loader worked. |
| Painter Exp A/B/C/D: one photo annotated into JSON, fin colour grid sampled | flame angel, pajama cardinal, kole tang, foxface and others | "night and day better"; C and foxface merged | Colours sampled from the photo work. Thickness taken from the side view alone gave fish about 1.65x FishBase mass. |
| Pixel-measured outline + parametric art | dottyback | "still terrible" | The outline alone isn't enough. Fins and markings need the real image. |
| **Photo cutout wrapped on the measured loft** | dottyback | **"that model looks pretty great"** | Needs both the measured body and the image on it. This is the method's origin. |

### 2b. The 3-view sheet method, per species

| Species | Sheet | Ref photos with the prompt? | Result | Nathan rounds / tool calls |
|---|---|---|---|---|
| Orchid dottyback | portrait, 3 stacked panels | prompt lost | Side "very strong", then fixes to the front, pectoral attachment, anal-fin bulge and rear taper. Liked. | about 11 rounds / about 60 calls, about 4 hours |
| Flame angel | portrait; first sheet, then a "strict" sheet | prompt lost | First model "done beautifully". The 3D render was blocked about 11 hours by machine overload. Top-panel length error fell from 6% to 1.2% with the strict sheet. It still has no rooted paired fins, and its colour drifts red. | about 5 rounds after the stall / 17 calls for the rebuild |
| Clownfish (sheet 1, variant C) | portrait | told to attach, not recorded | Length matched (965 vs 966 px). But the tail was fanned in the top view, width/depth was 0.73 (asked for ~0.5), and the spines were sawtooth with a cartoon mouth. Not built. | none (stopped at the audit) |
| Oscar (variant B) | portrait | told to attach, not recorded | The best sheet so far: tail edge-on score 0.09 (clownfish 0.60), side 1071 vs top 1065 px, width/depth 0.62 in all three panels. Hand-placed fin roots (build B) beat automatic ones (build A). | about 50 calls |
| Clown knifefish (v2: rigid object, numeric proportions) | landscape | | Hit its numbers (width 0.09, views within 7%) and needed no workarounds. "Looks pretty damn good". | about 9 calls, 17 points |
| Pleco | separate body and fin sheets (one `noref`, no photos) | none for `noref` | Fin sheet good, body sheet's views disagreed. Thickness hit the 1.6 cap (rms 2.22% SL). In progress. | about 14 calls, 24 points |
| Brownbanded bamboo shark | landscape, pectorals spread | | "comically terrible", "nah man this model just sucks". The limit is the renderer: 21 body sections, width tied to depth, no card for the median fins. | 3 rounds, about 30 points, rejected |

### 2c. Side experiments

| Experiment | Result |
|---|---|
| ChatGPT vs Gemini, same oscar prompt | ChatGPT clearly better. Gemini drew a small fish (705 px), printed numbers, spread the pectorals, made it thicker, and its front view disagreed. |
| Label map (asking the generator for a second colour-coded image) | Failed twice. Try 1 redrew the sheet (IoU 0.75, 2-5% SL edge drift). Try 2 used code: the outline was exact but the body/fin regions and the eye were invented. **Dropped.** The outline alone can come from a threshold of about 8/255 on black. |
| Auto vs hand-placed fin roots | Hand placement won on the oscar (auto read the dorsal as body and made a hump). 14 points are enough for the flame angel; 28 looked the same. |
| Spline-smoothed fin bases | No better. Nathan preferred straight segments. |
| `rembg` on backgrounds | IoU 0.97 on black, 0.84 on a synthetic busy background. Not needed while sheets are on black. |
| Separate body and fin sheets (pleco) | The fin sheet was great, but the body sheet was still inconsistent. Judged too costly for 150+ species. |

## 3. Findings

### On the prompt
1. **Views agree only when the prompt frames the sheet as one rigid object in one pose seen by three cameras, and gives numeric proportions.**
   - The knifefish (v2) and the oscar (variant B) followed this and their views agreed within 1-7%.
   - The pleco, shark and flame angel prompts lacked this framing, and their top and front views disagreed by 21-60%.
2. **Numbers work; long anatomy text is ignored or exaggerated.**
   - Numbers can still miss: the shark came out slimmer than asked (6.5% vs 10%).
   - Naming a cartoon fish ("Nemo") gave cartoon faces.
   - Putting headings in the prompt makes the generator print labels on the image.
3. **Generated sheets run thick.** Width/depth was 0.73 against about 0.5 expected on the clownfish. The pleco hit the thickness cap. A check against FishBase mass or a real top-down photo is needed.
4. **The "pectorals folded in the top view" rule conflicts with "one pose".** Nathan's point is that all the views must be literally the same model. A rule that changes the pose for one view breaks the rest.
5. **We have almost no record of what was sent.**
   - The dottyback and flame angel prompts are lost.
   - The pleco, shark and knifefish prompts aren't in the repo.
   - Whether photos were attached is recorded for only one sheet (the pleco `noref`).
   - The effect of reference photos is therefore **unknown**. It is the largest gap in the evidence.
6. **No sheet was ever regenerated with the same prompt to measure variance.** A difference between two prompts may just be one draw against another.

### On Claude's side
7. **The method needs both the measured body and the photo cutout wrapped on it.** Neither works alone (section 2a).
8. **The main cost is reading landmarks by hand off a grid image.**
   - Calls per fish: about 60, 50, 17, 14 and 9, against a target of 6-10.
   - Automatic body/fin splitting fails when the fin and body share a colour.
   - Hand-placed roots win on quality but cost calls.
9. **Settings were tuned per species and never consolidated.** These include `--level`, `--fullbody`, `--clip-head`, `--dense` (shark only), `thickfit` vs `measured_width`, and two projection-constant sets for the flame angel. Each new species starts by rediscovering these knobs.
10. **The sheet audit is the right gate but isn't fixed yet.** On the clownfish it caught the bad sheet before any build was spent on it. There are two versions of it (section 1).
11. **Renderer limits are separate from sheet quality.** Slender, flattened fish (sharks, eels) fail in the loft itself. No prompt work fixes that. Leave them out of the experiments below.
12. **Unverified:** a tank of about 20 photo-card species compared A/B against the current art, phone texture memory (about 4 MB per species), and where the flame angel's colour drift comes from.

## 4. Proposed experiments

### How to score them

Score every sheet and model the same way, so the results can be compared:

- **Sheet score (automatic, no build).** Run the merged `fish-sheet-audit.py` and check:
  - side vs top length within 2%;
  - front vs top-station width within 5%;
  - tail edge-on score at most 0.15;
  - width/depth within 15% of the target (a FishBase or real-photo value);
  - eye and mouth heights in side vs front within 2% SL;
  - no printed text;
  - pectorals in the same pose in every view.

  A sheet passes only if every check passes. Log the numbers.
- **Model score.**
  - Nathan's verdict: good / fixable / bad.
  - The method-doc checklist (section 4) passes.
  - Mass is within 0.6-1.6x FishBase.
- **Cost score.**
  - Claude tool calls from sheet to first model shown.
  - Nathan rounds.
  - Sheets regenerated.
- **Log** every sheet in `research/fish-sheets/log.csv`. Columns: species, date, generator, prompt version, ref photos (count and kind), layout, seed attempt, audit numbers, pass/fail, then the model verdict and costs. Prompts go in `research/fish-sheets/prompts/<version>.md`. Store sheets in `C:\Users\nreed\fish-sheets\` only, named after their log row.

**Test panel.** Four body types, with species that already have history:

| Body type | Species |
|---|---|
| Deep and flattened side to side | flame angel or oscar |
| Torpedo-shaped | clownfish |
| Long and thin | clown knifefish |
| Flattened top to bottom, bottom-dwelling | pleco |

No sharks or eels.

### The experiments, in order

**E0. One baseline (Claude only, no Nathan time).**
- Merge borg, tesla and the method doc into one branch on main.
  - Pick tesla's audit script, keeping borg's front/top check as information only.
  - Drop the label map stage.
  - Give the flame angel one projection set.
- Add the log and the prompts folder.
- Back-fill the log from the sheets already on disk, auditing each one, so the existing sheets become data points.
- **Done when:** one doc, one audit script, and every existing sheet has an audited log row.

**E1. Seed variance (Nathan: 9 generations, about 15 minutes).**
- Generate 3 sheets each for oscar, clownfish and pleco with the same variant B prompt and the same photo set.
- Audit all 9.
- **Answers:** how much of a prompt "effect" is just luck. It also decides whether the method should be "generate 3, keep the best by audit".
- **Run first:** without this, every later comparison is uninterpretable.

**E2. Prompt framing (Nathan: 24 generations).**
- Compare variant B against variant B+R (adds "one rigid model, one pose, three orthographic cameras", numeric proportions from FishBase, and no headings).
- Test also whether the pectorals should be folded or match the side-view pose in all three views.
- Use the 4 test species, 2 framings x 3 draws each.
- **Answers:** which prompt template becomes the default.

**E3. Reference photos (Nathan: about 24 generations).**
Use the winning prompt from E2. Compare four arms:

| Arm | Photos attached |
|---|---|
| a | none |
| b | 1 side photo |
| c | side + a top-down or front photo |
| d | 3 photos + one in-style example sheet (the oscar's) |

- Run 3 species, 2 draws each.
- Score colour fidelity too: the sheet's mean colour vs the photo, in sampled patches.
- **Answers:** whether photos earn their cost, and whether showing one good sheet works better than more photos (few-shot vs references).

**E4. Layout (Nathan: about 12 generations).**
- Compare portrait stacked panels (top view directly under the side view) against landscape, with a thin scale grid or registration lines in the prompt and without.
- Use 2 species, 3 draws each.
- **Answers:** which layout the audit measures most reliably.
- Could be folded into E2 if Nathan's time is short.

**E5. Landmark input (Claude, plus about 5 minutes of Nathan per fish).**
On 3 fish with passing sheets, compare three ways to get the landmarks:

| Arm | Landmarks from |
|---|---|
| a | Claude reading a grid image (today's way) |
| b | a small single-file HTML click tool (Nathan or Claude clicks about 14 points: fin roots, eye, mouth, peduncle) that writes the spec JSON |
| c | automatic detection with the hand clicks used only to check it |

- **Answers:** the cheapest way to hit the 6-10 call target without losing quality.

**E6. Thickness source (Claude only).**
- On the E1-E3 sheets, compare three sources of thickness:
  - `thickfit` from the top panel;
  - `measured_width`;
  - the top panel rescaled to a FishBase width/depth.
- Check each against FishBase mass, and against a real top-down photo where one exists.
- **Answers:** one thickness rule for the doc.

**E7. Frozen recipe, end to end (the proof).**
- Freeze the winners of E1-E6 into the method doc.
- Build 3 new species not seen before, one per body type, cold from a fresh chat.
- **Targets:**
  - at most 10 Claude calls and 2 Nathan rounds per fish;
  - every sheet passes the audit in at most 3 draws;
  - a "good" verdict on 2 of 3.
- Then run the open check: a tank of about 20 photo-card species A/B against the current art (alternate frames), and phone texture memory.

### Cost and order

| Step | Nathan time | Claude work |
|---|---|---|
| E0 | none | one Sonnet lane, about 1 session |
| E1 + E2 | about 33 generations, can be done in one sitting | audit only, scripted, cheap |
| E3 + E4 | about 36 generations | audit only |
| E5 + E6 | 5 min per fish | one Sonnet lane |
| E7 | a normal species review | one fresh chat |

**Decision points:**
- **After E1:** if the draw-to-draw spread is larger than the prompt differences, change the method to "draw 3, keep the best" and shrink E2-E4.
- **After E3:** if photos don't help, drop them and save Nathan the photo hunt for each species.

**Out of scope here:** a renderer for slender, flattened fish (sharks, eels). That decision is pending with Nathan separately.

## 5. Results

### E1: draw-to-draw variance (2026-11-20, text-only)

**Setup.** Prompt version `B-noref`, no photos (Nathan's choice; see `research/fish-sheets/E1-instructions.md`). ChatGPT, a new chat for every draw. There are 9 rows in `research/fish-sheets/log.csv`. Where the top and front panels touched, the sheet was audited on a copy with a 5-px black cut at the narrowest row; the original sheets are unchanged.

| Species | Layout | Side vs top length | Tail edge-on | Width/depth, top view | Width/depth, front view |
|---|---|---|---|---|---|
| oscar | 3/3 portrait | 0.6, 2.0, 1.4% | 0.08, 0.15, 0.10 | 0.635, 0.659, 0.617 | 0.590, 0.592, 0.671 (−7, −10, +9%) |
| clownfish | 1 portrait, 2 landscape touching | 2.0, 0.0, 0.8% | 0.05, 0.13, **0.29** | 0.589, 0.591, 0.618 | 0.694, 0.663, 0.707 (+18, +12, +14%) |
| pleco | 3/3 landscape touching | 1.8, 0.7, 0.0% | **0.34**, 0.21, 0.21 | 1.395, 1.387, 1.390 | 1.57, 1.97, 1.66 (+33 to +79%) |

**Findings**

1. **The side and top views repeat closely.** Length agreed within 2% in all 9 draws. Width/depth from the top view varied by ±3% for the oscar, ±2.5% for the clownfish and ±0.3% for the pleco. For the body measurements the model is built from, one draw is enough; "draw 3, keep the best" is not needed for thickness.
2. **The front view is not a measurement.** The error was random for the oscar (±10%) and biased for the clownfish (+12 to +18%). For the pleco it was meaningless (+33 to +79%), because its spread pectoral fins merge into the outline. **Decision:** the front panel is used for texture only. In the audit, front-vs-top thickness becomes an information line and stops being a pass criterion.
3. **Layout follows the fish's shape, not the prompt.** The deep oscar came back portrait every time. The long pleco came back landscape with touching panels every time, and the clownfish 2 times out of 3. For E2, try an explicit canvas shape and gap (for example "tall 2:3 canvas, at least 40 px of black between panels"). Alternatively, the audit could do the narrow-row cut itself.
4. **Tail edge-on is the one random failure:** 2 of 9 draws (clownfish d3 0.29, pleco d1 0.34). That is the only reason left to make more than one draw.
5. **Consistent does not mean correct.** The clownfish top view gave 0.59–0.62 every time, while earlier notes expected about 0.5 (not yet checked against measured specimens). Text-only sheets may be consistently wrong. The next question is accuracy against real numbers, not variance.

**Consequences for the plan**
- **Production stays at one generation per species** (Nathan's rule). E1 supports it: body measurements repeat within 2-3%. A sheet is redrawn only when the audit fails it, which E1 suggests happens about 1 time in 5 (tail not edge-on).
- Real proportions (researched 2026-11-20). Width and depth are measured at different points on the fish, so treat the ratios as approximate:

  | Species | Real width/depth | Depth %SL | Width %SL | E1 top view | Source, confidence |
  |---|---|---|---|---|---|
  | oscar | ~0.43-0.50 | 46.2 | ~20-23 (head width 19.6) | 0.62-0.66, too fat | ZooKeys 1113 (2022) Table 1, *A. ocellatus* n=16 (PMC9848875). Depth and head width measured; max width estimated. |
  | clownfish | ~0.45-0.55 | 42-48 | ~20-24 | 0.59-0.62, likely too fat | FishBase 6509 for depth. No published width: weakest number. |
  | pleco | ~1.41-1.54 (congeners) | 18-23 | 27.5-33 (cleithral) | 1.39, plausible, slightly low | Four *Hypostomus* descriptions (Zenodo 15866191, 17101351, 17162073, 15986026) and Zawadzki et al. 2008. No data for *H. plecostomus* itself. |

  Follow-up research (2026-11-20):
  - Total length ÷ standard length (TL/SL): oscar 1.193 (FishBase LL table, ID 3612, no statistics given); clownfish 1.26 (FishBase ID 6509, r² 0.995, TL 4.1-8.2 cm). Pleco: no source; 1.2-1.3 is typical for loricariids.
  - Clownfish width: still unpublished for *A. ocellaris* and its congeners. The best guess is 16-20 %SL, confidence low. E6's mass-match fallback (about 14-16 %SL) stays until a measured photo or calipers settle it.
  - Possible width sources not yet read: Fisher & Hogan 2007, and the supplement of a 2025 pomacentrid bioRxiv preprint.

  Text-only sheets draw the side-to-side flattened fish (oscar, clownfish) about 30% too thick, every time. That is a bias, so it can be corrected, which makes the numeric-proportions arm of E2 the main test.
- E2 uses 1 draw per species per arm.

### E2: numeric proportions in the prompt (2026-11-20; stopped after the oscar to save generations)

**Setup.** Prompt version `B-num`. Two oscar draws only; the clownfish and pleco were not drawn. Nathan's call: assume they follow the same pattern.

**Results**
- Thickness did not move. The station width/depth was 0.645 and 0.598, against 0.617-0.659 in E1. Top-view max width ÷ length was 0.203 and 0.189, against 0.191-0.206.
- ChatGPT ignores numeric proportions, as it did for the shark earlier.
- **Correction to the E1 finding.** The audit's width/depth is measured just behind the head, and that is not comparable to the published max-width/max-depth ratio. Measured like for like (top-view width ÷ total length, about 0.19-0.20, against a real value of about 0.17, assuming total length ≈ 1.25 × standard length), the oscar sheets are about 10-20% too wide, not 30%. That is close to the uncertainty in the real value itself.

**Decisions**
- Thickness is corrected on Claude's side (E6), not in the prompt.
- The prompt stays `B-noref` plus the layout line, which still needs testing on a long fish; that rides along with the next generation that is needed.
- Generations are scarce, so the next experiments are the ones that need no new sheets: E6, then E5, run on the 14 E1/E2 sheets. The three species replicate each other, so no extra draws of the same species are needed.
- E2 tests the prompt with layout and numeric-proportion lines added, still text-only.
- Real width/depth values are needed for the test species, so E6's real-numbers check moves ahead of E2.


### E6: thickness source (2026-11-20, no new sheets)

**Audit script v2 (done first).** The front-vs-top check is information only. Touching panels are split at the narrowest row (tallest band, middle 20-80%, 5-row cut) and the audit says so on a PASS line; the gaps check is skipped for those sheets. A new like-for-like line, "top max width / length" (greatest body width of the top view, narrow bulges opened away over 4% of the length, fins edge-on), is what `--real` compares: `--real R` is real max body width / total length, or `--real-width-sl W --tl-sl K` converts from % SL. Tail edge-on follows the plan: PASS <= 0.15, WARN <= 0.25, FAIL above (E1's two fanned tails read 0.29 and 0.34, good ones 0.05-0.15, so 0.15-0.25 is a grey zone that deserves a warning, not a pass). The log has 11 sheets (E1 9 + E2 2), not 14. Re-scored:

| Sheet | Panels | Max width / length | Tail edge-on | Result |
|---|---|---|---|---|
| oscar E1 d1 | clean | 0.199 | 0.08 | PASS |
| oscar E1 d2 | clean | 0.204 | 0.15 | FAIL (snout/tail ends 2.0% apart; tail on the WARN line) |
| oscar E1 d3 | clean | 0.188 | 0.10 | PASS |
| oscar E2 d1 | clean | 0.200 | 0.08 | PASS |
| oscar E2 d2 | clean | 0.188 | 0.08 | PASS |
| clownfish E1 d1 | split | 0.157 | 0.05 | PASS |
| clownfish E1 d2 | clean | 0.176 | 0.13 | PASS |
| clownfish E1 d3 | split | 0.161 | 0.29 | FAIL (tail fanned) |
| pleco E1 d1 | split | 0.165 | 0.34 | FAIL (tail fanned) |
| pleco E1 d2 | split | 0.172 | 0.21 | WARN (tail) |
| pleco E1 d3 | split | 0.169 | 0.21 | WARN (tail) |

Front-vs-top thickness was the only failure on 8 of the 11 sheets before and fails nothing now. Real max width / total length: oscar 21.5 %SL (range 20-23) with TL/SL about 1.2 (assumed) gives about 0.18, so the sheets are about 10% wide, inside the real value's own uncertainty; pleco 30 %SL (27.5-33) with TL/SL about 1.3 (assumed) gives about 0.23 against 0.165-0.172 on the sheets, so the pleco top views are about 25% narrow; the clownfish has no published width.

**Method.** `scripts/fish-sheet-e6.py` measures each sheet (side depth with fins opened away, peduncle, top-panel widths), lofts the body with the app's cross-section (`fish3d.ts` sections(): superellipse 2.4, no belly/wide/headW options) and computes body mass (volume x 1.02 g/cm3, fins excluded, as `body-volume.ts`) against FishBase `a x TL^b` (TL: oscar 300 mm, clownfish 100, pleco 380). Rules: (a) `thickfit`; (b) `measured_width` as drawn; (c) the top profile rescaled to the real max width % SL (oscar 21.5, pleco 30; the clownfish has none, so depth x 0.5 was tried); (d) the (b) profile scaled to 1.00 x FishBase. Data: `research/fish-sheets/e6-thickness.csv`.

| Mass / FishBase | (a) thickfit | (b) as drawn | (c) rescaled to real width | (d) mass-matched |
|---|---|---|---|---|
| oscar (5 draws) | 1.02 (0.93-1.12) | 0.98 (0.90-1.07) | **0.88 (0.82-0.98)** | 1.00 |
| clownfish (3 draws) | 1.54 (1.34-1.81) | 1.48 (1.28-1.75) | 1.85 (1.59-2.26), width = depth x 0.5 | **0.98** |
| pleco (3 draws) | 0.77 (0.72-0.81) | 0.72 (0.68-0.75) | **0.97 (0.90-1.02)** | 1.01 |
| Spread across draws, max / min (oscar, clownfish, pleco) | 1.20, 1.35, 1.12 | 1.19, 1.37, 1.11 | 1.19, 1.42, 1.14 | about 1.0 by construction |

**Findings**
1. The sheets' own thickness (a, b) lands inside the 0.6-1.6x gate for the oscar and pleco but not the clownfish (1.34-1.81x, one draw over). The pleco runs light (0.68-0.81x).
2. Rescaling to the real max width fixes the pleco (0.90-1.02x) and keeps the oscar near 0.9x. The remaining spread across draws (about 1.15-1.2x) comes from the side-view depth, not thickness, so no thickness rule removes it.
3. Absolute masses carry about +-20% from the side depth, which includes broad soft fins (oscar depth reads 57-60 %SL against 46 real). On the sheet the shipped oscar was built from this script gives 1.07x (a) against 0.89x in the repo, which uses hand-placed fin bases. Compare rules with each other, not the absolute numbers.
4. Where no width is published (clownfish), depth x a class prior is worse than the sheet (1.59-2.26x). Mass-matching to FishBase needs no width data, only the length-weight row every species already has. Its implied clownfish width is 14-16 %SL, thin against the 20-24 %SL guess, so check it against a top-down photo.

**Decision.** One rule (method doc section 3, step E): rescale the top-panel width profile so its maximum equals the real max body width in % SL and loft it as `measured_width`. With no published width, scale the same profile to 1.0 x FishBase mass and note it. `thickfit` is dropped from the final thickness. No renderer change needed: `?mw=1` / `R.measuredWidth` exist, and `R.thickx` multiplies the measured widths in `photofish.ts`.

**Not done.** The clownfish width is still unknown (needs a top-down photo or a specimen table). The rescale was not rebuilt and viewed in the 3D harness, since `fish-build.py` needs hand landmarks per sheet. TL/SL for the audit's `--real` conversion is assumed (oscar 1.2, pleco 1.3), not looked up.
