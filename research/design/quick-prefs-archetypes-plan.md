# Plan: image archetype cards + No live plants (Coordinator 22, 2026-11-10)
Spec: `quick-prefs-archetypes-handoff-2026-11-10.md` (the contract; 12 acceptance scenarios in its section 6).

## What exists (build 1756)
- `src/ui/quickPrefs.ts` draws the AB6 form twice from one function (`prefsHtml`): the optional screen after the habitat question and the "Your preferences" block in Constraints. Rows: Size slider, Look chips (`LOOK_CHIPS`: natural/lush/colourful/minimal/stylized), Live plants (`PLANT_ANSWERS`), collapsed Practical limits, collapsed Don't want (`AVOIDS`).
- Model in `src/scene/quickPrefs.ts` (`QuickAnswers`, `applyQuickPrefs`, `readQuickPrefs`, `passesHard`) with the hard / prefer model; Explore families in `src/scene/archetypes.ts`, `src/explore/*`, `src/demand/taste.ts`.

## Staging (3 lanes: 1, then 2 and 3 in parallel)
1. **QP1 Model + catalogue + hard exclusion** (no UI, no images). Reconcile the spec's archetype list against the EXISTING visual families (`scene/archetypes.ts` / Explore) per habitat (freshwater, saltwater, terrarium, vivarium/paludarium, unsure); every shown archetype must have generatable candidates. Add the 3-state preference (interested / avoid / unset) to the single source of truth, mapped to family ids and aesthetic dimensions as RANKING signals (avoid = downrank, never a hard ban). Replace the live-plants answer with an explicit hard "No live plants" exclusion (AVOIDS), honored in candidate generation AND the final whole-candidate check; conflict handling (planted archetype interested + No live plants: exclusion wins, honest compromise text, never fake plants passed off as live). Migration of saved `look` / `plants` answers. Report the catalogue + types contract early so QP2/QP3 can start.
2. **QP2 UI** (after QP1 lands): image cards with Interested / Avoid / Unselected (not colour-only), 4-6 per habitat, "unsure" shows nothing or a tiny sample, 2 per row or a scroller on 375 px, Skip / Start building always visible, same fields in the left Preferences block, Live plants row removed, No live plants under Don't want.
3. **QP3 Archetype thumbnails** (after QP1 lands; parallel to QP2): render consistent-framing, thumbnail-distinct images from REAL generated examples per archetype and habitat, webp, size-budgeted, `public/art/quick/`; QP2 consumes the filenames from the QP1 catalogue.
4. Then one verification pass (like IV1): spec scenario 12 end to end in the real UI plus the onboarding / Discovery regressions.

## Non-goals (from the spec)
No new modes, no separate survey system, no automatic locks, no A/B voting redesign, no equipment inventory changes.
