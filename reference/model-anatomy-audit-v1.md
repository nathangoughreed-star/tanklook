# TankLook animal model anatomy audit

Audit date: 2026-10-14

Source gallery: https://tanklook.com/model-sheets/

## Scope and interpretation

All 68 model sheets, covering 57 species, were visually inspected in four views: side, three-quarter, front, and top. Each sheet shows plain preview lighting in the top row and tank lighting in the bottom row.

Every inspected caption identifies **model v1, build 217, dated 2026-10-14**. Build 251 is the gallery export build, not the model revision. Model IDs below are copied from captions. The suffix `~f` identifies a female model; its image filename uses `-f` instead.

This document preserves the complete findings from the visual review. It is intended to be readable directly as plain Markdown, including by Claude. It contains observations, recommended corrections, systemic hypotheses, and ordinary source URLs. It does not assume access to the original chat.

These are observations of rendered model sheets, not a source-code or mesh inspection. Hidden underside anatomy, exact fin-ray/digit counts, and mesh topology cannot be verified from these views. A feature that is not clearly resolved in a render is not necessarily absent from the mesh. Pipeline diagnoses are hypotheses inferred from repeated visual patterns.

Priority meanings:

- **P0 — fundamental anatomy:** rebuild the affected body structure.
- **P1 — major species-defining shape:** correct diagnostic anatomy or silhouette.
- **P2 — refinement:** recognizable animal, but proportions or local anatomy need improvement. Some entries require a sex, age, or ornamental-variety specification before a definitive correction.

## Overall assessment

The largest problems are structural: shrimp have fish-like tails, several snail shells resemble unfinished spirals, and many fish lack the fin arrangements that distinguish their species. Repeated smooth oval fish bodies, short posterior fins, and minimally differentiated heads weaken species identity even when the markings are recognizable.

The lighting comparison does not remove these structural problems. Pale fins often wash out in preview light and become dark/translucent in tank light. Apparent fin disappearance should therefore be checked as a material issue separately from geometry.

## P0 — Fundamental anatomy needs rebuilding

| Species | Caption model ID / version | Visible problem | Recommended correction |
|---|---|---|---|
| Cherry shrimp | `cherryshrimp` · v1 | Smooth fish-shaped body; vertical forked tail; long, similar legs distributed along the abdomen; eyes appear embedded rather than stalked. | Build a distinct cephalothorax and articulated abdomen. Separate walking legs from swimmerets; replace the tail with a broad, horizontally spreading telson–uropod fan. |
| Amano shrimp | `amano` · v1 | Same incorrect body plan as the cherry shrimp. Surface segment lines do not create the stepped, articulated abdominal shape. | Rebuild the shrimp anatomy, then apply Amano-specific proportions and markings. |
| Skunk cleaner shrimp | `cleanershrimp` · v1 | Fish-like caudal fin, nearly straight capsule body, and repeated spike-like legs. Long antennae provide recognition but do not compensate for the body geometry. | Add the characteristic abdominal bend, jointed thoracic legs, smaller swimmerets, stalked eyes, and a proper tail fan. |
| Mystery snail | `mystery` · v1 | Shell reads as an open spiral canopy with a large cutaway gap, rather than a complete globose shell. The foot appears disconnected beneath it. | Construct continuous expanding whorls, a substantial body whorl and raised spire, and an aperture from which the head and foot emerge. |
| Ramshorn snail | `ramshorn` · v1 | Planispiral orientation is appropriate, but the shell resembles an open rolled strip. Its termination and connection to the animal are implausible. | Keep the flat coil, but give each whorl a closed tubular volume and a coherent terminal aperture connected to the soft body. |
| Mexican turbo snail | `turbo` · v1 | A conspicuous sector is missing from the shell; the remaining spiral floats above a slab-like foot. It lacks the substantial rounded shell volume of a turbo snail. | Rebuild the shell as a continuous three-dimensional coil with a rounded body whorl and functional aperture–mantle–foot connection. |

Anatomical basis: shrimp have distinct thoracic walking legs, abdominal swimmerets, and a telson–uropod tail apparatus [R1]. A snail's body emerges through its shell aperture; the large empty gaps shown in these models are not equivalent to that opening [R2].

## P1 — Major species-defining shapes need correction

