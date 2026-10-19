You are lane SD (one start chooser). Worktree ../Glass-Box-startchooser, branch startchooser, port 5763. Fast-forward to
origin/main first. Run on Sonnet. Subagents on Sonnet only.

Read HANDOFF.md "Start here" (lane rules, coordinator protocol), then the archived sections for lane KD / KK (start-dialog deal
cards: src/ui/featuredDeals.ts, deals.json, index.html #startDlg / #startDeals) via HANDOFF-archive.md headings, and research/
plan-guided-start-kits.md (guided start plan: the wizard / guided start is a separate future lane, do not build it here; leave a
clean seam for it). Memory: shared-folder-commits.md, push-live-is-fine.md.

Nathan 2026-10-19: starting a tank today is split over three places: the start dialog (Start fresh, deals cards, examples), the
New button (empty tank) and the Open... dialog (examples again, saved tanks, file). He wants ONE chooser for starting or opening
a tank, with these entries together:
  1. Start from scratch (an empty tank).
  2. Start from a bundle (a tank + stand + kit package; the deals / bundle data from lane KD, deals.json).
  3. Start from a sale (a bundle that is on sale now: the "N% off" cards; may be the same data as 2 filtered to sale prices:
     decide the cleanest split and tell Nathan with a picture).
  4. Start from a pre-built starter tank (the examples / starter styles).
  5. Open an existing tank (saved in this browser, or a downloaded file).
Work unit: build that one chooser as a single dialog (clear sections or tabs, phone-friendly at 375 px), shown at first launch
and by the New button and the Open... button (Open... can land on the "existing" section). Replace the duplicated example lists
rather than keeping two. Behaviour must not change: every entry opens the same scene it opens today (an example opens as a new
unsaved tank; a deal opens with its bundle pinned; Start fresh asks nothing new; opening a saved tank / file works as today;
replacing a dirty current tank keeps whatever warning exists today). Sections with nothing to show (e.g. no sales now) hide.
Keep the deals sweep data and its "as of" note visible. Add a one-line hook where the future guided start / wizard will plug in.
Tests: logic that picks and filters entries (sale vs bundle), no regressions in existing tests. Browser-check desktop and 375 px,
all five paths including Open from the New button with a dirty tank.
Pictures of the chooser (desktop + phone, each section) BEFORE shipping, via SendUserFile; wait for Nathan's verdict.

Files you own: the start / library dialogs in index.html, their code in src/ui/panels.ts (the start / New / Open handlers),
src/ui/featuredDeals.ts, style.css (.libdlg / .startdlg / .libgrid rules). Nobody else is editing these. Lanes GS (gecko surfaces)
and AN (anoles) are running but do not touch UI. If the main checkout has another chat's uncommitted edits, commit by path only.

Ship per the lane rules: git fetch + merge origin/main, tsc + tests + browser check, commit by path only (never -a), git push
origin HEAD:main, then git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main (skip the ff and say so if the main
checkout has other edits). No scene version bump. Add your own dated section under "Lane sections (current)" in HANDOFF.md (a
stub exists: fill it in). preview_stop when done. preview_start serves the folder the chat was opened in: run this chat in its
worktree. If this chat gets long, hand off to a fresh chat at a work-unit boundary after writing your state into your section.

Coordinator protocol: message the coordinator local_408aa124-ce91-4651-abaf-a221f0ceac82 ("Lanes coordinator 4") with send_message when work lands on main and
when you are done: commit hash, what landed, what is still open, which files are free. Questions for Nathan stay in your own
chat, with pictures. The coordinator cannot relay approvals.
