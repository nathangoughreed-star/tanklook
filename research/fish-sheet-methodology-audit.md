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