| Species | Caption model ID / version | Visible problem | Recommended correction |
|---|---|---|---|
| Marbled hatchetfish | `hatchet` · v1 | Deep belly is recognizable, but the small, low-mounted pectorals lose the defining wing-like silhouette. Anal fin is reduced to a short rear flap. | Enlarge and raise the pectoral fins; restore the long anal-fin base and appropriate posterior dorsal placement. Hatchetfishes have exceptionally developed pectoral anatomy [R3]. |
| Swordtail | `swordtail`, `swordtail~f` · v1 | Male sword is a short, thick tab; the anal region still reads as a broad fan. Both bodies are rather short and platy-like. | Give the male a long, tapering lower caudal extension and clearly recognizable gonopodium. Lengthen both body profiles and refine the upturned mouth. Keep the female swordless [R4]. |
| Guppy | `guppy`, `guppy~f` · v1 | Male anal region reads as a fan rather than a distinct gonopodium. Female tail is unusually coin-like, and both have poorly differentiated head–body transitions. | Resolve the male reproductive fin anatomically; reshape the female caudal into a natural fan and define the upturned jaws. The large ornamental male tail is not itself a defect. |
| Betta | `betta`, `betta~f` · v1 | Anal fins start too far back and resemble separate rear petals. Pelvic fins are insufficiently expressed; head lacks a convincing upturned jaw profile. | Extend the anal-fin base forward, establish the paired pointed pelvic fins, and reshape the mouth and opercular region. Preserve appropriate male/female fin-length differences. |
| Dwarf gourami | `dwarfgourami`, `dwarfgourami~f` · v1 | Dorsal and anal fins are shortened into posterior rounded lobes. Male dorsal shape is insufficiently differentiated from the female. | Extend the fin bases along the body; give the male a more pointed dorsal termination. Retain the already-present pelvic feelers. |
| Honey gourami | `honeygourami`, `honeygourami~f` · v1 | Long median-fin bases are reduced to rear paddles; the pointed generic face weakens the gourami profile. | Restore the dorsal and anal attachment lengths and refine the small mouth and forehead. Keep sex-specific body fullness and coloration. |
| Pearl gourami | `gourami`, `gourami~f` · v1 | Short, rounded dorsal fin in both sexes; male lacks convincing elongated dorsal termination and extended anal-fin rays. | Rebuild the long fin bases and male extensions; retain the female's rounder dorsal outline and both models' pelvic threads. |
| German blue ram | `gbr`, `gbr~f` · v1 | Dorsal appears as a smooth rear lobe, losing the anterior spiny section and the male's prominent leading spines. Pelvic fins are very slight. | Add a continuous spinous-to-soft dorsal profile, stronger male anterior spines, and appropriately elongated pelvic fins. |
| Bolivian ram | `bolivianram` · v1 | Rounded dorsal paddle lacks the raised anterior spines. Tail is an exaggerated angular V; ventral extensions are underdeveloped. | Restore the spiny dorsal silhouette, a less deeply forked caudal with appropriate outer-ray extensions, and longer pelvic fins. |
| Kribensis | `kribensis`, `kribensis~f` · v1 | Both dorsal bases are too short and posterior. Male is excessively compact and lacks pointed trailing dorsal/anal contours. | Lengthen the male body and fin extensions. Preserve the fuller female body while restoring her continuous dorsal base. |
| Freshwater angelfish | `angel` · v1 | Recognizable height, but the median fins form an overly rigid geometric diamond with straight triangular edges. Rear body/tail transition is crude. | Shape the dorsal and anal fins with swept, ray-supported contours and more natural trailing edges; refine the caudal peduncle. Lateral compression and pelvic streamers are appropriate. |
| Discus | `discus` · v1 | Round body is recognizable, but dorsal and anal fins look like short appendages attached at the rear rather than parts of the continuous disc outline. | Extend both fin bases around the body contour; improve their transition into the caudal region and define the mouth profile. |
| Oscar | `oscar` · v1 | Egg-shaped head/body lacks the large jaw, substantial cheek and opercular form. Dorsal is a rounded rear paddle; pectorals are undersized. | Sculpt the robust head and mouth, restore a long dorsal with distinct spinous/soft regions, and enlarge the rounded pectorals. |
| Bristlenose pleco | `bristlenose` · v1 | Head is too domed; pectoral and pelvic fins are tiny relative to the body; dorsal is a low rectangular flap. | Flatten and broaden the head, create large splayed paired fins, and restore a substantial dorsal sail. Bristle development should follow a specified sex/age; the underside sucker cannot be assessed here. |
| Pea puffer | `peapuffer`, `peapuffer~f` · v1 | Regular scale-like surface pattern is inappropriate; eyes read as flat discs and the small beak-like mouth is not resolved. | Replace ordinary scale patterning with appropriate skin detail, give the eyes anatomical volume, and define the small mouth. Posterior dorsal/anal placement and absence of pelvic fins are appropriate [R5]. |
| Firefish goby | `firefish` · v1 | One broad triangular dorsal sail substitutes for the distinctive narrow, elongated first dorsal and separate second dorsal. Anal fin is too abbreviated. | Build two distinct dorsal fins: a tall slender anterior pennant and a long low posterior fin; restore the matching elongated anal base [R6]. |
| Banggai cardinalfish | `banggai` · v1 | Single simple dorsal triangle loses the separate dorsal structures and elongated rays. Pelvic fins are tiny; overall silhouette is too generic. | Restore the first dorsal, elongated second dorsal and anal rays, and conspicuous pelvic fins. Preserve the deeply forked tail [R7]. |
| Yellow watchman goby | `watchman` · v1 | Only one low dorsal structure is clearly expressed. Eyes sit too flush with the head; mouth is poorly defined and pectorals are small. | Separate the two dorsals; raise the eyes, define the broad mouth/head, and enlarge the rounded pectorals. Check the fused pelvic structure in an additional underside view. |
| Yellow tang | `yellowtang` · v1 | Diamond-shaped body ends in a simple point rather than a projecting snout. Dorsal and anal fins are rounded rear lobes. | Model the distinct extended snout and small mouth; extend the dorsal and anal bases to create the continuous tang silhouette. |
| Coral beauty angelfish | `coralbeauty` · v1 | Dorsal and anal fins are shortened rounded paddles. Smooth egg-shaped head lacks the characteristic mouth and gill-cover definition. | Extend and shape the median fins, resolve their spinous portions, and give the head a distinct anatomical profile. |
| Malaysian trumpet snail | `trumpet` · v1 | Shell resembles stacked swollen beads with abrupt steps rather than one continuous tapered cone; connection to the foot is weak. | Use a continuous high-spired shell with slightly convex whorls and clear sutures, ending in an aperture attached to the animal [R8]. |
| Blue-leg hermit crab | `hermit` · v1 | Borrowed shell has the same open-sector construction problem. The exposed body resembles a straight connector; claws are bulbous, minimally articulated forms. | Correct the shell first, position the abdomen inside its aperture, and resolve claw palms, opposing fingers, and limb joints. |
| Dyeing dart frog | `dartfrog` · v1 | Body is an elongated rounded block; head and pelvic region barely separate. Hind limbs are thin rods, toes are pointed, and eyes look like exposed beads. | Sculpt head, trunk and hips separately; add muscular thighs, articulated feet with terminal discs, and integrated eye/eyelid forms. |
| White's tree frog | `treefrog` · v1 | Heavy body sits on disproportionately thin limbs. Head/shoulder form is overly uniform, and the eyes lack convincing surrounding tissue. | Build substantial thighs and forelimbs, a broader distinct head, and eyelid contours. Toe pads are present, but feet need better integration and proportions. |
| Fire-bellied toad | `firetoad` · v1 | Shares the elongated frog capsule and thin hind limbs. Rear toes appear as separate spikes without convincing webbing; skin relief is too smooth. | Shorten and broaden the body, increase thigh mass, construct webbed hind feet, and add restrained raised wart detail. |
| Chinese fire-bellied newt | `firenewt` · v1 | Body is extremely pencil-like, head scarcely differentiated, and tail narrows into a long needle with little visible vertical depth. | Broaden the trunk and rounded head; rebuild the laterally compressed swimming tail with a fuller side profile and less needle-like termination. |

