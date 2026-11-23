# Fish models: handoff to the next chat (2026-11-23)

**Your job:** build **new species** with the method that won on the blue tang. Nathan, 2026-11-23: "I like the way the tang looks
now and would rather put resources into new models than continuing to split hairs with this one." Fix something on an existing
fish only when the fix helps every future species.

## Start here (read these, nothing else first)
1. This file.
2. `research/fish-model-sheet-method.md` section 4: checklist rows 1-34. Run it before showing Nathan anything. Grep the rest of the doc when you need it.
3. `research/fish-sheets/prompts/bluetang3-chatgpt.md`: **the current best sheet prompt**, verbatim.
4. `research/fish-model-history.md` (on main): the 6-week story, if you need context. Skim only.

## Where the work is
- **Branch `claude/glbfish-e5`, worktree `.claude/worktrees/glbfish-e5`.** Nothing below is on main yet.
  - Other chats commit here too: "E-GEN-P" and "Blue tang orthographic reference sheet". Commit only your own files, and leave `src/data/species.json`'s uncommitted e5 lines alone.
  - Uncommitted oscar photo files (`public/art/fish/oscar-*.webp`, `oscar.anatomy.json`) belong to the E5 chat; don't commit them.
- **Dev server:** `glbfish` in the shared `.claude/launch.json` (it may land on port 5200). Flags:
  - `?photoart`: every build-B ("photo") fish;
  - `?photoart&glbfish&gen`: every second `bluetangc` / `boesemani` swaps to the generated finless mesh.
- **Sheets and work folders** stay out of the repo, in `C:\Users\nreed\fish-sheets\<slug>-gen\`.

## The method that won (build B, no clicks)
The blue tang `bluetangd` was built this way. Nathan likes it.
1. **Prompt.** Take the blue tang prompt (`bluetang3-chatgpt.md`) and swap only the species content: name, the master-geometry proportions (depth %SL, width %SL), colours and fin descriptions.
   - Keep its structure:
     - a "master geometry" section;
     - row 2 described as row 1 minus its fins;
     - the consistency checklist;
     - geometry ranked over looks.
   - It is a 5-row sheet: side with fins, finless side, top, front plus front fin map, and side fin label map.
   - First job: split that prompt into a fixed method block and a species block, save it as `research/fish-sheets/prompts/B-5row-template.md`, then hand Nathan a ready-to-paste prompt per species.
2. **Sheet.** Nathan generates it in ChatGPT, in a new chat for each species, and saves it as `C:\Users\nreed\fish-sheets\<slug>-gen\sheet.webp`.
3. **Fin cut:** `python -I scripts/fish-fin-cut.py <work>` writes `fins.json`, `finlab.npy`, `pec.npy` and `align.npy`.
4. **Spec with no clicks:** `python -I scripts/fish-spec-from-fins.py <work> <id> "<name>" "<sci>" <tl_mm>`. Copy `<work>/<id>.json` to `research/fish-specs/`.
5. **Build:** `python -I scripts/fish-build.py research/fish-specs/<id>.json` writes the anatomy JSON and WebPs. Add a species.json row like `bluetangd`'s.
6. **Thickness (rows 33 and E6).** The sheet's own width ran 1.28-1.38× the FishBase mass on the tang.
   - Set the spec's `thickx` = FishBase mass ÷ model mass, using FishBase `a·TL^b`, and rebuild.
   - Compute the model mass from the anatomy JSON: superellipse 2.4 sections, half-width × half-depth per station, density 1.02 g/cm³. The tang's inline calculation is in this chat's log; a small script for it would pay off.
   - Don't trust `scripts/fish-sheet-e6.py` on 5-row sheets: it misread the panels of one tang sheet (depth 31% SL).
7. **Pectoral spread (row 32).** Judge it per species: try 0.2 / 0.35 / 0.5 rad with the body width held fixed. The tang kept 0.35; 0.2 buried the fin and 0.5 read as paddles.
8. **Pelvic.** The fin cut can catch only the tip. Check that the traced pelvic covers the whole fin (tang: re-traced by hand in the spec).
9. **Pictures.** Six matched views, one fish at a time, swim off: side, 3/4 from the head end, 3/4 from the tail end, head-on, from above, normal tank distance. Use this recipe in the page console:
   ```js
   __shot = async (sp, az, el, zoom, yf) => { __gb.viewer.swim = false; __gb.viewer.sway = false; __gb.viewer.drifters.length = 0;
     __gb.store.update(s => { const t = s.tanks[s.active]; t.tank = { L: 72*25.4, H: 24*25.4, D: 24*25.4 };
       t.fish = [{ id: 901, species: sp, x: .5*t.tank.L, y: yf*t.tank.H, depth: .5*t.tank.D, yaw: 0, pitch: 0, roll: 0, bend: 0 }];
       t.camera = { ...t.camera, az, el, zoom }; }); await new Promise(r => setTimeout(r, 1800)); };
   // views: (0,0,4,.5) (35,15,3,.35) (-35,15,3,.35) (90,0,5,.5) (0,80,4,.5) (15,8,1.3,.5)
   ```
   - Set the viewport to 1600×1000 and close the tank panel ("Done") first.
   - For blind A/B sheets, assign A/B by coin flip and keep the key in a separate file (`research/fish-sheets/bluetang-blind-AB*`).
   - Nathan gets second opinions from ChatGPT. Expect its notes back pasted in, and weigh them; they have been useful.

## Decisions on record (2026-11-23)
- The ChatGPT-revised prompt beat Claude's own prompt in a blind A/B. Write future prompts in its style.
- The fin membrane is shared by every photo-built and generated fish: `MEMBRANE` in `src/render/textures.ts`, with the same numbers in `scripts/fish-glb-assemble.py` (row 34).
- Not pursued, too fish-specific:
  - fin root shaping;
  - the black fin-edge alpha (`--alo 2 --aw 6` gave a fuzzy fringe on the tang).
- **Performance, measured with 40 tangs per frame:**
  - old procedural fish: 6.2k triangles and 8 draws each, 3.4 ms per frame;
  - build B: 10.3k triangles and 9 draws, about 5.4 ms;
  - generated: 16k triangles and 8 draws, about 5.4 ms.

  No lag expected on a desktop; phones are untested. Cheap wins if needed:
  - a detail ladder by fish size;
  - drawing the outline from a lower-detail copy;
  - merging the generated fins into one mesh.

## Open, but not your job unless Nathan asks
- **Merge to main.** Nothing from `claude/glbfish-e5` is on main. It needs a loader keyed by species art, not dogfood flags, and the E5 oscar files resolved. Merge only with Nathan's yes.
- **Build B or generated (finless) as the production method.** The tang decision was build B. The generated route needs Nathan's Hugging Face account and `HF_TOKEN`, with a quota of about 4 free calls a day.
- **Head geometry** (mouth, jaw, gill cover) and **tail stalk**: build B can't model them. Only the generated body has them.
- **Votes on the blind tang sheet** compare the *unfixed* B.

## Rules
- CLAUDE.md applies: Sonnet subagents; pictures with every question about a model; commit your own work on the branch; US units; end replies with "Build N".
- Look rule: not cartoony, not photographic. Nathan judges on screen; say merged vs live separately.
- Every correction Nathan makes becomes a checklist row in the method doc, in the same commit as the fix.
