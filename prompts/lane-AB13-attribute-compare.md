# AB13: A / No opinion / B attribute comparison replaces the thumbs matrix (Coordinator 22)

Follow `prompts/lane-AB-common.md` (and `prompts/lane-common-c20.md`). First `git fetch origin && git merge --ff-only origin/main`. The full spec is `research/design/attribute-refinement-handoff-2026-11-10.md`: READ IT ALL; it is the contract (sections 3-8, 16 acceptance tests). Also read HANDOFF "AB7", "AB7b", "PS1", "AB10". Report to Coordinator 22; never push.

## Nathan's decision (2026-11-10)
The per-attribute thumbs up/down matrix goes away ("bye bye"). Replace it with the optional comparative selector: per meaningfully-different attribute, one mutually exclusive A / No opinion / B choice (soft evidence only, recorded at the same moment as the overall vote, Skip records nothing). Keep the panel collapsed by default, keep locks and Shuffle scope, keep Combine as a separate "Try B's plants in A" action with approval. Existing recorded thumbs stay as historical soft feedback (no migration that destroys them). Locks are NOT part of this row choice; keep them per attribute as today (PS1 semantics: persistent, replace with warning).

## Process (two steps, report twice)
1. PHASE 1 FIRST: inspect the code (AB7 thumb UI/actions in `src/ui/ab/`, `src/scene/attrs.ts`, the preference learner and AB5 challenger generation, Combine, how differences are computed) and send Coordinator 22 a SHORT report: the minimal change plan, where the learner will consume relative attribute choices, and any conflict with the spec. Then continue straight into phases 2-4 unless a conflict needs Nathan's call (then stop and wait for my reply).
2. Final report when done: branch + sha rebased on origin/main, build + full vitest (load timeouts re-run alone), the spec's 16 acceptance tests mapped to tests or real-UI checks, desktop + 375 px screenshots of the compact default screen and the expanded Details panel in `research/screens/AB13/` (~60 KB, key ones to Nathan via SendUserFile), HANDOFF section (mark AB7's thumbs superseded).

Include "Try B's plants in A" / "Try A's plants in B" for any attribute where the Combine path supports it; if a given attribute can't be combined yet, show the button only where it can. Do not touch the top-bar menu (AB12), start/resume (SL2) or preview-state code (PS1) beyond what is needed.
