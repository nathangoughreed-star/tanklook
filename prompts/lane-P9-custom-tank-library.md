# Lane P9: custom tank library (Coordinator 24, 2026-11-13; UI2 §7 P9, decision 13)

Rules: `prompts/ui-build-common.md` (P lane: engine only, no UI).

## Job
The data layer for Nathan's custom tanks (UI2 §2a "Custom tank maker", §3, §7 P9; shots 06, 07):
- A custom-tank spec (name, shape, L / H / D, shape dims (bow depth etc.), glass type and thickness, rim, optional `priceUsd` override, owned flag), validated like the scene's tank.
- A library saved per browser across setups (localStorage `tanklook.customTanks`): add, edit, rename, duplicate, delete; each entry has an id and a version.
- A setup holds its OWN copy plus the library id and version. Library edit: the setup keeps its copy and can ask "Updated in my tanks: use the new version?" (expose a function that says whether a newer version exists). Library delete: the setup keeps its copy.
- Share links and saved files carry the copy (check `scene/validate.ts` round-trips it).
- Migration on load: a saved scene whose tank has hand-edited dimensions on a catalogue product, or no product at all, becomes an auto-named custom tank copy (e.g. "Custom 36 x 18 x 16 in"), without changing what is drawn.
- Price: the engine uses `priceUsd` when set (marked as the user's own figure in the cost line items), else today's estimate (`demand/engine.ts` ~107-109).
- Your files: new `src/scene/customTanks.ts`, `src/scene/validate.ts` / scene types (only the custom-tank fields), `src/demand/engine.ts` (only the price override), new tests `test/p9-customtanks.test.ts`. Do NOT touch `panels.ts` (lane P1 owns it) or any UI.
- Proof: node tests for library ops, versioning, migration, round-trip, price override; old saves still load and draw the same (a before / after shot of one migrated scene).
