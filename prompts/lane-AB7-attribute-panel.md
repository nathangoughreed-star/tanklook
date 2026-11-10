# AB7: Attribute panel in Discovery A/B (Coordinator 22)

Follow `prompts/lane-AB-common.md` (and `prompts/lane-common-c20.md`). First run `git fetch origin && git merge --ff-only origin/main`. Read HANDOFF.md section "AB5" and "AB6" only, plus `src/ui/ab/` and `src/ui/quickPrefs.ts`.

## Nathan's request (2026-11-10, dogfooding build 1730)
1. (Moved to lane AB8: pan / zoom / lock visibility. Do NOT touch the pan/zoom controls; just do not make them worse. AB8 runs in parallel on the camera/controls files.)
2. The bottom menu (decision dock) becomes EXPANDABLE. Expanded, it lists every attribute of the candidate tank: tank size, stocking, hardscape, background, substrate, plants, lighting, filtration, heating, and the rest the design has (use the existing attribute / lock model from DX and AB; do not invent a second one). Show A and B values side by side where they differ.
3. Next to each attribute: thumbs up, thumbs down, and a lock button.
   - Thumbs up / down are SOFT guidance only. They feed the preference learner (weights / confidence); they never hard-filter or hard-code anything. Toggle on/off, mutually exclusive per attribute value. "Told" still beats "learned" per the AB6 hard/prefer model, but a thumb is a soft signal, not a "told" hard rule.
   - Lock keeps that variable fixed for all remaining generations (same lock semantics as DX locks / `store.frozen` rules). Lock state is visible and consistent with the existing lock and unlock controls.
4. Collapsed state keeps today's compact dock. Expanded state must not make the A/B views unusably small; on 375 px use a scrollable sheet.

## Done when
- Unit tests for thumb-as-soft-signal (never filters), lock persistence across generations, and history/immutability unaffected.
- `npm run build` clean, lane tests plus ab* files pass, `scripts/ab-journey.mjs` passes at desktop and 375 px.
- Screenshots (desktop + 375 px, collapsed and expanded) in `research/screens/AB7/` at ~60 KB each; send key ones to Nathan with SendUserFile.
- HANDOFF.md AB7 section. Report once to the coordinator with branch + sha rebased on origin/main. Never push.
