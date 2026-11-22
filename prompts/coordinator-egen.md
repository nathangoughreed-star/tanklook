# E-GEN: generated fish models, handoff to a new chat (updated 2026-11-22 evening)

**Your job:** finish the E-GEN work. The method is the generative image-to-3D route with a finless body and fin cut-outs.
1. Turn the one-off rainbowfish build into a repeatable per-species pipeline.
2. Prove it on a second species.
3. Then design the experiments that decide the production prompt.

Lanes may do runs; you design, track and report.

**Read first:** `research/multiview-to-3d.md`. It is short. Runs 1-5 are the evidence and its last two sections are the current state; grep the rest as needed.

## Decisions so far (Nathan, 2026-11-22)
- The generated oscar "looks really good, better than build B". The method is worth pursuing.
- Faults he named on the oscar:
  - messy fin tips;
  - fin outlines painted onto the flank.

  Both are fixed by the **finless method**: generate the body from finless panels, and cut the fins from the finned panel.
- Detail by size: big fish detailed, small schooling fish light (plan in the research note, run 3).
- Editing an existing sheet to remove fins failed: ChatGPT redrew the body as an egg. **Generate the finned and finless panels in one image instead** (prompt below).
- Generator account: he leans to Hugging Face Pro ($9/mo, about 25-40 GPU min/day, overage $1 per 10 min). Replicate (about $0.03-0.06/run, no daily cap) is the fallback if the cap ever blocks. Not bought yet. **He must create the account and set `HF_TOKEN` himself.**

## Where everything is
- **Branch `claude/glbfish-e5`, worktree `.claude/worktrees/glbfish-e5`.** Built on E5's branch because build B's oscar photo files exist only uncommitted in `.claude/worktrees/e5-landmarks-37dd7d`. Those were copied in for local runs and are **not** committed. Commits, newest first:
  - b2ed32eb viewer;
  - 3f924449 fin-line script;
  - 84277257 reshape;
  - 9808ce47 rainbow build;
  - 761405dc swim / outline;
  - f2a24f9d LODs;
  - 6c11dab7 first swap.
  - **Nothing is merged to main.** Main has only the research note, pictures and this brief.
- **Code:**
  - `src/render/glbfish.ts` is the dogfood swap, used as `?photoart&glbfish=<20000|8000|3000|1200|ladder>[&glball][&gen]`. `&gen` = every second Boeseman's rainbowfish uses the finless build.
  - Generated parts get swim (uv = body axis, texture on uv1), fish lighting, and the loft's outline shell.
  - `outlineMat` is exported from `fish3d.ts`.
