# Guided Visual Discovery spec (Nathan, Revision 02, 2026-10-30)

Plain-text copy of `TankLook_Guided_Visual_Discovery_Spec_Updated.docx` (Nathan's plan to implement). Plan and lanes: `visual-discovery-plan.md`.

```

PRODUCT EXPERIENCE / PROPOSED SPECIFICATION / REVISION 02
Guided Visual Discovery
An image-led path from “What kind of world?” to a defined visual archetype and density setting.
Decision summary
Use a short, visual classification flow. Stop aesthetic branching once the user selects a recognizable archetype; finish with one archetype-specific visual-density choice. Then hand off to Make It Your Own, where the design becomes editable and feasibility is checked.

Recommended user journey
1
Environment
Aquarium  /  Terrarium  /  Paludarium

2
Water type — aquarium only
Freshwater  /  Saltwater  /  Brackish

3
Visual family
Choose the broad look: e.g., Wild Habitats, Sculpted Nature, Bright & Playful.

4
Archetype
Choose a recognizable endpoint: e.g., Blackwater Creek, Iwagumi, Dutch Garden.

5
Visual density
Open & Airy  /  A Bit of Both  /  Wild & Full (within that archetype).

→
Make It Your Own
Generate a starting concept, then edit layout, ingredients, livestock, and practical constraints.

Interaction principle
The experience should feel like browsing attractive miniature worlds—not completing a technical questionnaire. Every stage makes a meaningful visual decision. Details that do not alter the archetype belong in the editor.

01 / ENTRY DECISIONS
Establish the world before the style
Environment — initial three cards
Choice
Suggested card copy
What it determines
Aquarium
“Dive into an underwater world. The fish are beautiful; the water needs looking after, too.”
Primarily submerged environment.
Terrarium
“A little piece of land behind glass. From tiny jungles to sun-baked deserts.”
Terrestrial or arboreal environment.
Paludarium
“Can’t decide between land and water? Have both! Twice the scenery, a little more engineering.”
Substantial land–water interface.

Aquarium — three equal water-type options
Water type
Playful supporting line
Implication
Freshwater
“Underwater forests, bright communities, and glowing playgrounds. More ways to get creative without making a splash in your wallet.”
Broadest set of accessible planted and community looks.
Saltwater
“Own a slice of the ocean. Incredible fish and living coral—your wallet might notice.”
Marine livestock; coral systems may need higher cost and care.
Brackish
“Where rivers meet the sea. Mangrove roots, unusual creatures, and just a pinch of salt.”
Specialized salinity, livestock, and often shoreline scenes.

All three are first-class choices in the aquarium branch; brackish is not hidden as an obscure advanced option.
Handling cross-category habitats
These labels guide discovery, not biological classification. An animal or archetype can reveal that a different enclosure format is necessary. For example, a mudskipper mudflat may be discovered through Brackish Aquarium but should resolve into a brackish paludarium-style build with meaningful land access.
Guided discovery should not conceal constraints
Use a brief, inviting hint on each card. Reserve exact cost, operating burden, compatibility, and welfare diagnostics for setup generation and evaluation. Do not imply all choices have equivalent demands.

02 / AESTHETIC TAXONOMY
Visual families → archetypes
After environment (and water type, if applicable), the user chooses a broad visual family, then a concrete archetype. The following families are the working taxonomy; individual endpoint images remain a curated content library.
Branch
Visual families presented
Freshwater
Underwater Gardens  ·  Sculpted Nature  ·  Wild Habitats  ·  Clean & Minimal  ·  Bright & Playful  ·  Fish Showcases
Saltwater
Living Coral Gardens  ·  Fish-First Oceans  ·  Natural Ocean Habitats  ·  Sculpted Reef Landscapes  ·  Glowing & Otherworldly
Brackish
Mangrove & Estuary  ·  Mudflat & Shoreline  ·  Rocky Coast & Tidepool  ·  Fish-First Brackish Habitats  ·  Brackish Planting
Terrarium
Tropical Rainforest  ·  Desert & Drylands  ·  Enchanted Woodland  ·  Rocks, Cliffs & Canopies  ·  Botanical Worlds  ·  Creature Showcases
Paludarium
Rainforest Waterfalls  ·  Overgrown Riverbanks  ·  Swamps & Mangroves  ·  Rocky Streams & Cliffs  ·  Fantasy Water Gardens  ·  Waterside Creature Habitats

Definition of a valid ending archetype
Has a distinct, recognizable visual identity and enough structure to generate an attractive initial scene.
Does not require the user to choose a particular palette, specimen count, or layout detail before proceeding.
Is meaningfully different from neighboring archetypes; if two endpoints look the same in representative images, consolidate them.
Does not encode an unsafe or anatomically implausible default. Animal-specific constraints are applied independently.
Examples of endpoints
Good stopping points
Blackwater Creek; Dutch Garden; Underwater Forest; Fluorescent Glow; Iwagumi Stone Garden; Mangrove Estuary; Rocky Desert Canyon; Rainforest Waterfall.
Still too broad
“Cichlid Showcase” (Malawi mbuna versus planted discus); “Natural Aquarium” (Iwagumi versus blackwater); “Reef Aquarium” (LPS garden versus fish-only marine display).

03 / FINAL GUIDED DECISION
Density: the last aesthetic choice
Once an archetype is selected, show the same core scene in three levels of visual density. This is the last guided comparison before the editor. The change concerns the visual amount and arrangement of plants, roots, rocks, coral, or ornaments—not the number of animals.
OPEN & AIRY
“A little breathing room goes a long way.”
Low coverage; more exposed substrate and negative space.
A BIT OF BOTH
“Plenty to explore, without getting too crowded.”
Balanced structure, greenery, and open viewing/swimming areas.
WILD & FULL
“More places to explore, more of what you love.”
Higher visual coverage and richer structural complexity.

Example: Blackwater Creek
Open & Airy
A Bit of Both
Wild & Full
One main branch; scattered leaves; visible sandy bottom.
Several interlocking roots; botanical clusters; clear openings.
A tangle of roots, branches, and abundant leaf litter.

Density controls a relative visual impression
In Iwagumi, dense means richer stone composition—not a jungle that breaks the archetype.
In a formal Dutch Garden, dense means fuller groups and coverage—not uncontrolled, messy growth.
In a coral garden, dense means more apparent coral coverage—not unsafe proximity or unrealistic growth.
In a terrarium, open does not remove essential hides, climbing surfaces, cover, or thermal structure.
Art-direction requirement
Density images must hold camera angle, tank footprint, lighting, background, focal species, and basic composition as constant as practical. Otherwise the user may be choosing lighting or livestock instead of density.

04 / DENSITY RECIPE REFERENCE
How the three levels translate
These examples guide the visual-asset library and scene-generation recipes. Exact amounts are validated against animals, structure, and available dimensions.
Archetype
Open & Airy
A Bit of Both
Wild & Full
Blackwater Creek
Single branch + leaves
Several roots and botanicals
Tangled root canopy + leaf litter
Dutch Garden
Airy plant groupings
Defined terraces and gaps
Full, tightly grouped planting
Underwater Forest
Few isolated trees
Woodland + clearings
Interconnected forest structure
Iwagumi Stone Garden
Few prominent stones
Supporting stones + carpet
Complex but restrained stone layout
Fluorescent Glow
Limited neon accents
Coordinated plants/decor
Vibrant decor across the scene
African Cichlid Rockscape
Simple stable rockwork
Several cave formations
Layered stone structures
LPS Coral Garden
Separate coral focal points
Multiple spaced colonies
Rich coral coverage; safe spacing
Mangrove Estuary
Few exposed roots
Interlocking root groups
Dense root network
Mossy Woodland
Open soil + moss patches
Logs, ferns, moss and rocks
Continuous forest-floor coverage
Rocky Desert Canyon
Open terrain + feature rocks
Cliffs + open ground
Complex ledges and rocky crevices
Rainforest Waterfall
Exposed falls + few plants
Moss and ferns surrounding falls
Waterfall enveloped by vegetation
Marine Fish & Rock
Open sand + few structures
Rock arches and caves
Rich rockscape with swimming lanes

Adjust wording by archetype if useful
Keep three comparable settings in the data model, but the visible names can be tuned. For Iwagumi, “Minimal / Classic / Layered” may read better than “Wild & Full.” For a rainforest, “Open / Balanced / Overgrown” is natural. The progression must still mean increasing visual density.

05 / PRODUCT BEHAVIOR
What happens after selection
Make It Your Own starts with a usable draft
Generate a recognizable scene in the chosen environment, water type, visual family, archetype, and density.
Carry the original preference settings forward as editable project data; no need to restart the quiz.
Let the user modify hardscape, planting, color palette, decorations, species, enclosure size, and equipment.
Apply feasibility checks for animal welfare, water chemistry, physical space, care time, experience, equipment, and budget.
Where constraints conflict with the aesthetic, propose a close viable interpretation rather than silently changing the selected style.
Technical meaning of density
Density affects
Plant/coral cover, hardscape visual coverage, ornament frequency, exposed substrate, negative space, and perceived complexity.
Density does not directly affect
Animal counts, filtration capacity, biological carrying capacity, aggression rules, space minima, or mandatory habitat elements.

Guardrails and edge cases
Situation
Expected behavior
Sparse design with cover-dependent animals
Preserve adequate hiding, shade, substrate, climbing, or retreat structure.
Dense rock or coral with territorial animals
Check available space, stable construction, water flow, and appropriate separation.
Brackish shoreline archetype
Allow the build to resolve into a land/water enclosure even if discovered via Aquarium.
User already selected an animal
Use animal requirements to constrain incompatible branches; do not force redundant answers.
User selects two aesthetic favorites
Keep both as soft preferences; generate a blend or alternatives when the combination is feasible.

06 / IMPLEMENTATION CONTRACT
Suggested data contract & acceptance tests
Persistent preference fields
vision.environment = aquarium | terrarium | paludarium
vision.waterType = freshwater | saltwater | brackish | null
vision.familyId = canonical visual family
vision.archetypeId = canonical ending archetype
vision.density = open | balanced | full
vision.secondaryLikes = optional alternative family/archetype IDs
vision.renderRecipe = editable starting scene parameters

Minimum acceptance criteria
Each eligible branch has a family → archetype → density path; no dead ends.
An aquarium user can reach Make It Your Own in five selections; terrarium and paludarium users typically need four.
Every archetype is recognizable from its representative visual, and each density trio changes primarily density.
Changing visual density never directly changes livestock quantity or bypasses welfare rules.
Users can go back, change an earlier selection, and retain compatible downstream preferences.
Chosen vision and density persist with the project rather than disappearing after a refresh.
Open content work
Next deliverable
Build a canonical archetype registry, verify each endpoint against the 24 existing TankLook looks, and record missing rendering features. Curate one representative reference image and three controlled density examples per archetype. See Sections 07–09 for the delivery contract.

Status: proposed product design. Rendering support classifications are not yet audited; examples and taxonomy names need validation.

07 / CANONICAL ARCHETYPE CONTRACT
Make each endpoint buildable
Each archetype needs a stable, developer-facing definition—not just a beautiful tile. This is the contract between taste discovery, the existing look library, the scene generator, and the validation engine.
Required registry fields
Field
What must be specified
ID and classification
Stable archetypeId; environment; water type if applicable; familyId; short public name and tagline.
Reference image
Strong, recognizable benchmark; source/license and indication that it is a reference, not necessarily a TankLook render.
Visual fingerprint
The few characteristics that make this endpoint recognizable; one explicit contrast with its closest sibling.
Baseline scene recipe
Generic example enclosure and relative layout: key hardscape, planting/coral/decor, substrate, water/light mood, open space.
Density trio
Open, balanced, full variations using archetype-specific parameters; hold camera, footprint, lighting, and focal subject constant.
Rendering dependencies
Geometry, materials, texture, effects, and placement logic needed to make the scene convincing.
Current look mapping
Link to one or more of TankLook’s existing 24 looks, with IDs and transformation notes; mark unknown rather than guessing.
Constraints and delivery
Animal/environment compatibility constraints, support status, known visual limitations, closest supported alternative.

Worked example — Blackwater Creek
Attribute
Proposed canonical definition
Path / identity
Freshwater  →  Wild Habitats  →  Blackwater Creek. Distinguishing cues: amber tint, leaf litter, roots, natural stream substrate.
Baseline scene
A modest rectangular aquarium with sandy areas, asymmetric submerged roots, scattered botanicals, low-key planting; livestock remains optional and species-validated.
Density mapping
Open: one focal branch + leaves. Balanced: interlocking roots + botanical groups. Full: layered root canopy + substantial leaf litter, retaining usable space.
Needed visual support
Tannin/water tint, varied driftwood and root shapes, leaf-litter textures/instances, natural sand, subdued shadows.
Existing-look mapping
TBD by code audit of the 24 current looks; no implied support status until visually tested.

08 / AVAILABILITY AND COMING SOON
Keep taste separate from renderer limits
Research defines which archetypes belong in the taxonomy. TankLook’s current drawing capabilities determine how each one can be offered today; they should not silently redefine user taste.
Support status for each archetype
State
Definition
Picker behavior
Supported
The generator can produce a recognizable representation with acceptable density variants.
Normal visual tile; proceed to generation and checks.
Partially supported
The key identity is achievable but important details cannot yet be drawn faithfully.
Normal reference tile with a concise limitation before generating; no false claims about missing features.
Coming Soon
A faithful scene cannot be produced with current assets/logic.
Show a labeled reference image and interest option; offer the closest genuinely buildable alternative.

Coming Soon should not become a dead end
Show the same high-quality visual-reference standard as supported styles, clearly marked “Reference / Coming Soon”; never imply the picture is a current in-app render.
Let the user save the desired archetype as an aspirational preference. Record a distinct interest event for product prioritization; do not treat it as a generated project.
Offer an explicitly labeled closest supported alternative, or let the user return to explore other styles. Never silently replace the preference or end the flow.
Do not attach a price to an ungenerated archetype. Price only a proposed, feasible configuration whose equipment, animals, and materials have been resolved.
Treat compatibility in context: keep known hard biological impossibilities out of build recommendations, but preserve the user’s expressed aesthetic interest for alternatives.
Example — fluorescent decor not yet available
A user chooses Fluorescent Glow from a labeled concept/reference image. TankLook saves the interest, explains that the required glowing decor/materials are unfinished, and offers a supported colorful community scene as an alternative—not as an equivalent product.

09 / DEVELOPMENT PRIORITIES AND VALIDATION
Audit, build, and learn
Capability audit across the 24 current looks
Map every archetype to existing look IDs and a representative render; compare the output against its visual fingerprint and sibling archetypes.
Record support as Supported / Partially supported / Coming Soon, plus required missing assets, materials, placement rules, or environmental logic.
Confirm that open, balanced, and full variants remain recognizably the same archetype and do not alter livestock counts.
Review availability at generation time when enclosure dimensions, animal constraints, or equipment make a nominally supported scene unsuitable.
Prioritize feature packs by coverage
Rank missing renderer capabilities by how many distinct archetypes they unlock, expressed user interest, visual fidelity gained, and implementation effort. Examples worth evaluating include artificial-decor packs (neon plants, ornaments, shipwrecks), natural wood and botanicals, water tint, coral geometry, and emergent-root/shoreline construction. “Decor first” is a hypothesis to test against the audit, not a guaranteed ranking.
Additional acceptance tests
Test
Pass condition
Archetype clarity
A reviewer can distinguish nearby siblings from comparable benchmark images without relying solely on their labels.
End-to-end traceability
Every selectable endpoint has a stable ID, recipe, reference, density variants, mapped looks, and explicit support state.
Honest coming-soon flow
Unsupported choice saves interest, discloses its limitation, and offers a viable alternative or return path without pretending to render it.
No invented prices
Only an actual generated, itemized setup receives price estimates; references and aspirational archetypes do not.
Feasibility integrity
Livestock welfare, tank geometry, salinity, stability, care, and budget checks remain independent of aesthetic preference.
Interest measurement
Track unsupported-style interest separately from completed builds; use results to inform later renderer investment.

Scope boundary
Ponds, patio tubs, and outdoor water gardens remain outside this initial indoor-enclosure discovery tree. They can become a separate environment branch later without changing existing archetype IDs.
```
