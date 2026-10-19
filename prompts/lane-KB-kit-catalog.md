Read HANDOFF.md "Start here" first, then research/plan-guided-start-kits.md (decisions, "L0 audit and schema", "Amendments").
You are lane KB (kit catalog, research-heavy). Worktree, branch and port: the coordinator assigns them (../Glass-Box-kits, branch
kits). Run on Sonnet; any helper subagents Sonnet or Haiku only (never opus or fable: a hook denies it).

Work unit: a catalog of all-in-one aquarium KITS (tank + light + filter, often heater and lid) from budget brands to plant- and
reef-focused ones, as data. Nathan: look up the light (type and wattage) for each; do NOT hunt for exact filter or heater models,
assume they are adequate and record only their class.

STEP 1 (mandatory, before any fan-out): ONE-BRAND COST CHECK. Pick one budget brand (Top Fin / PetSmart is the obvious one), research
ALL its current freshwater kits yourself in this chat, and measure what it cost: tokens per kit, minutes per kit, and what you could
and could not find (light type? wattage? published PAR? tank dimensions? price?). Then write to Nathan, in your chat: per-kit cost,
projected total for about 25 kits across 4-5 brands, which fields came out reliably and which are guesses, and a proposed brand list
(budget, mid, plant-focused, reef-focused; examples to evaluate: Top Fin, Tetra, Aqueon, Fluval, Marineland, Waterbox, Red Sea,
Fluval Evo / Flex, Fluval Spec, Biocube; verify they exist and are in current retail before including). WAIT for his yes before step 2.
Rule: before any fan-out over 3 subagents or about 1 M tokens, quote the cost and wait.

STEP 2 (after his yes): fill src/data/kits.json + src/data/kits.ts (typed loader) with KitModel per the plan schema:
id, brand, name, tank (a TankModel id from lane KA's src/data/tanks.json; until KA lands, write the tank outer dimensions inline in a
`tankDims` field and the coordinator reconciles ids), water, light { type, tech, count, watts, par?, spec }, lid, stand?, filter class
only, heater class/watts only, tier, price { usd, asOf, url }.
- `light.tech` must be one of the 13 LightTech values in src/scene/types.ts (map each lamp to the closest; note the mapping).
- `light.spec`: 'published' only when the maker publishes PAR; 'listing' when type and wattage are on the listing; 'guess' when you had to
  assume (use the tier default and say so in `note`).
- price: approximate current retail, `asOf` the date you checked (ISO), `url` to the listing. Prices drift; Nathan knows they are
  estimates and the UI will show the "as of" date. Never invent a number: if no price is found, leave `price` out and say why.
- Every record has a `source` URL list and a `note` for anything uncertain.
3. test/kits.test.ts: schema validity (tech is a real LightTech, type matches the tech's fixture, watts > 0 unless flat, price date
   valid, urls present), every `tank` id exists in tanks.json once KA has landed.
4. research/kits/<brand>.md: one short file per brand with the sources and anything ambiguous, so a later refresh is quick.

Files you own: src/data/kits.*, test/kits.test.ts, research/kits/. You read src/scene/types.ts and src/scene/lightout.ts only.
No code in the app beyond the loader. No scene version bump.

Ship per the lane rules: git fetch + merge origin/main, tsc + tests, git push origin HEAD:main, then
git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main. Stage by path, never commit -a. Add your own dated section under
"Lane sections (current)" in HANDOFF.md.

Coordinator protocol: message the coordinator local_408aa124-ce91-4651-abaf-a221f0ceac82 (send_message) after the cost check (so it can relay Nathan's decision
request), whenever work lands on main, and when you are done. preview_stop if you started a server. Questions for Nathan stay in your
own chat. If the chat gets long, hand off to a fresh chat at a work-unit boundary after writing your state into your HANDOFF section.
