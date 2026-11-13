# YourArium: Expanding Visual Styles, Asset Diversity, and Discovery

Nathan's write-up, pasted to Coordinator 24 on 2026-11-13. It was written with another assistant and is stored here verbatim in content; only line breaks are compacted. Status: product direction established, implementation details open.

## 1. Executive Summary
We identified a major blind spot in YourArium's current tank design system: **the platform approaches aquarium aesthetics almost exclusively through the perspective of naturalistic aquascaping enthusiasts.**

The existing freshwater visual styles are:
1. Nature / River
2. Jungle / Lush planted
3. Iwagumi / Stone-focused
4. Dutch / Planted garden
5. Blackwater / Rooted
6. Clean & minimal

These are useful styles, but they do not represent the full range of aquariums that ordinary hobbyists want. Walk into a mainstream pet store and you'll find artificial plants, brightly colored gravel, resin ornaments, castles, shipwrecks, figurines, fluorescent decorations, bubbling structures, and themed aquarium accessories. These aesthetics have been almost entirely absent from our design language.

**The fundamental design principle emerging from this discussion is:**
> YourArium should not generate the most aesthetically sophisticated aquarium according to traditional aquascaping standards. It should help each user create the best possible version of the aquarium they actually want, subject to feasibility, animal welfare, and their individual constraints.

A naturally planted aquarium and a colorful pirate-themed aquarium are both legitimate design goals. The tool should approach both with comparable sophistication and equally rigorous husbandry standards. This requires more than adding decorations: it affects the visual taxonomy, asset library, generator, preference-learning system, discovery process, and how we evaluate scene quality.

## 2. Original Problem: The Existing Six Styles Are Too Narrow
The freshwater visual selection screen offers six cards:

| Existing style | Visual identity |
|---|---|
| Nature / River | Natural stones, wood, organic planting |
| Jungle / Lush planted | Dense vegetation and overgrowth |
| Iwagumi / Stone-focused | Stone composition, restrained planting, open space |
| Dutch / Planted garden | Deliberately arranged, colorful plant groups |
| Blackwater / Rooted | Roots, leaf litter, dark water, subdued atmosphere |
| Clean & minimal | Restrained materials and sparse composition |

These are not six equally representative freshwater design families. They are predominantly **naturalistic or planted-aquarium subtypes**. The system was effectively overlooking a substantial mainstream hobbyist audience.

Many aquarium owners are not primarily interested in recreating a natural ecosystem or following established aquascaping conventions. They may want:
- a colorful aquarium with artificial plants;
- bright blue or rainbow gravel;
- a pirate ship and a bubbling treasure chest;
- a castle or miniature underwater city;
- a fluorescent GloFish-style display;
- a decorative centerpiece surrounded by living plants;
- something visually fun, personalized, nostalgic, or imaginative.

These preferences should not be treated as inferior versions of naturalistic aquascaping.

**Agreed direction:** the current six styles should remain available, but they should no longer define the entire freshwater aesthetic universe. They belong primarily within a broader naturalistic design family; some styles, particularly minimalism, can apply across other families too.

## 3. The Decorative Planter Example: Why a Simple Natural/Artificial Split Is Insufficient
Nathan provided a photograph of an aquarium with live plants growing among decorative sculptural face-shaped planters. It combines:
- live aquatic plants;
- manufactured decorative planters;
- naturalistic greenery;
- a sculptural or spiritual aesthetic;
- an ornamental composition that is not purely naturalistic.

So aesthetics are not a binary choice. Other combinations:
- live plants around an ancient temple;
- a shipwreck among natural driftwood;
- artificial plants among realistic stones;
- colored gravel under a restrained decorative arrangement;
- ceramic planters integrated into a jungle aquascape;
- a naturalistic substrate with an intentionally playful focal ornament.

**Conclusion: aesthetic style, material selection, and theme need to be represented separately.**

