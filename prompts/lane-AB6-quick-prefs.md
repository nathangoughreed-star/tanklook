# Lane AB6: Quick preferences (Discovery v2, Coordinator 21, 2026-11-10)

Start with `prompts/lane-AB-common.md`.

Nathan, 2026-11-10: "A/B testing is cool and visually a great way to discover preferences, but is very costly ... 10 seconds from the user may help eliminate multiple rounds of costly A/B testing." The principle he adopted: **ask the user what they already know; show them what they don't.**

Every question is optional and has a "not sure" answer.

## Build
1. **One screen after the habitat question.** The AB4 flow is New Setup -> habitat question -> intro popup -> editor. Replace the separate intro popup with ONE screen that holds:
   - three optional preference rows;
   - a "don't want" row;
   - the intro text: the spec 2.2 copy, shortened to two lines;
   - a single "Start building" button, plus "Skip".

   It still appears on every new project and never on Open Existing, a starter, a deal or Continue. The AB4 tests that cover the popup move to this screen. Reuse `src/ui/introPopup.ts` or replace it.
2. **The rows.** Each row adapts to the habitat that was picked.
   - **Size:** Small / Medium / Large / No preference yet.
     - Map each size to real gallons per habitat in ONE table, in a new `src/scene/sizePrefs.ts`, with the numbers stated and sourced from the tank catalogue's spread. A medium terrarium is not a medium aquarium.
     - Show the gallon range under each choice. US units.
   - **Look:** chips, pick any: Natural, Lush, Colourful, Minimal, Stylized. Leaving them all blank is fine.
   - **Live plants:** Definitely / I'd prefer them / Prefer without / Not sure. For dry habitats, word it for that habitat, or hide it where it makes no sense.
   - **Don't want:** chips, for example no live plants, no CO2 system, no snails or shrimp, no large or aggressive fish, no bright colours, no daily care. Pick only from things the engine can actually filter or rank. Check each one maps to a real field before offering it.
   - **Budget and weekly care time:** a compact "Add limits (optional)" link that opens the existing limits fields inline (`src/ui/limitsPanel.ts`). It writes the same brief items. No new limits model.
3. **Strength decides what an answer becomes.**
   - **Definitely** and **Don't want** become explicit REQUIREMENTS, written as brief requirements or constraints. The engine filters on them and the Checks strip shows them. They are user statements, so they may filter.
   - **Prefer** answers, size and look chips become explicit PREFERENCES. Write them into Explore's preference model as "You told us" weights: `preferences.aspects.told` in `src/explore/aspects.ts`, using the existing closed tag vocabulary, plus new keys only if the vocabulary lacks them (additive).
     - Look chips map onto the internal axes natural/stylized, sparse/lush, muted/colourful and ordered/wild.
     - Size maps to a target range.
   - Told weights must override learned ones. That is the existing rule: a direct user statement beats an inference. Check it, and add a test.
   - Nothing here is a DX0 lock.
4. **Same data model, editable anytime.** Add a small "Your preferences" block, read and editable, to the Constraints menu (DX7). It holds the same rows, writes the same fields, and works during Discovery (AB5 makes the menus restricted during Discovery; preferences and constraints stay editable). A change there marks the Discovery session for a re-check (AB0 `resume` / rebase).
5. **Hand-off to the generator.** Export one pure reader, `readQuickPrefs(brief) -> { sizeGal?: {lo, hi}, plants?: 'require' | 'prefer' | 'avoid', look: AxisWeights, avoid: string[] }`. Lane AB5 owns `pairGen.ts` and wires this into candidate generation and ranking. Don't edit `pairGen.ts`; describe the contract in your report.
6. **Tests:** `test/ab6.test.ts`.
   - Each answer writes the right field, at the right strength.
   - Skipping writes nothing.
   - A "prefer" answer never becomes a requirement.
   - "Definitely" and "don't want" do become requirements.
   - Told weights beat learned weights.
   - Size maps differently per habitat.
   - The screen shows on New Setup and toolbar New, but not on Open, a starter or Continue.
7. **Screenshots** at desktop and 375 px: the screen per habitat (freshwater and terrarium at least), the limits link opened, and the Preferences block in the Constraints menu. Save them to `research/screens/ab6/` (about 60 KB each) and commit them.

## Owns
- `src/ui/introPopup.ts` (or a NEW `src/ui/quickPrefs.ts`)
- the start block of `src/ui/startMode.ts` and `startScreenLogic.ts`, after the habitat choice
- NEW `src/scene/sizePrefs.ts` and `src/scene/quickPrefs.ts`
- `src/explore/aspects.ts`: additive only. AB5 also adds here, so keep your edits to new exports.
- a Preferences block in the Constraints menu markup in `index.html`, plus its wiring
- `test/ab6.test.ts`

## Do not touch
`src/scene/pairGen.ts`, `pairFacts.ts`, `combine.ts`, `src/ui/ab/*`. Those belong to AB5.

## Report
Send ONCE to Coordinator 21 (`local_94b0b16c-78cc-4537-b306-4baa170900b2`): the sha, test counts, screenshot paths, the `readQuickPrefs` contract, and the size table. Never push.
