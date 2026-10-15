Read HANDOFF.md first, but only the parts you need (it is about 260 KB). Read: the "Efficiency review" section at the top
(your lane's brief), the "Parallel lanes" section (the current-lanes table: who owned which files, and the coordinator
protocol), and lanes J, J2 and K2 (performance work already done and what was left open). Memory: shared-folder-commits.md.

You are lane E2: a static audit of the code after the feature push (about 470 commits in a week, by about 20 parallel
lanes). You READ and RANK; you do not change any app code. Worktree C:\Users\nreed\Glass-Box-audit, branch code-audit
(npm ci is already done). You need no dev server. First git fetch + merge origin/main and write down the commit you
audit.

Work, in this order:
1. Dead code: unused exports, unreachable branches, and leftovers from approaches Nathan rejected (older fish styles,
   dropped experiments, dev-only paths the app never imports). Use the TypeScript compiler API that's already installed
   (a small script, scripts/unused-exports.mjs, is fine). Add no new dependencies. Dev-only tools such as
   render/incrementalCheck.ts and review.html are on purpose: list them, don't flag them.
2. Duplicated logic: the same geometry, maths, colour or parse code written twice by different lanes.
3. Hot-path waste, by reading the code: allocations inside per-frame code (render loop, onBeforeRender, animation, pointer
   drag), work redone per frame that could be cached, cache keys that miss or collide (lane J's open item 3: the
   `plants` cache key in render/items.ts rounds the height but builds with the exact one), and per-item draw calls where
   instancing would fit. List these as suspects with file:line. Lane E1 times them.
4. Bundle: what makes up dist-single/tanklook.html (about 750 KB) after `npm run build:single`: the three.js share, data
   JSON, art tables. Is there anything easy to drop or lazy-load?
5. A split plan for the two merge-conflict hotspots: src/ui/panels.ts (1630 lines, 109 changes this week) and
   src/render/build.ts (1212 lines, 72 changes). Propose the new modules, what moves where, and the order of commits.
   Each commit is a pure move (no behaviour change), so tests, incrementalCheck (0 px differ) and every fingerprint stay
   identical. Say which files each step touches and what it collides with. It runs only at a quiet point.

Write research/efficiency/E2-code-audit.md: one ranked table (item, file:line, evidence, estimated gain, risk to the
approved look, size, needs-quiet yes/no), then the split plan. Back every claim with file:line. Don't speculate about
speed you can't point to.

Do not edit anything in src/. Subagents run on Sonnet only (Haiku for plain greps); quote the cost to Nathan before
fanning out to more than 3.

Ship: git fetch + merge origin/main, commit by path only (research/efficiency/E2-* and scripts/unused-exports.mjs if you
wrote it; never -a), git push origin HEAD:main, then git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main.
Update the "Efficiency review" section of HANDOFF.md in place (dated).

Coordinator protocol: when you are done, send_message to the coordinator, session
local_d0390f66-339c-4fa1-ab38-43e9c2a35958 ("Lanes coordinator 2"): the commit hash, your hot-path suspects (for lane E1
to time), the top five ranked items, and the split plan in a few lines. Questions for Nathan stay in your own chat.
