# Lane DS1: visual styles audit and first-slice proposal (Coordinator 24, 2026-11-13; request R20)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; push your branch after every commit). **Research only: no app code changes.** Deliverable is a design doc.

## Input
- Nathan's write-up: `research/design/styles-direction-2026-11-13.md` (in this coordinator folder: `C:/Users/nreed/Glass-Box-coord/research/design/styles-direction-2026-11-13.md`). Its §20 is your task list (items 1-7).
- Coordinator 24's review, which Nathan has seen. Treat these as strong suggestions to test against the code, not decisions:
  - **Families as internal presets**, not a new required Guided step. The style screen gains 3-4 cards (e.g. Colorful decorative, Themed centrepiece, Glo, Natural with an accent) plus "Surprise me" → Discover. Drop "Hybrid" as a user-facing family.
  - **One vertical slice first:** the pirate tank (Test B: ship + natural gravel + live plants), plus colored gravel and two artificial plants, end to end: card → generator recipe → Discover attributes → welfare → price. Add only the attributes this slice needs; no abstract attribute system first.
  - **Start with 5 preference dimensions:** natural↔decorative, colour intensity, density, theme on/off, live↔artificial plants.
  - **Additions:**
    - art direction: whimsical subject, same crisp realism, never cartoony (Nathan's standing rule);
    - ornaments linked to real products with prices (Nathan's "real gear in true colours" rule);
    - artificial plants get no nitrate / oxygen credit, never grow, but do collect algae;
    - silk vs hard plastic plants for long-finned fish;
    - swim-through openings vs fish size (entrapment);
    - colored gravel must trigger the existing bottom-dweller substrate warnings (SD1);
    - bubble ornaments add an air pump;
    - GloFish need blue / actinic light and are banned in Canada and the EU;
    - a download-size budget per asset (EF3);
    - acceptance tests automated where the generator's scene data allows.
  - **Aquarium-only scope (AQ1, `src/scope.ts`) is on:** keep the format habitat-general, plan no terrarium work.
- **Existing code to start from:**
  - DQ8 feedback model (`scene/attrs.ts`: item vs design level Like / Dislike, `feedbackScore`);
  - Discover candidate pool (`src/explore/pool.ts`), archetypes, layout presets (`layout.id`);
  - the item catalogue / variants (`src/render/items.ts`, `itemsInScope`);
  - the DQ6 evaluation `research/design/discover-redesign-evaluation-2026-11-12.md`;
  - the old brief `prompts/lane-SS-scape-styles.md` (in the coordinator folder).

## Deliverable
`research/design/ds1-styles-audit.md` on your branch, answering §20 items 1-7 with file:line references:
1. **Where the six styles live, and every hardcoded naturalistic assumption** (generator, item placement, Discover scoring, welfare / stocking credit for plants).
2. **The taxonomy verdict**, with reasons.
3. **The proposed internal representation:** attributes, themes, materials, asset metadata fields (unknown stays unknown) and presets, as TypeScript types in the doc only.
4. **The smallest change set** that makes the pirate slice possible without changing any naturalistic scene. Name the files.
5. **A phased plan:** slice → second recipe → Guided / Discover exposure → library growth, each phase with acceptance tests (§18 A-G plus H "artificial plants give no nitrate credit" and I "ornaments are priced").
6. **How Keep / Like / Dislike map onto the new attributes.**
7. **Welfare separation and unknown-safety handling.**

End with a short **"Decisions for Nathan"** list: each a yes / no or a pick, with a one-line recommendation.

Keep it readable: Nathan reads it. Plain words, tables where useful, no padding. Push the branch, report once with the sha and the doc path.
