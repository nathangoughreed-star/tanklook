You are Coordinator 26 for Glass Box / TankLook. You take over from Coordinator 25 (title "C25: Coordinator, stands + product library"). You coordinate and merge; lanes build. Title this chat "C26: Coordinator, stands merge + plumbing".

Read only: this file; `CLAUDE.md`; `prompts/coordinator-25.md` (merge job steps 1-9 carry over unchanged, including the runner and flaky-test rules); HANDOFF.md "Start here" (grep by heading).

Work in `C:/Users/nreed/Glass-Box-coord`. C25's runner: `C:/Users/nreed/AppData/Local/Temp/claude/6901f973c3fe917d/3257cdce-ddd9-4762-bd9d-4e318489dd70/scratchpad/run-suite.sh` (copy into your scratchpad). Flaky under load, fine if each passes alone: ab1, swimField, ds2-pirate, dq4, dq2, taste, gs1-glass. Watch out: C24 once reset the coord checkout mid-suite; only one coordinator touches it.

## State (2026-11-16, origin/main build 2203)
- Landed: price sweep 2026-11-16 (9b554da0 + 0e6739e0, build 2202). Its fix moved the example-pin clock in demand / gearFilters / tech tests to `now = 2026-11-16`: a Petco sale checked on 11-16 reads as not live at 11-09. Re-pin anything at 11-16, never 11-09.
- Logs R98 (PM1 brief), R99 (IL1 brief), R100 (Plumbing view) are on main.
- Ignore local branch `c25-sp1`: its re-pins are at the old 11-09 clock.

## Merge next (one stack, one full suite)
1. **HD1 stands (R95 + R96):** branch `claude/r96-stand-models`, tip 24642104. It contains SP1 528a017c + PL1 round 1 fcc64141 (cherry-picked, so not an ancestor of PL1's branch) + the R96 photo models and the review fixes. C25 looked at 15 compare images (`research/screens/SP1/compare/`) and passed them. aqueon-forge-30 is modelled from the Forge 10 photo, flagged as an estimate. Pick `git log origin/main..24642104` oldest first.
2. **PL1 round 2:** 53317900 (That Pet Place / Walmart stands, based on SP1 e209550e). Pick only its commits not already in HD1 (compare by subject; fcc64141 is in HD1 as a pick).
3. **PL2 (R97):** `claude/pl2-equipment-rows` 53317900..8c30c2a5. It adds 22 filters, heaters and lights, refits `gear-price-curves.json`, adds 22 webps, and changes the gearSpec / gearCatalog counts and the stand label tests.
4. Conflicts are expected in `test/gearFilters.test.ts` and `test/tech.test.ts` LOCKs and `compromise.test.ts`. Keep the code from both sides. Regenerate the LOCK at the 11-16 clock after the whole stack (C25's trick: a temp copy of the test file that writes the computed numbers to a json, then diff; vitest swallows console.log). Say in the comment which moves come from the stands (SP1: planted / blackwater +$30.19, the real $180 Seapora Roman) and which from PL2.
5. Then build, run the full suite, push, and check the deploy. Tell Nathan the stands are live with one in-tank shot from tanklook.com.

## In flight
- **CP2 READY** (R101, reported via C24): 065762f1 on `claude/fervent-lewin-751f9e`. Compare gets per-row match buttons and Make B like A / A like B (undoable); the list opens on click. Files: `src/shell/compare.tsx`, `src/shell/logic/compare.ts`, shell.css, `test/s9-compare.test.ts`. The full vitest was NOT run: your suite covers it. Check the shots in `research/screens/CP2/` (n-* at 1280, m-* at 390). It's independent of the stand stack, so merge it first or alongside.
- **IL1 READY** (local_4f7c1d7e-3e3d-4ee3-aa18-e2d0685b87f5): R99 is done, commit 2132c324 on branch `il1-inline-canister-gear`. Full vitest: only ab1 failed (timing). It adds the heated Oase Thermo 100/200/300 (they count as the heater), `src/data/gear/inline.json` with 11 in-line heaters / CO2 diffusers / reactors, `tech.returnInline`, an Equipment > Filter "On the return hose" group, units drawn on the hose, and atomizer mist. Flags: many prices / specs / colours are estimates (marked est); Thermo 100/300 tiles are copies of the 200's. Its "1280" shots in `research/screens/IL1/` are really 800 px wide: open them, and if the picker isn't readable, ask IL1 for true 1280 shots. Merge it AFTER the stand stack (both touch tech / demand; the canister price curve was refit) and re-pin once for both.
- **PM1** (R98) is NOT started. It is the gear photo-model pilot: 7 hoods + 9 NICREW lights, measured per look. Nathan said yes, but to start after the 5-hour reset (12:20 pm EST 11-16). Start it then on Sonnet (brief `prompts/lane-PM1-gear-photo-models.md`). Its report must quote cost per look and an estimate for the rest; bring that to Nathan before any more PM lanes start.
- **HD1** (local_dfbb4235-...) and **PL1** (local_2642fce8-...) are done once merged; offer to archive them.
- **SW2** (fish behaviour) is idle. New behaviour asks go there.

## R100 Plumbing view: PV1 DONE (14729453 on claude/ecstatic-ptolemy-84521b, mockups + research/screens/PV1/, notes research/mockups/PV1/notes.md; C25 sent Nathan the shots. Nathan 2026-11-16 picked CUTAWAY (02a) over PV1's flat pick. Questions 2-6 in notes.md are still open: heat-loss toggle, where the switch lives, cooling cyan, rated vs real GPH, reef badge. Ask them with their pictures before briefing the build (flow-graph data model + the Plumbing view; overflow / sump products as their own lane)). Merge the mockup commit (docs only) when convenient. Was: mockup lane PV1 started by C25 (brief prompts/lane-PV1-plumbing-mockups.md); message it that you are its coordinator; show Nathan its shots when it reports
C25 proposed a mockup first (see C25's last reply): 3 static schematic mockups (HOB planted; canister + in-line CO2 / heater; reef with overflow box + sump + return pump), then the flow-graph data model, then the view, with overflow boxes and sumps as real products in their own lane. Start nothing until Nathan picks. Nathan 2026-11-16: keep it simple, in and out arrows, NO fluid dynamics. The 'flow model' is only a list of connections (A -> B, direction, the GPH the gear states) plus plain sums (turnover = filter GPH / gallons; return pump GPH vs the overflow's rated GPH).

## Carried over from C24 / C25
- Needs a live check (none verified yet): R85-R94 (see coordinator-25.md), R91 Full screen (press F on tanklook.com in the browser pane).
- Waiting on Nathan: DM1, SS1, DL1, CP2, BL1; R81 waits on his screenshot.
- Known oddities: see coordinator-25.md.
- Every "check": run `python scripts/request_audit.py` and compare with research/requests.md (next free id: R102).

House rules: end every reply with "Build N"; US units; screen questions come with pictures; verify visually before "done"; no polling or waiting turns; hand off at ~12 % context or ~120 turns.
