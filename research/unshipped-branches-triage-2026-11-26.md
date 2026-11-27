# Unshipped branches triage (2026-11-26)

Read-only triage of six local branches with committed work that never reached main. Method: `git fetch`, `git log` / `git diff` against each branch's merge base, `git merge-tree --write-tree --name-only origin/main <branch>` for the test merge, and `git grep` on `origin/main` for the same functions and data rows. Nothing was checked out, built, tested, merged or pushed. "Tests not run" applies to every verdict below: where I say a test may move, that is read from the diff, not observed.

## Summary

| # | Branch | Request | Verdict | Size | Clean merge | Needs Nathan? |
|---|---|---|---|---|---|---|
| 1 | `claude/r145-air-gulping-752836` | R145 | PORT | M | No (4 files: build.ts, roam.ts, swimSim.ts, swimTypes.ts) | Yes: the gulp rates are estimates, not sourced figures; confirm that is acceptable |
| 2 | `claude/vigilant-cori-0f54f0` | R143 | MERGE | S | Yes | Only if he wants the changed fish masses reviewed (see section) |
| 3 | `claude/onboard-bichir-knife-shark` | R150 (second use of the number) | MERGE after 2 small conflict fixes | S | No (requests.md, fishLive.json) | Yes: bichir id and length (bichir vs bichirb, 335 vs 445 mm), and whether the clownknife / bambooshark live entries survive the b9 rebuild |
| 4 | `claude/exciting-engelbart-800558` | RX-BICHIR | PARTIAL PORT, close the rest | S-M | No (build.ts, swimSim.ts) | Yes, same bichir question as branch 3 |
| 5 | `claude/tl1-r134-r135` | R134 / R135 | MERGE | S | Yes | No |
| 6 | `claude/species-backup-mine` | (CI unblock, R147 era) | CLOSE | none | No (5 files) | No |

Numbering collision: branch 3's `research/requests.md` row is also numbered R150, and origin/main already has R150 (the yellow lab roll fix, 11-25). Whoever merges branch 3 has to renumber its row.

---

## 1. `claude/r145-air-gulping-752836` (R145 air gulping), PORT, size M

- Commit: one, `9990c595`, 2026-11-24. Base `7cf900e0`. 11 files, +341 / -8. Source files: `src/scene/fishBehavior.ts` (+29), `src/scene/swimSim.ts` (+84 / -4), `src/scene/swimTypes.ts` (+4), `src/render/build.ts` (2 lines), `src/render/roam.ts` (1 line), new `test/swimGulp.test.ts` (66), new `research/air-gulping.md` (158), 3 screenshots, one requests.md row.
- What it does: a `GULP` table (trips per hour, night multiplier, dart or slow rise) for bettas, gouramis, corys, plecos, otos, kuhli, clownknife, bichir, ADF, axolotl, fire-bellied newt; `gulpFor()` resolves it per tank (dark tank uses the night multiplier); the sim runs a scripted trip (rise, hold at the surface, return to the exact spot it left), picks a clear column first, uses its own random stream (`seed ^ 0x2545f491`) so other fish's randomness does not move, and drops a member on a trip out of its shoal's centre. Adds an optional `sim.gulp(id)` for dev and tests.
- Test merge: conflicts in `src/render/build.ts`, `src/render/roam.ts`, `src/scene/swimSim.ts`, `src/scene/swimTypes.ts`. 6 commits have touched `swimSim.ts` on main since the base (Lane BR unit 1 among them).
- Already on main another way? No. `git grep -i gulp` on origin/main finds only research and planning text (the aliveness plan and requests.md R145), no `GULP`, `gulpFor`, `startGulp` or `swimGulp`. Nothing superseded it.
- Risk if merged as is: it cannot be merged as is. After a port: `build.ts` now passes `gulp` into every roster fish's spec, so any swim test that builds specs through `build.ts` for gulping species would see fish leave their paths. Tests that build specs directly (`makeSwimSim` with hand-written specs, as the files `swimSim`, `swimHabit`, `swimTrace`, `swimUpright`, `swimRelations`, `swimPace` appear to) should be unaffected because a fish with no `gulp` takes no trip and the gulp stream is separate; not verified. The group-statistics change (`cnt` now counts only fish not on a trip, plus a new `if (!cnt) continue`) touches shared code and is the part most likely to interact with Lane BR's changes.
- Data caveats: nearly every `GULP` rate is labeled "estimate" in `research/air-gulping.md` (only the cory figure cites FishBase). The plan in `research/fable/7-aliveness-answer.md` says every `GULP` row should carry a source note. The `pleco`, `bristlenose`, `oto`, `adf`, `axolotl` and `firenewt` rows are marked in the branch as never running (those animals cling or crawl and bypass the swim sim). The `bichir` and `clownknife` keys only fire if the species id is `bichir` / `clownknife`; on main the bichir is the model row `bichirb` (see branches 3 and 4).
- `fishLive.json`: not touched.
- Recommendation: PORT. Re-apply the three new blocks (gulp state arrays and init, `startGulp` / `gulpStep` / `gulpAt`, the take-over hook in the per-fish loop, the group-stat exclusion, `sim.gulp`) onto current `swimSim.ts`, re-add the type fields, and the two one-line `build.ts` / `roam.ts` edits (the `roam.ts` cache key must include the gulp values). `fishBehavior.ts`, `test/swimGulp.test.ts` and `research/air-gulping.md` should carry over unchanged. The test will need a check against the new `sim.setEvents` and the `tall` clamp. Size M: the logic is self-contained but the integration points were all rewritten.