| Dimension | Possible values |
|---|---|
| Visual style | Naturalistic, colorful, minimalist, dramatic, whimsical |
| Materials | Live plants, artificial plants, natural stone, wood, resin, ceramic |
| Theme | None, pirate, ruins, fantasy, zen, sci-fi, spooky |
| Composition | Dense, open, symmetrical, asymmetrical, structured, wild |

These can overlap and be combined. The generator should not assume that choosing one determines the others.

## 4. Proposed High-Level Visual Families
Nathan's proposal: artificial / decorative styles as a parallel branch alongside the naturalistic ones. The other assistant's recommendation: four user-facing families plus an open option. This is **not a finalized requirement for exactly four**.

- **A. Naturalistic:** the existing six (Nature / River, Jungle, Iwagumi, Dutch, Blackwater, Clean & minimal).
- **B. Decorative / Artificial:** Bright & cheerful, Artificial planted, Ornament-centered, Fluorescent / Glo-style, Clean decorative, Colorful community. These are not to be treated as children's or low-quality designs.
- **C. Themed / Storytelling:** Pirate / Shipwreck, Ancient ruins / Temple, Castle / Fantasy, Zen / Spiritual, Sci-fi / Futuristic, Spooky / Sunken relics. These may use natural or manufactured materials, and live or artificial plants.
- **D. Hybrid:** Natural + decorative accent, Live-planted ruins, Sculptural planter garden, Natural substrate + colorful accessories, Ornamental centerpiece + organic surroundings, Calm decorative / planted composition. The face-planter tank belongs here.
- **Open / Surprise Me:** for users who don't know; especially important in Discover.

**Caveat:** the families overlap. Hybrid is a combination of independent properties, and a themed tank can be fully natural or fully artificial. **Recommendation: families are user-facing entry points and generator presets, not rigid classifications in the data model.**

## 5. Changes to the Guided Decision Tree
Today: Freshwater leads to the six naturalistic styles, forcing specific aquascaping decisions before broad preferences are known.

Proposed: Freshwater Aquarium → Broad Visual Direction → Subtype → Individual Refinement.
1. Broad direction: Naturalistic, Decorative / Artificial, Themed / Storytelling, Hybrid, or Open to anything.
2. Subtypes of the chosen family.
3. Refine through scene reactions, conversational adjustments, or optional controls.

UX rules:
- choices are not irrevocable; the aim is to find a direction, not lock into a taxonomy, and users can change their minds;
- do not add several mandatory questions just because more categories exist; Guided must not become cumbersome.

## 6. Changes to Discover
Discover is not a strict decision tree. It has moved from rigid A/B pairs toward iterative whole-scene generation, keeping preferred elements and requesting variations.

**Initial behaviour:** with no visual preferences given, generate genuinely diverse designs, e.g.:
- natural river;
- dense jungle;
- decorative artificial-planted;
- pirate;
- fluorescent / colorful;
- naturalistic with ornamental accents;
- sculptural planted hybrid;
- minimalist.

**Preference narrowing** uses Keep This (preserve a component), Like and Dislike, and concentrates on demonstrated interests:
- likes a shipwreck but dislikes bright gravel → keep the shipwreck theme, move toward natural substrates;
- likes artificial planting but dislikes a castle → explore artificial greenery without fantasy structures.

**Critical: Likes and Dislikes teach individual visual properties, not whole-style labels.** Liking a lush jungle tank may mean "likes high vegetation density", not "likes naturalism". Liking a pirate tank does not imply liking plastic plants or neon gravel.

**Diversity vs convergence:** explore broadly at first, then favour preferred regions as reliable signals accumulate. Keep some exploration while preferences are uncertain, and let the user deliberately widen the search again.

## 7. Preference Learning: Independent Aesthetic Attributes
Categorical style choice alone is insufficient. Candidate dimensions:

