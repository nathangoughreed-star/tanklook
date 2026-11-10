# AB8: Pan / zoom / lock visible while comparing (Coordinator 22)

Follow `prompts/lane-AB-common.md` (and `prompts/lane-common-c20.md`). First run `git fetch origin && git merge --ff-only origin/main`. Read HANDOFF.md "AB5" only, plus `src/ui/ab/`.

## Nathan's request (2026-11-10, dogfooding build 1730)
While comparing A and B in the main split view, the whole pan / zoom (orbit, zoom, reset) controls must still be visible and working, along with the existing lock and unlock controls. Find what hides or disables them (dock, panels, pair layer, frozen state) and fix it. Scope: camera/controls visibility and input only. A parallel lane (AB7) is building an expandable attribute panel in the bottom dock; do not restyle the dock or touch its contents, keep your changes to the controls and their z-order/layout so merges stay clean.

## Done when
- Controls visible and working in Discovery at desktop and 375 px, in both panes, with the dock collapsed and (once AB7 lands) expanded; lock/unlock still work.
- A test or journey-script assertion for it; `npm run build` clean; ab* tests and `scripts/ab-journey.mjs` pass.
- Screenshots in `research/screens/AB8/` (~60 KB each), key ones to Nathan via SendUserFile. HANDOFF.md AB8 section. Report once to the coordinator with branch + sha rebased on origin/main. Never push.
