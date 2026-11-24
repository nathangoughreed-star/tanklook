# How the 3D fish models were made: a history of the experiments (Oct 8 – Nov 23, 2026)

Written 2026-11-23 as a historian's record. It covers what was tried, what each attempt produced, what Nathan said about it, and what is still open.
It does not replace the working documents. Use them for the details:
- `research/fish-model-sheet-method.md`: the loft method ("build B"), its 31-row checklist and its change log.
- `research/fish-sheet-methodology-audit.md`: experiments E0–E7 on the sheets.
- `research/multiview-to-3d.md`: the generative image-to-3D route (E-GEN), runs 1–5.
- `prompts/coordinator-egen.md` and `research/fish-sheets/prompts/`: the prompts.

The sources are about 150 fish commits on `origin/main`, the `claude/glbfish-e5` branch (up to `cffbd0bd`), the HANDOFF history and the memory notes.
Most of Nathan's quotes below come from those documents.

---

## 1. The short version

| Era | Dates | Approach | Verdict |
|---|---|---|---|
| 1 | Oct 8 | Procedural 2D painted cards (`PLANS` in `fishgen.ts`) | "Too cartoony" |
| 2 | Oct 9 – Oct 16 | The same plan lofted into a 3D body: painted texture on the flanks, fin cards, outlines | "Materially closer… first real proof 3D fish can work". Shape fine, painting weak |
| 3 | Oct 22 – Oct 28 | Code-level realism passes, partly written by **ChatGPT on our source code**, with colours from reference photos | Adopted for about 40 models (ember, tetras, corys, rasboras, cichlids) |
| 4 | Nov 18 | Redrawn by eye from reference photos (RX1/RX2, 23 species) | Only the tailspot blenny was good |
| 5 | Nov 19 | "Fish painter": one photo annotated into JSON, with a fin colour grid sampled from the photo | "Night and day better", but thickness and fins still wrong |
| 6 | Nov 19 – Nov 20 | **3-view sheet from ChatGPT → measured loft → sheet as texture** ("photoart", build B) | Dottyback: "that model looks pretty great". Later: too photographic (R144) |
| 7 | Nov 22 | **Generative image-to-3D** (Hunyuan3D-2mv) from the sheet panels | Oscar "looks really good, better than build B" |
| 8 | Nov 22 – Nov 23 | **Finless method**: a generated finless body plus fins cut from the finned panel | Rainbowfish, then blue tang. In progress |

None of eras 5–8 is in the default app yet. On main, photoart sits behind the `?photoart` flag. The generated models are on the `claude/glbfish-e5` branch only, behind `?glbfish`.

---

## 2. Timeline in detail

### Era 1: procedural painted cards (Oct 8)
- **What:** 37 species, each drawn from one parametric `Plan` (proportions, colour fields, bands, fins) and painted as a flat card.
- **Result:** rejected as cartoony: flat saturated fills, blurred bands, no sheen or scales, fins drawn as tints.
- **Rule that came out of it:** the fish must be as crisp as the rest of the tank render (glass, gravel, plants).

### Era 2: the 3D loft from the plan (Oct 9 – 16)
- **Decision (Oct 9):** fully 3D fish built from the existing plan. Sourced models were rejected for four reasons:
  - art provenance;
  - inconsistent style;
  - file size (about 10–20 MB for 42 Meshy fish against 0.57 MB);
  - "sourcing every species forever".
- **AI 3D was looked at and turned down.** Nathan said Meshy "seemed cool", then: **"let's see how well we can refine the models without Meshy."** (Six weeks later, era 7 came back to generated 3D.)
- **Build:** 40 stations × 28-point superellipse rings. The painted card is projected onto both flanks.
- **Setback 1:** the first verdict ("too cartoony… doesn't match how good and crisp the rest of the model displays") was given on **broken pictures**. The loft's triangles were wound inward, so the near flank was culled and the pictures mostly showed the flat card.
- **After the fix:**
  - a fish shader mode (facing light, Blinn highlight, edge sheen);
  - a shaded eye socket, scale net, cory plates, wavy bands;
  - real 3D paired fins;
  - contact shadows.