## P2 — Recognizable animals needing proportion or local-anatomy refinement

| Species | Caption model ID / version | Visible problem | Recommended correction |
|---|---|---|---|
| Neon tetra | `neon` · v1 | Smooth oval trunk, sharply pointed snout and abrupt tail-root transition produce a generic fish silhouette. | Refine the small mouth/head, slimmer rear body and caudal peduncle; soften the mechanically angular caudal outline. |
| Cardinal tetra | `cardinal` · v1 | Similar capsule body and pointed face to the neon; dorsal and tail geometry feel schematic. | Refine species-specific body depth, head contour and fin outlines instead of relying primarily on the longer red marking. |
| Ember tetra | `ember` · v1 | Body appears unusually heavy and egg-shaped; dorsal is low and anal base abbreviated. | Reduce excessive midbody fullness where appropriate and restore more characteristic dorsal and anal proportions. Allow fuller females. |
| Rummy-nose tetra | `rummynose` · v1 | Weak distinction between trunk and caudal peduncle; small dorsal and blocky tail attachment. | Give the rear body a more natural taper, clarify the narrow peduncle and refine the dorsal and caudal lobes. |
| Harlequin rasbora | `harlequin` · v1 | Smooth oval body loses the rhomboid profile; diagnostic black patch reads more like a rounded bean than a wedge. | Establish the deeper shoulder and slender peduncle; reshape the marking into a triangular rear-body patch [R9]. |
| Chili rasbora | `chili` · v1 | Slenderness is broadly convincing, but snout is overly spear-like and the tail-root transition is blunt. | Shorten and soften the head profile and refine the caudal peduncle; review eye-region texture wrapping in the frontal view. |
| Zebra danio | `danio` · v1 | Dorsal sits too far forward; pointed terminal face does not express the upturned mouth. Barbels are not clearly resolved. | Shift the dorsal rearward, refine the oblique mouth and add readable fine barbels at suitable viewing distance [R10]. |
| Celestial pearl danio | `cpd`, `cpd~f` · v1 | Snout is too long and pointed; caudal fork is overly deep and angular. | Use the species' very short snout and a moderately forked tail. The rounded dorsal/anal outlines are reasonable [R11]. |
| Cherry barb | `cherrybarb`, `cherrybarb~f` · v1 | Male is overly full-bodied; both have low, simplified dorsals and abrupt rear taper. | Make the male more slender, retain appropriate female fullness, and refine dorsal height and peduncle transitions. |
| Tiger barb | `tigerbarb` · v1 | Deep body is recognizable, but dorsal is too small and narrow; pelvic fins are reduced to tiny projections. | Enlarge the triangular dorsal and give the paired fins more convincing area and attachment. |
| Platy | `platy` · v1 | Undersized dorsal; caudal reads as a stiff angular trapezoid; mouth profile is poorly resolved. | Increase dorsal area, round the caudal fan naturally, and define the small upturned mouth. |
| Black molly | `molly` · v1 | Dorsal resembles a rectangular flap; caudal is coin-like; face ends in a generic point. | Use a ray-supported dorsal outline appropriate to P. sphenops, a natural caudal fan and an upturned jaw profile. |
| Fancy goldfish | `goldfish` · v1 | Tail reads predominantly as a single vertical fan; paired fins are very small. "Fancy" does not identify the intended variety. | Specify the variety. If this is a fantail-type fish, build the paired double caudal clearly visible from above; enlarge the paired fins. Round body shape alone is not an error. |
| Bronze corydoras | `bronzecory` · v1 | Pectorals are small and high-looking; dorsal is a narrow leaf. Armour rows are not convincingly expressed. | Add broad low pectoral fins with strong leading spines, a fuller triangular dorsal and clearer paired rows of body scutes. Barbels are already present. |
| Panda corydoras | `pandacory` · v1 | Same undersized pectoral and dorsal structures as the bronze cory; head/body armour is overly smooth. | Correct the cory body/fin framework, then refine the panda-specific mask and markings. |
| Otocinclus | `oto` · v1 | Dorsal is a small rectangular flap; pectorals are slight and caudal appears insufficiently forked. | Restore a triangular dorsal, appropriate paired-fin spread and a clearer caudal fork. An underside view is needed to judge the sucker. |
| Kuhli loach | `kuhli` · v1 | Snout is too sharply tapered; visible barbels look like thick triangular projections. Body is nearly uniform in thickness. | Use a blunter loach head, fine cylindrical barbels and subtler head-to-trunk-to-tail volume changes. A straight review pose is not itself a defect. |
| Clown loach | `clownloach` · v1 | Dorsal and paired fins are too small; the pointed generic head weakens the robust loach profile. | Increase fin area and refine the arched back, sloping forehead and subterminal-mouth region. Preserve the existing barbels. |
| Siamese algae eater | `sae` · v1 | General elongation is reasonable, but dorsal is small and the pointed snout does not clearly express the grazing-mouth anatomy. | Refine the lower mouth/snout profile, dorsal proportions and gradual peduncle taper. |
| Zebra nerite snail | `nerite` · v1 | Dome is broadly recognizable, but shell edge/spiral transitions are crude. Foot is an oversized uniform slab with little distinct head anatomy. | Refine the low-spired shell and aperture, reduce the exposed foot volume and connect a distinct head to the opening. |
| Ocellaris clownfish | `ocellaris` · v1 | Dorsal is a short rounded flap concentrated toward the rear; pectorals are too small; head blends into an oval body. | Restore the long continuous dorsal with spinous and soft portions, larger rounded pectorals and a clearer mouth/gill-cover profile. |
| Royal gramma | `royalgramma` · v1 | Dorsal is shortened and posterior; smooth pointed face lacks the substantial oblique mouth. | Extend the dorsal base and sculpt the jaws, cheek and operculum. Preserve the recognizable two-colour division. |
| Six-line wrasse | `sixline` · v1 | Dorsal reads as a short ribbon; face is a sharp wedge rather than a distinct forehead and small mouth. | Extend the continuous dorsal and refine head curvature, lips and caudal-peduncle transition. |
| Blue-green chromis | `chromis` · v1 | Dorsal starts too far back; head and trunk merge into a generic oval. Tail fork is recognizable but mechanically angular. | Restore the anterior dorsal base, define the small mouth/gill region, and refine caudal ray curvature. |
| Axolotl | `axolotl` · v1 | Gill branches resemble rigid combs with repetitive teeth; trunk and tail-fin profile are very simplified. | Keep the three paired gill branches but add softer, finer filament structure; refine trunk volume and the continuous dorsal/caudal fin contour. Feathery external gills are a defining feature [R12]. |

