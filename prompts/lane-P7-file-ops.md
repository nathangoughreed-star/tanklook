# Lane P7: file operations out of panels.ts (Coordinator 24, 2026-11-13; UI2 §7 P7)

Rules: `prompts/ui-build-common.md` (P lane: no visible change).

## Job
Move the file operations from `src/ui/panels.ts` (about lines 168-494 at build 1973; re-find them, P1 has shifted lines): the scene library, open example / shared link, save / save as / download, resume, project naming and the "replace your project?" logic, into `src/ui/logic/files.ts` (no DOM; dialogs stay in the old UI and call the module). The old shell behaves exactly as before. Node tests for each operation (library add / rename / delete, save as copies, open shared link round-trip, autosave resume, the replace guard).
- Your files: `src/ui/logic/files.ts` (new), `src/ui/panels.ts` (only the moved block and its call sites), new tests `test/p7-files.test.ts`. Lane S3 works in `src/shell/` at the same time; do not touch it.
- Proof: existing file-related tests pass; before / after shots of Open, Save as and Share look identical.
