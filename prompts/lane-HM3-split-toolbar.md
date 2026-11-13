# Lane HM3: viewer cleanup and shared split-view toolbar (Coordinator 24, 2026-11-13)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; build + only your own tests; push your branch to GitHub after every commit; real-app screenshots under `research/screens/HM3/`, one per request, named after it).

## Nathan's asks (2026-11-13, his screenshots: `C:\Users\nreed\AppData\Local\Temp\claude\6901f973c3fe917d\25b783f7-9335-469e-89b9-e237ead98b9d\images\4.webp` = split view on live 1879, `images\5.png` = the A tab)
Quoted: "The 'map' button in the lower left should be put in the view section. remove the undo and redo and save button from this screen. Leave those always at the top of the expandable menu on the left. remove the discover button from the main viewer as well, keep it in the menu on the left. anything that applies equally to both tanks like 'view' and 'another moment' should be in a menu cluster in the top middle right between the two split tanks views. Each side should have a 'notes' section as well where warnings are displayed pertaining to each tank."

Request rows (research/requests.md): R12-R16.
1. **R12 Map**: no floating "Map" button in the lower left of the viewer. The viewpoint map is switched from the View menu only (HM2 already put a Map checkbox there: keep it in sync). The map card itself may still show when switched on.
2. **R13 Undo / Redo / Save off the viewer**: remove them from the viewer toolbar in every state, including the copies HM2 added for when the left panel is collapsed. They stay pinned at the top of the left panel (already sticky). Keyboard shortcuts (Ctrl+Z / Ctrl+Y / Ctrl+S) keep working.
3. **R14 Discover off the viewer**: remove the Discover pill from the viewer. The left panel's header Discover button stays and still opens the Discover card (the card itself may still sit in the viewer once opened; keep it clear of the Water chip and Notes).
4. **R15 Shared cluster in split view**: controls that act on both tanks (View, Another moment, the Views linked lock, the panel arrow if it fits) sit in ONE cluster at the top middle, over the divider between the two views, not on side A. Single-tank view keeps today's top-left toolbar.
5. **R16 Notes per side**: each side of the split has its own "Notes" section listing that tank's warnings (today's "Checks: notes only" pill shows on side A only in his screenshot). Label it "Notes". Keep it compact (closed pill by default, like FX1's Checks pill), opened per side. Single view: the same Notes pill.

Check at 1500x900, 1920x1080, 1280x800 and 390x844 (phone), split and single, panel open and collapsed: nothing overlaps (SV1's overlap asserts in `scripts/sv1-shots.mjs` are a good start). Files: `src/ui/panels.ts`, `src/ui/sideOverlays.ts`, `src/ui/discover/inline.ts`, `src/ui/fullnessTile.ts`, checks strip, `src/style.css`. Add a dated HANDOFF.md section "HM3".