## Systemic model-generation hypotheses

These are inferred from repeated rendered appearances, not confirmed by inspecting source code.

| Repeated pattern | Evidence across models | Correction at pipeline level |
|---|---|---|
| Too few anatomical body templates | Oval fish, fish-shaped shrimp, nearly identical frog trunks | Separate body plans by anatomical group before applying species parameters. |
| Fin shape varies more than fin structure | Rear rounded paddles recur in gouramis, cichlids, clownfish and marine angelfish; two-dorsal species lose their separation | Parameterize fin count, origin, attachment length, spines and trailing rays independently. |
| Appendages are decorative rather than anatomically anchored | Tiny catfish pectorals, repeated shrimp leg spikes, thin frog limbs | Define attachment landmarks, joint chains and relative appendage dimensions for each group. |
| Shell construction does not produce a complete animal | Open sectors, floating spirals and slab-like feet recur across snails and the hermit | Generate continuous shell whorls and aperture geometry, then place the mantle/body through that aperture. |
| Sex differences rely too heavily on colour | Male livebearer anal fins and male gourami/cichlid extensions are weakly expressed | Make sex-specific anatomy explicit, with separate validation for each variant. |
| Surface detail sometimes substitutes for anatomy | Shrimp segmentation is mostly drawn on; puffer uses ordinary scale-like patterning | Establish correct geometry first, then select skin, scales, armour or shell detail by taxon. |

