# Lane AU1: audit every request Nathan made today against the real app (Coordinator 23, 2026-11-12)

Follow `prompts/lane-common-c20.md`, including the new visual proof rule at its end. Your chat is titled "AU1: Request Audit". This lane VERIFIES. It does not fix anything, except a one-line fix whose cause is certain, and that only as a separate commit, listed in the report.

## Why
Nathan asked for the collapsed-panel expand arrow to move up. The lane said it had checked it, the coordinator merged it on passing tests, and it never worked: the CSS rule used `var(--bb-h)`, which is undefined where it applied. Nathan: "How many silent errors do we have where I am just shouting into the void?" Your job is to answer that with evidence.

## 1. Collect the requests
- Gather every request Nathan made on 2026-11-12, **in his own words**, from every TankLook chat. Use `mcp__ccd_session_mgmt__list_sessions` (the TankLook group) and `list_events` / `search_session_transcripts`, and read only the user turns.
- Include:
  - the coordinator chat `local_d471d9d2-10e5-4bcb-83ce-631ef91c8055`;
  - every lane chat it started;
  - the VF-A / VF-B / VF-C chats;
  - hand-started chats from today, e.g. "Clickable aquarium elements menu", "Left window width on PC", "Gallon range slider with size categories", "Visual polish opportunities".
- Split compound messages into single checkable items. One message can hold four asks: the toolbar message did.
- Also take every "done" claim a lane made about something visible.

## 2. Check each item in the real app
- Build from origin/main in your worktree and run it with your launch.json port. Also check the live site, tanklook.com, and note its build number.
- For each item:
  - reproduce it as Nathan would, at desktop width; also at phone width if the request concerns layout;
  - save a screenshot under `research/screens/AU1/<nn>-<slug>.png`, cropped to the part that matters.
  - Mark it **VERIFIED**, **BROKEN** (say what's wrong), **PARTIAL** (say what's missing) or **NOT CHECKABLE** (say why).
- Be adversarial: try the obvious variants (the panel collapsed vs open, Guided vs Sandbox, a tank with and without a stand, a saved tank reloaded).

## 3. Report
1. Write `research/audit-2026-11-12.md` with a table: # / Nathan's words / chat it went to / lane and commit that claims it / status / screenshot path / notes.
2. Commit the doc and the screenshots on your branch, rebased on origin/main.
3. Report ONCE to the coordinator:
   - the sha;
   - counts per status;
   - the BROKEN and PARTIAL lines (one line each).
4. Don't send Nathan anything yourself. The coordinator relays it.

## Machine
Other lanes may be running. Use `scripts/lowprio.ps1` for screenshot runs, and kill your browser / vite when done. Never end a turn with anything running in the background.
