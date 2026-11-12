# Lane VF-C2: substrate realism + hardscape embedding (Coordinator 23, 2026-11-12)

Follow `prompts/lane-common-c20.md`. Your chat is titled "VF-C2: Substrate Realism + Embedding". VF-C's successor. Run on Sonnet.

## Why
Nathan's reviewer approved the caustics (VF5b) and says the remaining fake look is now mostly:
- (a) substrate realism: how the grains are spread, plain colour and material, some flat materials;
- (b) hardscape grounding: objects look placed on the bottom rather than embedded in it.

## Read first
- HANDOFF section "VF-C: substrate patterning and contact shadows" (grep by heading; never read HANDOFF.md whole).
- The VF plan and the VF-C brief. They are untracked in the shared folder:
  - `C:/Users/nreed/Glass Box/prompts/plan-VF-visual-fidelity.md`
  - `C:/Users/nreed/Glass Box/prompts/lane-VF-C-ground.md`
  Read them there; do not copy them.
- The switch pattern in `src/render/fx.ts` (`FX_DEFAULT`); the VF lanes share it and `scripts/vf-shots.mjs`, so keep both sides on conflict.

## Task
Every new effect is a switch in `fx.ts`, OFF until Nathan says yes.
1. **Embedding (b)**, render only, no scene change:
   - sink hardscape into the bed by a per-piece depth;
   - add a small berm of substrate around each piece's base, draped into the ground mesh where the piece meets it;
   - let grains spill over the bottom edge;
   - add a darker wet ring.
2. **Substrate realism (a):**
   - mixed grain sizes with size sorting: coarse in hollows and at the feet of pieces, fine on top and in open areas;
   - per-grain variation in colour, roughness and sheen instead of one flat material;
   - a detail texture for the painted-only sand presets, so they aren't one flat colour up close.

Files: `grains.ts`, `scatter.ts`, `textures.ts`, `contact.ts`, the ground hooks in `build.ts`, plus `fx.ts` and `vf-shots.mjs`.

Not yours: reef live-rock colour, rock recess darkening, the actinic cast and the final re-shoot. Those belong to VF7 (VF-A).

## Proof and approval
1. Make before/after sheets for each stage and send them to Nathan, and get his yes in your own chat before switching an effect on.
2. Do the perf check as an A/B on alternating frames.

## Done
1. Run `npm run build` and the full vitest.
2. Add your HANDOFF section "VF-C2: ...".
3. Commit on your branch and rebase on origin/main.
4. Report ONCE to the coordinator: sha, build and test result, and which switches are ON.
5. Stop your preview servers. Never end a turn with a test run in the background.