## Important interpretation constraints

- Do not turn every observation of poor visibility into a claim that anatomy is absent. Small transparent fins, barbels, mouths, and underside structures can be obscured at sheet resolution.
- Do not add ordinary overlapping scales to puffers or replace catfish armour with generic scale texture.
- Retain valid features already present: gourami pelvic feelers, angelfish pelvic streamers, catfish/loach barbels where noted, pea-puffer posterior dorsal/anal placement and lack of pelvic fins, and the axolotl's three paired gill branches.
- Do not automatically treat large ornamental guppy/betta tails, a round fancy-goldfish body, fuller females, or a straight review pose as errors.
- Specify sex/age for bristlenose bristles and the intended ornamental variety for fancy goldfish.
- Do not thicken naturally thin fin membranes simply because they disappear edge-on. Review fin attachment, outline, curvature, and material separately.

## Illustrated evidence

The images below are the original hosted review sheets, not newly generated illustrations. Image links require network access; all observations needed to understand their significance are also included as text in this document. Because the hosted assets may later change, the captioned version/build above defines the audited snapshot.

### Cherry shrimp — cherryshrimp, v1, build 217

The side and top views expose the vertical fish-like tail and repeated leg arrangement. The top view lacks the broad horizontal tail fan expected of a shrimp.

