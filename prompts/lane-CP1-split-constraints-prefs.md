# Lane CP1: split "Constraints and preferences" into two menu sections (Coordinator 24, 2026-11-13; request R26)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; build + ONLY your own tests; push your branch after every commit; real-app shots under `research/screens/CP1/`).

## Nathan's ask (2026-11-13)
"lets also separate constraints and preferences into two tabs rather than a combined one"

## Today
`index.html:327`: ONE left-menu section `<details class="sec" data-sec="brief">` titled "Constraints and preferences", holding `#briefHost` (setup brief bar), "Your preferences" (`#prefsHost`, `quickPrefs.ts attachPrefsBlock`), "Your limits" (`#limitsHost`, `limitsPanel.ts`) and the `#cnNoNew` "No new equipment" checkbox.

## Job
- Two sibling menu sections, same style as the others:
  - **Preferences**: `#prefsHost` (look, likes, Don't want, etc.).
  - **Constraints**: `#limitsHost` (money, time, space, experience) and `#cnNoNew`.
  - Put `#briefHost` where it reads best (likely on top of Preferences, or above both if it summarizes both); say which in your report.
- Every door keeps working and opens the RIGHT section: "Edit in Your limits", the brief bar's "Your limits" chip, the coach steps (`coach/steps.ts` `#limitsHost`), `openLimits` / `openSec('brief')` in `panels.ts`, the experience link, the checks strip. Anything that opened the old section for preferences opens Preferences.
- Saved open / closed state of the old section must not break anything (an old saved key is fine to ignore).
- Respect the aquarium-only scope (`src/scope.ts`) and the split view (SV1 side copies, if any reuse these hosts).
- No behaviour change beyond the move.

## Tests / proof
- Update or add a test that both sections exist and each door opens the right one.
- Real-app shots: the left menu with both sections closed, each one open, and one "Edit in Your limits" click landing on Constraints. Add a dated HANDOFF.md section "CP1".
