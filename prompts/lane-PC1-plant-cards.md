# Lane PC1: plant picker as picture cards, like Animals (R53)

Nathan 2026-11-15, picture `research/screens/PC1/nathan-before.png` (the new UI's Plants section: plain name chips, "PLANTS 31", "ARTIFICIAL PLANTS 12"): "can we use picture cards for plants too? I want them built very similarly to the animals with groupings by types, a card with picture for each, etc"

## Model to copy
The Animals picker in the new UI (`src/shell/animals.tsx`, `.pgrid` / `.ptile` in `src/shell/shell.css`; AT1 lane, R48/R50/R51):
- category chips with counts at the top, then grouped sections of tile cards, two per row in the side panel;
- each card: picture, name, a meta line, a care badge, an Add button;
- an (i) info button (top-left of the picture) is the ONLY thing that opens a larger card plus a rundown. A click on the rest of the card does nothing; drag-out into the view still works;
- things already in the tank leave the tiles (the stock rows above own them).
AT1's last part (info button, in-tank hiding, `e2428567` on `claude/admiring-visvesvaraya-9f3333`) may not be on main when you start. Check `git log origin/main` for "AT1 part 3"; if it isn't there, copy the pattern from that branch. Factor shared tile and detail pieces into one component if that's clean, without changing how Animals looks.

## Do (in `src/shell/plants.tsx`)
1. **Groups by type**, with chips and counts. Use what the plant data already says. Suggested groups, adjust to the data: Foreground / carpet, Midground, Background / stems, Epiphytes (on wood and rock), Floating, Emersed / houseplants (pothos, monstera, peace lily ...), Artificial. Show only groups with members for this tank's kind (aquarium vs terrarium, as the list is filtered today).
2. **Pictures:** bake a still per plant from its real 3D model, the same way `scripts/bake-gallery.mjs` bakes the fish into `public/gallery/<look>.webp`. Write them to e.g. `public/gallery/plants/<id>.webp`, with a live-drawn fallback when a file is missing.
   - True colours, a crisp render like the tank, nothing cartoony (Nathan rejected painted art twice).
   - Same background tile as the fish cards.
3. **Card meta:** grown height in inches, care level badge (Beginner / Intermediate / Advanced, from the plant data), and a light-need hint if the data has it. Artificial plants say "Artificial" instead of care.
4. **Add button:** adds one bunch or portion, as the current chip does today. Keep whatever the chip does now, drag included.
5. **Info detail:** a larger picture plus a rundown: height and spread, growth speed, light, CO2, care, placement (fore / mid / background), whether fish eat it, and the in-tank count if any. Use only fields that exist; no new data.
6. **Plants already in the tank** leave the tiles, as in Animals (they're in the rows above with − / +). Keep the counts and empty-state text honest (see AT1's `e2428567` fix).
7. **Search box and "Fits this tank":** if the Plants section has them today, keep them working with tiles.

## Checks
- `npm run build`.
- Shell plant tests; add a test for the grouping (every plant lands in exactly one group, in-tank ones hidden).
- Shots at 1280 and 390 px: the grid, one detail, an artificial card, a stocked tank. Save them in `research/screens/PC1/`, and look at them yourself before reporting.
- Commit on your branch (code, baked webps, shots) and send the coordinator (C24) the sha and shot paths. Do not push to main.