- **Review:** "materially closer… first real proof 3D fish can work". The discus was best and the bronze cory weakest ("smooth blimp").
- **Then (Oct 13 – 16):**
  - "fish stand out" outlines, with body and fins sharing one line width;
  - lane S: structural median fins (base along the body, spines, trailing rays) and a 3D mouth line;
  - lane Y: an anatomy audit of 8 bottom and marine fish;
  - F2: fantail goldfish;
  - fins made less see-through (alpha 0.36 → 0.6);
  - `pec.flat` / `pelvic.flat` options.

### Era 3: realism passes, including ChatGPT writing the code (Oct 22 – 28)
- **Photo-built plans:** Sterba's cory and the dwarf pencilfish got their own plans built from reference photos.
- **Outside generation of code, not images.** The `handoff/chatgpt-ember/` and `handoff/chatgpt-batch1/` folders packaged `fishgen.ts`, `paint.ts`, `fish3d.ts` and `textures.ts` with a brief.
  - The brief: improve the shared tools, keep the signatures, use opt-in Plan fields so other species stay unchanged, and return the files in full.
  - ChatGPT's ember pass added a rounder section, warm colour fields, scale glints, a curved gill seam and tinted fins. It was adopted (`89cbe697`) as the opt-in fields `sectionExp`, `shimmer` and `gillLine`.
  - The pass then spread to the neon, cardinal and green neon (a thin glowing stripe with a halo), the corys, rasboras, danios and cichlids. Marking refinements (discus net, dwarf gourami pinstripes) came from reference photos.
  - About 40 model sheets were recorded (`public/model-sheets/`).
- **What worked:** a tight brief built around opt-in fields and a "return whole files" contract made the outside code usable with almost no rework.
- **What it couldn't fix:** the parametric fins and the procedural marks stayed what they were.

### Era 4: redraw by eye from photos (Nov 18)
- **Trigger:** the Endler's female, drawn from memory, came out flat and drab. Nathan: "why not get reference photos every single time?" That became `species-art-method.md`: at least 2 photos per look, the look written down, and a side-by-side check.
- **RX1/RX2:** 23 species redrawn this way.
- **Result:** "Shapes from eyeballed outlines were consistently wrong." Only the tailspot blenny was good.

### Era 5: the fish painter (Nov 19)
- **What:** one Commons or iNaturalist photo, annotated by eye on a 50 px grid into JSON (body polygon, fins, roots, eye, bar paths). A fin colour grid is sampled from the photo.
- **Result:** "night and day better". The foxface merged. Four fish (flame angel, pajama cardinal, kole tang, foxface) are still drawn this way on main.
- **Why it was replaced:**
  - The IoU of 0.99 only proved that the loader lost nothing from the annotation.
  - Thickness from the side view alone gave fish about 1.65× FishBase mass.
  - Fins stayed flat sheets.

### Era 6: the 3-view sheet and the measured loft ("photoart", build B) (Nov 19 – 20)
- **Origin (orchid dottyback):**
  1. A pixel-measured outline with parametric art was "still terrible".
  2. The **photo cutout wrapped on the measured loft** gave **"that model looks pretty great… Side view very strong"**, the first fish Nathan liked.
  3. Nathan then had ChatGPT make a **3-view sheet** (side, top and front on black). Scripts measured the outline and the top-view widths, the side panel became the texture, and the top and front panels were projected on as layers.
- **Cost of that first fish:** about 11 rounds, about 60 tool calls, about 4 hours. The prompt was not recorded.
- **Species run through it:**

  | Species | Outcome |
  |---|---|
  | Flame angel | "done beautifully" (render blocked about 11 hours by machine overload). A strict sheet cut the top-panel error from 6% to 1.2% |
  | Clownfish | Sheet failed the audit, so no build. A "Nemo" prompt gave cartoon faces |
  | Oscar | Best sheet. Hand-placed fin roots (build B) beat automatic ones (build A, back hump) |
  | Clown knifefish | "Looks pretty damn good" in about 9 calls |
  | Pleco | In progress: separate body and fin sheets |
  | Brownbanded bamboo shark | **"comically terrible", "nah man this model just sucks"**. The loft can't do slender, flattened fish |

