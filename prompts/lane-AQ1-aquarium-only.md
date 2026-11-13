# Lane AQ1: aquarium-only mode (Coordinator 24, 2026-11-13; request R19)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; build + only your own tests; push your branch after every commit; real-app shots under `research/screens/AQ1/`).

## Nathan's ask (2026-11-13)
"is there a simple way to just remove all references and features to anything except aquariums on the live site? I dont want to delete the code we worked hard on, I just want to remove it from the current scope until I get a complete handle on aquariums." Approved: "Yes, start it".

## Job
- **ONE scope switch:** e.g. `src/scope.ts` exporting `SCOPE: 'aquarium' | 'all'`, default `'aquarium'`. Flipping it to `'all'` restores today's app exactly. A URL override (`?scope=all`) is fine for checking the hidden features. **Delete no feature code, data or tests.**
- **What stays:** aquariums, freshwater AND saltwater / reef. Ripariums (emersed plants over an aquarium) stay too.
- **What gets hidden in aquarium scope:**
  - the world choices terrarium, paludarium and "any" (`src/scene/brief.ts` `WORLDS`): Guided setup and Discover start on aquarium and never offer the others;
  - reptiles, amphibians and land invertebrates; land and terrarium-only plants; dry ground / dry hardscape; terrarium backdrops and tank types;
  - herp / terrarium gear: heat lamps, UVB, misters, foggers, basking spots;
  - the herp "Animal checks" card (#stocking);
  - any wording that names terrariums, paludariums, vivariums or herps (headers, help text, How to use, tooltips, Discover presets, report text).
- **Where to gate:** at the few choke points, not in 90 files:
  - the world choice;
  - catalogue / list filters for animals, plants, gear, backdrops and ground;
  - Discover's candidate pool;
  - the panels' section lists.

  Find them first and list them in your HANDOFF section.
- **Saved tanks:** a saved or shared tank that is a terrarium or paludarium still opens without errors, with a short note ("Terrariums are paused for now; this tank is shown as saved"). Don't silently convert it.
- **Tests:** engine functions keep their current default behaviour, so existing tests stay green; GitHub runs the full suite on main. Gate in the UI / catalogue layer, or make tests run with `SCOPE='all'`. Add a test that, in aquarium scope, no land / herp species, plant or gear reaches the lists or Discover.
- **Proof:** real-app shots of every place that used to show a non-aquarium option, before and after: Guided world step, Animals list, Plants list, Equipment, backdrops, Discover presets, How to use. Also grep the built bundle's visible strings for terrarium / paludarium / vivarium / reptile / gecko / herp and explain each hit that remains.
- Add a dated HANDOFF.md section "AQ1", including how to turn everything back on.
