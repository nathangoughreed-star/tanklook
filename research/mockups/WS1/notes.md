# WS1 (R111): full-screen workspaces, mockups and notes

Mockup only. No production code. Source: `ws.html` (one page, `?p=<name>`), PNGs rendered by `render.sh` (headless Chrome). It uses the real UI2 tokens (`research/design/ui2/tokens.css`) and real assets: the tank render, `public/gallery` fish and plants, and the gear model-sheet renders (true colours). **Placeholders:** prices, gph, "fits" pills and counts are invented. Stone, wood, cave and decor tiles are drawn illustrations, because no catalogue pictures exist for them (River stone is a real crop of the tank render). The tank-picker tile pictures are schematic outlines, not renders. Real tiles need an art lane (see Open questions).

## 1. The shell: how a tab opens a workspace
`01-shell-flow.png`

- Click a rail icon (or the phone tab) and the tab opens its **workspace**. It fills everything right of the rail, exactly as the tank picker already takes over the panel + view. The 380 px panel and the separate 3D view are replaced by one canvas.
- **Always visible:** the header (tank name, a live summary chip with Habitat / cost / water temperature, Undo, Redo, Save) and the rail. The summary chip updates as you place things, so a tile's price and welfare effect show up right away. A click on another rail tab goes straight to that workspace, so there is no menu stack.
- **Workspace bar:** back arrow (= Esc), title, a mode label, then the buttons.
- **Recommendation: hybrid.**
  - **Live** for Scape, Plants, Animals and Equipment. The preview is your real tank, and edits already go through `store.edit` with undo. Buttons: **Done** (kept) and **Revert this visit** (rewinds the undo stack to where you came in). Cancel/Apply on every tab would mean holding a second copy of the scene, and the user wants to see the real thing.
  - **Draft** for Tank (choose and custom builder). Swapping the tank moves and clamps items. Browsing 118 tanks with arrow keys must not touch the scene (the picker already works this way through `preview()`). Buttons: **Cancel** and **Use this tank** / **Save and use**, applied as ONE undo step.
- Leaving: Done / ◀ / Esc returns to the main view with the edits kept. The main view stays as it is today (rail + narrow panel + tank) as a summary and quick-edit surface: a card per tab with "Open <tab>" is the entry (see phone flow).

## 2. The workspaces (frame A, preview left + catalogue right)
| File | What it shows |
|---|---|
| `02-tank-picker.png` | Tank: today's picker as a draft workspace. TP1 filters (size, shape, brand, deals) in a left column, tiles with a silhouette, DL1 "Tank + stand" deal ribbons. |
| `03-tank-custom.png` | Tank: custom tank builder. Shape tiles, size sliders with typed values, glass thickness with the GS2 solver result. |
| `04-scape-hardscape.png` | Scape: big tiles for stones, wood, caves and decor. A tile pill says what the item does to your water ("Raises hardness" is flagged because neon tetras like soft water). A tray lists what is placed. |
| `05-scape-substrate.png` | Scape: substrate swatches, layers, depth/slope with typed values, a **cross-section** (front to back, 1 in grid, root depth, leaf litter), substrate weight. |
| `06-plants.png` | Plants: big tiles with light and CO2 fit pills against YOUR light, a zone filter, and a top-view placement plan. |
| `07-animals.png` | Animals: species tiles, **OR1 continent chips** in the filter bar, **CM3 colour-form swatches** inside the Guppy tile, a stocking gauge. |
| `08-equipment.png` | Equipment: role tabs, product tiles in true colours with a fit pill ("Too small / Fits / Oversized"), DL1 deal ribbon, a "Your setup" role strip and the PL1 stand rating. |

Each has a large live preview. Frame A gives it about 40 % of the width, roughly 485 × 400 px on a 1280 screen.

## 3. What stays a small panel
`12-small-panels.png`

| Tab | Decision | Why |
|---|---|---|
| Preferences | panel | About eight choices, nothing to browse. |
| Constraints | panel | Sliders with typed numbers. A dashboard could come later, but it is not a catalogue. |
| Settings | panel | Rarely opened, so keep it small. |
| Print | paper view later | Already a page. A full-screen paper preview with Print and Done is nice, but low priority. |
| **Discover** | **workspace** | Ideas are pictures of finished tanks, so it is the most visual tab. I would build it right after the five catalogues. |

