# TankLook Guided Setup, Revision 03: two starting paths (Nathan 2026-11-02)

Supersedes the entry structure of research/design/visual-discovery-spec.md Rev 02 and research/design/guided-flow-plan.md (four entry
points). The archetype taxonomy, rendering-support rules, curated-image-to-render cutoff and density rules of Rev 02 / VD1-VD6 STAY in effect.

## 1. Core decision
Guided Setup has two starting paths: **Animals First** and **Look First**. The old four entries were: Animals I Want, Appearance I Want,
Tank I Have in Mind, Help Me Explore.
- Tank I Have in Mind moves into the shared equipment step: a tank the user owns or plans to use is an input or constraint, not a workflow.
- Help Me Explore is covered by Look First: people discover preferences through visual examples.
The two paths differ only in which decision comes first (inhabitants or environment). They must NOT become separate project types or
modes: same project, compatibility engine, design generation, equipment accounting and customization tools.

## 2. Shared onboarding
**Step 1, World:** "What kind of world are we creating?" Aquarium, Terrarium, Paludarium, Open to anything / Not sure yet. For aquariums,
Freshwater / Saltwater / Brackish stay three equal options, but water type is not necessarily asked here; its position depends on the route.

**Step 2, Existing Equipment:** "Are you bringing anything with you?" Tanks / enclosures and dimensions; filters, heaters, lighting and
other hardware; relevant supplies and accessories. An obvious "Starting from scratch" option and a "Skip for now" action. Fast and
optional. Two states per item:
- Required / I want to use this: a fixed requirement when generating designs.
- Available / I'm flexible: counts toward cost savings, but alternatives may be recommended.
Ownership alone never locks equipment into the design.

**Step 3, Constraints:** "What should we work around?" Physical space, startup budget, ongoing budget, setup time, maintenance time /
care rhythm, experience level. Distinguish hard limits from flexible targets. Experience informs guidance, risk and complexity; it does not
prohibit choices. A prominent "Skip for now" / "I'll figure this out later". A skipped constraint is UNKNOWN, not zero or unlimited:
continue on reasonable provisional assumptions, name them when it matters, let the user add constraints later. No long intake form.

**Step 4, Choose your starting point:** "Where would you like to start?" Two equally prominent options; the only major branch.
- Animals First: "Choose the creatures you love, and we'll build a world around them."
- Look First: "Create a world you love, then discover who can live there."

## 3. Animals First
1. Choose animals (search / browse the catalogue, species and quantities).
2. Evaluate compatibility and feasibility (environment needs, minimum enclosure, compatibility, welfare).
3. Establish a suitable enclosure (existing equipment if appropriate, else recommend one that fits the animals and known constraints).
4. Explore compatible aesthetics (visual families and archetypes that suit the inhabitants and environment).
5. Choose archetype and density (personalized renders including the chosen animals).
6. Make It Your Own (shared editor).
If the animals fix the water type, don't ask it (clownfish = saltwater). Conflicts between animals or with hard constraints are explained
with viable adjustments; never silently remove animals or imply an incompatible combination is fine. The full visual discovery still runs
after the inhabitants are set.

## 4. Look First
1. Water type where applicable (Freshwater / Saltwater / Brackish).
2. Visual Family (curated inspiration images).
3. Archetype (actual TankLook renders of the user's enclosure, same geometry, camera and quality; Balanced density).
4. Density (Open & Airy / Balanced / Dense or Wild & Full of the chosen scene; archetype-specific: roots and botanicals for blackwater,
   coral cover for a coral garden, rock structure for a desert terrarium). Visual density never raises animal stocking.
5. Suitable Animals (compatible animals and stocking suggestions; final stocking not required before the editor).
6. Make It Your Own.
Terrariums / paludariums use their own aesthetic tree; no irrelevant aquarium questions. Cutoff: World, Water and Family use curated
images; from Archetype on, renders of the user's enclosure. The chosen archetype and density carry into the editor unchanged.
No tank selected: use known dimensions; else a clearly labelled provisional enclosure from known space / budget / constraints; else an
editable example enclosure. Never interrupt discovery with a mandatory questionnaire. The enclosure can be changed later.

## 5. Shared project state, not modes
Both routes update the same state: world / environment, water type, existing equipment + required flag, constraints + hard / flexible
(and unknown), selected animals, enclosure, family and archetype, visual density, generated scene configuration, remaining decisions and
unresolved feasibility issues. Every item can be revisited without restarting Guided Setup (Animals First user changes the look; Look First
user replaces suggested animals; a skipped budget is added later; an existing tank is unlocked to explore alternatives; changing tank
dimensions re-evaluates and adapts the scene). On upstream changes, preserve as much of the design as possible and name the conflicts.

## 6. Make It Your Own, the one destination
Entry condition: a coherent starting design, not a resolved purchasing plan (Animals First: animals + suitable enclosure + generated
habitat; Look First: a finished-looking environment + compatible stocking suggestions still open). The editor changes animals and
quantities, plants / hardscape / decor, density and appearance, equipment and enclosure; reviews compatibility, welfare, costs, upkeep and
constraints; compares alternatives; finalizes. Keep desired appearance and practical feasibility distinct.

## 7. Unchanged
Canonical archetype specs and visual features; archetype -> look mapping and render dependencies; support full / partial / unavailable;
Coming Soon with labelled reference imagery and interest tracking; renderer limits never shrink the taxonomy; ponds and patio tubs out of scope.

## 8. UX requirements
Minimize friction (equipment and constraints quickly skippable). Progressive disclosure. No redundant questions. Skipped info stays
editable and is never penalized. Unknowns are not requirements. Archetype / density previews lead to the same scene in the editor.
Compatibility and welfare are authoritative on every path. Contextual breadcrumbs: shared onboarding shows `World -> Equipment -> Limits ->
Starting Point`; after the branch, only the steps of that route; conditional steps (Water) hidden when irrelevant or resolved. Users can
switch which aspect they work on without switching projects or losing progress.

## 9. Example journeys
A. New fishkeeper: Aquarium; Starting from scratch; skips constraints; Look First; Freshwater; Wild Habitats; compares archetype renders in
a provisional tank; Blackwater Creek; Balanced; explores suitable fish; Make It Your Own. No inventory or budget form.
B. Experienced keeper: Aquarium; existing 40 gal breeder marked Required; budget and maintenance time; Animals First; builds a community;
compatibility for the 40 breeder; compatible families; archetype + density; editor with the fish in place.
C. Aesthetic goal, limited budget: Paludarium; skips equipment; startup budget and maximum dimensions; Look First; Rainforest Waterfalls;
waterfall archetypes in a provisional enclosure; moderate density; TankLook proposes practical gear and planting that keep the look; editor.

## 10. Follow-up asked for
Reconcile against the current Guided Setup code and prior specs. Goals: (1) two entry paths; (2) existing tank in shared equipment
onboarding; (3) equipment and constraints fast to complete or skip; (4) keep the discovery taxonomy; (5) personalized renders from
Archetype; (6) both routes on one project and editor; (7) keep information and re-evaluate feasibility when decisions change. Say what the
code supports, what can be reused, what needs restructuring, and conflicts with the current flow.
Guiding principle: users give vision, inhabitants, resources and constraints in whatever order feels natural; TankLook bridges them into an
attractive, feasible, healthy environment without forcing unnecessary decisions.
