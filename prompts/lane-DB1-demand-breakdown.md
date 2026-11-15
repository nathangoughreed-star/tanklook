# Lane DB1: upkeep and time breakdowns in the new UI's Cost and time drawer (R52)

Nathan 2026-11-15, picture `research/screens/DB1/nathan-before.png`: "is there a place for a more detailed breakdown of where the time and monthly cost is going?" Answer: "Yes, port it."

## Today
- New UI (`?ui=2`, Preact shell in `src/shell/`): the Cost and time drawer (`src/shell/drawers.tsx`, data from `src/shell/logic/checks.ts`) shows To set up / Upkeep / Time / Relative difficulty and ONLY a "Costs most to set up" list.
- Old UI: `src/ui/demandPanel.ts` already has the breakdowns. Clicking a bar lists `drivers(D, P, bar, 6)` (what drives setup / upkeep / minutes / risk), each with its best swap and that swap's effect on set-up / upkeep / time / risk, and under minutes the `rhythmLine()` (demand/rhythm.ts: the minutes as a rhythm and how long the tank can be left). Reuse that logic; do not re-derive any numbers.

## Do
1. Make the three figures at the top of the drawer (TO SET UP, UPKEEP, TIME) plus Relative difficulty selectable (buttons, the selected one marked). The list below shows that figure's breakdown: "Costs most to set up" (as now, the default), "Where the upkeep goes" ($/mo per line: power, water, food, filter parts, replacing what dies, ... whatever `drivers` gives), "Where the time goes" (min/wk per job, plus the rhythm line), "What makes it harder" (risk drivers + plan problems with fixes).
2. Under each list, the swaps that lower it, as in the old panel (text only for now; the drawer says read-only, keep it read-only unless the old panel's swap is a one-click action that already exists and is safe to call).
3. US units ($, min/wk). Numbers must match the old panel for the same tank and the totals at the top.
4. Phone 390 px: the four figures still fit; the list scrolls inside the drawer.

## Checks
`npm run build`; the shell tests for drawers / checks; add a test that the upkeep lines and the minutes lines come from the same `drivers` result the old panel uses and that the totals match. Shots at 1280 and 390 px of each of the four breakdowns on a stocked tank (e.g. the 20 gal Tetra kit with plants and a school) in `research/screens/DB1/`.

Commit on your branch and send the coordinator (C24) the sha plus the shot paths. Do not push to main.
