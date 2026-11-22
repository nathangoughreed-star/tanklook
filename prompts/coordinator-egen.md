# E-GEN experiment coordinator: generated fish models (written 2026-11-22)

**Your job:** design and run the experiments that decide how to make fish models with the generative image-to-3D method. Lanes do the runs; you design, track and report. Read `research/multiview-to-3d.md` first (whole file, it is short); it holds the survey and runs 1-3.

## Where things stand
- **Method:** a reference sheet (ChatGPT image) -> Hunyuan3D-2mv (free Hugging Face demo, `tencent/Hunyuan3D-2mv`, endpoint `/shape_generation`; side panel as `front`, head-on panel as `left`) -> `scripts/fish-glb-bake.py` (drop zero-area triangles, decimate, xatlas UVs, project the sheet into a texture) -> GLB.
- **Code:** branch `claude/glbfish-e5` (f2a24f9d), dogfood flag `?photoart&glbfish=<20000|8000|3000|1200|ladder>[&glball]`, file `src/render/glbfish.ts`. Oscar only. It is built on E5 because build B's oscar photo files exist only uncommitted in `.claude/worktrees/e5-landmarks-37dd7d`.
- **Inputs and outputs:** `C:\Users\nreed\fish-sheets\oscar-gen\` (cropped panels, raw mesh `hy2mv_0.glb`, LOD bakes). Sheets stay out of the repo.
- **Results so far (oscar):**
  - Silhouette IoU vs sheet: side 0.93, top 0.87 (top not an input), front 0.75.
  - In the tank it beats build B on shape, by Claude's read. Nathan: "worth pursuing".
  - 3000 triangles is about indistinguishable from 20000 at 300 px on screen.
  - Frame cost follows draw calls more than triangles: about 1 draw per generated fish vs about 9 per loft fish.

## Constraints
- **Free quota is tiny.** Anonymous ZeroGPU gives about 2 min/day shared across spaces, and TRELLIS.2 was refused. A Hugging Face token (`HF_TOKEN`) raises it, but Nathan must create and set it himself. Ask him before planning more than about 2 generations a day. Paid options (Meshy multi-image about $0.60/model, Tripo about $0.30-0.50) need his yes and his key.
- The machine's GPU has 4 GB, so the models can't run locally.
- Follow CLAUDE.md:
  - Subagents run on Sonnet.
  - Quote cost before any fan-out over 3 agents.
  - Every question to Nathan about a model comes with pictures.
  - Commit your own work (`scripts/ship.sh` in the shared folder; commits on the branch in worktrees).
- The fish art rule: not cartoony, not photographic, matching the scene. Nathan judges looks on screen.

## Questions to answer, roughly in this order
1. **Prompt for this method.** Section "Next step" of the research note lists what the sheet should ask for:
   - views around one vertical axis (side, head-on, tail-on, optionally both flanks);
   - same scale and centre in every panel;
   - flat, shadowless light;
   - paired fins in one pose, not covering the flank.

   Design A/B prompts and score them with the same audit: silhouette IoU per view, a thickness check against FishBase mass, and baked-texture defects.
2. **Which inputs help Hunyuan3D-2mv:** side only, side + head-on, + tail-on, + right flank. Also whether to remove the background ourselves or with its rembg.
3. **Species that stress the method:** a laterally flat fish (angelfish or discus), a slender one (neon tetra, for the small-fish ladder), a bottom dweller (cory or pleco), and one the loft failed on (brownbanded bamboo shark).
4. **Cleanup chain to automate:**
   - swim weights so the mesh bends with the swim shader;
   - an outline pass;
   - texture compression (webp/KTX2);
   - mesh compression (meshopt);
   - per-species LOD ladder and the size-based budget in the note;
   - instanced draws for schools.
5. **Alternatives** if Hunyuan disappoints: TRELLIS.2 (single image), Meshy / Tripo multi-image (paid). Run the same oscar sheet through each for a fair comparison.

## Report
Report once per finished experiment: a table, the pictures, and the decision it supports. Keep a running results section in `research/multiview-to-3d.md`.
