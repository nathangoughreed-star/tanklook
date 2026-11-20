# Fish sheet log (E0 baseline, 2026-11-20)

- `log.csv`: one row per generated 3-view sheet. Sheets stay out of the repo (`C:\Users\nreed\fish-sheets\`). Add a row with
  `python -I scripts/fish-sheet-log.py SHEET --species X --date D --generator G --prompt V --photos "..." --verdict ... --calls N --rounds N --notes "..."`.
  Audit columns come only from `scripts/fish-sheet-audit.py` (parsed from its output); anything you do not pass is written as `unknown`.
- `prompts/<version>.md`: the exact prompt text per version (`lost.md` lists the ones never recorded; do not guess them).
- `pass` is the audit script's own PASS/FAIL (length 1%, panels, size >= 900 px, front vs top/side thickness within 5%, tail edge-on < 0.25).
  It is stricter than the experiment scoring in `research/fish-sheet-methodology-audit.md` section 4 (e.g. tail <= 0.15); re-score from the columns if needed.
  `front_top_width_pct` is information only (scale registration). `eye_mouth_delta` is not measured by any script yet: `not measured`.
- Back-fill rows were audited with the default stations (0.15, 0.20). Duplicates in Downloads are named in `notes`.
- `model_verdict`: Nathan's verdict only where it is recorded (good / fixable / bad); otherwise `unknown` or `not built`.
