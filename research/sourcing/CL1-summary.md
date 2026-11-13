# CL1 care-level audit: summary so far (pilot, 10 of 83 aquarium-scope species)

Data: `research/sourcing/CL1-care-levels.json`. care.ts is NOT changed; Nathan approves first.

## Proposed changes
- **discus 2 -> 3** (medium): LiveAquaria reads 2 for captive-bred stock; Fishkeeper and Tropical Freshwater Fish read expert-level.

## Low-confidence species
None yet in the pilot (all others medium, kuhli high). Weak spots: oto (2 pages opened, Seriously Fish URL 404), neon and guppy (2 sources each), SAE (Seriously Fish page is genus-level).

## Betta (resolved)
care.ts says 2 and that is current. The 2026-10-21 combine (commit 91c4289e, "apply all except the 11 kept") moved it 1 -> 2; betta was not one of the 11. The 10-20 "kept beginner (1)" note and the provenance.ts row are stale. Pilot sources: Seriously Fish Moderate; Fishkeeping World and Aquarium Co-Op beginner-leaning but conditional on heater, cycled 5+ gal tank. Keep 2 (medium). Provenance row to be fixed after approval.

## Cost
About 23k Sonnet tokens per species; remaining 73 about 1.7M (2.0M with verification).
