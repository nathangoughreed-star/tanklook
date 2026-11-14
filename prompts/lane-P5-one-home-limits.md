# Lane P5: one home per limit in the data (Coordinator 24, 2026-11-14; UI2 §7 P5, §3, decision 3; request R27)

Rules: `prompts/ui-build-common.md` (P lane: no visible change in the old UI). With P10, it unblocks shell step 5 (Constraints, shot `research/screens/UI2/04-constraints-and-cost.png`).

## Base
Start from branch `origin/claude/p10-experience-a2e548` (lane P10, being finished). P10 edits the same files (`scene/brief.ts`, `ui/demandPanel.ts`) and lands before you. If P10 has pushed newer commits by the time you finish, merge them in.

## Job (read UI2 §3 "One home per setting" in full, and its rows for Money and time, Space, Your home, room temperature)
- **The per-browser profile:** move the cost panel's "Guardrails" / "Your situation" fields from localStorage `tanklook.demand` (budget, monthly limit, time per week, No new equipment, space, water / electricity costs, ...) into the brief (`src/scene/brief.ts`), so they travel with the setup, its file and its share link.
  - Experience is the exception: it stays per browser, owned by P10's `demand/experience.ts`.
- **Room temperature:** stored ONCE, in the brief. Today it is stored twice (`tech.roomC` and the brief), so remove `tech.roomC` as a stored value. The Equipment heater row and the engine read the brief.
- **Migration:**
  - old saves and share links: `tech.roomC` moves into the brief when the brief has none;
  - an existing `tanklook.demand` profile seeds the brief of setups that have no value yet (state the rule in HANDOFF);
  - a round-trip test.
- **Engine:** every consumer reads one place, through a small accessor in `brief.ts`. That includes `demand/engine.ts`, Suggest, the heater sizing in `scene/tech*.ts` / `techEdit.ts`, and the Water drawer.
- **Old UI:** `demandPanel.ts` and the Equipment room temp field keep their DOM and read / write the brief. They look and behave the same.
- **Locked numbers:** demand / cost / heater tests keep their locked numbers. If any number moves, stop and report it with before / after values; do not re-bless.
- **Tests:** `test/p5-limits.test.ts`.
- **Your files:**
  - `src/scene/brief.ts`, `src/ui/demandPanel.ts`;
  - `src/scene/tech.ts`, `src/scene/techEdit.ts` (room temp only);
  - the read sites in `demand/*` (limits only);
  - save / validate migration;
  - the new test.
  - Lane P8 (`scene/gearOwn.ts`, ownedGear, techMenu) is finishing, and shell lanes S7 / S9 / S10 work in `src/shell/`. Don't touch their files.
- **Proof:**
  - before / after shots of the cost panel (Guardrails / Your situation) and the heater row are identical;
  - a setup saved with a $300 budget and 68 deg F room reopens with both;
  - an old save with `tech.roomC` migrates.
