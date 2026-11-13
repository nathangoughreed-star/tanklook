# Lane CB2: canister hoses enter the cabinet through a back-panel cut-out (Coordinator 24, 2026-11-13; request R8)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; build + ONLY your own tests; push your branch after every commit; real-app shots under `research/screens/CB2/`).

## Nathan's ask
R8 (audit #31), approved 11-13: "yes, fix it". Today (live 1950, picture `research/screens/R8-before-behind.png`, wall hidden, seen from behind) a canister filter's hoses run down OUTSIDE the cabinet's back panel almost to the floor, with no hole where they enter.

## Job
- A cabinet stand with a canister (or sump / any gear inside the cabinet that has hoses or cords up to the tank) gets a **cut-out in the back panel near the top** (real cabinets: a rounded rectangle or two round holes, roughly 3-4 in wide, centered under the hose run), drawn as a real opening.
- The intake and return hoses leave the tank top at the back, run down behind the tank a short way, and **pass through the cut-out into the cabinet** to the canister. Nothing hangs down the outside of the back panel.
- Power cords from cabinet gear use the same opening.
- An open stand, a table or no stand: unchanged. A cabinet with nothing inside: no cut-out.
- Start from CB1's cabinet code (`prompts/lane-CB1-cabinet.md`, HANDOFF "CB1") and the hose code in `src/render` (grep `hose`).

## Tests / proof
- A test that, for a cabinet + canister, every hose segment below the tank bottom lies inside the cabinet volume or within the cut-out.
- Real-app shots: from behind with the wall hidden (before / after), a 3/4 front view (nothing new visible from the front), and an open-stand case unchanged. Add a dated HANDOFF.md section "CB2".