| Dimension | Example contrast |
|---|---|
| Natural vs manufactured appearance | driftwood and rock vs visibly artificial decor |
| Theme strength | unthemed vs strongly narrative |
| Color intensity | muted vs vibrant |
| Visual density | sparse vs richly populated |
| Whimsy | realistic vs fanciful |
| Focal emphasis | plants vs ornaments |
| Compositional order | structured vs organic / wild |
| Symmetry | symmetrical vs asymmetrical |
| Vegetation density | sparse vs lush |
| Material selection | natural, artificial or mixed |

These need not all be mandatory sliders or binaries: some are categorical, some continuous, some multi-valued.

Example inferred profile: moderately naturalistic, strong live greenery, one prominent ornament, subdued colors, fairly dense vegetation, low whimsy, a serene / spiritual theme. That profile could produce the face-planter tank without a dedicated "Buddha Planter Aquarium" archetype.

**Keep separate, never one score:**
1. user preferences;
2. scene attributes;
3. hard constraints (tank size, equipment, budget, animal requirements);
4. welfare evaluations.

An unpopular design can be healthy; an appealing design can be wrong for its livestock.

## 8. The Generator Needs Multiple Design Grammars
The generator appears oriented to naturalistic aquascaping: natural substrates, live plants, rock and wood, organic asymmetric composition, restrained palettes, natural focal points. These should no longer be global defaults.

| Direction | Composition logic |
|---|---|
| Iwagumi | restrained stone grouping, open areas |
| Jungle | dense layered planting |
| Dutch | deliberate plant groups, contrasting shapes / colors |
| Pirate | recognizable centerpiece plus supporting decorations |
| Fluorescent | high-contrast palette, coordinated lighting and ornaments |
| Zen hybrid | sculptural centerpiece integrated with greenery |
| Minimal decorative | limited ornament count, restrained clutter |

Generation = feasibility and welfare constraints + aesthetic preferences + composition rules + compatible asset selection + controlled variation.
- Families give initial presets and asset weightings.
- Subtypes give composition recipes.
- Individual preferences modify those recipes.
- Equipment, livestock, dimensions, budget and maintenance still govern feasibility.

Do not encode decorative or artificial tanks as inferior. Do not force decorations into naturalism, or "improve" an artificial tank by replacing its decor with plants and driftwood.

## 9. Large 3D Asset Library: Recommended Architecture
A diverse library is desirable, but not as a giant pile of unrelated meshes: a **structured, extensible library with metadata and procedural variation**. Families:
- **Natural:** rocks, driftwood, roots, leaf litter, caves, botanicals.
- **Living vegetation:** species, clusters, groundcover, epiphytes, floaters.
- **Artificial vegetation:** plastic, silk, artificial grasses / moss, colored arrangements.
- **Decorative / themed:** shipwrecks, castles, ruins, bridges, statues, faces and sculptural planters, skulls, fantasy, sci-fi, decorative caves.
- **Substrate / backgrounds:** natural sand and gravel, colored and mixed-color gravel, decorative substrates, themed and artificial backgrounds.
- **Functional / animated:** bubble ornaments, bubble walls, artificial hides, equipment disguises, other habitat structures.

Freshwater first, extending to saltwater, terrariums and paludariums.

## 10. Every Asset Needs Meaningful Metadata
A shipwreck is not just a GLB: it may be a focal decoration, a swim-through, or a shelter, depending on geometry and animal size.
- **Identification:** id, family, source / provenance, version, variants.
- **Visual:** style affinities, theme tags, materials and appearance, palette, visual prominence, composition role.
- **Geometry:** real dimensions, bounding box, collision, orientation, placement anchor, allowed scaling, substrate intersection rules.
- **Placement:** foreground / midground / background, burying or attachment, preferred neighbours, clearance, supported habitats.
- **Function:** hide / shelter, perching, swim-through, planting pockets, flow obstruction, visual barriers, interaction with equipment.
- **Husbandry:** material suitability, known hazards, entrapment, sharp edges, maintenance access, livestock-specific limits.
- **Commercial / operational:** estimated cost, real product link, availability, licensing, rendering complexity.