## 4. Phone
`13-phone-flow.png` (3 steps), `14-phone-scape.png`, `15-phone-animals.png`, `16-phone-equipment.png`, `17-phone-tank.png`

- A workspace is a full screen: back arrow, title, live dot, Undo, Done. Under it is a one-line summary (tank name, Habitat, cost, temperature).
- A 150–190 px preview strip stays on top. A "Bigger" button expands it. Under it are scrollable category chips and a 2-column tile grid. The footer holds the count + Revert + Done.
- Filters (continent, fit, type) and colour forms open as **bottom sheets**. The draft tank picker uses a sticky "Use <tank>" footer.
- The main view on a phone gets an "Open <tab>" card above the tab bar (`p-main` in `ws.html`).

## 5. Layout options for the frame
`09-frames-compare.png` (full size: `04-…` for A, `10-frame-B.png`, `11-frame-C.png`)

- **A: preview left, catalogue right (recommended).** The tank and the tiles are both big. The left column has room for the placed tray, stats and the cross-section. It is the same structure as the picker. On a phone it stacks (strip over grid).
- **B: preview strip on top.** The widest grid (6 across). The strip is bad for judging height, plants and hides. It suits very large catalogues (all 118 tanks).
- **C: full-bleed preview, drawer over it.** The best look at the tank. Tiles are smaller (7 across) and the drawer covers the floor you are decorating.
- Recommendation: A everywhere. The frame takes a `layout` prop so Tank could use B later if wanted.

## 6. Migration note
I read `tank.tsx`, `App.tsx` and the tokens. I did not read the Scape / Plants / Animals / Equipment components in detail, so the column below is my judgment from file names and sizes (`scape.tsx` 260 lines, `plants.tsx` 117, `animals.tsx` 232, `equipment.tsx` 218).

- **Move as they are:**
  - the logic modules (`shell/logic/*`, `scene/*`) and the store;
  - the `Group` / `Seg` / `LenRow` / `Toggle` controls (they become the "settings" strip inside a workspace, e.g. the substrate sliders);
  - `maker.tsx`, which is already a workspace;
  - `view.tsx` (the View cluster) and the preview wiring `preview(S)`.
- **Redesign:**
  - `ScapeSection`, `PlantsSection`, `AnimalsSection` and `EquipmentSection` become a tile catalogue plus a tray;
  - the tank picker rows become tiles;
  - `App.tsx`'s `Panel` switch becomes a `Workspace` host (rail stays, header gains the summary chip, a `useWorkspace(mode: 'live' | 'draft')` hook handles Done / Revert / Cancel).
- **One new shared piece:** `WorkspaceFrame` (layout A) and `Tile`. Build it first in one lane, then the five tabs can follow in parallel.
- **In-flight lanes:**
  - TP1 (picker filters) maps to the left filter column in `02`.
  - OR1 (continent filter) maps to the chip row in `07`.
  - CM3 (colour forms) maps to the swatches in the Guppy tile and the phone sheet.
  - PL1 (stand rating) maps to the Stand tab tiles and the weight line in `08`.
  - DL1 (deals) maps to the ribbons on tank and gear tiles.
  - None of them need a rework. Each builds its piece as a small component with props, and they land in the workspace frame later. They can merge into today's panel meanwhile.
- **Art needed:** stone, wood, cave and decor catalogue pictures, tank tile renders, stand renders and light renders. Without them the tiles fall back to the drawn illustrations or name-only (as TP1 already allows).
- **Suggested build order:** `WorkspaceFrame` + Scape (it has the most to gain), then Animals, Plants, Equipment, Tank, Discover.

## Open questions for Nathan
1. Live-with-Revert for the build tabs, and draft only for Tank. OK? (`01-shell-flow.png`)
2. Frame A (preview left) as the standard? (`09-frames-compare.png`)
3. Does the main view keep a narrow summary panel, or become only the tank with the rail? (`01-shell-flow.png`, panel 1 and 3)
4. Discover as a workspace too? (`12-small-panels.png`)
5. Should an art lane make real pictures of stones, wood and caves (and tank/stand tiles)? (`04-scape-hardscape.png`, drawn tiles)
