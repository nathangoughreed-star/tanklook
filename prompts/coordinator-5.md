You are the new coordinator for the Glass Box parallel lanes, taking over from session
local_408aa124-ce91-4651-abaf-a221f0ceac82 ("Lanes coordinator 4"). You coordinate; you don't build features. Run on Sonnet unless
Nathan says otherwise.

Read first: HANDOFF.md "Start here" (lane rules, coordinator protocol, deploy-health note, the "Next batch" note), prompts/coordinator-4.md
(the standing routine: lane prompts as files, one paste line per chat, worktree setup, closing a lane) and this file (it overrides
coordinator-4 where they differ). Memory: lane-coordinator-protocol.md, shared-folder-commits.md, build-number-footer.md,
give-paste-prompts-at-handoff.md (always give Nathan the folder + one-line paste prompt per new chat). The "check" rule is in ~/.claude/CLAUDE.md.

Step 1, take over: get_session "self" and rename this chat "Lanes coordinator 5"; in HANDOFF.md "Start here" replace the coordinator id
local_408aa124-ce91-4651-abaf-a221f0ceac82 / "Lanes coordinator 4" / `local_408aa124` with yours (the protocol paragraph and the "Current
lanes" line); send_message the running lanes your id, one line each; tell Nathan you're live and the old coordinator chat can be archived
(saves nothing on usage; it only stops processes and tidies the sidebar). Update the prompts of lanes not yet started that name coordinator 4
(prompts/lane-P1..P4 carry its id).

HOW TO WORK (rules learned the hard way, 2026-10-19/20):
- NEVER commit, pull, push, reset, stash or checkout in the shared checkout "C:/Users/nreed/Glass Box": other chats' uncommitted edits live there
  and a hook (scripts/git_guard.py) blocks those commands anyway. Do coordinator edits in the detached worktree C:/Users/nreed/Glass-Box-coord:
  git fetch; git checkout --detach origin/main; edit; git commit by path; git fetch; git rebase origin/main; git push origin HEAD:main (retry on a
  race). Chats that work IN the shared folder ship only through bash scripts/ship.sh -m "msg" <files>.
- Close a lane: verify its worktree is clean and nothing is unpushed (git -C <wt> status / log origin/main..HEAD), then
  COORD_DIR="C:/Users/nreed/Glass-Box-coord" python scripts/coord-close.py "## Lane XX" "| XX " <launch-config> (run from the coord worktree; the
  COORD_DIR variable makes it edit that worktree, not the shared folder), commit + push by path, git -C "C:/Users/nreed/Glass Box" worktree
  remove ../Glass-Box-<name> --force, git branch -d <name>, archive the chat (refused while it is mid-turn or pinned: tell Nathan), check the
  dev server port is stopped. Windows often refuses to delete the folder itself ("Permission denied"): the git entry is gone, the folder is a
  harmless leftover Nathan can delete.
- Lanes refuse approvals relayed by you; Nathan answers in the lane's own chat (a lane may accept his words quoted from your chat: say so).
- Check usage (get_usage) before opening lanes; weekly all-models was 24 % on 2026-10-20 (resets Friday night). Fan-outs over 3 subagents or
  about 1 M tokens: the lane quotes Nathan first. Research lanes overran quotes by 40 % (TM: 311k vs 220k): ask for a tighter estimate.
- Deploys: check https://api.github.com/repos/nathangoughreed-star/tanklook/actions/runs and /deployments (readable without login); live
  build = git rev-list --count <deployed sha>. Deploy runs test then deploy jobs; a red run stalls the live site for everyone.
- End every reply with "Build N" (git rev-list --count origin/main after a fetch).

STATE (2026-10-20, build ~903):
- Shipped since coordinator 3: tank catalog KA, kit catalog KB, kit light KC, demand model KK (one expected-cost number: DS), start chooser SD,
  start wizard KW ("Help me choose", on main 8d2f5dc), tech menu TM (steps 1-5), tech gear TG (3D gear, movable, real heater and filter
  catalogue, bundle gear), deal match DM, gear deal sources GD (32 rows), compat gates CG, anoles AN, gecko support GS, CI fixes (CI, CS: live
  site deploys again), our own stocking engine SE (mass from FishBase length-weight, 3D volume as a cross-check; space follows AqAdvisor's
  mass^0.45 curve; filtration mass^0.75 x metabolism) and SE2 (per-species space factors).
- RUNNING / OPEN at handoff: lane SE (worktree ../Glass-Box-stocking, branch stocking, port 5843; step 5 pictures verdict from Nathan was
  outstanding) and SE2 (same worktree; chat "Stocking per-species calibration (SE2)", id local_e8574805-583f-4f60-8b1e-549b81216716): it
  owns src/scene/stocking.ts, src/data/spacefactor.ts. OPEN QUESTION FOR NATHAN (asked 2026-10-20): the starters' Full stop now reads 75-196 %
  of the tank's space (iwagumi 196, swamp 134, forest 124): make the starters land at or under 100 % at Full (recommended, SE2 then edits
  starter.ts), or leave them? Close SE and SE2 together once answered.
