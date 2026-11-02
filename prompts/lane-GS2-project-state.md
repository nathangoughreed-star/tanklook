# Lane GS2: one shared project state for Guided Setup Rev 03 (data + tests, no UI)

Coordinator: Coordinator 18, local_a9a242cb-2560-4fe6-8c3a-0e51e36644b4. Report ONCE with send_message when ready to merge, done, or blocked.
Own worktree, never the shared folder: `git fetch`, `git checkout -b gs2-project-state origin/main`. Read HANDOFF.md "Start here" (incl. "GUIDED SETUP REV 03", "Machine load"), research/design/guided-setup-rev03.md sections 2, 5 and 8.
You OWN: src/scene/brief.ts, a new src/scene/project.ts, a new test/project.test.ts (and existing brief tests). Do NOT edit src/ui/** (GS3 owns src/ui/discovery/*; UI wiring is lanes GS4-GS6). One-line hooks elsewhere only if unavoidable; say so.
Build the state of the spec's section 5 by extending the existing brief (setupBrief / brief.vision / owned gear / limits), not a parallel model:
- world: aquarium | terrarium | paludarium | any (unknown); water: freshwater | saltwater | brackish | unknown, plus whether it was asked or implied by the animals.
- route: 'animals' | 'look' | undefined (which decision comes first; NOT a mode: switching keeps everything).
- equipment: each owned item (tank + dimensions, filter, heater, light, other) with use 'required' | 'available'; a "from scratch" answer distinct from "not answered". Ownership alone never sets required.
- constraints: space, startup budget, ongoing budget, setup time, maintenance time / care rhythm, experience; each { value, kind: 'hard' | 'flexible' } or UNKNOWN when skipped (never 0 or Infinity). Experience is advisory only.
- enclosure: chosen | owned-required | provisional { reason: 'from constraints' | 'example', label } so the UI can label it.
- animals, family, archetype, density stop, scene recipe (the existing vision fields), and unresolved issues / remaining decisions as a derived list.
Pure selectors: provisionalEnclosure(state) (known dimensions, else from space / budget / roster minimums, else an editable example), assumptionsInUse(state) (which unknowns were filled by assumptions, for the UI to name), unresolved(state). An upstream-change helper, e.g. applyChange(state, patch) -> { state, conflicts[] }, that keeps downstream picks while still valid and lists conflicts instead of silently dropping animals or looks.
Old saves (current brief / vision / owned gear / limits formats) load with the same meaning: migrate on read, no SCENE bump unless unavoidable (say so). Tests for every rule above, including unknown != 0, required vs available, provisional labels and applyChange conflicts.
Rules: gallons, inches, deg F, US $. Before reporting: npm run build + FULL vitest via Bash run_in_background (never Start-Process; end the turn, no polling). Moved numbers: none expected; if any, write research/design/moved-numbers-gs2.txt. Don't push: send branch, sha, suite result, and the exported API (names + one line each) for GS4-GS6.
