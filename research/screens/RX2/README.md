# RX2 reference photos and looks (R139 phase 2, marine)
Photos viewed from the scratchpad (not committed, copyright); page URLs recorded here. One photo per species so far (Wikimedia Commons aquarium photos); a second photo per look is still wanted.

## Batch 1 (2026-11-19): tailspot blenny, yellowtail blue damselfish, pajama cardinalfish
- Tailspot blenny: https://en.wikipedia.org/wiki/Ecsenius_stigmatura (Commons photo). Look: olive-green head and back to tan-orange flank, peach belly, orange line under the eye, orange-ringed eye, black spot ringed white at the tail base.
- Yellowtail blue damsel: https://en.wikipedia.org/wiki/Chrysiptera_parasema (Commons photo). Look: electric blue, dark scale edges, dark eye streak, dark spot at the pectoral base, yellow-orange tail only.
- Pajama cardinal: https://en.wikipedia.org/wiki/Sphaeramia_nematoptera (Commons photo). Look: silvery yellow-green head and front, black-edged-scale band behind the head, red-brown spots behind it, orange eye, lilac fins, long second dorsal.
Picture: batch1-vs-photos.png (model sheet beside the photo). Known gaps: one photo each, no sex looks (sexes alike or unrecorded), the cardinal's scale net is a plain black band, the damsel lacks the fine scale pattern, blenny head cirri missing.
Numbers: FishBase (distribution, length), LiveAquaria (minimum tank), retailer pages (prices); conflicts are written in the provenance `why`.
AqAdvisor: tailspot blenny has its own id; damselfish (Green Chromis) and pajama cardinal (Banggai cardinal) are flagged stand-ins; AqAdvisor was unreachable on 2026-11-19, so no new ids were resolved.
Missing on purpose: no sold-by-sex or pair rows (no sex-ratio or pair rule is set); lengths of tl are hobby-page figures where they exceed FishBase.

## Batch 2 (2026-11-19): orchid dottyback, lawnmower blenny, flame angelfish, foxface rabbitfish, kole tang
Photos viewed (scratchpad only; Wikimedia Commons, via the Wikipedia pages): https://en.wikipedia.org/wiki/Pseudochromis_fridmani (Yeda, 2025-05-19), https://en.wikipedia.org/wiki/Salarias_fasciatus ("Algae blenny.jpg" and "Salarias fasciatus Aquarium DG.jpg", both close-ups of the head and front half), https://en.wikipedia.org/wiki/Flame_angelfish ("Flame angelfish (Centropyge loricula).jpg"), https://en.wikipedia.org/wiki/Foxface_rabbitfish ("Siganus vulpinus 2.jpg"), https://en.wikipedia.org/wiki/Ctenochaetus_strigosus ("Ctenochaetus strigosus 1.jpg"). Looks are written above each plan in src/art/fishgen.ts.
Pictures: batch2-vs-photos.png (model sheet beside the photo, first pass; flame angel, foxface and kole tang were redrawn after it, v2), batch2-in-tank.jpg (the Reef example with the new fish in it; the pane gave an 800x500 capture, not 1280x800).
Known gaps: one photo per species (no sex looks; flame angel males are larger and a little more coloured, FishBase/Wikipedia); the lawnmower's photos show the front half only, so its body pattern is a stylised read; the flame angel's bars are straighter than the fish's, the foxface's head mask is simpler, and the kole tang's wavy lines are broader than the fish's fine lines. AqAdvisor was unreachable on 2026-11-19: orchid dottyback (Royal Gramma), lawnmower (Tail Spot Blenny), flame angel (Coral Beauty), foxface and kole tang (Yellow Tang) are flagged stand-ins. Masses are estimates (FishBase LW rows not opened). Prices: flame angel and foxface listings vary a lot by size; see the demand rows.
Not set (no basis): sold-by-sex and pair-former rows (none of these has a sex-ratio or pair rule; flame angel harems are noted in the message only).

## Redo (2026-11-19, Nathan's review): masses, AqAdvisor, sex, tank sizes
- **Masses:** all 8 now carry the FishBase Bayesian length-weight estimate (species summary pages opened 2026-11-19, "in cm total length"): a, b = tailspot 0.00759, 3.00; damsel 0.01445, 3.00; pajama 0.02188, 3.09; orchid 0.00490, 3.11; lawnmower 0.00851, 3.00; flame 0.02951, 2.89; foxface 0.01318, 3.06; kole 0.02291, 3.03. None of the pages lists measured length-weight rows (only the model estimate). Because the real masses were lighter, the damsel, orchid and flame angel bodies were slimmed (model/table mass was 1.8, 1.9, 1.6) and re-recorded.
- **AqAdvisor:** removed for all 8 (treated as non-existent; tests exempt them; the onboarding check is gone).
- **Tank sizes:** every minimum found, averaged (listed in each tankmin `states`); the footprint is the standard tank nearest the average volume, minLengthMm follows it.
- **Sex research (is a second model needed? do ratios matter for health? breeding out of scope):**
  - Tailspot blenny: no reliable visual or behavioural sexing (forums only: possible tail filaments, shorter orange stripe on the female); one per tank for aggression anyway -> no second model, no ratio rule.
  - Lawnmower blenny: no outward sexing signs found (forum: both sexes have two anal spines); solitary (FishBase) -> none.
  - Yellowtail blue damsel: Wikipedia says the sexes are very hard to tell apart; FishBase morphology page lists no sex attributes; males are told by behaviour (territory, egg guarding) -> none.
  - Pajama cardinal: FishBase sex-attribute field empty, no sexing source found; Wikipedia says socially monogamous pairs inside a group; the group band (6 or more) is the health rule -> none.
  - Orchid dottyback: protogynous (starts female, a dominant becomes male; Fishkeeper), the commonly cited tail-fin cue is unreliable; one per tank -> none.
  - Flame angelfish: Wikipedia says males are generally larger and slightly more coloured; a Reef Central reply says males have bolder bars and Fenner (via WetWebMedia) bluer-streaked unpaired fins; FishBase: harems of 3-7. A difference this slight does not earn a second model. A harem is a breeding-style arrangement, and the health rule we model is one per tank (aggression to other dwarf angels) -> none.
  - Foxface: the sexes are not discernible externally (WetWebMedia Q&A) -> none.
  - Kole tang: no source found; tang sexes are not told apart visually (Reef Central) -> none.
  So no sexed model, sold-by-sex row or ratio rule was added; each is "researched, none found".
- Photos: Nathan 2026-11-19 allows learning from photos on any site, not only free ones; multi-angle (top, head-on) photos for these 8 were not collected in this redo.
