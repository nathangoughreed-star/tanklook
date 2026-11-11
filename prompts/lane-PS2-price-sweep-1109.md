# PS2: Land the 2026-11-09 price sweep (Coordinator 22)

Follow `prompts/lane-common-c20.md`. First `git fetch origin && git merge --ff-only origin/main`. Read HANDOFF "PS1", which is how the 2026-11-02 sweep was landed (re-blessed tests, a moved-numbers file). Report to Coordinator 22; never push.

## Task
- The sweep is committed as `547b9693` on branch `refs/heads/price-sweep-2026-11-09`, in the shared repo at `C:/Users/nreed/Glass Box`. It has 22 price changes and 1 Petco sale, with `report.md` alongside. It was never landed.
- Fetch it: `git fetch "/c/Users/nreed/Glass Box" refs/heads/price-sweep-2026-11-09`.
- Cherry-pick it onto origin/main, resolving any conflicts with newer catalogue edits. The newer value wins unless it is the sweep's own subject.
- Move the tests' pinned date to 2026-11-09 where PS1 pinned 2026-11-02, if that is still how it works.
- Re-bless only the numbers the price changes move. List every moved number with old → new in `research/design/moved-numbers-ps2.txt`.
- Any change that isn't explained by a price in the sweep is a bug: stop and report it.

## Done when
- The sweep is on your branch.
- The moved-numbers file is written.
- The build is clean and full vitest passes (re-run load timeouts alone).
- A HANDOFF section.
- Report the branch and sha.
