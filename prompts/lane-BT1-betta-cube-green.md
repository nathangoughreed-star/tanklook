# Lane BT1: A lone betta in a 12 in cube reads green (upper green, near yellow)

Coordinator: Coordinator 17, local_44e5506c-3362-4ae4-9201-786513054e8f (or the newer one named in HANDOFF.md "Start here"). Report ONCE with send_message when ready to merge, done, or blocked.
Start: `git fetch`, then `git checkout -b bt1-betta-cube origin/main` in your own worktree (never the shared folder). Read HANDOFF.md "Start here" + lane rules and the GV9 section (fix 3). Beyond that grep, don't read whole files.
Rules: Units gallons, inches, deg F, US $. Questions for Nathan stay in your chat WITH pictures (files, SendUserFile).
Before reporting: npm run build + FULL vitest with the Bash tool's run_in_background (never Start-Process; end the turn and wait, no polling), browser check, screenshots SAVED AS FILES. Don't push: send branch, sha(s), suite result, moved numbers, screenshot paths. Stop preview servers.

Nathan (2026-11-02), asked whether a lone betta in a 12 in cube should read green instead of yellow: "yea it should be green but upper/almost borderline yellow."
Today: the red line is Nathan's 2026-10-28 ruling ("one betta is comfortable in a 12 in cube", 305 mm); the yellow "below the recommended size" line is Seriously Fish's 17.7 in length (src/scene/tankMin.ts `tankMinimum`, the Fullness tile, and since GV9 a line on Suggest cards). An 8 gal cube (13.8 in) and a 12 in cube read yellow.
Build: for a lone betta, a 12 in cube is GREEN, placed near the yellow edge (the tile's gauge sits high in the green band, not mid-green). Below 12 in stays as today (yellow / red per the existing lines). Do it as data for the betta (its recommended length / comfort line), not a special case in code, with the source note "Nathan 2026-11-02". A betta with tankmates is unchanged. Suggest cards drop the "below recommended" line for these tanks since they are now green.
Moved numbers: list every Suggest / example / starter result whose colour or rank changes in research/design/moved-numbers-bt1.txt; regen calibration only if the HANDOFF rules require it.
Tests: lone betta 12 in cube green and within the top part of the green band; 10 in cube not green; betta + tankmates unchanged.
Screenshots: the Fullness tile for a lone betta in a 12 in cube and in an 8 gal cube (13.8 in).
