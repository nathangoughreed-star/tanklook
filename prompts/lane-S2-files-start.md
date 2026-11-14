# Lane S2: start, open, save, share, resume in the new shell (Coordinator 24, 2026-11-13; UI2 §7 step 2; request R27)

Rules: `prompts/ui-build-common.md` (shell lane). Follow S1 / S3's template: pure view-models in `src/shell/logic/*.ts` with node tests; components only draw them (HANDOFF "S1", "S3").

## Job (behind ?ui=2 only)
- **Header file menu** (UI2 §2a row "Header", shot 01): project name (click to rename), saved dot, Save, and `...` = New / Open / Save as / Share link / Download.
- **Open**: the scene library (rename, delete), the examples, a shared link and an uploaded file. Use the "replace your project?" guard.
- **Start and resume**: a first visit opens a new tank; a return visit resumes the autosave, the same as the old site does today. Use the **Get started** 5-tick checklist only if §1a asks for it in this step; otherwise leave it for step 10.
- Every operation goes through P7 `src/ui/logic/files.ts` (HANDOFF "P7"). If something is missing, add it there with tests and tell Coordinator 24 which.
- **Your files:** new `src/shell/files.tsx`, `src/shell/logic/files.ts` and new tests. In `src/shell/App.tsx` and `src/shell/shell.css`, touch only the header block and the lines that mount your menu. Lane S8 is adding sections to App.tsx at the same time, so keep your App.tsx edits small and in one place. Do not edit `panels.ts`.
- **Proof:** 1600x900 shots of the header menu, Open (library + examples), Save as and Share link next to UI2 shot 01. Add a phone shot at 390x844. Show a round-trip: save in ?ui=2, reload, resume, then open the same scene in the old UI. The old site (no ?ui=2) stays unchanged.
