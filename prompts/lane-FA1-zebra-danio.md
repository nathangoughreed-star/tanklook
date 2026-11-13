# Lane FA1: zebra danio looks washed out (Coordinator 24, 2026-11-13; request R29)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; build + ONLY your own tests; push your branch after every commit; real-app shots under `research/screens/FA1/`).

## Nathan's ask (2026-11-13), picture `research/screens/FA1/nathan-before.png`
"zebra danios are looking a little washed out, can we fix?" In his shot they read as pale cream fish with faint yellowish lines.

## The real fish
Danio rerio: 4-5 bold, sharp, dark blue to blue-black horizontal stripes running from the gill to the end of the tail fin, alternating with silver / pale gold stripes; anal fin striped the same way; back olive-brown; belly silvery white; females a little deeper-bodied with the same stripes. From normal viewing distance the fish reads as clearly striped blue and gold, not cream. Check 2-3 real photos (e.g. Seriously Fish, Wikipedia) and note them in your HANDOFF section.

## Job
- The recipe is `src/art/fishgen.ts:540` (`danio`: `shade` is pale tan / cream, `shimmer` warm). Make the stripes dark, saturated and sharp-edged, the light bands silver-gold, and extend the stripes onto the tail and anal fin as in the real fish. Keep the body shape.
- Art bar (Nathan's standing rule): crisp, true colours, same realism as the rest of the tank, NEVER cartoony or painted. No glow.
- Check it under the default light, a dim light and a strong planted light: it must not wash out under bright light either. If the washed-out look comes from a shared shader / lighting setting rather than the recipe, say so and show which other fish it affects before changing anything shared.
- Bump the danio's entry in `src/data/model-versions.json` as other fish changes do; regenerate `public/gallery/danio.webp` and `public/model-sheets/danio.jpg` if they come from the recipe.
- Glance at the other strongly striped / patterned fish that share the same recipe style (e.g. other danios, rasboras); list any that look washed out the same way, but change only the zebra danio.

## Proof
Real-app shots: a close view and a normal tank view, before / after, in a planted tank with the default light (`research/screens/FA1/`), plus the model sheet. Add a dated HANDOFF.md section "FA1".
