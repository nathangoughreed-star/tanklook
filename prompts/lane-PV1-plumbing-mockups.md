# Lane PV1: Plumbing view mockups (R100, Nathan 2026-11-16)

Nathan wants a new view tab, "Plumbing": a schematic of all the equipment and the water paths.

## What he said (verbatim)
- "a new view tab called "plumbing" that shows moreso a schematic of all of the equipment and plumbing. Thinks like water paths, sumps, heaters, filter intakes and outflows, co2 and/or heat or cooling being added to the flow, overflow boxes"
- "this should absolutely be simplified to simple in and out arrows, no need for fluid dynamics"
- "im imagining a green line for co2 entering (exits through plant use and off-gassing), heat entering as red through the heaters and exiting through heat loss in the water-tank-air boundary, if necessary to show, maybe its not. I just think it would be cool to see the cannister filter circulating cleaned water as well as adding co2 from an inline reactor, and adding heat from an in-line heater. I think that would be cool. Take some creatve liberties on this, all I really have right now is an idea and what I have said."

## Do (MOCKUPS ONLY, no app code)
Make three static but animated mockups, as self-contained HTML + SVG files in `research/mockups/PV1/`, so Nathan can react before anything is built.

The three tanks:
1. HOB planted 20 long: an intake and an outflow, and a heater in the tank.
2. Planted 40 breeder with a canister, an IN-LINE CO2 reactor and an IN-LINE heater on the return. This is the hero: the clean-water loop, green CO2 joining the flow, red heat joining the flow.
3. Reef 75 with an overflow box, drain to the sump (with sections), return pump, skimmer, heater in the sump, and a chiller or ATO if it reads well.

## Direction (creative liberty inside these)
- Boxes and in / out arrows; no physics.
- Each box carries its real label and the GPH or watts it states. Show plain sums: turnover x/hour, return GPH vs the overflow's rating, with a green / amber badge.
- Water in blue. Dirty water going to the filter can be a duller blue than clean water coming back.
- CO2 in green: the source, then the line joining the water, then the sinks (plant uptake, off-gassing at the surface) as small outgoing arrows.
- Heat in red, from the heater; heat loss at the surface and glass as faint arrows, behind a "show losses" toggle (Nathan isn't sure it's needed).
- Gently animated flow (moving dashes or particles), with a pause option, and respect prefers-reduced-motion.
- Choose a layout: a side cutaway (tank above, stand / sump below, hoses as real routes) or a clean flat diagram. Try both on mockup 2 and say which you'd pick and why.
- Show it inside the app frame: the existing View tabs with "Plumbing" added. Grab the real tab bar look from the current app at 1280 px and match the app's colours and type (`src/shell/shell.css`).
- Phone at 390 px too, at least for mockup 2.

## Deliver
- The HTML files.
- PNG shots at 1280 and 390 in `research/screens/PV1/`.
- A short `research/mockups/PV1/notes.md`: the layout pick, the legend, and the open questions for Nathan (each one with its picture).
- No changes in `src/`.

## Flow
Fresh branch from origin/main; commit on your branch, never push. A full vitest isn't needed: there's no source change. Send the sha + shot list to the coordinator, and send them ONCE. That's C26 if it has messaged you, else C25 ("C25: Coordinator, stands + product library").
