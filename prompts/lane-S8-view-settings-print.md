# Lane S8: View, Settings, Print in the new shell (Coordinator 24, 2026-11-13; UI2 §7 step 8; request R27)

Rules: `prompts/ui-build-common.md` (shell lane). Follow S1 / S3's template: pure view-models in `src/shell/logic/*.ts` with node tests; components only draw them (HANDOFF "S1", "S3").

## Job (behind ?ui=2 only)
- **View** (UI2 §2a row "Viewer cluster"):
  - camera presets, the Show toggles and the viewpoint map;
  - the map is a switch, off by default (decision 9);
  - export PNG and "Another moment".
  - Compare is step 9: leave its button out.
- **Settings** (rail, bottom; grep §2a / §3 for "Settings"):
  - units (US / metric), rules, and graphics;
  - for graphics, reuse the existing settings logic (HANDOFF "GS1: Graphics settings menu", 2026-11-12) through its module, not the old DOM.
- **Print** (§2a row "Section Print", shot `08-print-shopping-list.png`, approved):
  - three presets: Shopping list, Setup sheet, Full report (there is no Build plan);
  - part ticks; Print / .txt / .csv;
  - a live paper preview.
  - Reuse the existing sheet and report text builders. If they live inside old UI files, move only the text builders into a plain module (P-lane rules: the old UI calls the module, no visible change) and name it in your report.
- **Your files:** new `src/shell/view.tsx`, `settings.tsx`, `print.tsx`, `src/shell/logic/{view,settings,print}.ts` and new tests.
  - In `src/shell/App.tsx` / `sections.ts` / `shell.css`, touch only the lines that register your sections. Lane S2 is editing the header at the same time.
  - Do not edit `panels.ts` except to replace a moved builder with a call.
- **Proof:**
  - 1600x900 shots of View, Settings and Print (all three presets) next to shot 08;
  - one phone shot of Print at 390x844;
  - the printed Shopping list matches the old site's numbers for one example tank.
  - The old site (no ?ui=2) is unchanged.
