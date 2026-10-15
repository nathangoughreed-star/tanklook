Read HANDOFF.md first (the current-lanes table and the "Coordinator protocol" paragraph). Memory: shared-folder-commits.md,
push-live-is-fine.md. Worktree, branch, launch config and port: ask the coordinator chat for a free set.

You are lane SD: density sliders for the starter set (Nathan 2026-10-15). Goal: the generator makes beautiful, distinct
tanks quickly (idea generation or just for fun). The user generates one, then tweaks it by hand or starts from scratch.
This lane builds the foundation. New styles (Nature, Dutch, Jungle, Forest, biotopes, marine sub-styles) and a
composition dropdown come in later lanes and plug into it.

Today: src/scene/items.ts `starterStyle(seed)` rolls density (`dens`: sparse / medium / packed) from the seed, along
with scale, foci (composition) and materials. `starterItems` draws every layer from ONE rng stream, so changing any
count shifts everything after it. Layouts: LayoutId in src/scene/types.ts; Shuffle: `layoutShuffle` in src/ui/panels.ts.

Decided (Nathan):
- Three sliders: hardscape, plants/corals, animals. Each is STEPPED (about 5 stops, Sparse .. Packed), NOT continuous.
- No live redraw while dragging: the tank regenerates once on release (or on a Generate button). Nathan: a continuously
  rendering slider is too cumbersome and too heavy.
- Each stop is a fraction of the STYLE's own range (iwagumi hardscape tops out at 7 stones; a stop never breaks the
  style's rules).
- Shuffle rolls a new seed and keeps the slider settings; density no longer comes from the seed.

Do:
1. Split the generator into per-layer rng streams (seed x layer constant): hardscape, then plants/corals placed around
   the hardscape, then animals. Changing the plant slider regenerates plants only; rocks stay put. Changing hardscape
   regenerates hardscape and the layers that depend on it.
2. Move density from `starterStyle` to settings (LayoutSettings gets per-layer density; old files load with a default
   that reproduces the current look as closely as reasonable). Seed 1 "as designed" stays as is at the default stops.
3. Per-style density ranges for the existing layouts (stones, driftwood, planted, iwagumi, swamp, reef).
4. Animal density: fill against the existing stocking / bioload rules from a species pool suited to the layout; never
   exceed a sensible bioload, whatever the stop.
5. UI: three stepped sliders beside the layout picker, regenerate on release, one undo step per regenerate.
6. Hand edits: ASK Nathan before building (with pictures: a tank before / after a slider move) whether a regenerate
   keeps items the user moved or added (pinned) or replaces the whole layer (Undo brings it back).
7. Tests: same (layout, seed, densities) gives the same tank; a plant-slider change leaves the hardscape items identical.

Report to the coordinator chat when it is live, with before / after pictures at Sparse, Medium and Packed for iwagumi,
planted and reef.
