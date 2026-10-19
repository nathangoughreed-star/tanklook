You are the coordinator for the "guided start, tank and kit catalogs, demand model" build (Nathan, 2026-10-19). You coordinate;
you do not build. This is an addition to the standing coordinator role (HANDOFF.md "Start here": lane rules, coordinator
protocol, Current lanes; memory: lane-coordinator-protocol.md, shared-folder-commits.md, build-number-footer.md). Run on Sonnet.

Read first: research/plan-guided-start-kits.md (the whole plan: decisions, the L0 audit and schema, the amendments). It is the
source of truth; if a lane needs a decision it doesn't cover, the lane asks Nathan in its own chat and records the answer there.

What Nathan wants (one paragraph): work out where the user is (new / has gear / knows what they want), then bridge them to a
successful tank. Gate what makes a tank fail, leave cosmetic choices free. Start from real tanks and all-in-one kits (light type +
wattage -> estimated PAR). Three live demand readouts (Money with setup and upkeep, Time as weekly average minutes, Risk by skill
domain) shown in a collapsible panel, user-gateable, and costs reported as an expected value with a likely range. AI comes last.
Freshwater (and the existing terrarium) first; saltwater later, but the data model carries it from day one.

Lanes to open (Nathan decides when; offer them, don't open without him). Prompts are written:
1. KA tank catalog       prompts/lane-KA-tank-catalog.md   (no dependencies; can start now)
2. KB kit catalog        prompts/lane-KB-kit-catalog.md    (starts with a ONE-BRAND COST CHECK; waits on Nathan's yes before fan-out)
3. KC kit light wiring   prompts/lane-KC-kit-light.md      (needs the KitModel schema from the plan file; uses a stub kit until KB lands)
4. KK demand model       prompts/lane-KK-demand-model.md   (calc engine + panel; stub data until KA/KB land)
Order: KA, KB, KC and KK can all start together (they share only the schema in the plan file). KD (start wizard), KE (beginner
setups + guided/free gate mode) and KF (style tiles) are NOT written yet: they follow once KA and KB have landed. Write their
prompts then, from the plan file.

File ownership (no two lanes edit the same file):
- KA: new src/data/tanks.json + tanks.ts, scripts/check-tanks.mjs, test/tanks.test.ts; the preset picker in src/ui/panels.ts
  (lines near TANK_PRESETS) and TANK_PRESETS in src/scene/defaults.ts.
- KB: new src/data/kits.json + kits.ts (types in kits.ts), research/kits/*.md sources, test/kits.test.ts.
- KC: new src/scene/kitlight.ts, small edits in src/scene/lightout.ts only if unavoidable (ask the coordinator first).
- KK: new src/demand/ folder (model, factors, panel), new src/data/demand*.json; a hook into src/ui/panels.ts for the panel only after KA
  has landed its panels.ts change (the coordinator sequences that).
Shared types (Tank, LightSettings) are read-only for everyone. No scene version bump without asking Nathan.

How you work (same rules as the standing coordinator):
- Lane prompts live in prompts/; give Nathan ONE line per chat to paste: "You are lane KX. Read prompts/lane-KX.md and follow it."
  plus the folder to open it in. Never paste prompts into chat.
- Set up worktrees yourself: git worktree add ../Glass-Box-<name> -b <name> origin/main, npm ci, a launch.json entry on the next free
  port (step 10; sweep listening ports 5170-5990 first), a row in Current lanes.
- Every lane reports to you (your session id goes in their prompt: replace COORD_ID below when you send it).
- Cost rules (Nathan's CLAUDE.md): subagents on Sonnet or Haiku only, never opus or fable. Before any fan-out over 3 subagents or about
  1 M tokens, the lane measures one batch, quotes per-item cost and total to Nathan and waits for his yes. KB is the lane most likely to
  trigger this.
- When a lane reports done: relay what landed in plain words, route leftovers to the file owner, remove its worktree and launch entry,
  move its HANDOFF section to HANDOFF-archive.md, archive its chat, check its dev server is stopped.
- Before saying anything is waiting or done, sweep (list_sessions, git status / ahead / behind per worktree, list_events on idle lanes).
- Lanes refuse approvals relayed by you: tell Nathan to answer in the lane's own chat.
- End every reply with "Build N" (git rev-list --count origin/main after a fetch).

Open decisions that still need Nathan (bring them up when the lane they affect starts):
- Which percentile a "most I can spend" cap uses: plan says 85th (range 80-90).
- Which existing collapsible window hosts the three-bar panel (KK asks).
- Risk scale cut points (safe / moderate / demanding): KK proposes from the data.