- **The checklist ratchet:** every correction Nathan made became a row in the method doc. Section 4 now has 31 rows: doubled eye, fin "leaves", detached pectorals, anal bulge, blunt rear, orange rendering red, and more.
- **E0–E7 experiments (Nov 20):** summarised in section 3 below.
- **Setback 2: another verdict on broken renders.** E5's 3D comparison showed a "gap along the back" on every fish, which was first wrongly called a harness quirk. The cause was the `photofish.ts` outline being wound tail-first. That single bug broke every `fish-build.py` fish. With it fixed (`fcb46e87`), five new species were built from Nathan's clicks in 2–3 calls each (angelfish, neon, betta, bronze cory, pea puffer), and 4 of the 5 needed no tuning.
- **Style correction (R144, Nov 20):** **"The point was never to be photo-realistic… it looks kind of out of place considering the limitations of the rest."** The target is between a sticker and a photograph: the same level of stylization as the substrate, equipment and plants. This is not resolved.

### Era 7: generative image-to-3D (Nov 22)
- **Research:** `multiview-to-3d.md` found that "a few views → 3D" has been a solved problem since 2024. Image-to-3D generators treat the views as conditioning rather than hard geometry, so they tolerate views that disagree, which was build B's biggest cost.
- **Run 1, Hunyuan3D-2mv (free Hugging Face demo):** side panel in the `front` slot and head-on panel in the `left` slot. One call, about 10 tool calls in all.
  - Silhouette IoU: **side 0.93**, top **0.87** (the top panel was never an input), front 0.75.
  - Fins were thin, not blobby.
  - The texture endpoint failed, so we bake our own texture.
  - TRELLIS.2 was refused for quota (about 2 GPU minutes a day anonymous).
- **Run 2, in the tank beside build B:** the generated body had a real head (lips, gill cover, eye socket).
  - Bake bugs: orange pectorals (painted with the flank colour behind them) and an eye painted on the flank.
- **Run 3, triangle budgets:**
  - 20k / 8k / 3k / 1.2k triangles look the same at 300 px down to 3k.
  - Frame cost follows **draw calls, not triangles**: 100 build-B oscars take 953 draws, 100 generated ones take 253.
  - Plan: detail by adult size (big fish detailed, schooling fish light), three.js LOD, instanced schools.
- **Nathan:** the generated oscar **"looks really good, better than build B"**. His two faults:
  - messy fin tips;
  - fin outlines painted onto the flank.

