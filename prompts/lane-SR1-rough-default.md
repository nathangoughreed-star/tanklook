# Lane SR1: substrate roughness defaults to 50 % (Coordinator 23, 2026-11-12)

Follow `prompts/lane-common-c20.md`. Your chat is titled "SR1: Roughness 50 % Default". A small lane.

## Nathan (2026-11-12)
"Can we default every tank to having 50% roughness in the substrate?"

## Today
- `Substrate.rough?: number` (`src/scene/types.ts` around line 209): 0-100 %, lumps and ripples on the ground's skin only; absent = smooth.
- The UI is the Substrate section's "Roughness" slider (`index.html` line 237, `#subRoughness` / `#oSubRoughness`).
- It is drawn in `src/render/build.ts` around line 993.

## Task
1. **Every tank defaults to 50 %:**
   - absent `rough` means 50, for new tanks, starters, Discover / A/B candidates, and old saves and share links that never set it;
   - put one constant in one place (e.g. `ROUGH_DEFAULT = 50` beside the type) and read it everywhere `rough` is read.
2. **An explicit 0 stays smooth:** the slider at 0 must store `rough: 0`, not delete the field. Check the slider handler and any validation or cleanup that drops zero or default values.
3. Values that something sets explicitly (generators, starters, saved tanks with a value) keep their value.
4. Tests:
   - absent means 50;
   - 0 round-trips through save / load and share links;
   - an old save without the field renders at 50.
   - If golden or scene-hash tests change only because of the new default, update them and list each in your report.
5. One before/after screenshot on a reference tank, sent to Nathan in your own chat.

## Collisions
- CB1 is editing `src/render/build.ts` (stand and cabinet parts) and `src/interact/*`. Touch `build.ts` only where roughness is read.
- VF-A (VF7) is editing `src/render/lighting.ts`, so stay out of it.

## Done
1. Run `npm run build` and the full vitest, re-running any failing files alone.
2. Add your HANDOFF section "SR1: ...".
3. Commit on your branch and rebase on origin/main.
4. Report ONCE to the coordinator with the sha and the result. Stop your preview servers.
5. Never end a turn with anything running in the background.
