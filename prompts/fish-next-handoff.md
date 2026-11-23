# Fish models: handoff to the next chat (2026-11-23, second edition)

**Your job:** keep building **new species** with the build-B (no clicks) method, and fix pipeline problems only when the fix
helps every species. Nathan picks the species; he generates each sheet in ChatGPT and pastes it in.

## Start here (read these, nothing else first)
1. This file.
2. `research/fish-model-sheet-method.md`: section 4 checklist **rows 33-41** (everything learned this session), and the
   "Prompts used" table in section 2 (rows for yellow tang, discus, cardinal). Grep the rest when needed.
3. `research/fish-sheets/prompts/B-5row-template.md`: the sheet prompt template (method block + species slots + rules).
   Worked examples: `yellowtang-5row.md`, `discus-5row.md`, `cardinal-5row-v2.md` (latest template).

## Where the work is
- **Branch `claude/glbfish-e5`, worktree `.claude/worktrees/glbfish-e5`**, 47 commits ahead of origin/main. **Nothing is on main.**
  Merge only with Nathan's yes (it needs a loader keyed by species art, not the `?photoart` dogfood flag).
- Leave alone, not yours: uncommitted `public/art/fish/oscar*.webp`, `src/data/fishart/oscar.anatomy.json` and the e5 lines in
  `src/data/species.json` (E5 chat). Commit species.json rows hunk-only (see "Committing" below).
- Sheets and work folders stay out of the repo: `C:\Users\nreed\fish-sheets\<slug>-gen\`.
- Dev server: `glbfish` in the shared `.claude/launch.json` (lands on 5201 when 5197 is busy). Stop it when done.

## Fish built this session (all build B, `?photoart`)
| id | sheet | notes |
|---|---|---|
| `yellowtangb` | `yellowtang-gen` | width 16.6% SL from FishShapes (`thickx` 0.76) |
| `discusc` | `discus-map-gen` | row 2 kept the same-colour fins: body from row 5 (`fish-fin-cut.py --body-from-map`) |
| `cardinalb` | `cardinal-gen/sheet.webp` | first non-disc fish; sheet depth 25% SL (real 29.4) |
| `cardinalc` | `cardinal-v2s-gen` | v2 sheet stretched to FishShapes depth (`fish-sheet-stretch.py`, k 1.162), pectoral spread 0.35. **Preferred cardinal** |
| `bluetangd` | (earlier chat) | rebuilt only for the new eyes |
| `gbrb` | `ram-gen` | German blue ram, `--body-from-map`, `thickx` 0.56; mass 1.2-1.36x FishShapes |

## The pipeline now (per species)
1. **Numbers first:** FishShapes v1 CSV (Smithsonian specimens; https://zenodo.org/records/6642650, copy in the old scratchpad may be
   gone: re-download). Per species: `Max_body_depth`, `Max_fish_width`, `Head_depth`, `Min_caudalpeduncle_depth`, `Total_weight`
   over `Standard_length`. It covers most aquarium species (checked: ram, gramma, corys, guppy, danio, betta, angelfish, gobies,
   chromis, clownfish, anthias, mandarin, swordtail, platy...). FishBase length-weight a/b are usually Bayesian estimates: fallback only.
2. **Prompt:** fill the template's species block (`DEPTH_PCT`, `EXTRA_RATIOS` = head and peduncle depth, body bullets, colour, fins,
   `SHAPE_DONT` / `TOP_DONT` for this body plan). **No width numbers, no size adjectives** (rows 37, template rules).
   `python -I scripts/fish-prompt-fill.py <species.txt> <out.txt>`; save the prompt as `research/fish-sheets/prompts/<slug>-5row.md`.
3. **Sheet** from Nathan -> `<work>/sheet.webp`. Audit: `python -I scripts/fish-sheet-audit5.py <sheet> --real depth,head,ped,width`.
4. **Fin cut:** `python -I scripts/fish-fin-cut.py <work>` (fins named by row-5 colour). If row 2 kept fins (depth well above real or
   a fin role missing): add `--body-from-map`.
   Also use it when the dorsal / anal tips overhang the stalk with black gaps under them (cichlids, gouramis, bettas): row 2 fills
   those gaps as body (row 42). `fish-build.py` now clamps the stalk depth from 85 % SL back (row 43).
5. **Depth:** if the audited depth is off by more than ~8%: `python -I scripts/fish-sheet-stretch.py <sheet> <real/drawn> <new-work>/sheet.webp`
   and continue in the new folder (row 39).
6. **Spec:** `python -I scripts/fish-spec-from-fins.py <work> <id> "<name>" "<sci>" <tl_mm>` (also samples eye colours, size and pupil).
   Copy `<work>/<id>.json` to `research/fish-specs/`, set `"dense": true`, check the pelvic covers the whole fin, pectoral `spread` 0.2-0.35.
7. **Build:** `python -I scripts/fish-build.py research/fish-specs/<id>.json` (adds the species.json row).
8. **Width:** read the drawn max width (`python -I scripts/fish-mass.py src/data/fishart/<id>.anatomy.json <tl_mm> 1 3`), set
   `thickx` = FishShapes width / drawn width, rebuild. Check mass against FishShapes `Total_weight` at the same SL (pass tl = SL x tlOverSl).
9. **Pictures:** six views (recipe below), one contact sheet, send with the sheet's row 1 beside them.

## Screenshot recipe (works around the pane not drawing)
Run a tiny POST receiver in the background (`python -I scripts/shot-recv.py <outdir>`, port 5299), then in the page:
```js
const v = __gb.viewer, c = v.renderer.domElement;
const shot = async (sp, az, el, zoom, yf) => { v.swim = false; v.sway = false; v.drifters.length = 0;
  __gb.store.update(s => { const t = s.tanks[s.active]; t.tank = { L: 72*25.4, H: 24*25.4, D: 24*25.4 };
    t.fish = [{ id: 901, species: sp, x: .5*t.tank.L, y: yf*t.tank.H, depth: .5*t.tank.D, yaw: 0, pitch: 0, roll: 0, bend: 0 }];
    t.camera = { ...t.camera, az, el, zoom }; }); await new Promise(r => setTimeout(r, 1800)); };
