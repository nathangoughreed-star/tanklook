# CL1 care-level audit: for Nathan to approve (2026-11-13)

Scope: all 83 aquarium-scope species in `src/data/care.ts` CARE (land / herp species hidden by `src/scope.ts` skipped).
Data: `research/sourcing/cl1/CL1-care-levels.json` (in a subfolder because provenance.ts globs research/sourcing/*.json and expects batch files) (each source with URL, label, reason; `final` = the level I propose; `verify` = second look on changes and low-confidence rows).
**care.ts is NOT changed.** Provenance rows only after you approve.

77 of 83 keep their level. Sources are few: 26 species have fewer than 3 opened pages (Seriously Fish, Aquarium Co-Op, Petco and LiveAquaria often failed to open), so "medium" is the usual confidence.

## Proposed changes (5)
| species | now -> proposed | confidence | why |
|---|---|---|---|
| discus | 2 -> 3 | medium (verified) | Fishkeeper and Tropical Freshwater Fish read expert-level; LiveAquaria says 2 only for captive-bred stock. Needs warm, spotless water and heavy feeding. |
| hatchet (marbled) | 1 -> 2 | medium (verified) | Jumpers that need a mature, stable, covered tank and are often lost in new tanks. |
| coral beauty | 1 -> 2 | medium (verified) | Sources call it moderate: reef-safety, diet variety and ich risk; two pages only. |
| swordtail | 2 -> 1 | LOW after second look (one new source) | Fishkeeping World calls it easy and Seriously Fish moderate; the new source says hardy. Needs a bigger tank, which is size, not skill. |
| rummynose | 1 -> 2 | LOW (verifier inconclusive) | One page says Intermediate; the others stress stable, mature water. Your call. |

Checked and NOT proposed: blue tang 2 -> 3 (first pass said 3, the second look found Moderate labels, so it stays 2).

## Low-confidence species (kept at current level)
swordtail (proposed change above), goldfish 1 (real split: "moderately easy" vs "harder than its reputation"), merah 2, exclamation rasbora 2 (two sources, one genus-level), cajun dwarf crayfish 1 (genus-level pages only), red swamp crayfish 2, redclaw 2, yellow tang 1 (one source), yellow watchman goby 1 (one source). Also weak: oto (2 pages), SAE (Seriously Fish page is genus-level).

## Betta (resolved)
care.ts 2 is the current decision. The 2026-10-21 combine (commit 91c4289e, "apply all except the 11 kept") moved it 1 -> 2 and betta was not among the 11. The 2026-10-20 "kept beginner (1)" note in decisions.md and the provenance.ts row are stale. Sources: Seriously Fish Moderate; Fishkeeping World and Aquarium Co-Op beginner-leaning but only with a heater and a cycled 5+ gal tank. Keep 2 (medium). Provenance row to be fixed after your OK.

## Cost
About 833k Sonnet subagent tokens in total (pilot 228k, three batches 428k, two verifiers 177k).
