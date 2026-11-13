# Discovery v2 lanes AB0-AB4: common header (Coordinator 21, 2026-11-09)

- Follow `prompts/lane-common-c20.md`. Report ONCE to Coordinator 24 (`local_020eecae-8a33-45aa-9462-3e0faa222a5e`) and never push. Title your chat "ABn: Title", using the id and title from your lane file.
- Read first:
  - `research/design/discovery-v2-plan.md`: your row and the decisions.
  - `research/design/discovery-v2-handoff.md`: the spec. Read the sections your lane file names, plus section 12 (acceptance).
  - `src/scene/discoveryTypes.ts`: the shared contract (types only). Build against it. If it needs a change, put that in your report, and keep any local extension in your own file meanwhile.
- Lanes AB0-AB4 run in parallel on disjoint files.
- Before reporting:
  - Run `git fetch && git merge origin/main`, then `npm run build`, then your tests.
  - A UI lane also attaches screenshots at desktop and 375 px.
- Report: commit sha, test counts, screenshot paths (UI lanes), anything the coordinator or Nathan must decide, and contract changes you need.
