Read HANDOFF.md first, but only the parts you need (it is about 260 KB). Read: the "Efficiency review" section at the top
(your lane's brief), the "Parallel lanes" coordinator protocol, and the performance history in lanes J, J2 and K2 (what
was already sped up, how it was measured, what was left open). Memory: perf-ab-alternate-frames.md,
shared-folder-commits.md.

You are lane E1: a performance baseline for TankLook as it stands now, after the feature push. You MEASURE and RANK; you
do not change any app code. Worktree C:\Users\nreed\Glass-Box-perf2, branch perf-baseline, launch config `perf2`, port
5623 (npm ci is already done). First git fetch + merge origin/main and write down the commit you measure.

Why now: lanes J / J2 / K2 measured edit cost on 2026-10-14. Since then plant growth, the 3D walls, algae, scape
density, the light mount and more have landed, and nobody has measured the whole app since. Lane GR4 (GPU reveal +
background prebuild, branch plants3d) and lane AL (algae) are still running. Their render paths will change, so the
baseline has to be re-runnable.

Work, in this order:
1. A re-runnable harness: new file scripts/perf-baseline.mjs. It's yours, and it's the only code you add. Reuse what
   export-sheets.mjs does to start the dev server, but run on the hardware GPU (`--use-angle=d3d11`; SwiftShader numbers
   are meaningless). It loads each example in src/examples plus a split view and records, per view:
   - steady GPU ms (timer queries, the way J2 measured), CPU ms per frame, draw calls, triangles, geometries / textures /
     programs in memory, JS heap
   - time from load to first frame, and the first frame after a full rebuild
   - edit timings through render/incrementalCheck.ts
   Run it at 1050x850 (J2's size, so the numbers compare) and at 375x812 phone size. Measure the production build
   (`npm run build:single`) for load time and size. Output: a JSON file plus a short summary it prints. Any A/B
   comparison alternates frames; sequential timings on this shared machine lie.
2. Run it. Record the machine's load (which other chats and dev servers were running), and mark any number taken under
   load.
3. Find where the time goes in the worst two or three views: which passes, materials and shaders dominate (the frost
   transmission pass, the lit plant shader, the 3D walls, growth / algae, per-item draw calls). Check which of J2 / K2's
   open items are still true.
4. Write research/efficiency/E1-perf-baseline.md: the baseline table, the breakdown, and a ranked list of candidate fixes.
   For each fix: the measured cost it targets, estimated gain, risk to the approved look, size, the files it would touch,
   and whether it needs the other lanes to be quiet (it does if it touches a file another lane owns, or panels.ts /
   build.ts / viewer.ts).

Do not edit anything in src/. If a measurement needs instrumentation, put it in your script or in the page via the
console. Don't add hooks to app code. Subagents run on Sonnet only; quote the cost to Nathan before fanning out to more
than 3.

Ship: git fetch + merge origin/main, commit by path only (scripts/perf-baseline.mjs and research/efficiency/E1-*; never
-a), git push origin HEAD:main, then git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main. Update the
"Efficiency review" section of HANDOFF.md in place with your results (dated). When done, preview_stop your dev server.

Coordinator protocol: when the harness is pushed and when you are done, send_message to the coordinator, session
local_d0390f66-339c-4fa1-ab38-43e9c2a35958 ("Lanes coordinator 2"): the commit hash, the top five ranked items with
their numbers, and what's open. Lane E2 (static code audit) runs alongside you. If E2 names a hot-path suspect, time it
when the coordinator passes it on. Questions for Nathan stay in your own chat.