![Cherry shrimp model v1: four views in preview and tank lighting](https://tanklook.com/model-sheets/cherryshrimp.jpg)

Image URL: https://tanklook.com/model-sheets/cherryshrimp.jpg

### Firefish — firefish, v1, build 217

The broad single sail replaces the species' distinctive two-part dorsal arrangement: a narrow elongated first dorsal and a separate long low second dorsal.

![Firefish model v1: four views showing incorrect dorsal geometry](https://tanklook.com/model-sheets/firefish.jpg)

Image URL: https://tanklook.com/model-sheets/firefish.jpg

### Mexican turbo snail — turbo, v1, build 217

The open shell sector and gap above the foot are visible in both lighting setups. The shell does not convincingly enclose the animal or connect to it through an aperture.

![Mexican turbo snail model v1: four views showing incomplete shell and body connection](https://tanklook.com/model-sheets/turbo.jpg)

Image URL: https://tanklook.com/model-sheets/turbo.jpg

## Model inventory and direct sheet links

Scientific names below reproduce the gallery captions, rather than attempting a taxonomic update. All entries are model v1, build 217. Each linked image contains the four views in both lighting conditions.

| Species | Scientific name from caption | Model IDs and sheet URLs |
|---|---|---|
| Neon tetra | Paracheirodon innesi | [neon](https://tanklook.com/model-sheets/neon.jpg) |
| Cardinal tetra | Paracheirodon axelrodi | [cardinal](https://tanklook.com/model-sheets/cardinal.jpg) |
| Ember tetra | Hyphessobrycon amandae | [ember](https://tanklook.com/model-sheets/ember.jpg) |
| Rummy-nose tetra | Hemigrammus rhodostomus | [rummynose](https://tanklook.com/model-sheets/rummynose.jpg) |
| Harlequin rasbora | Trigonostigma heteromorpha | [harlequin](https://tanklook.com/model-sheets/harlequin.jpg) |
| Chili rasbora | Boraras brigittae | [chili](https://tanklook.com/model-sheets/chili.jpg) |
| Zebra danio | Danio rerio | [danio](https://tanklook.com/model-sheets/danio.jpg) |
| Celestial pearl danio | Danio margaritatus | [cpd (male)](https://tanklook.com/model-sheets/cpd.jpg); [cpd~f (female)](https://tanklook.com/model-sheets/cpd-f.jpg) |
| Marbled hatchetfish | Carnegiella strigata | [hatchet](https://tanklook.com/model-sheets/hatchet.jpg) |
| Cherry barb | Rohanella (Puntius) titteya | [cherrybarb (male)](https://tanklook.com/model-sheets/cherrybarb.jpg); [cherrybarb~f (female)](https://tanklook.com/model-sheets/cherrybarb-f.jpg) |
| Tiger barb | Puntigrus tetrazona | [tigerbarb](https://tanklook.com/model-sheets/tigerbarb.jpg) |
| Guppy | Poecilia reticulata | [guppy (male)](https://tanklook.com/model-sheets/guppy.jpg); [guppy~f (female)](https://tanklook.com/model-sheets/guppy-f.jpg) |
| Platy | Xiphophorus maculatus | [platy](https://tanklook.com/model-sheets/platy.jpg) |
| Black molly | Poecilia sphenops | [molly](https://tanklook.com/model-sheets/molly.jpg) |
| Swordtail | Xiphophorus hellerii | [swordtail (male)](https://tanklook.com/model-sheets/swordtail.jpg); [swordtail~f (female)](https://tanklook.com/model-sheets/swordtail-f.jpg) |
| Betta | Betta splendens | [betta (male)](https://tanklook.com/model-sheets/betta.jpg); [betta~f (female)](https://tanklook.com/model-sheets/betta-f.jpg) |
| Dwarf gourami | Trichogaster lalius | [dwarfgourami (male)](https://tanklook.com/model-sheets/dwarfgourami.jpg); [dwarfgourami~f (female)](https://tanklook.com/model-sheets/dwarfgourami-f.jpg) |
| Honey gourami | Trichogaster chuna | [honeygourami (male)](https://tanklook.com/model-sheets/honeygourami.jpg); [honeygourami~f (female)](https://tanklook.com/model-sheets/honeygourami-f.jpg) |
| Pearl gourami | Trichopodus leerii | [gourami (male)](https://tanklook.com/model-sheets/gourami.jpg); [gourami~f (female)](https://tanklook.com/model-sheets/gourami-f.jpg) |
| German blue ram | Mikrogeophagus ramirezi | [gbr (male)](https://tanklook.com/model-sheets/gbr.jpg); [gbr~f (female)](https://tanklook.com/model-sheets/gbr-f.jpg) |
| Bolivian ram | Mikrogeophagus altispinosus | [bolivianram](https://tanklook.com/model-sheets/bolivianram.jpg) |
| Kribensis | Pelvicachromis pulcher | [kribensis (male)](https://tanklook.com/model-sheets/kribensis.jpg); [kribensis~f (female)](https://tanklook.com/model-sheets/kribensis-f.jpg) |
| Freshwater angelfish | Pterophyllum scalare | [angel](https://tanklook.com/model-sheets/angel.jpg) |
| Discus | Symphysodon aequifasciatus | [discus](https://tanklook.com/model-sheets/discus.jpg) |
| Oscar | Astronotus ocellatus | [oscar](https://tanklook.com/model-sheets/oscar.jpg) |
| Fancy goldfish | Carassius auratus | [goldfish](https://tanklook.com/model-sheets/goldfish.jpg) |
| Bronze corydoras | Corydoras aeneus | [bronzecory](https://tanklook.com/model-sheets/bronzecory.jpg) |
| Panda corydoras | Corydoras panda | [pandacory](https://tanklook.com/model-sheets/pandacory.jpg) |
| Bristlenose pleco | Ancistrus sp. | [bristlenose](https://tanklook.com/model-sheets/bristlenose.jpg) |
| Otocinclus | Otocinclus vittatus | [oto](https://tanklook.com/model-sheets/oto.jpg) |
| Kuhli loach | Pangio kuhlii | [kuhli](https://tanklook.com/model-sheets/kuhli.jpg) |
| Clown loach | Chromobotia macracanthus | [clownloach](https://tanklook.com/model-sheets/clownloach.jpg) |
| Siamese algae eater | Crossocheilus oblongus | [sae](https://tanklook.com/model-sheets/sae.jpg) |
| Pea puffer | Carinotetraodon travancoricus | [peapuffer (male)](https://tanklook.com/model-sheets/peapuffer.jpg); [peapuffer~f (female)](https://tanklook.com/model-sheets/peapuffer-f.jpg) |
| Cherry shrimp | Neocaridina davidi | [cherryshrimp](https://tanklook.com/model-sheets/cherryshrimp.jpg) |
| Amano shrimp | Caridina multidentata | [amano](https://tanklook.com/model-sheets/amano.jpg) |
| Zebra nerite snail | Neritina natalensis | [nerite](https://tanklook.com/model-sheets/nerite.jpg) |
| Mystery snail | Pomacea diffusa | [mystery](https://tanklook.com/model-sheets/mystery.jpg) |
| Ramshorn snail | Planorbella duryi | [ramshorn](https://tanklook.com/model-sheets/ramshorn.jpg) |
| Malaysian trumpet snail | Melanoides tuberculata | [trumpet](https://tanklook.com/model-sheets/trumpet.jpg) |
| Ocellaris clownfish | Amphiprion ocellaris | [ocellaris](https://tanklook.com/model-sheets/ocellaris.jpg) |
| Royal gramma | Gramma loreto | [royalgramma](https://tanklook.com/model-sheets/royalgramma.jpg) |
| Yellow tang | Zebrasoma flavescens | [yellowtang](https://tanklook.com/model-sheets/yellowtang.jpg) |
| Firefish goby | Nemateleotris magnifica | [firefish](https://tanklook.com/model-sheets/firefish.jpg) |
| Banggai cardinalfish | Pterapogon kauderni | [banggai](https://tanklook.com/model-sheets/banggai.jpg) |
| Six-line wrasse | Pseudocheilinus hexataenia | [sixline](https://tanklook.com/model-sheets/sixline.jpg) |
| Blue-green chromis | Chromis viridis | [chromis](https://tanklook.com/model-sheets/chromis.jpg) |
| Coral beauty angelfish | Centropyge bispinosa | [coralbeauty](https://tanklook.com/model-sheets/coralbeauty.jpg) |
| Yellow watchman goby | Cryptocentrus cinctus | [watchman](https://tanklook.com/model-sheets/watchman.jpg) |
| Skunk cleaner shrimp | Lysmata amboinensis | [cleanershrimp](https://tanklook.com/model-sheets/cleanershrimp.jpg) |
| Mexican turbo snail | Turbo fluctuosus | [turbo](https://tanklook.com/model-sheets/turbo.jpg) |
| Blue-leg hermit crab | Clibanarius tricolor | [hermit](https://tanklook.com/model-sheets/hermit.jpg) |
| Dyeing dart frog | Dendrobates tinctorius | [dartfrog](https://tanklook.com/model-sheets/dartfrog.jpg) |
| White's tree frog | Ranoidea caerulea | [treefrog](https://tanklook.com/model-sheets/treefrog.jpg) |
| Fire-bellied toad | Bombina orientalis | [firetoad](https://tanklook.com/model-sheets/firetoad.jpg) |
| Chinese fire-bellied newt | Cynops orientalis | [firenewt](https://tanklook.com/model-sheets/firenewt.jpg) |
| Axolotl | Ambystoma mexicanum | [axolotl](https://tanklook.com/model-sheets/axolotl.jpg) |

## Anatomical references

These sources support the anatomical comparisons cited above. The model-specific defect descriptions remain visual judgments from the TankLook sheets, not conclusions stated by these sources.

- **[R1] Australian Government Department of Agriculture, Water and the Environment — Crustacean anatomy, Aquatic animal diseases significant to Australia, identification field guide, 5th edition.** External prawn anatomy diagram distinguishing abdominal segments, walking legs, swimmerets, telson, uropods and eyestalks. https://www.agriculture.gov.au/sites/default/files/documents/crustacean-anatomy.pdf
- **[R2] Carnegie Museum of Natural History — Mollusk terminology.** Definitions of aperture, mantle, whorl, foot and shell structures. https://www.carnegiemnh.org/science/mollusks/terminology.html
- **[R3] FishBase — Gasteropelecidae family summary.** Modified elongated pectoral rays and specialized pectoral apparatus of hatchetfishes. https://www.fishbase.se/summary/FamilySummary.php?ID=109
- **[R4] Fishes of Australia — Xiphophorus hellerii.** Upturned mouth, male caudal sword and gonopodium. https://fishesofaustralia.net.au/home/species/3638
- **[R5] Matsuura, K. — Taxonomy and systematics of tetraodontiform fishes: a review focusing primarily on progress in the period from 1980 to 2014. Ichthyological Research.** Puffer body characters include beak-like jaws, posterior dorsal/anal fins, absent pelvic fins and absence of typical scales. https://link.springer.com/article/10.1007/s10228-014-0444-5
- **[R6] Fishes of Australia — Nemateleotris magnifica.** Very elongate filamentous first dorsal and separate posterior dorsal anatomy. https://fishesofaustralia.net.au/home/species/2943
- **[R7] Oregon Coast Aquarium — Banggai cardinalfish.** Tasseled first dorsal, elongated second dorsal and anal rays, and deeply forked caudal. https://aquarium.org/animals/banggai-cardinalfish/
- **[R8] USGS Nonindigenous Aquatic Species — Melanoides tuberculata.** Elongate conical shell with slightly convex whorls. https://nas.er.usgs.gov/queries/Factsheet.aspx?speciesID=1037
- **[R9] NParks Flora & Fauna Web — Trigonostigma heteromorpha.** Rhomboid body, slender caudal peduncle and triangular black patch. https://www.nparks.gov.sg/florafaunaweb/fauna/2/8/283
- **[R10] National Research Centre for Riverine and Lake Fisheries, Bhutan — Danio rerio.** Rearward dorsal placement, obliquely upturned mouth and barbels. https://www.nrcrlf.gov.bt/tour/danio-rerio-hamilton-1822/
- **[R11] Smithsonian Research Online — The celestial pearl danio, a new genus and species of colourful minute cyprinid fish from Myanmar.** Original description addressing the extremely short snout, rounded dorsal/anal fins and moderately forked caudal. https://repository.si.edu/items/83007d42-a3cd-48c2-8195-3b126c907b64
- **[R12] San Diego Zoo — Axolotl.** Broad body/head and signature feathery external gills. https://animals.sandiegozoo.org/animals/axolotl

## Coverage check

- P0: 6 species / 6 models.
- P1: 26 species / 35 models.
- P2: 25 species / 27 models.
- Total: 57 species / 68 models.
- All audited models: v1, build 217.

