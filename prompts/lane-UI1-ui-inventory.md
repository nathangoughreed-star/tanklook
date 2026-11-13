# Lane UI1: inventory of today's UI, for a UI rebuild (Coordinator 24, 2026-11-13; request R27)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; push your branch after every commit). **Research only: no app code changes.** Deliverable is one doc plus a screenshot catalogue.

## Why (Nathan, 2026-11-13)
"the models look really good, I like the analysis and the features. But god the UI is terrible... its just been frankensteined for so long." Decision: keep the engine (`src/scene`, `src/demand`, `src/render`, `src/data`, `src/explore`), design a new UI on paper, build a new shell beside the old one behind a switch, move features over one at a time. A second chat (UI2, design) will propose the new screen map FROM YOUR DOC, so it must be complete and factual. You do not design anything.

## Deliverable: `research/design/ui1-inventory.md`
Plain words, tables, file:line references, no padding. Nathan reads the summary; UI2 reads all of it.
1. **Surface inventory (the main table).** Every user-visible surface: screens, left-menu sections and sub-sections, viewer overlays (tiles, pills, clusters, Map card), dialogs, popups, Guided setup steps, Discover screens, split view, report / shopping sheets, coach. For each: name as shown, where it lives (file:line, `index.html` id), what the user does there, which engine functions it calls, and where its state is kept (Store, scene JSON, localStorage key, URL param).
2. **Coupling.** For each `src/ui` file (group small ones): lines, and one of `layout only` / `thin wiring` / `logic tangled in`. For the tangled ones, name the calculations that live in UI code and would have to be pulled out before a new shell could reuse them. Note what is already split (`*Logic.ts` files). `panels.ts` and `index.html` get their own paragraph.
3. **How it is wired.** Start-up order (`main.ts`), how panels attach, how the viewer and the panels talk, split-view side copies (SV1), the scope switch (`src/scope.ts`), and `style.css` (size, how it is organised, how many distinct button / card / panel / pill styles exist: count them).
4. **Duplicates and inconsistencies (facts only).** The same setting or number shown or edited in more than one place; things with two names; several doors to one panel; controls that look different but do the same thing.
5. **User jobs.** From the flows that exist (start a tank, Guided setup, Discover, edit by hand, compare two tanks, check welfare / cost, shopping list / report, save / share), list which surfaces each job passes through, in order, with click counts where easy. List surfaces that belong to no job.
6. **Tests tied to the DOM.** Which test files depend on today's markup or `src/ui` modules (count, and name the biggest), so a new shell's test cost is known.
7. **Size of a rebuild.** A table of features to carry over, each S / M / L with one line of reasoning, and what blocks it. No calendar promises; say what you could not assess.

## Screenshot catalogue: `research/screens/UI1/`
Real-app shots (current origin/main, aquarium scope) of every distinct surface in section 1, about 20-30 files, named `NN-surface.png`, at 1600x900, plus one phone-width shot of the main screen. Reference each from the table. Use a realistic tank (planted 40 gal with fish and gear), not an empty one.

## Limits
- Read excerpts, grep and count; do not read `HANDOFF.md` whole. Subagents on Sonnet / Haiku only, at most 3.
- End with a 10-line summary for Nathan: the 5 biggest structural facts, in plain words.
