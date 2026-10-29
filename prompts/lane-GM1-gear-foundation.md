# Lane GM1: Gear model foundation (G0)

You are lane GM1. Coordinator: Coordinator 16, local_543b9920-e805-4bf4-be11-6109c6498477 (send_message when pushed-ready, done, or blocked; report ONCE).
Read research/design/gear-model.md fully (sections 2, 3, 9 and 11 matter most; 11 = Nathan's approvals), HANDOFF.md "Start here", and your own section only.

Job (lane G0 in section 9): add `src/scene/gearSpec.ts` (StatBlock, `statsOf`, limits, adapters) and split `gear-catalog.json` and `gear3d.ts` per type under `src/data/gear/*` and `src/render/gear/*`, with `src/data/gearCatalog.ts` wrappers so every current import keeps working.
Rules: PURE REFACTOR. No engine number moves, no render change, no behaviour change; parity tests prove it (old vs new `statsOf` / catalogue output identical for every product; render snapshots unchanged). EQUIP_ENABLED stays false. Don't touch UI, demand or pricing (later lanes G1-G3 own those). Never loosen a welfare gate.
Before pushing: npm run build + FULL vitest; do not push yourself, send me the sha(s) and the suite result; I merge. Work in your own worktree on Sonnet; run builds/tests in the background and end the turn rather than polling.
Report: shas, suite result, file map (old -> new), and which files are now free for G1 / G2 / G3 / G4.
