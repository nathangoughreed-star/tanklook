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