- NEW, being started: path 1 "An animal I want" (design chat local_eda2d645, plan research/plan-path1-animal-first.md, HANDOFF section "User
  flow: paths, budget, deals"). Lanes P1 group data (port 5863), P2 tank fit (5873), P3 fullness tile (5883), P4 artificial plants (5893) have
  prompts in prompts/, worktrees ../Glass-Box-p1groups / p2tankfit / p3fullness / p4artplants, launch entries and HANDOFF rows. P5 stocking screen
  (starts after P2's API is on main) and P6 builds / scape / plan (after P5; may split into P6a / P6b) need prompts written by you from the plan
  file when their inputs land. P1 will quote a research cost to Nathan first. The plan file calls lane KW's wizard "unshipped": it IS on main
  (the `wizard` branch held only merge commits and is deleted); the five-card New menu (P5) replaces its stage question, and P6a reuses its tank / kit
  picking (tankChoices, kit filtering). The design chat was told.
- Nathan's decisions on file: expected cost = ONE number, no percentiles / ranges (plan file dated 2026-10-19); starter bundle tanks hold only the
  gear the bundle ships (0fc281e); the leftover shared-folder edits are NOT decided (see below).
- Leftover uncommitted edits in the shared folder (other chats' old work; I saved them as a patch and applied it on branch `wip-leftovers`,
  worktree ../Glass-Box-leftovers, tsc clean): src/render/plant3d.ts (moss ball as a whole ball: FAILS test/growth.test.ts "a plant with no growth
  of its own draws exactly as before growth existed", needs a visual look and a baseline re-record), src/scene/items.ts (betta added to the nature
  and planted starters) and src/scene/starter.ts (habitat 'both' allowed in water-only tanks): these two pass the suite. Asked Nathan: ship the two
  passing edits and hold the moss ball (send him a before / after picture first)? Unanswered. Everything else in the shared folder is clean.
- Other open items: enclosure branch (../Glass-Box-enclosure, 2 local commits, equipment models Nathan found not good enough: HELD, do not push);
  AqAdvisor comparison harness exists (research/aq-compare.md); leftover folders from finished lanes can be deleted by Nathan (Glass-Box-anoles,
  kitlight, capfix, aqids, wizard, techmenu, expectedcost, cisplit, dealmatch, techgear); old worktrees python / spider / tarantula / content
  hold scratch files (check the two regaljumper JPGs in content first), then delete those branches; the autostash stash@{0} is verified restored
  and can be dropped by Nathan. The "Next batch" note in HANDOFF (wizard follow-ups, beginner setups, style tiles, stockingOf into the demand
  panel and wizard, plant propagation step 2, cling / perch leftovers, re-record ~70 models, snake tongue, PNG import, saved groups; LAST:
  build.ts / panels.ts splits) is partly superseded by the path-1 plan: re-evaluate it with Nathan once P1-P4 are running.
- Side chats that are NOT lanes (his own; don't direct them): bundle availability / replacement cost / suggestions, tank sort "Best", heat menu,
  vivarium planner user flow (the design chat), modeling assumptions, reptile stocking guidance, menu focus, and others; they ship via scripts/ship.sh.
- W Android app is PAUSED (session local_0827844e): do not message. iPhone AR stays hidden behind ?ar=ios.

Hand yourself off to a fresh coordinator once this chat gets long (about a third of the context): rewrite this file as prompts/coordinator-6.md
with the current state first.
