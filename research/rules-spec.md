# How rules produce verdicts (DRAFT for Nathan, 2026-10-21)

Status: draft from the user-flow design chat, after the product review (TankLook_Product_Review.docx, 21 Oct) and the
reviewer's follow-up. Nothing here is built. It replaces the parked "gate kinds" question (hard truths / fit / taste):
what matters is how each rule behaves, not what the categories are called.

## 1. Principles
1. **Never block modelling.** A user can always build, inspect and improve any setup, including a bad one. Rules decide
   only what TankLook *recommends*, and what it says about it.
2. **One assessment per setup.** The same scene gets the same verdict in every path. Paths change the presentation and how
   much the tool steps in, never the result.
3. **Locks are never relaxed silently.** What the user locks (tank size, an animal, a spending ceiling, owned gear, no CO2,
   a time limit) stays. When nothing satisfies the locks, say which locks conflict and offer the smallest changes.
4. **Severity and confidence are separate.** Uncertain evidence never makes a serious harm look harmless; a serious label
   never makes a disputed threshold look measured.
5. **Missing input gives "unknown", never a pass.**
6. **Every output says what kind of number it is:** measurement, calculation, estimate, scenario, or conditional judgment.

## 2. A rule record (one per consequential rule)
| Field | Answers | Example: dwarf frog group size |
|---|---|---|
| `claim` | What TankLook asserts | Dwarf frogs do better in groups than alone |
| `evidence[]` | Each source, and what it ACTUALLY says (summary, link, date checked) | Keeper guides: "keep at least 2-3, more is better"; no count beyond that |
| `basis` | measured / source-stated / TankLook interpretation / derived calculation / conservative default | Threshold 5 = TankLook interpretation (Nathan's judgement); 1 = avoid is source-stated |
| `applies` | Species, habitat, life stage, conditions | Aquatic, adults, any tank |
| `inputs` | What the rule needs; any missing = unknown | Count (sex not needed) |
| `severity` | How bad failure is (scale below) | 1 alone: S2; 2-4: S1 |
| `confidence` | How sure the assessment is (scale below) | Alone is bad: C2; "5 is better than 3": C1 |
| `response` | From the matrix in section 3 | Warn at 1, inform at 2-4, nothing at 5+ |
| `resolution` | Changes that address the actual mechanism | Add frogs (if the tank allows), else a bigger tank, else a different animal |
| `wording` | The words per band, reviewed with the threshold, never alone | "Social need met; the tank now limits more" at 5+ |

`evidence` and `basis` come from the provenance rule for the value (src/data/provenance.ts, built by lane ST, 6da4be0): its
`says` (what the source states) and `src`, and its `basis` (measured / source-stated / interpretation / derived /
conservative-default), kept on the rule tag, not the page entry, because one page backs many values in different ways.
A citation for "keep in groups" never vouches for "5 or more". Today 842 of 1277 CARE values are interpretation
(research/source-coverage.md).

## 3. Severity, confidence and the response matrix
Severity: **S3** death, injury, predation, a lethal parameter; **S2** chronic harm (stress, stunting, aggression, shortened
life); **S1** reduced success (shy, pale, algae, slow growth); **S0** preference, appearance, cost.
Confidence: **C3** established (measured, physical, or consistent strong sources); **C2** supported (keeper consensus,
ranges agree); **C1** weak (one source, estimate, disputed); **C0** unknown (inputs missing).

| | C3 established | C2 supported | C1 weak | C0 unknown |
|---|---|---|---|---|
| **S3** | Withhold recommendation; say what fails and what fixes it | Withhold; "likely to fail unless..." | Do not endorse; "we can't confirm this is safe", say why it is uncertain | Ask for the missing input; verdict unknown |
| **S2** | Warn; recommended builds avoid it | Warn; recommended builds avoid it | Inform, with the uncertainty | Ask for the input |
| **S1** | Inform | Inform | Inform (quietly) | Mention only if asked |
| **S0** | Show as a tradeoff (cost, look, effort) | same | same | same |

**The matrix is a decision aid, not the whole decision.** What to do about low confidence depends on WHY it is low:
| Why the result is uncertain | Response |
|---|---|
| A relevant input is missing (a tank dimension) | Ask the user to measure it |
| Pairing status unknown | Ask if known; otherwise keep the uncertainty in the verdict |
| Husbandry sources disagree | Explain the disagreement and apply a stated policy (which side TankLook takes, and why) |
| The engine has no suitable model (arboreal habitat, feeding supply) | Report the limitation; never imply another answer from the user would fix it |

**Confidence has one object:** how sure we are that THIS setup carries THE STATED risk, not how reputable the source is.
A reputable source for "keep in groups" gives low confidence that a group of 4 in this tank is harmed.

"Withhold" means the guided paths will not propose it and the plan sheet will not call it suitable; the editor still lets
the user build it, with the issue visible. Where several rules fire, each shows; one good score never cancels another
(low fullness does not hide a dimension, feeding or territory problem).

## 4. Specific rules this changes in path 1
- **Sex and pairing are two inputs.** Sex per animal: male / female / unsexed. Pairing, where a rule depends on it: established
  pair / unconfirmed / unknown. One male plus one female is never assumed to be a compatible pair.
- **Group thresholds are reviewed with their words.** P1's bands become rule records with `basis` stated; the 5+ message
  becomes "social need met; the tank now limits further additions", and only where the threshold is supported.
- **Builds converge.** Show only genuinely different builds: when cheapest and balanced differ by less than the cost
  uncertainty, show one.
- **Cost comparison.** Setup cost stays visible; first-year cost (setup + 12 months of upkeep) is a second number, labelled an
  estimate; no "cheapest" winner is declared when the difference is inside the uncertainty. One expected budget number stays
  (Nathan 2026-10-19), plus an optional "don't go over" ceiling lock and "I don't know yet".
- **Owner path:** report both "does the change help" and "is the result suitable"; unchanged concerns sit in a compact
  baseline summary. The first look is called a "setup check" (an inventory cannot prove animal health).
- **Workload, not an average:** daily tasks, a normal week, occasional big tasks.
- **"Plants never add room"** applies to water volume and floor in aquatic tanks only; branches and foliage are habitat for
  arboreal animals. Guided recommendations open per habitat type when its model supports them.

## 5. Benchmark cases (expected verdicts are HYPOTHESES for Nathan to review before they become tests)
Some cases are held out of any calibration so they can show errors rather than confirm the fit. Cases isolate mechanisms as well as test whole setups: the same group in different tanks (density only), different
groups in one roomy tank (group only), so a right-looking verdict cannot come from the wrong rule. Today's engine was run
on these first as a diagnostic baseline: research/benchmark-baseline.md (regenerate with
`GEN_BENCH=1 npx vitest run test/benchmarkBaseline.test.ts`); compare again after the rules work.
| Case | Expected behaviour (draft) |
|---|---|
| Low waste, poor dimensions (e.g. a long fish in a short tank) | Dimension issue stays visible, S2-S3 by species, despite low fullness |
| Dense planting, heavy stocking | Plant uptake lowers the filtration bar only; crowding and territory warnings stay |
| Mandarin in a big enough reef | Feeding (live pods) flagged S3/C3 unless the plan shows a food supply |
| Two unpaired cichlids / rams | Not treated as a pair; "pairing unknown" asks or warns |
| Fewer animals in an unsuitable tank (owner) | "Improvement, but the main problem remains" |
| A small owner question (one plant swap) | Only light and planting space asked; full setup check optional |
| Locked tank + tight budget | No lock changes; the conflict and the smallest changes shown |
| Expired deal / missing gear data | Cost or confidence changes visibly; missing data never passes |
| Same plan opened in another path | Identical assessment; scene work kept |
| Dwarf frog x1 / x3 / x5 / x9 in 10 gal (combined) | x1 warn; x3 inform; x5 social need met but the tank limits; x9 tank limits (space) |
| Dwarf frog x5 in 2.5 / 20 long / 29 / 75 gal (density only) | Group verdict identical in all four; only the tank verdict changes |
| Neon x3 / x8 / x15 in 40 gal breeder (group only) | Tank verdict identical; only the group verdict changes |
