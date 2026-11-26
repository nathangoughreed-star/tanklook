# 23. Shrimpspin Aquascape-Planer (web, German) + two "what do you want" threads
Researched 2026-11-25 from thread text Nathan pasted (the agents and both browsers are blocked from reddit.com). Confidence: low-medium (one launch thread, ~8 comments; product site not visited).

## Snapshot
- Product: Shrimpspin 3D Aquascape-Planer, https://www.shrimpspin.de/aquascape-planer . German-only UI at launch, English promised. Launch post on r/Aquascape about 8 months ago (https://www.reddit.com/r/Aquascape/comments/1sgmx6b/), roughly 5 upvotes.
- Small team / solo developer; a free account saves multiple layouts; a community system (share, like, comment on 3D scapes and photos) was being built at launch.

## What it does
- Full 3D placement of hardscape and plants, chosen substrate, adjustable lighting; all placement manual (no auto-generation).
- A "realistic rendering" mode that produces high-quality still images.
- **AR mode: puts the planned scape in your room on a phone or tablet** to check size and placement. This is the AR competitor ChatGPT's report pointed to.
- Models built by hand from generated reference images (the developer used AI for coding and reference images only).

## What users love
- One user (2 months ago) prefers it to Scape It because Scape It is barely usable without Pro.
- A "catch the shrimp" mini-game while it loads was liked.

## Complaints and weak spots
- Loading takes far too long (the developer blamed maintenance at the time).
- German only.
- **Hardscape realism critique (applies to every planner, including ours):** every rock and piece of wood is unique, so a planned layout can't be rebuilt from real pieces. The commenter's wish: photograph your own pieces from all sides and load them into the planner. The developer's reply: the tool is for proportion, depth and balance (e.g. a 16 in stone in a small tank), not a 1:1 copy.
- **Community attitude to AI:** a top-1% r/Aquascape commenter warned the sub "heavily frowns upon" AI-based planners (energy and carbon concerns). The developer stressed that design is 100% manual.

## vs YourArium
- They have, we lack: AR placement in a room (our AR lanes Q / T are planned), a photo-quality render mode, account-based saves and a community feed.
- We have, they lack: generated setups, stocking engine and gates, animals, real products and prices, marine and herps, English and US units.
- Ideas worth taking: (1) state plainly how setups are generated (rules and data, not generative AI) wherever we say "suggest" or "generate", because r/Aquascape is hostile to AI planners; (2) a "my own rock / wood" slot: rough dimensions or a few photos of a piece the user owns, so plans use what they have (fits our Available/Required gear model); (3) a still-render export for sharing.
- Threat: low (German-only, small reach), but it shipped AR first.

## What people ask app builders for
**Aqua Keeper launch thread** (https://www.reddit.com/r/fishkeeping/comments/1ti9ouj/, ~6 months ago; a freshwater keeper app with fish ID, tank evaluation, tracking, care guides, compatibility, reminders). One answer, but a clear one: disease ID with treatment; stocking / pairing recommendations; aquatic plant ID with care. (Disease and care are out of scope for us; stocking recommendations are core.)

**Modern stocking calculator thread** (https://www.reddit.com/r/fishkeeping/comments/1sw4mpn/, ~7 months ago):
- The builders' complaints about AqAdvisor: dated UI, a page reload for every tweak, missing newer species and colour morphs.
- Their planned features: instant recalculation; **top / middle / bottom zone capacity** (so plecos and corys don't overload the bottom while the top sits empty); a nitrate build-up forecast with a water-change schedule; planted-tank toggle offsetting nitrate; temperature, fin-nipping, substrate-digging and lid warnings; US / metric toggle.
- **The top reply:** calculators are too conservative. Its example: one reads 80% for 10 cardinals in a 40 breeder, where experienced keepers run 30-40 cardinals plus apistos, corys and a pleco. It recommends forums and a parameter / water-change tracker instead. The builder agreed accuracy has limits and aims at beginners' UX.
- What it means for us: our stocking engine is calibrated against expert stockings (research/expert-curve.md), which answers exactly this complaint; say so where the % is shown (ties to R152). Zone capacity by level is worth checking against our habitat model. Parameter tracking stays out of scope.