Not every field is needed for every asset. **Unknown stays unknown, never an optimistic default.** Geometry cannot establish aquarium safety: chemistry, coatings, edges, hidden cavities and durability need verified product information or explicit user input. Grant habitat function only with sufficient evidence. An import of unknown material is not safe just because its geometry is valid.

## 11. Procedural Variation: Making the Library Scale
A few high-quality families give much more diversity through:
- color changes, approved scale changes, rotation and mirroring;
- alternate textures, weathering, moss / algae;
- partial burial, attached plants, clusters, preset configurations.

Example, a sculptural face planter: light gray stone, dark weathered, mossy, different plantings, partly embedded, different sizes. Combined with plants, substrates, lighting and neighbours, that makes many designs.

**Guardrails:** variation must not silently change function. Scaling a hide changes its opening; vegetation can block entrances; embedding can create inaccessible cavities. Scene evaluation must reflect these.

## 12. Custom 3D Imports
Yes eventually, but not needed for the core experience. Challenges:
- wrong dimensions or units; bad pivots or orientation;
- missing textures; excessive polygon counts; invalid geometry;
- unknown materials; hidden cavities or entrapment; unknown aquarium suitability;
- licensing.

Phases:
1. curated built-in library with metadata and variation;
2. visual-only imports (GLB) with dimension checks, resizing, rotation, placement, occupancy and performance limits; no biological or husbandry credit;
3. assisted classification from user-supplied material, openings, cavities, submersion and hazards, distinguishing verified facts from user assertions;
4. community / partner packs, moderated models, official collections, manufacturer and product-linked assets (possible monetization).

Imports are an expansion, not a prerequisite.

## 13. Animal Welfare Independent of Aesthetic Taste
Looking natural does not make a tank better for animals, and decorative is not inherently unsuitable:
- a manufactured cave can be excellent shelter;
- a shipwreck can break sightlines;
- artificial plants can give cover;
- a rock pile can have dangerous gaps;
- a minimal tank can lack cover;
- a decorative opening can trap a growing fish.

Assess shelter, usable swimming space, turning clearance, substrate compatibility, sharpness / entrapment, equipment performance, water parameters, temperature, stocking compatibility and species-specific needs.

A scene can succeed aesthetically and fail welfare, or the reverse.
- Artificial plants get no nutrient-uptake credit.
- Ornamental caves get shelter credit only when right for the animal's size and behaviour.
- Beginner-friendly looks do not imply beginner-friendly animals.

**Key rule: the engine evaluates what objects do, not whether they look like traditional aquascaping.**

## 14. Initial Asset Scope
Roughly 100-300 built-in assets was floated: a suggestion, not a target. The real target depends on:
- how much diversity procedural variation gives;
- reuse;
- performance;
- authoring cost;
- whether each family yields convincingly distinct results.

**The metric is the number of meaningfully different, coherent, feasible scenes, not the raw asset count.**

## 15. Beyond Freshwater
- **Terrariums:** natural forest, decorative fantasy forest, artificial vines and plants, ruins, themed, hybrids.
- **Paludariums:** natural wetland, waterfall / jungle, temple ruins, decorative rock gardens, fantasy, planted sculptures.
- **Saltwater:** natural reef, artificial coral, themed reef structures, minimal marine, mixed.

The asset and preference architecture should be reusable across habitats, with habitat-specific safety and placement. Not every object belongs in every habitat.

## 16. Decisions, Recommendations, Open Questions
**Established direction:**
1. The current freshwater style selection is too narrow.
2. The six styles are mostly naturalistic aquascaping.
3. Artificial, decorative, themed and mixed aesthetics deserve first-class support.
4. The generator adapts to users rather than imposing traditional aesthetics.
5. Decorative assets need real generator support, not cosmetic add-ons.
6. Preference learning distinguishes characteristics, not only style labels.
7. Asset organization and metadata are essential.
8. Welfare and function stay independent of aesthetics.
9. Refinement, preserved elements and iteration remain central to Discover.

