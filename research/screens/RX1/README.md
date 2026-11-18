# RX1 reference photos and looks (R139 phase 1)
Photos viewed from the scratchpad (not committed, copyright); page URLs recorded here.

## Endler's livebearer (Poecilia wingei)
- Seriously Fish species page (photos by JJPhoto, male_1, female_1, female_2): https://www.seriouslyfish.com/species/poecilia-wingei/
- Look written down from the photos: female golden-brown back with dark scale edges, silvery blue-white belly, translucent olive tail, dark gravid spot low on the belly. Male olive back, silver-white stripe above the flank, orange blotches on the flank and tail base, black vertical bar and black belly patch, green-yellow rear body, clear tail edged black above and orange over black below.
- Render: endler-redo-from-photos.png (male top, female middle); first pass endler-in-tank.png was drawn from memory and is superseded.

## Batch 1 (2026-11-18): three-spot gourami, common pleco, glowlight tetra, convict cichlid, electric blue acara
Reference pages viewed (photos downloaded to the scratchpad only, per Nathan's standing OK; not committed):
- Three-spot gourami wild / blue / gold / opaline: https://www.seriouslyfish.com/species/trichopodus-trichopterus/ (JJPhoto, Hippocampus, Chor-Kiat Yeo)
- Common pleco: https://www.aquariumsource.com/common-pleco/ (hypostomus-plecostomus-1.jpg, common-pleco.jpg)
- Glowlight tetra: https://www.seriouslyfish.com/species/hemigrammus-erythrozonus/ (JJPhoto)
- Convict cichlid: https://www.seriouslyfish.com/species/amatitlania-nigrofasciata/ (Nora Brede, Hayath)
- Electric blue acara: https://www.aquariumsource.com/electric-blue-acara/ ; wild blue acara https://www.seriouslyfish.com/species/andinoacara-pulcher/ (Hippocampus)
Looks written down in the comment above each plan in src/art/fishgen.ts. Pictures: batch1-cards.png (cards, three-spot in standard / blue / gold; then pleco, convict male + female, electric blue acara, Endler male + female), batch1-in-tank.png (all in the planted example).
Known gaps: the cards are a stylised read of the photos (bars on the convict are more regular than the fish's); common pleco has no sex look; the opaline three-spot is in the picker but not on the card sheet.

## Batch 2 (2026-11-18): clown killifish, peacock gudgeon, false julii corydoras, neon dwarf rainbowfish, firemouth cichlid
Photos viewed (scratchpad only): Seriously Fish pages, https://www.seriouslyfish.com/species/epiplatys-annulatus/ (male, female), /tateurndina-ocellicauda/ (male, female), /corydoras-trilineatus/ (Hippocampus), /melanotaenia-praecox/ (Kris Bolam male), /thorichthys-meeki/ (Unimati.dk). Looks are written in the comment above each plan in src/art/fishgen.ts.
Pictures: batch2-cards.png (killifish male + female, gudgeon male + female, false julii, rainbowfish male + female, firemouth), batch2-in-tank.png.
Known gaps: the false julii body is the peppered cory's (a little deep); the gudgeon's dorsal / anal fins are simplified; no photo of a female rainbowfish or a female firemouth (the sheet's female rainbowfish follows the Seriously Fish text: slimmer, paler); the firemouth has no sex look.

## Batch 3 (2026-11-18): salt-and-pepper corydoras, clown pleco, yoyo loach, glass catfish
Photos viewed (scratchpad only): Seriously Fish, https://www.seriouslyfish.com/species/corydoras-habrosus/ (Peter Macguire), /botia-almorhae/ (Mick Wright; the page says its photos are of close relatives, the yo-yo pattern matches), /kryptopterus-vitreolus/ (Nonn Panitvong, Unimati.dk); Aquarium Source https://www.aquariumsource.com/clown-pleco/ (its one photo is a dim shot under wood, so the clown pleco's orange-cream bands follow the page text, not a clear photo).
Pictures: batch3-cards.png (salt-and-pepper, clown pleco, yoyo loach, glass catfish), batch3-in-tank.png.
Known gaps: clown pleco needs a better photo before sign-off; yoyo bars are more regular than the fish's looping pattern; the glass catfish is see-through: the plan got a `bodyA` (body opacity, 2D card and 3D body material, no outline) and `solid` marks (the spine and the organ patch behind the head, painted over the clear body). Nathan 2026-11-18: transparency is the whole point of this fish.
