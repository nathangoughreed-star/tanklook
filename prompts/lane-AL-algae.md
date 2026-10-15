Read HANDOFF.md first (the current-lanes table and the "Coordinator protocol" paragraph). Memory: shared-folder-commits.md,
push-live-is-fine.md, fish-art-not-cartoony.md (same bar for algae: crisp and real, never cartoony), perf-ab-alternate-frames.md.
Worktree `../Glass-Box-algae`, branch `algae`, launch config `algae`, port 5613.

You are lane AL: a dirty / algae view (Nathan 2026-10-15: "add a dirty/algae slider(s) to show what the tank will look
like when not pristine"). Today every tank renders spotless. This lane lets the user see the same scape a few weeks
past a water change, or neglected.

Proposed design (confirm with Nathan BEFORE building past step 2, with pictures: one tank at three levels, side by side):
- A "Condition" section with one master slider, Pristine .. Neglected, plus per-effect sliders under a disclosure that
  the master drives together (a hand-set effect slider overrides the master for that effect):
  1. Glass: green spot algae dots and a soft green/brown film on the panes, heavier at the waterline and on the lit
     panes; the front pane must still read (the user has to see the tank through it).
  2. Hardscape: diatom brown film first, then green fuzz / hair algae on the lit top faces of rock and wood, black
     beard algae tufts on edges in flow. Deterministic per item (item seed), weighted by the light map (`scene/lightout.ts`):
     more algae where PAR is high.
  3. Substrate: brown diatom film and mulm / detritus in corners and behind rocks.
  4. Water: cloudiness (bacterial bloom, white haze) and green water as fog / volume tint in `waterVolumeMaterial`
     (`render/lighting.ts`); tannins stay a separate thing if they exist, do not merge them.
  5. Surface: a faint oily film / scum near the edges.
  Salt tanks swap the palette: red cyano slime, bubble algae, brown diatoms; no BBA.
- Display-only: no effect on stocking, light or growth numbers. Saved in the tank file and share links (`scene/share.ts`),
  validated (`scene/validate.ts`); default 0, so every existing tank and example looks exactly as it does now.
- Live while dragging is fine ONLY if it is a uniform / material change (no geometry or texture rebuild per input);
  otherwise regenerate on release like lane SD's sliders. Measure with alternating A/B frames; the edit-performance
  rules from lanes J / J2 bind.

Files:
- Own: new `src/render/algae.ts` (+ test), a new `condition` field on the tank settings in `scene/types.ts`
  (NOT LayoutSettings, lane SD's), its rows in `validate.ts` / `share.ts`, the water fog hook in `render/lighting.ts`.
- Shared, keep to small hooks: the Condition section in `ui/panels.ts` / `index.html` (lane SD owns the layout picker
  and density sliders there, GR4 owns growStep: do not touch those), glass / substrate / hardscape materials in
  `render/build.ts` and the non-plant branches of `render/items.ts`.
- NOT yet: algae on plant leaves. `render/plant3d.ts` and the plant branch of `render/items.ts` belong to lane GR4
  (ready to open). Note it as an open item; a follow-up lane adds it once GR4 frees those files.

Ask Nathan (with pictures, per CLAUDE.md) also: should the growth timeline (Feeding + Time, `scene/growtime.ts`,
lane GR3) drive the condition over time (e.g. weeks without a water change), or stay a manual slider for now?

Tests: condition 0 renders identically to today (material params unchanged); same tank + condition gives the same
algae placement; old files load at 0; share link round-trips the condition.

Report to the coordinator chat (session `local_d0390f66-339c-4fa1-ab38-43e9c2a35958`) when it is live, with before /
after pictures at Pristine, middle and Neglected for one planted tank, one iwagumi and one reef. When done, stop your
preview servers (preview_stop).