**Recommended but not approved:**
1. exactly four families;
2. an explicit broad-family screen in Guided;
3. six subtypes per family;
4. a mixed-family gallery as Discover's opening;
5. the specific axis list;
6. 100-300 assets;
7. the four-phase import rollout;
8. community packs and marketplaces.

**Open questions:**
- Should families be explicit choices or internal presets?
- Must Guided require a family, or allow going straight from a mixed gallery?
- Which attributes are adjustable versus learned?
- How do we tell a liked object from a liked composition?
- How many procedural families are needed before imports?
- How do unverified custom objects affect welfare scoring?
- How much of the generator generalizes, and what needs new recipes?

## 17. Proposed Implementation Priorities
1. **Audit the design system:** where the six styles are defined; rigid categories or presets; how styles drive asset selection; how layouts are assembled; how Discover uses visual preferences; which assumptions favour naturalistic scenes. Do not start generating hundreds of assets.
2. **Separate aesthetic attributes from style presets**, keeping existing presets working (compatibility or migration).
3. **Expand the generator vocabulary:** decorative focal pieces, artificial vegetation, colored substrates, themes, mixed compositions, multiple grammars. A generator cannot make a style just because the UI names it.
4. **A small proof-of-concept asset set and recipes:** colorful artificial community, ornament-focused, pirate / shipwreck, ruins / temple, fluorescent, planted sculptural hybrid. Test them beside the six existing styles.
5. **Update Guided and Discover** once the generator can actually produce the new space. Don't expose directions that produce nearly identical scenes.
6. **Extend the library** by coverage gaps and user interest; consider imports only after the library and metadata mature.

## 18. Acceptance Tests
- **A. Decorative planted:** artificial greenery, natural-looking gravel and a ceramic centerpiece, cohesive, with no live plants substituted.
- **B. Pirate:** a ship, natural gravel and several live plants, all integrated.
- **C. Sculptural planter:** face planters among live plants without a hardcoded archetype.
- **D. Preference inference:** like the shipwreck, dislike the bright gravel → explore other substrates while keeping some themed options.
- **E. Welfare independence:** a manufactured shelter vs natural rock is judged on real function, size and safety, never by favouring rock.
- **F. No forced inheritance:** colorful decor with a minimalist layout is supported; vibrant does not mean cluttered.
- **G. Broad discovery:** with no style given, Discover shows clearly different approaches before converging.

## 19. Product Philosophy
YourArium is a general habitat design platform bridging what a user imagines and a complete, feasible, maintainable, animal-appropriate environment they can build. Any starting point is valid: one decorative object, a tank of artificial plants, an elaborate biotope, something new. **Maximize the user's satisfaction with the resulting habitat, subject to real-world constraints and animal welfare.**

## 20. Request to Claude
Review this direction against the existing implementation:
1. Audit the freshwater style definitions, generator, Discover preference model and asset architecture; find where naturalistic assumptions are hardcoded.
2. Evaluate the taxonomy: are four families useful, or does a more flexible approach better support cross-family combinations?
3. Propose an internal representation for independent visual attributes, themes, materials, asset metadata and generator presets.
4. Identify the smallest architectural changes that make decorative, themed and hybrid generation genuinely possible without breaking naturalistic generation.
5. Recommend a phased implementation starting with a representative proof of concept, not a massive catalogue.
6. Preserve the Guided / Discover philosophy: iterative refinement, preference learning, selectively retained elements.
7. Keep welfare logic separate from aesthetic preference, and handle unknown asset safety properly.

Do not assume every proposed category, number or phase is final. Distinguish architectural necessities from optional enhancements, identify reusable code, and flag decisions needing explicit product approval before implementation. **The objective is to expand the expressive range of the whole habitat-generation system, not to add a few novelty decorations.**