- **Scripts:**
  - `scripts/fish-glb-bake.py`: oscar LOD bake (drop zero-area triangles, decimate, xatlas UVs, project the sheet).
  - `scripts/fish-fin-line.py`: fin-vs-body pixel classifier giving the real back and belly line under the fins, plus the tail-fin base.
  - `scripts/fish-glb-assemble.py`: finless body + median fin card + paired fin cut-outs, reshaped to the body line, in one GLB.
  - The fin-cut step (finned minus finless masks giving `finlab.npy` / `align.npy`) **only exists inline in the old chat**. Rewrite it as `scripts/fish-fin-cut.py` (logic: align panel 2 to panel 1 by the head columns' top/bottom edges; fins = panel 1 mask AND NOT dilated panel 2 mask; label components over 300 px).
- **Assets:**
  - `public/art/fish/lod/` holds `oscar-hy2mv-{20000,8000,3000,1200}.glb` and `boesemani-gen.glb`.
  - `public/glbview.html` is an orbit viewer (`?m=boesemani-gen` / `oscar-hy2mv-8000`).
- **Sheets and raw meshes** (kept out of the repo): `C:\Users\nreed\fish-sheets\oscar-gen\` and `...\rainbow-gen\` (`sheet.webp`, `hy_body.glb`, the npy steps, debug pictures).
- **Dev server:** `glbfish` in the shared `.claude/launch.json`. Nathan may still be looking at it. That launch.json entry is uncommitted; leave it or remove it, but don't commit other chats' edits in that file.

## Generator call (free Hugging Face demo)
```python
from gradio_client import Client, handle_file
Client("tencent/Hunyuan3D-2mv").predict(caption=None, image=None,
  mv_image_front=handle_file("side.png"),   # finless side, RGBA cut-out on transparent, square 1024
  mv_image_back=None,
  mv_image_left=handle_file("front.png"),   # finless head-on, RESCALED to the side panel's scale
  mv_image_right=None, steps=30, guidance_scale=5.0, seed=1234, octree_resolution=256,
  check_box_rembg=True, num_chunks=8000, randomize_seed=False, api_name="/shape_generation")
```
- `/generation_all` (texture) fails server-side. We bake our own texture anyway.
- **Quota:** anonymous use ran 4 requests today (first at about 10:44, so the reset is about 10:45 on 11-23). A refused request costs nothing.
- The local GPU is 4 GB, so the generator can't run locally.

## The combined sheet prompt (worked on the rainbowfish; keep the method block, swap the species paragraph)
Four portrait panels: (1) side with fins, (2) the same side with every fin "trimmed off flush at its base, as if cut with scissors", (3) top without fins, (4) front without fins. The full text, with the Boeseman's species paragraph, is in the old chat. Rebuild it from these parts:
- the B-4view v2 method block in `research/fish-sheets/prompts/B-4view.md`;
- the panel 2 wording above;
- "Do not fill in, round off, smooth or extend the body into the space the fins occupied";
- "Where the pectoral fin covered the flank in panel 1, the flank's own markings continue underneath".

**Known prompt faults:**
- The finless panel still turned fin bases into body. The code fixes this, but the prompt could too: "the back and belly line under each fin is the body's own edge, visible through the fin base"; "the tail stalk ends where the tail rays begin".
- The top panel came out 6% short and the front 36% over scale. The code rescales them; the prompt could say the scale again per panel.

## Open work, in order
1. **Make the pipeline per-species.**
   - Panel bands, and the fin component picks (pelvic location), are hard-coded to the rainbowfish sheet in `fish-glb-assemble.py` and `fish-fin-line.py`. Read the bands from the sheet.
   - Pick fins by position relative to the body: above = dorsal, below the rear half = anal, below the front half = pelvic, behind = caudal.
   - Add `fish-fin-cut.py`.
   - One command per species: sheet → panels → generator → fin cut → fin line → assemble → GLB.
2. **Pectoral without hand tracing.** Add the B-4view v2 label-map panel (pectoral in yellow plus a black root dot; this worked on the dwarf gourami) to the combined prompt. That makes it 5 panels, so check the size rule. Or find the pectoral from fin-ray texture inside the flank.
3. **Small defects:**
   - a dark seam along the anal-fin base;
   - a dark oval at the cut tail stalk, seen from behind;
   - the tail fin vanishes when seen exactly edge-on (it is a flat card, as in build B).
4. **Second species** with the combined prompt. Pick a different body plan from the rainbowfish: a deep flat cichlid (angelfish or discus), or a small schooling fish (neon) for the light end of the detail ladder. Nathan generates the sheet in ChatGPT; give him the full prompt to paste.
5. **Detail ladder and performance** for the finless build: decimate the body to the 8000 / 3000 / 1200 / ~400 levels. Fins are 5 quads, so they are almost free. Use instancing for schools. Repeat the frame-cost run (run 3 method) on a phone before fixing budgets.
6. **Production questions** for the experiment design:
   - which inputs help the generator (side only, + head-on, + tail-on);
   - prompt A/B, scored with silhouette IoU, a FishBase mass check, and texture defects;
   - stress species: angelfish, cory or pleco, and the bamboo shark that the loft failed on;
   - alternatives (TRELLIS.2 single image; Meshy / Tripo paid) on the same rainbowfish sheet for a fair comparison.
7. **Merge plan:** decide how the GLB path lands on main. It needs a real loader keyed by species art (not the dogfood flag), and build B's E5 files resolved with the E5 chat. Merge only with Nathan's yes.

## Rules
Follow CLAUDE.md:
- Subagents on Sonnet.
- Quote the cost before a fan-out over 3 agents.
- Pictures with every question about a model.
- Commit your own work (`scripts/ship.sh` in the shared folder; branch commits in worktrees).
- Look rule: not cartoony, not photographic. Nathan judges on screen; say merged vs live separately.
- Report once per finished experiment, with a table, the pictures, and the decision it supports. Append results to `research/multiview-to-3d.md`.
