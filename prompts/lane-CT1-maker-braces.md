# Lane CT1: custom tank maker: modeled braces, custom brace + Optimize, default name (Coordinator 24, 2026-11-14; request R37)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; build + ONLY your own tests; push your branch after every commit; real-app shots under `research/screens/CT1/`). Work in the new shell (`?ui=2`): `src/shell/maker.tsx`, `src/shell/logic/tankGlass.ts`, `src/scene/customTanks.ts`, solver `src/scene/glassSolver.ts` (HANDOFF "GS1 (glass solver)"; method `research/design/gs1-glass-solver.md`).

## Nathan's request (2026-11-14)
1. "in the custom tank maker, I want the perimeter brace and cross brace to be actually modeled, they dont show up in the pic now."
2. "How does the program actually optimize the bracing? I feel like the bracing should be able to be inputted custom with an 'optimize' button that gets the total glass used down to just enough to stay at the desired safety factor."
3. "default the names of the custom tank to its dimensions if no name is given like 'Custom 36x10x10'; right now it looks like it defaults to 24x12x12 even if you change the dimensions and dont rename it."

## Today
`optimizeBrace` searches perimeter widths 2, 2.5, 3, 3.5, 4 in, brace thickness over stock sizes, and 0..2 cross braces (opening >= 6 in). Each candidate is re-solved for wall / bottom thickness at the safety factor, with the silicone joints checked. Cost = glass volume vs unbraced = 100. It keeps the best perimeter-only and the best with-cross options, and the maker offers those presets. The brace is not drawn in the 3D tank (no brace geometry in `src/render`).

## Job
1. **Model the braces in 3D:** perimeter strip(s) glued flat along the inside top of the four walls, plus cross braces front to back at their solved positions. Use real glass thickness and width, the same glass material and edge tint as the walls, and the rim / trim rules unchanged. They show in the maker's preview and in the room tank. Check hood, lid, light and HOB placement still fit (a brace narrows the top opening; flag clashes rather than hiding them).
2. **Custom brace input in the maker:** a Bracing block with these fields:
   - none / perimeter / perimeter + cross;
   - perimeter width;
   - brace thickness;
   - number of cross braces and cross width.
   The live result shows wall / bottom thickness, safety factor met or not, and total glass volume (US units: in, sq ft or cu in, lb of glass).
3. **Optimize button:**
   - It finds the brace (within the fields the user left unlocked, or all of them) that gives the least total glass that still meets the target safety factor, including the silicone joint checks.
   - It fills in the fields and says what it chose and why, in one plain line (e.g. "2.5 in perimeter, 1 cross, 1/4 in strips: 18% less glass than unbraced").
   - Search finer than today if it's cheap: for example 1/4 in width steps and up to 3 cross braces, with the minimum opening kept.
   - Keep the solver pure, with the UI calling it.
4. **Default name:** if the user never typed a name, the name follows the dimensions as "Custom LxWxH" in whole inches (e.g. "Custom 36x10x10"). It updates live as dimensions change and stops following once the user types a name. Clearing the name goes back to following. Saved tanks keep their stored name.

## Proof
Maker shots at desktop and 375 px:
- perimeter-only and perimeter + 2 cross on a 48x18x20 tank;
- the room view with braces;
- Optimize before and after;
- the name following 36x10x10.

Tests:
- the optimizer result meets the SF and is minimal over its grid;
- the brace geometry matches the spec;
- the name rule.

Add a dated HANDOFF.md section "CT1".

## Part 2 (added 2026-11-14; request R38): shapes and on-screen dimensions
Nathan: "I still want the pie slice with angle, radius, and height (this absorbs 'round' which would just be 360 degrees) as an option for the custom tank. and allow whatever number for the polygon. Make the dimensions editable on screen by clicking on the dimension box. Allow polygon side lengths to be independently edited unless it makes an impossible shape."

Today:
- `src/scene/shape.ts` has `pie` with `pieDeg` 45-180 deg, D = radius, L = the chord.
- `round` is a separate shape.
- `poly` allows `POLY_SIDES` = 3, 5 or 6 regular sides.
- In the maker (`src/shell/maker.tsx` ~125-133), pie shows Width + Radius + Angle.

5. **Pie:** angle, radius and height are the only inputs. The angle runs 30-360 deg, and the width (chord) is derived and shown read-only.
   - 360 deg is a full cylinder and draws exactly like today's `round`. The maker's shape list drops "Round" (files saved as `round` still load, mapped to pie 360 or kept as-is internally, your call, with a test).
   - Check the render / glass / volume / footprint paths for angles over 180 deg: the two flat back panes fold inward, and at 360 there are no flat panes.
   - The glass solver: a curved wall is outside the Levy plate model. Say so in the UI, as GS1 does for non-rect shapes today if it does; don't fake a number.
6. **Polygon, any number of sides:** a number input from 3 sides up to a sensible maximum (e.g. 24; above that it is effectively round).
   - **Side lengths independently editable:** a per-side list, plus clicking a side's dimension on screen.
   - Edits that make an impossible shape are refused: the shape must stay closed, convex (or at least simple), with every side length positive.
   - A side is solved for closure: show which side or angle is derived and refuse impossible values with a one-line reason.
   - "Regular" is the default; with all sides equal it behaves as today.
   - Volume, footprint, glass area, substrate and the 3D tank follow the real polygon.
7. **Dimensions on screen:** the maker's preview shows dimension boxes (length / width / height / radius / angle / side lengths, in US units, inches with fractions as the rest of the app does).
   - Clicking a box turns it into an input; Enter or blur applies the value through the same validation as the side panel, and Esc cancels.
   - This works on desktop and at 375 px (tap).

Extra proof:
- pie at 90, 180, 270 and 360 deg;
- 8-sided regular and irregular polygons, plus a refused impossible edit;
- clicking a dimension box to edit it.

Extra tests: polygon closure / refusal, the pie 360 = round volume, and loading an old `round` file.

## Part 3 (added 2026-11-14; request R39): no timer on "preview in my setup"
Nathan: "when 'previewing in my setup' dont put it on timer, just keep the 'back now' button."
8. The maker's in-setup preview (`inSetup` in `src/shell/maker.tsx`) stays on until the user clicks "Back now" (or closes the maker). Remove the auto-return timer and any countdown text. Proof: a shot of the preview after 30 s still showing, with the Back now button.

## Part 4 (Nathan 2026-11-15) - R66
Asked whether to tint the brace strips so they show in the room view: "they should look identical to normal glass right? Like a slight tint and edges outlined a bit?" Yes: draw the perimeter and cross braces with the same material as the tank's glass panes (the same tint, transparency and edge outline, including the low-iron vs standard tint if the tank has it), not a separate flat colour. Their cut edges get the same edge line as the glass. Check them in the room view and close up. Shots before/after at 1280 (room view, 3/4 from above). Commit on a fresh branch from origin/main and send me the sha.
