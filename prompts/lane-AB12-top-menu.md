# AB12: Top control bar declutter + orbit-lock question (Coordinator 22)

Follow `prompts/lane-AB-common.md` (and `prompts/lane-common-c20.md`). First `git fetch origin && git merge --ff-only origin/main`. Read HANDOFF "AB8", "AB11". Report once to Coordinator 22; never push.

## Nathan's request (2026-11-10, screenshot of build 1746)
The top-left bar in Discovery (View, Another moment, Re-centre, Fit Both, brightness slider, "build 1746") sits over tank A's half, so it reads as controls for the LEFT tank only. They apply to both.
1. Move the "build N" label out of that bar into the LEFT MENU at the top (the app's left menu header area).
2. Bundle View, Another moment, Re-centre, Fit Both and the brightness slider into ONE central expandable menu, centered horizontally on the divider between the two views, still at the top. Collapsed = a single compact button (e.g. "View options"); expanded = the existing controls. Must not cover the A / B labels or either tank's top edge when collapsed; closes on outside click / Escape; keyboard accessible. At 375 px (one pane at a time) it stays centered at the top.
3. Question to answer in your report, and fix if it is a defect: "Why is orbit locked?" Nathan sees the padlock at the bottom of the divider. I believe it is the camera LINK between A and B (AB8: orbit moves both; unlocking lets A and B orbit separately), not a disabled orbit. Verify in the real UI that orbit works with the padlock closed and open, and that dragging in either pane does what it should. If the padlock reads as "orbit is locked", relabel it ("Views linked" / "Views independent" with tooltip and aria-label) and consider moving it into the same central menu or beside it. If orbit is really blocked in some state (e.g. frozen store, top-down view, Straight-on view), fix that.

## Done when
Build clean; ab* + journey pass at desktop and 375 px; test/assert for the central menu open/close and for orbit with link on/off; screenshots (collapsed, expanded, 375 px) in `research/screens/AB12/` (~60 KB) sent to Nathan with SendUserFile. HANDOFF section.
