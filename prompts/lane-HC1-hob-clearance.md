# HC1: hang-on-back filter vs wall and 3D background (R59)

Nathan 2026-11-15, picture `research/screens/HC1/nathan-before.png`: an HOB filter body sitting into the room wall behind the tank, and with the 3D background on, the filter's outlet spout separated from its body (the spout moved inward past the background, the body stayed outside).

"two things to fix with the filters. if we have an HOB with a known clearance requirement between the back of the tank and the wall, just move the tank there so the filter doesnt clip. also when the 3d background is selected it separates the filters otlet from the body. Just leave them the same and make a cutout in the background if necessary just large enough for the spout."

## Do
1. **Wall clearance:** when the room wall is on and the tank has an HOB (or any back-hung gear with a known depth behind the glass, e.g. an HOB skimmer or overflow box), set the tank's gap from the wall to at least that gear's depth behind the rim plus a small margin (about 0.5 in). Use the product's clearance figure if the catalog has one; otherwise use its modeled body depth. It's automatic and updates when the gear changes. Never pull the tank closer than the person's own setting. Show the gap where the room / wall distance is shown today, with a note like "moved out 4.3 in for the HOB filter".
2. **3D background:** the HOB stays one rigid piece: body, lip and intake/outlet exactly as without a background. The background gets a notch at the top edge, only as wide and deep as the spout and intake tube need (plus about 0.25 in), at the HOB's position. Reuse the cutout machinery from the canister-hose cutouts (lane CB2). A move or swap of the HOB moves the notch.
3. Nothing changes for tanks without an HOB, and exports and picking match the view.

## Checks
- `npm run build`; tests for room / wall placement and the background cutouts; a new test that HOB depth sets the wall gap, and that the HOB parts keep the same relative positions with the 3D background on and off.
- Before/after shots of Nathan's case: the side view like his picture, and a 3/4 view showing the notch. Save in `research/screens/HC1/` and look at them yourself.
- Commit on your branch and send the coordinator (C24) the sha. Do not push to main.