## 2. `claude/vigilant-cori-0f54f0` (R143 backfill batch 1), MERGE, size S

- Commit: one, `9f52e496`, 2026-11-19. Base `fe91227a`, 464 commits behind main. 15 files, +70 / -83. Species: endler, convict, peacockgudgeon, rainbowshark, redtailshark.
- Test merge: clean (no conflicts).
- What it does and what main has (checked per species, `scripts/lw-sources.json` and `src/data/bodymass.json` are identical in pairs on main):

| Species | Main now (a, b, source) | Branch (a, b, source) | Status |
|---|---|---|---|
| endler | 0.01288, 3.14, estimate | 0.00995, 2.992, fishbase-congener (guppy rows; no Poecilia wingei row exists) | differs, branch is better sourced |
| convict | 0.01445, 2.99, estimate | 0.02205, 3.000, fishbase-measured (one TL row) | differs |
| peacockgudgeon | 0.0063, 3.1, estimate | 0.01153, 3.0, fishbase-measured (SL row converted at 1.2) | differs |
| rainbowshark | 0.00794, 3.02, fishbase-bayes | 0.01140, 2.844, fishbase-measured (TL row) | differs |
| redtailshark | 0.00871, 3.09, fishbase-bayes | 0.00400, 3.424, fishbase-measured (TL row) | differs |

  None of the five rows is on main with the branch's values. Other branch content, none of it on main: `soldSex.ts` (endler now sold sexed and checked, convict unsexed and checked, peacock gudgeon unsexed and checked, with shop listings cited), `careNeeds.ts` rainbowshark / redtailshark territory notes, `spacefactor.ts` and `substrateTraits.ts` rows for the two sharks, `provenance.ts` rules (the main file already has an R143-era rule for `{redtailshark,rainbowshark}` care, a different path), `aqadvisor.json` (removes the five AqAdvisor rows, which still exist on main) with the matching `test/aqadvisor.test.ts` NO_AQ edit, `research/species-onboarding-baseline.json` (drops the two sharks from five lists), `model-versions.json` (adds rainbowshark and redtailshark v1), two model-sheet images, and one `fishBehavior.ts` line (HOVER row for endler; I did not diff its content, only that it is a one-line change).
