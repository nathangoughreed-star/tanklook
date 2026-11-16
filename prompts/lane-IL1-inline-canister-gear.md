# Lane IL1: heated canisters and in-line gear on the canister return (R99, Nathan 2026-11-16)

Nathan: "do we have any cannister filters with integrated heaters and/or co2 systems? I would love to have that option to direct the co2 in line with the return if thats an established method". Then: "lets start it now".

Today:
- One heated canister is in the library, `oase-filtosmart-thermo-200` in `src/data/gear/filters.json`. Nothing reads its heater, so picking it still adds and prices a separate heater.
- The CO2 rows in `src/data/gear/co2.json` are regulator and cylinder kits and DIY yeast setups. There are no diffusers or reactors.
- There is no in-line heater.
- There are 19 canisters in total.

## Do
1. **Heated canisters.** Add a field for a built-in heater (watts, thermostat range).
   - Fill it for the Oase Thermo.
   - Search for other heated canisters that are really sold now, at the maker's site and at US retailers. Add those with prices.
   - When the picked filter has a heater, it satisfies the Tech heater row: no separate heater and no double price. The heat capacity check uses its watts. The cost line says "Heater: built into <filter>".
2. **In-line products, real ones with price, url, specs and per-part colours**, in the same pattern as the other gear json:
   - in-line heaters (e.g. Hydor ETH 200 / 300; hose size, watts)
   - in-line CO2 diffusers / atomizers (e.g. Up Aqua, CO2Art, Chihiros; hose size, minimum flow they need)
   - in-line CO2 reactors (e.g. CO2Art, Cal Aqua; hose size, flow loss)
   - Note per product whether it is visible in the tank (an atomizer's mist is visible; a reactor's output is not).
3. **Offer them only when the filter is a canister**, with the hose size matched to the canister's.
   - An in-line heater counts as the heater.
   - An in-line diffuser or reactor counts as the CO2 diffuser part. The regulator and cylinder still come from the CO2 kit rows, so a kit's own in-tank diffuser is replaced, not added.
   - Flow: a reactor or an in-line heater lowers the delivered GPH by a stated amount (from the maker if given, else a marked estimate).
4. **Drawing:** the in-line unit sits on the return hose outside the tank (under the stand or behind it, wherever the hoses are drawn now). With an atomizer, a fine mist plume comes out of the outflow. Real colours; simple geometry is fine.
5. **Tests:**
   - the heated canister fills the heater row with no double cost
   - in-line items are hidden for HOB, sponge and sump filters
   - hose-size matching
   - the flow loss is applied
   - old saved files still load

## Shots
At 1280 and 390 px:
- the Tech picker with a canister and the in-line options
- a planted tank with a canister + in-line atomizer (mist visible)
- the cost lines

Save them to `research/screens/IL1/`.

## Flow
1. Fresh branch from origin/main.
2. Commit on your branch.
3. Run the FULL `npx vitest run`. Restore `research/screens/R88/speeds.txt` if the run rewrites it. Timing-only failures in ab1, swimField, ds2-pirate or dq4 are fine if each passes when rerun alone.
4. Send the sha, the shot list and the test result to the coordinator (C25; the `local_` id is in your start message). Don't push.

Related, not this lane: Nathan wants a "Plumbing" schematic view (R100). Keep in-line items as data on the filter's return path (e.g. `tech.returnInline: [...]`, in flow order), not as free-floating rows, so that view can draw them later.