### Era 8: the finless method (Nov 22 – 23)
- **Idea (Nathan's):** generate a finless body and add the fins separately.
- **Editing the existing sheet to remove the fins failed.** ChatGPT redrew the body as an egg.
- **One prompt with both versions worked** (rainbowfish, run 4). The panels:
  1. finned side;
  2. the same side "trimmed flush… as if cut with scissors";
  3. top without fins;
  4. front without fins.

  The finned and finless head depths matched to the pixel. Fins = the finned mask minus the finless mask.
- **Run 4 fault:** the generator turned the fin bases into body, so the dorsal and anal fins showed only as thin strips.
- **Run 5 fix, in code (`fish-fin-line.py`):** a random-forest pixel classifier finds the real back and belly line under the fins. The body may only shrink. Both dorsals and the anal fin then showed at full size.
- **Nov 22 evening (E-GEN-P):**
  - one command per species (`scripts/fish-gen.py`);
  - panels found by their gaps (stacked or 2×2 grid);
  - fins named by position;
  - the pectoral from a label-map panel 5.
- **Nov 23, blue tang (the second species):**
  - built both ways from one sheet;
  - a 5-row sheet (side, finless side, top, front, plus a front fin map and a side label map) built **both methods with no hand fixes** (`d5d97748`);
  - Nathan reviewed it in the tank, and five fixes followed (`1a283665`, `cffbd0bd`).
  - Chats [Blue tang orthographic reference sheet](#local_5f462786-9a11-4555-9018-20068d216690) and [Reference image comparison](#local_e06f0489-9fb3-4764-ab5b-c8118ba8bfb0) were still active when this was written.

---

## 3. What has worked best

### 3a. Prompting the image model (ChatGPT, outside Claude)
1. **Frame the sheet as one rigid object, in one pose, seen by several orthographic cameras.** The knifefish v2 and oscar variant B prompts did this and their views agreed within 1–7%. The pleco, shark and flame angel prompts didn't, and their views disagreed by 21–60%.
2. **The method block is exhaustive; the species paragraph is selective.** Long anatomy text is ignored or exaggerated.
3. **Avoid these:**
   - character names ("Nemo" gave cartoon faces);
   - headings (they get printed on the image);
   - a rule that changes the pose for one view, such as "pectorals folded in the top view". It breaks "same model in every view".
4. **Pure black background, flat shadowless light, no text, mouth closed, "photorealistic, no stylization".** The black background lets an outline threshold of about 8/255 catch even dark fins.
5. **ChatGPT clearly beats Gemini.** On the same oscar prompt Gemini drew a small fish (705 px), printed numbers, spread the pectorals and gave a front view that disagreed.
6. **Use a new chat per draw, and one generation per species.** E1 (9 draws) showed body measurements repeat within 2–3%. Redraw only when the audit fails a sheet, which E1 suggests happens about 1 time in 5.
7. **Numeric proportions don't move thickness** (E2, 2 oscar draws). Thickness is corrected on Claude's side instead.
8. **Ask for the finned and finless versions in the same image.** Never ask the model to edit an existing sheet.
9. **Layout follows the fish's shape unless the prompt specifies it:**
   - deep fish came back portrait;
   - long fish came back landscape with touching panels;
   - the current template asks for a 2:3 canvas, a 2×2 grid for deep-bodied fish, and at least 4% black gaps.
10. **Region labels:**
    - **A free-form "label map" failed twice.** The first try redrew the sheet; the second used ChatGPT's code path, which got the outline right and invented the fin regions.
    - **A narrow, specific request worked:** pectoral painted yellow with a black root dot (dwarf gourami: 0.23% of length), then the blue tang's front fin map and side label map.

### 3b. Generation outside Claude (tools and services)

| Tool | Used for | Result |
|---|---|---|
| ChatGPT (images) | All reference sheets | The best sheet maker. The prompt-dependent faults are listed in 3a |
| ChatGPT (code) | Realism pass on the procedural fish code | Adopted (ember, then ~40 models) |
| Gemini | Oscar sheet comparison | Worse on every measure |
| Hunyuan3D-2mv (HF free demo) | Body shape from 2 panels | Shape solved in one call. No texture. Daily quota tiny |
| TRELLIS.2 | Single-image 3D | Not run (quota refused) |
| Meshy / Tripo | Paid image-to-3D | Considered Oct 9 and Nov 22; never run |
| BGNN trait segmenter (local, CPU) | Fin and eye regions without clicks | Eye and median fins good; paired fins weak |
| `rembg` | Busy backgrounds | IoU 0.97 on black, 0.84 busy. Not needed while sheets are on black |

### 3c. In-Claude work (deterministic scripts, no freehand modelling)
- **Measure, don't model.** No Claude model draws the 3D shape. Scripts measure the sheet, and the numbers drive the loft or reshape the generated mesh. Every success came after this rule.
- **The body and the image belong together.** A measured outline alone or a photo alone fails; both together work (dottyback).
- **Audit the sheet before building** (`fish-sheet-audit.py` v3). It caught the clownfish sheet before any build. The tail rescue fixed a metric that was failing good sheets.
- **Nathan's clicks for landmarks** (`tools/fish-landmarks.html`): about 1 minute per fish, as accurate as anything else, and close to zero Claude calls.
  - Grid reading by Claude was 6–8% SL off on the tail base.
  - Automatic detection missed the eye 2 times in 3.
  - Calls per fish fell from about 60 (dottyback) to 2–3 (E7 part 2).
- **Thickness rule (E6):** rescale the top-panel width profile to the real maximum width (% SL). With no published width, scale to 1.0× FishBase mass.
- **For generated meshes:**
  - drop zero-area triangles, decimate, unwrap with xatlas, project the sheet;
  - spread fins take the front panel's colour;
  - finless body plus fin cards;
  - the fin-line classifier.

---

## 4. Challenges and setbacks

1. **Two verdicts were given on broken renders.** Inward-wound triangles (Oct 9) and the tail-first outline (Nov 20) each made several fish look bad, and each was first blamed on something else. The lesson, now in memory: verify on screen before calling anything "done", and suspect the loader first.
2. **Lost prompts.** The dottyback and flame angel prompts were never recorded, and whether photos were attached was logged for only one sheet. That is why `log.csv` and `prompts/` exist.
3. **Views that disagree.** The front panel is not a measurement: random ±10% on the oscar, biased +12–18% on the clownfish, meaningless on the pleco. It is now used for texture only.
4. **Generated sheets get thickness wrong.** Measured like for like, the oscar was 10–20% too wide and the pleco top view about 25% too narrow. The clownfish has no published width to check against.
5. **Fins share the body's colour.** Colour-only body/fin splitting fails (the oscar got a hump on its back), which is why clicks or a classifier are needed.
6. **Slender, flattened fish** (sharks, eels) fail in the loft itself: 21 stations, width tied to depth, no card for the median fins. No prompt fixes that.
7. **The style target moved.** Rejected as too cartoony (Oct), then as too photographic (Nov 20). The target is in between and is not yet defined by any example.
8. **Infrastructure:**
   - an 11-hour render stall from machine overload;
   - a syntax error from an unescaped apostrophe that killed the landmark tool;
   - conflicting script copies across branches (two `fish-sheet-audit.py`, two flame angel specs), which E0 had to merge;
   - HF quota;
   - a 4 GB local GPU that can't run the generator.
9. **Work stranded on branches.** Build B's oscar photo files exist only uncommitted in the E5 worktree. All of E-GEN is unmerged.

## 5. Fixes that landed (selected; the full list is checklist rows 1–31)
- Superellipse loft, fish shader, shaded eye, contact shadow, outlines (era 2).
- Photo cutout on the measured loft; the eye seated on the photo's eye; plan fin leaves dropped (rows 3, 5, 6).
- Rooted 3D pectoral and pelvic fins (G2, row 7). Photo-textured paired fins (`PHOTO_FINS`, row 26).
- Anal bulge and belly lumps capped; rear taper; `--level` axis through the peduncle (rows 8–10, 14).
- Top and front projection layers (rows 20–21, 29). `--sat 0.72` for the lighting's 1.35× saturation boost (row 22).
- Dark-fin alpha (`--alo/--aw`, rows 25 and 28).
- Tail edge-on audit anchored at the peduncle (row 30).
- Outline winding fix (`fcb46e87`).
- Generated-mesh bake: the spread-fin colour rule, swim UVs, outline shell, LOD ladder.
- Finless body reshaped to the real body line; stalk pulled to the tail-fin base.
- Blue tang (Nov 23):
  - pectoral wedge split;
  - painted pectoral removed from behind the 3D fin;
  - mouth registered by the outline when no front eyes are found;
  - tail-stalk cap seam;
  - top-view rear stations.

## 6. Tried and not (yet) solved
- **The style level (R144).** Nobody has yet shown an example between a sticker and a photograph that Nathan accepted.
- **Label maps as a general region source.** Dropped; only the narrow pectoral and fin-map requests work.
- **Automatic landmarks.** The heuristics missed the eye and fin bases. The segmenter is weak on paired fins. A pre-fill hybrid has not been built.
- **Pectoral detection over the flank** without a label panel. On the rainbowfish it was traced by hand.
- **Spline-smoothed fin bases.** No better; Nathan preferred straight segments.
- **Separate body and fin sheets** (pleco). The fin sheet was great, but the method was judged too costly for 150+ species.
- **The bamboo shark.** Rejected; the renderer has no slender-fish loft.
- **Flame angel colour drift** (renders redder than the sheet). The cause was never checked.
- **Smaller defects still open:**
  - angelfish pelvic filaments partly broken;
  - a dark block above the betta's dorsal;
  - a dark seam along the anal-fin base on generated fish;
  - the tail card vanishes when seen exactly edge-on.
- **Untested:**
  - whether attaching reference photos helps the sheet at all (E3 was never run; E1 was text-only);
  - phone frame cost and texture memory;
  - a 20-species tank A/B against the current art.
- **Generator access.** Hugging Face Pro ($9/month) is preferred and Replicate is the fallback. Not bought; the account and token are Nathan's to set up.

## 7. Lessons for whoever continues
1. **Spend effort on the evidence, not the look.** Every leap came from measuring something (pixels, IoU, mass against FishBase), not from tuning by eye.
2. **The cheapest landmark source is Nathan's mouse.** One minute of clicks beat 50 tool calls.
3. **Treat the image model as a source of consistent pictures, not of numbers.** It ignores numeric thickness, so correct that afterwards.
4. **Let a generator handle shape whenever views disagree.** Keep our own fin cards and sheet projection, the parts Nathan liked.
5. **Record every prompt and every sheet** (`log.csv`, `prompts/`). Half the early evidence is unusable because the prompts weren't kept.
6. **Judge in the tank, beside the substrate and plants, at tank size.** Both "too cartoony" and "too photographic" were verdicts on context, not on the fish alone.