const grab = async name => { for (let i = 0; i < 3; i++) { v.dirty = true; v.draw(); await new Promise(r => setTimeout(r, 300)); }
  v.dirty = true; v.draw(); const d = c.toDataURL('image/png'); await fetch('http://127.0.0.1:5299/' + name, { method: 'POST', body: d }); };
```
- Call `v.draw()` yourself: the drawn-listener route times out whenever the pane isn't being captured. Wait ~4 s after a reload.
- Zoom scales with fish size: 12 in fish: side 4-8; 1.8 in cardinal: side 24-40, head-on 30, 3/4 views zoom 8 with `yf` .22.
- Close the tank panel first if it is open; set the viewport to 1600x1000 and back to desktop at the end.

## Decisions on record (2026-11-23)
- Thickness = FishShapes measured max width, not FishBase mass (FishBase's yellow tang a/b ran ~1.6x light; row 35).
- Width numbers out of the prompt: sheets overshot them by a third anyway (row 37). Depth stays as the one number.
- ChatGPT draws cardinals ~25% SL deep in every layout (2 five-row + 3 side-only); the layout is not the cause. Fix depth at build (row 39).
- ChatGPT's own critique: right about the cross-section wording and front-view scale (tetra front views 1.36-1.48x the side depth),
  wrong that the segmentation rows misalign (IoU 0.97-0.98, stray < 1%). The build uses the front view only as a face texture.
- Eyes: colours, size (1.35x the row-5 disc) and pupil come from the sheet; measured eyes face straight out (rows 40-41).

## Open (pick up only if Nathan asks, or if it blocks a species)
- Cardinal iris reads flat grey (sheet: bright silver with a gold inner rim): the eye texture is a two-tone ring.
- Yellow tang: a 2 px sliver of the sheet's painted eye outline shows behind the 3D eye.
- Forehead loses a few px near the snout tip (outline opening radius 9 + inset): visible on small fish.
- Leftover weight: disc fish run 1.1-1.4x the real mass at the right max width (width profile too flat / section too boxy).
- Pelvics splay sideways from above on the discus.
- FishShapes head depth vs the audit's "depth at the eye": not the same measurement; don't compare them directly.

## Committing
- Worktree: commit on the branch, your own files only. species.json: add only your row to the index
  (`git show HEAD:src/data/species.json` -> insert the row -> `git hash-object -w` -> `git update-index --cacheinfo`), so the E5 lines stay out.
- `npx tsc --noEmit -p .` after any TS change. There are no tests for photofish/fish3d; verify on screen.
- Every correction Nathan makes becomes a checklist row in the method doc, in the same commit.

## Rules
- CLAUDE.md applies: Sonnet subagents; pictures with every question about a model; US units; end replies with "Build N".
- Look rule: not cartoony, not photographic. Nathan judges on screen; say merged vs live separately.
- Nathan often pastes ChatGPT's opinion of a sheet: weigh it against measurements before acting.