- Superseded? No commit on main touches these rows since the base. Main's `requests.md` says R143 is "R142 backfill now covers all six rules for every species", which is the follow-on; the branch is the data for batch 1 of it.
- Risk if merged as is:
  - Fish mass feeds stocking (`src/scene/stocking.ts` reads `bodymass.json`). The new `a`, `b` values change the computed mass of these five fish (for example the red-tail shark's b of 3.424 gives a much heavier adult than the old 3.09). Any stocking test or golden pinned to those fish would move; I did not check which ones, and the fs1-sharks tests read care data (`CARE`, crowd warnings), not mass, so they are probably unaffected.
  - The `model` column in `bodymass.json` (3D body mass divided by table mass) was recomputed on 11-19 against the models of that day. It will drift if the body plans changed since. The file is rebuilt by `scripts/body-mass.mjs`, so regenerate before merging. `test/bodymass.test.ts` checks `bodyvolume.json`, not this column.
  - `model-versions.json`: rainbowshark and redtailshark entries have 11-19 hashes and `build: 2403`. All five fish are build-B live on main (`fishLive.json`: endlerb, convictb, rainbowsharkb, peacockgudgeonb, redtailsharkb), but main's `model-versions.json` has no rainbowshark or redtailshark rows at all. Whether those hash rows still match the current drawn models is not determined; if a model-version test compares hashes it could fail.
  - Does not touch `fishLive.json`, `stockSummary.ts`, `verdict.ts`, `animalfit.ts`, `main.ts` or any swim file.
- Recommendation: MERGE. Before shipping: run `scripts/body-mass.mjs`, then the bodymass, aqadvisor, species-onboarding, soldSex and stocking test files, and re-record `model-versions.json` for the two sharks if the review page says "changed". Size S.

## 3. `claude/onboard-bichir-knife-shark` (R150 data), MERGE after two small conflict fixes, size S

- Commits: 3 (`50d79bdc`, `a9b700f3`, `1c347da6`), all 2026-11-25. Base `022a7242`. 32 files, +210 / -20.
- What it does: onboards the Senegal bichir (under the id `bichirb`, kept), clown knifefish and brownbanded bamboo shark as real catalogue species. Adds care, groups, climate, lid need, origin, water chemistry, sources, provenance, space factor, substrate traits, demand items, length-weight rows (lw-sources, bodymass), tank minimums (tankmin.json, all three), HOVER / BENTHIC / HABIT rows, gallery pictures and model sheets. Species rows become full rows (`species.json`: clownknife tl 600 to 915 mm, bambooshark 900 to 945 mm and made salt / bottom / low, bichirb 305 to 335 mm and made bottom / low). It also adds `fishLive.json` entries for bichirb, clownknife and bambooshark, edits tests (`fishLive.test`, `minimum.test`, `aqadvisor.test`), and, per Nathan 11-25, removes the "water shallower than the fish is long is not assessed" rule in `src/scene/tankMin.ts`.
- Test merge: conflicts only in `research/requests.md` and `src/data/fishLive.json`; all other files merge automatically (`species.json`, `species.ts`, and the data files).
- On main already? No. The three fish are still bare model-only rows on main (`species.json` has clownknife tl 600, bambooshark tl 900, bichirb tl 305, with no other keys) and none of the data keys for bichir, bichirb, clownknife or bambooshark exists in tankmin, lw-sources, bodymass, care, careNeeds, lidNeed, groups, origin, waterchem, spacefactor, substrateTraits, climatedata or demand-items on main (checked all thirteen files). The depth rule is still on main at `tankMin.ts` line 116.
- Overlap with branch 4: both onboard the bichir with different ids and different numbers. This branch uses id `bichirb`, tl 335 mm, tank 1665 x 605 mm / 117.5 gal. Branch 4 uses id `bichir`, tl 445 mm, tank 1440 x 530 mm / 95 gal. A note committed on main (`07e4e5c0`, 2026-11-24) records Nathan's decision "B model, keep drawn; rename bichirb -> bichir, tl 445", which is the branch-4 shape; this branch is a day later and says "bichirb, id kept". I could not determine which Nathan wants now.
- Other risks:
  - Clownknife and bambooshark are in the b9 fish batch (`HANDOFF-batch-b9.md`, "the six": labeo, clownknife, bambooshark, goldfish, kuhli, hillstream), so new look ids and a new approval are likely; the `fishLive.json` entries here approve the old models (key = look = species id). Whether the b9 rebuild keeps those ids is not stated.
  - `minimum.test.ts` gains `BEYOND_CATALOGUE = ['bambooshark']` (no stock tank is wide enough), and the Decision 3 kuhli test is rewritten; both pin the new rule. Removing the depth rule changes `reasonIn` text, so any other test or screenshot using the "not assessed" string will move.
  - `test/fishLive.test.ts` is edited so these three are expected to be listed. That conflicts in spirit with main's `4aadb581` / `0fc146f0` (model-only rows stay out of lists) only until the rows are full rows, which they are on this branch; no conflict at merge.
  - Without a drawn fishgen plan the bichir has no art outside the live build-B model (branch 4 adds the drawn fallback). Not checked whether the non-`?photoart` view of `bichirb` renders a stand-in.
  - The kuhli test row and `src/review/main.ts` try/catch are in branch 4, not here.
- Recommendation: MERGE, size S, after Nathan answers the bichir id and length question. Fix the `requests.md` conflict by renumbering (R150 is taken on main) and the `fishLive.json` conflict by keeping main's entries plus the three new ones, unless b9 supersedes the knife and shark looks, in which case drop those two. Run the minimum, species-onboarding, fishLive and aqadvisor tests.

## 4. `claude/exciting-engelbart-800558` (RX-BICHIR), PARTIAL PORT (lie-flat behavior), close the rest, size S-M

- Commits: 4 (`9f89003b` 11-23, `ba5f0df4`, `17e3f870`, `74a095f9` all 11-24). Base `e95cdddf`. 31 files, +132 / -10.
- What it does:
  1. Onboards the Senegal bichir as species `bichir` (tl 445, zone bottom), with a drawn `fishgen.ts` plan, care, tank minimum, water chemistry, mass (a 0.00457, b 2.99), stocking class, and a gallery picture.
  2. Makes the bichir and kuhli lie flat on the bed: new `REST_PITCH` table (bichir 0, kuhli 0) in `fishBehavior.ts`, new `restPitch` and `rad` fields on `SwimmerSpec`, and `swimSim.ts` uses `restP[i]` in place of the hard-coded -20 degree rest pitch and `s.rad` in place of `len * 0.12`; `build.ts` passes them.
  3. A one-paragraph onboarding-checklist rule in `research/species-onboarding.md`: a species with a build-B photo model points at it instead of getting a second row.
  4. `src/review/main.ts` try/catch so one look that fails to build does not stop the review page.
- Test merge: conflicts in `src/render/build.ts` and `src/scene/swimSim.ts`; the rest auto-merges.
- On main already? Item 2 is not: `git grep` for `REST_PITCH`, `restPitch`, "lies flat" finds nothing on main. Item 1 is duplicated by branch 3 with different values (see branch 3), and main has no `bichir` rows. Item 3 is not on main. Item 4: not checked whether main has an equivalent guard (the diff shows main's `review/main.ts` merges automatically, so it did not change the same lines).
- Risk if merged as is: it cannot be merged as is (swimSim conflict). Behavior risk after port: bottom fish keep the default -20 degree rest pitch, so adding `restP` changes nothing for them, but `rad` and the `restPitch / 4` term change the moving-along-the-floor pitch only for fish listed in `REST_PITCH`, so existing swim goldens should not move; not verified. Conflicts with branch 3 on `species.json`, `tankmin.json`, `fishBehavior.ts` rows (both add a bichir row with different ids) if both merged; pick one.
- Recommendation: PARTIAL PORT, size S-M. Salvage (a) the `REST_PITCH` / `restPitch` / `rad` change across `fishBehavior.ts`, `swimTypes.ts`, `swimSim.ts` (3 hunks) and `build.ts` (1 line), with the bichir and kuhli rows, re-keyed to whatever id the bichir takes; (b) the checklist paragraph in `research/species-onboarding.md`. Close the bichir data (superseded by branch 3 for the same facts, later and with the shark and knifefish) unless Nathan wants branch 4's `bichir` id and 445 mm length, in which case the data changes direction and branch 3's bichir rows would be the ones to drop. The drawn `fishgen.ts` bichir plan (11 lines) is only needed if "keep drawn" still stands.

## 5. `claude/tl1-r134-r135` (TL1: bundle's own lid), MERGE, size S

- Commits: 2 (`7376488d`, `f1137ec4`, both 2026-11-19). Base `fe91227a`. 12 files, +38 / -11.
- What it does: adds an optional `bundleLid` on `TankSetup`, set in `sceneFromDeal` when the bundle has a lid. With it set: `hoodOf` and `lidOf` return no catalogue product, `demandOf` prices the lid as "Hood / Lid that comes with the bundle (name)" at the generic lid price with zero hood power, `lockNote` / `includesNote` / `lidDetail` say it comes with the bundle (instead of "comes with a glass top"), and picking a catalogue hood or lid product, or changing the lid kind, clears it. Validation keeps the field when loading a scene. New test `R134 R135 a bundle keeps its own lid` in `test/lids.test.ts`, one screenshot.
- The "kit LED bar fix" in the brief: the second commit only restores an if / else chain in `sceneFromDeal` that the first commit split. It is a repair of this branch's own first commit, not a separate fix on main. After both commits `dealscene.ts` has one added line relative to the base.
- Test merge: clean.
- Superseded? No. `git grep bundleLid` on origin/main finds nothing. Of the eight source files the branch touches, six have zero commits on main since the base (`engine.ts`, `dealscene.ts`, `integrated.ts`, `tankEdit.ts`, `validate.ts`, `types.ts`); only `shell/logic/tank.ts` and `shell/tank.tsx` changed (two tank-picker commits, `c6a8a491` and `ea6f4884`), and they merge cleanly. The deal id used by the new test (`petco-imagitarium-led-55`) still exists in `src/data/deals.json`.
- Risk if merged as is: moves the lid row label and price for bundle starts, so any test that reads the lid row from a deal scene could change. I found existing tests reading lid labels in `hoods.test.ts` (line 37, a setup with a hood product, not a bundle) and `productgate.test.ts` (line 156, a "comes with a glass top" note for a product that is not a bundle), neither of which appears to go through `sceneFromDeal`; not run. The `requests.md` rows for R134 / R135 say TL1 also made a `demand.test` fix, but that file is not in this branch's diff; I could not tell where it went. Does not touch the files today's lanes changed (swimSim, stockSummary, verdict, animalfit, main.ts, shell start files, items.ts, fish scripts, `fishLive.json`) except the two shell files above.
- Recommendation: MERGE. Run `lids`, `hoods`, `productgate`, `demand` and the deal-scene tests first. Size S.

## 6. `claude/species-backup-mine` (art variants out of the species catalogue), CLOSE

- Commit: one, `007fa625`, 2026-11-24. Base `309762ab`. 7 files, +72 / -8.
- What it does: adds `src/data/variants.ts` (maps each build-B / C / D id to its base species by scientific name, so a variant reads the base species' data), changes `species.ts` to export `ALL_SPECIES` (everything, for the review page) and `SPECIES` (catalogue only: no variants, no rows marked `"hold": true`), marks clownknife, bambooshark and bichirb `hold` in `species.json`, filters `scripts/source-audit.ts` to catalogue species, switches `review/main.ts` to `ALL_SPECIES`, and adds a care-data note with paste-ready rows.
- Test merge: conflicts in `research/requests.md`, `research/species-clownknife-bambooshark-bichir.md` (both sides added it), `src/data/species.ts`, `src/review/main.ts`.
- Superseded: yes. Main's `4aadb581` ("model-only species rows stay out of the app lists") does the same job another way: a bare row (only id, name, sci, tl, art, aspect) is a review look, kept out of `SPECIES` unless `?photoart`, listed in `REVIEW_LOOKS`. `0fc146f0` makes `source-audit.ts` count catalogue species only and rewrites the research note (main's copy of that file already contains the paste-ready rows). The branch's own diff is what main's fix replaced.
- Anything worth salvaging? Only one idea, not currently needed: `variants.ts` / `VARIANT_BASE` / `aliasVariants` (a variant inherits its base species' data and group, salt and zone fields). Main has none of it (`git grep VARIANT_BASE` finds nothing) and uses the bare-row test instead. If a build-B look ever needs the base species' category, salt, zone or group without a full row, this is the hunk to take: `src/data/variants.ts` (23 lines) and the `inherit()` function in the branch's `species.ts`. The explicit `"hold": true` flag is a different, more explicit way to keep a full row out of the catalogue and is not on main either.
- Recommendation: CLOSE.

---

## What I could not determine

- Which tests actually move for branches 1, 2, 3 and 5; none were run (the machine is busy).
- Whether the `model-versions.json` hashes in branch 2 still match current models.
- Whether branch 4's `review/main.ts` try/catch is already covered on main.
- Whether the b9 rebuild changes the look ids of the clownknife and bamboo shark.
- Which bichir id and length Nathan wants today.


## Nathan's decisions

- **Bichir (2026-11-26):** id `bichir`, 445 mm (17.5 in). So the lie-flat branch's identity wins; when the data branch (`onboard-bichir-knife-shark`) is merged, its `bichirb` / 335 mm / 117.5 gal rows are renamed and resized to match, and the tank minimum is recomputed for 445 mm, not copied from either branch.
- Still open: clown knifefish and bamboo shark live entries vs the b9 rebuild; estimated gulp rates for R145.
