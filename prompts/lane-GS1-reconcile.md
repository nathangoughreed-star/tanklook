# Lane GS1: reconcile Guided Setup Rev 03 against the code (docs only)

Coordinator: Coordinator 18, local_a9a242cb-2560-4fe6-8c3a-0e51e36644b4. Report ONCE with send_message when ready to merge, done, or blocked.
Own worktree, never the shared folder: `git fetch`, `git checkout -b gs1-reconcile origin/main`. Read HANDOFF.md "Start here" (incl. "GUIDED SETUP REV 03" and "Machine load"), research/design/guided-setup-rev03.md (the spec), research/design/visual-discovery-spec.md, research/design/unified-setup-plan.md.
You write ONE file: research/design/guided-setup-rev03-reconcile.md. Do not edit src/ or tests (GS2 owns src/scene/brief.ts + a new src/scene/project.ts; GS3 owns src/ui/discovery/*).
Answer the spec's section 10 concretely, by file and function. For each of its 7 goals and each step of sections 2-6:
(a) what the code already does (cite file:line);
(b) what is reusable as-is (ownedGear.ts sheet, limitsPanel.ts, setupBrief.ts / welcomeGuard.ts, knownOf in discovery/logic.ts, tiles.ts previews, recipes.ts, newTank.ts, startMode.ts, welcome.ts, the animal roster / stockGallery / suggest);
(c) what must be restructured;
(d) conflicts with the current flow (e.g. VD5 moved owned gear + limits into Make It Your Own panels; the "I already know my animals" link; World today has no "Open to anything"; owned gear has no Required vs Available flag; limits have no unknown vs hard vs flexible; Animals First today vs the spec).
Then a file-ownership plan for the queued UI lanes GS4 (shared onboarding World -> Equipment -> Limits -> Starting Point, skip, breadcrumbs), GS5 (Animals First route) and GS6 (revisit + re-evaluation in the editor): which files each owns so they can run without touching each other's files, and anything GS2 / GS3 must expose for them.
Flag open questions for Nathan, each with a picture if it is about a screen (screenshot the current screen, save the file, SendUserFile it).
No renders beyond a few screenshots. Don't push: send branch, sha, the reconcile file path and the open questions.
