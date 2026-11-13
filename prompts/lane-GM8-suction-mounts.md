# Lane GM8: suction-cup gear sticks only to glass (Coordinator 24, 2026-11-13; request R25)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; build + ONLY your own tests; push your branch after every commit; real-app shots under `research/screens/GM8/`).

## Nathan's ask (2026-11-13), picture `research/screens/GM8/nathan-before.webp`
"Suction cups should only be sticking to glass. If they have a 3d background, it needs to move to a different side. Also, keep the pH checker solution bubble away from the co2 diffusor."

In his picture, a CO2 drop checker (green, with suction cups) and the diffuser hang on the back wall, IN FRONT of a 3D rock background, and the drop checker sits right above the diffuser.

## Job
1. **Glass-only suction mounts.** Every piece of gear that mounts with suction cups (drop checker, CO2 diffuser, bubble counter / check valve if in tank, suction-cup heaters, airline holders, thermometers, etc.: find them in `src/render/gear/co2.ts`, `common.ts`, `generic.ts`, `src/render/gear3d.ts`, `src/scene/gearSpec.ts`, gear JSON) must sit flat on a glass pane:
   - with a 3D / foam / rock background on the back wall (or any back-wall decor that covers the glass), auto-placement moves it to a side pane (or the front pane only as last resort) where nothing blocks the glass;
   - the cups touch the glass, never float in the water or sit on a background / rock;
   - a user's manual move should snap to glass too (or say why it can't).
2. **Drop checker away from the diffuser.** Auto-placement puts the drop checker at the far end of the tank from the CO2 diffuser (or at least a clear horizontal gap; at least ~1/2 the tank length when it fits, and never directly above it). Real practice: away from the bubble stream, in the flow, mid-depth to low.
3. Don't change gear that clips to the rim or hangs on the back (HOB filters, skimmers) unless it also uses suction cups.

## Tests (own files only)
- With a 3D background, no suction-cup gear is placed on the back wall; every cup position is on a glass plane (within ~1 mm).
- The drop checker and diffuser are separated horizontally by at least the chosen gap in a 20 gal, 40 gal and 75 gal tank.

## Proof
Real-app shots: Nathan's case (a planted CO2 tank with a 3D rock background) before / after, front and a 3/4 view showing the cups on the side glass, plus a tank without a 3D background showing nothing broke. Add a dated HANDOFF.md section "GM8".
