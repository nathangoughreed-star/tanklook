# PS1: Separate Discovery preview state + persistent locks (Coordinator 22)

Follow `prompts/lane-AB-common.md` (and `prompts/lane-common-c20.md`). First `git fetch origin && git merge --ff-only origin/main`. Read HANDOFF "AB9", "AB10", "IV1" and `src/ui/ab/screen.ts` (`writing()`, `giveBack`), `src/scene/store.ts`, `src/scene/locks.ts`, `src/scene/attrs.ts`. Report once to Coordinator 22; never push. Another lane (AB12) edits index.html / style.css / panels.ts for the top bar: do not touch those.

## Background
IV1 found AB9 is allow-then-restore: Keep/Lock write lighting, substrate, tank, background and pieces into the WORKING design (undo pushes, rev bumps, scene events) and Close restores them. Autosave was patched, but live observers (viewer, derived panels) still see the preview write, and Close also drops the object locks.

## Nathan's decisions (2026-11-10)
1. Discovery must not write to the working design at all. Keep / Lock change only Discovery requirements (locks, switches, brief, constraints) until Make It Yours, the only operation that commits a generated design (one undoable step, as today). Prefer a separate preview state / overlay over allow-and-restore. If that is bigger than ~2 days, stop and report.
2. Object locks (lighting, tank, substrate, background, hardscape pieces, gear) SURVIVE Close and are honored on reopen, as animal locks already are. IV1 scenarios 2 and 5 must pass.
3. Locks hold ONE value each. Locking a new hardscape REPLACES the existing hardscape lock (do not accumulate pieces from A and B). When a lock would overwrite an existing different lock, show a clear WARNING first (e.g. "This replaces your locked hardscape from A. Replace / Cancel"); no silent overwrite. Same rule for background, tank, substrate and gear (check the existing "replaced" message from AB10 and upgrade it to a confirm). Unlocking stays one click.

## Done when
Tests: working design + undo stack + rev byte-identical after any sequence of Keep/Lock/thumbs/Close (assert no store write, not just restore); locks persist across Close/reopen and autosave reload; hardscape replace with warning; Make It Yours one undo step; manual editing normal after Close. Re-run IV1's nine scenarios in the real UI at desktop and 375 px. Run the FULL vitest suite, re-running load-timeout suspects alone. Screenshots (warning dialog, locks after reopen) in `research/screens/PS1/` ~60 KB, key ones to Nathan via SendUserFile. HANDOFF section (update the AB9 and IV1 notes that say allow-then-restore).
