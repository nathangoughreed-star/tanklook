"""b12 (2026-11-28): species blocks for the next 20 roster species (Nathan: "Approve all 20"). Same method as b11
(scripts/b11-species-blocks.py supplies block() and strip_fins(); this file holds only the b12 species).
Usage: python -I scripts/b12-species-blocks.py            write <id>-b12-gen/species.txt
       (fish-prompt-fill.py per folder)
       python -I scripts/b12-species-blocks.py --finish   strip absent fins, copy to research/fish-sheets/prompts/<id>-b12-5row.md"""
import importlib.util, os, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('b11blocks', os.path.join(HERE, 'b11-species-blocks.py'))
M = importlib.util.module_from_spec(spec); spec.loader.exec_module(M)
M.BATCH = 'b12'
ADIPOSE, DORSAL2 = M.ADIPOSE, M.DORSAL2
SMALL = 'The species has small, even scales; draw them as a faint, smooth texture, not as individually outlined scales.'
MINUTE = 'The species has minute scales; skin should look smooth and velvety rather than displaying large individual scales.'
LARGE = 'The species has large, visible scales; draw them as a regular, gently reflective scale pattern.'
FOLD = 'naturally folded close against the flank'
S = {}

S['bleedingheart'] = dict(common='bleeding heart tetra', sci='Hyphessobrycon erythrostigma', sl=2.0, cs='strongly laterally compressed',
 body=["Adult tetra. Deep, rhomboid, strongly laterally compressed body: the back rises steeply to the dorsal-fin origin, the belly curves down to the anal-fin origin.",
  "Head with a gently sloping forehead and a rounded snout; terminal mouth.",
  "Greatest body depth at the dorsal-fin origin. Narrow caudal peduncle.", "Eye round, set high and forward on the head."],
 colour="Adult. Silvery pinkish-tan body with a faint violet sheen. One round blood-red spot on the flank just behind the gill cover, about the size of the eye. No stripes.\n\nEye: silver with a red upper rim.",
 fins=["Dorsal: Tall, pointed, at the highest point of the back; in males the front rays extend into a sickle. Black and white with a red base. Drawn semi-translucent.",
  "Anal: Long base from mid-belly to the caudal peduncle, deepest at the front. Pinkish with a white front edge and a dark band. Drawn translucent.",
  "Caudal: Forked. Clear with a pink tint. Drawn translucent.",
  "Pectoral: Rounded, behind the gill cover, " + FOLD + ". Clear. Drawn translucent.",
  "Pelvic: Pointed, under the dorsal origin. Pinkish. Drawn translucent.",
  "Adipose: A rounded tab on the back in front of the caudal. Pink. Drawn opaque."],
 marks='the red flank spot', top='laterally compressed body, widest just behind the eyes, tapering evenly to the caudal peduncle',
 toppat='the pinkish-tan back', row5=ADIPOSE, scales=SMALL, pat='silvery pink body with one red flank spot and a black-and-white dorsal',
 dont='Do not draw a torpedo or an oval: the back rises to a peak at the dorsal-fin origin.', topdont='Do not make the body spindle-shaped or thick.')

S['blackneon'] = dict(common='black neon tetra', sci='Hyphessobrycon herbertaxelrodi', sl=1.2, cs='moderately laterally compressed',
 body=["Adult tetra. Elongate, laterally compressed body with a gently arched back and belly.",
  "Head with a straight forehead and a rounded snout; terminal mouth.",
  "Greatest body depth at the dorsal-fin origin. Narrow caudal peduncle.", "Eye round, high on the head, with a red-orange upper half."],
 colour="Adult. Olive-grey back. A thin pale green-white line runs along the upper flank from the gill cover to the tail base, directly above a broad black band that covers the lower flank from behind the head to the caudal peduncle. Belly pale silver.\n\nEye: red-orange upper half, silver lower half.",
 fins=["Dorsal: Short-based, pointed, at the middle of the back. Clear with a pale tip. Drawn translucent.",
  "Anal: From mid-belly to the caudal peduncle, deepest at the front. Clear. Drawn translucent.",
  "Caudal: Forked. Clear. Drawn translucent.",
  "Pectoral: Rounded, behind the gill cover, " + FOLD + ". Clear. Drawn translucent.",
  "Pelvic: Pointed, under the dorsal. Clear. Drawn translucent.",
  "Adipose: A rounded tab on the back in front of the caudal. Clear-grey. Drawn opaque."],
 marks='the pale line over the broad black band', top='laterally compressed body, widest just behind the eyes, tapering evenly to the caudal peduncle',
 toppat='the olive-grey back', row5=ADIPOSE, scales=SMALL, pat='broad black lateral band under a pale green-white line, red-topped eye',
 dont='Do not draw a deep, diamond-shaped body.', topdont='Do not make the body spindle-shaped or thick.')

S['rosybarb'] = dict(common='rosy barb (male)', sci='Pethia conchonius', sl=3.0, cs='moderately laterally compressed',
 body=["Adult male barb. Oval, laterally compressed body with an evenly arched back and a rounded belly.",
  "Head with a gently sloping forehead and a rounded snout; terminal mouth, no barbels.",
  "Greatest body depth at the dorsal-fin origin, about the middle of the body. Deep caudal peduncle.", "Eye round, mid-head."],
 colour="Adult male. Rose-red to pink body, olive-gold along the back, deepest red on the lower flank and belly. One black spot on the caudal peduncle, above the anal-fin end. Visible silvery scale edges.\n\nEye: gold with a dark pupil.",
 fins=["Dorsal: Short-based, triangular, at the highest point of the back. Red with a black tip. Drawn semi-translucent.",
  "Anal: Short-based, triangular, behind the pelvics. Red. Drawn semi-translucent.",
  "Caudal: Forked. Clear with a red tint. Drawn translucent.",
  "Pectoral: Rounded, low behind the gill cover, " + FOLD + ". Clear red. Drawn translucent.",
  "Pelvic: Pointed, under the dorsal origin. Red. Drawn semi-translucent.", "No adipose fin."],
 marks='the black peduncle spot', top='oval body, widest just behind the eyes, tapering to the caudal peduncle',
 toppat='the olive-gold back', row5='', scales=LARGE, pat='rose-red barb with a black tail-base spot and black-tipped dorsal',
 dont='Do not draw a torpedo or a disc.', topdont='Do not make the body spindle-shaped or thick.')

S['giantdanio'] = dict(common='giant danio', sci='Devario aequipinnatus', sl=3.2, cs='moderately laterally compressed',
 body=["Adult danio. Elongate, laterally compressed body with a nearly straight back and a gently curved belly.",
  "Head with a straight forehead and a pointed-rounded snout; terminal, slightly upturned mouth; two pairs of fine barbels.",
  "Greatest body depth at about a third of the length. Moderate caudal peduncle.", "Eye round, mid-head."],
 colour="Adult. Steel-blue to blue-green body. Two or three yellow-gold stripes run along the flank from behind the gill cover to the caudal peduncle, broken into bars and dashes behind the head; the blue between them continues as a band into the middle of the tail fin.\n\nEye: silver-gold.",
 fins=["Dorsal: Short-based, at the rear of the back. Clear with a yellow tint. Drawn translucent.",
  "Anal: Long base from mid-belly to the caudal peduncle. Clear yellowish. Drawn translucent.",
  "Caudal: Forked, with the blue body band running into its middle. Clear. Drawn translucent.",
  "Pectoral: Pointed, low behind the gill cover, " + FOLD + ". Clear. Drawn translucent.",
  "Pelvic: Pointed, mid-belly. Clear. Drawn translucent.", "No adipose fin."],
 marks='the yellow stripes and blue bands', top='elongate body, widest just behind the eyes, tapering evenly to the caudal peduncle',
 toppat='the blue-green back', row5='', scales=SMALL, pat='steel-blue body with yellow-gold stripes broken into bars at the front',
 dont='Do not draw a deep body.', topdont='Do not make the body thick.')

S['sailfinmolly'] = dict(common='sailfin molly (male)', sci='Poecilia latipinna', sl=3.0, cs='moderately laterally compressed',
 body=["Adult male livebearer. Elongate, laterally compressed body with a straight back and a flattish belly.",
  "Head with a flat forehead and a rounded snout; upturned terminal mouth.",
  "Greatest body depth just behind the middle. Deep caudal peduncle.", "Eye round, high on the head."],
 colour="Adult male (wild type). Olive-grey body with five or six rows of dark spots along the flank and an iridescent blue-green sheen; yellow-orange on the throat and chest.\n\nEye: gold.",
 fins=["Dorsal: A sail: a long, tall fin starting just behind the head and running to the caudal peduncle, its height about as tall as the body is deep. Blue-grey with rows of black spots and an orange edge. Drawn opaque.",
  "Anal: In males a gonopodium, a narrow forward-pointing rod under the belly. Grey. Drawn opaque.",
  "Caudal: Rounded fan. Blue-grey with black spots and an orange edge. Drawn opaque.",
  "Pectoral: Rounded, behind the gill cover, " + FOLD + ". Clear. Drawn translucent.",
  "Pelvic: Pointed, just ahead of the gonopodium. Grey. Drawn translucent.", "No adipose fin."],
 marks='the rows of dark spots', top='elongate body, widest just behind the eyes, tapering to the caudal peduncle',
 toppat='the olive back under the sail base', row5='', scales=LARGE, pat='olive-grey body with rows of dark spots and a tall spotted sail dorsal',
 dont='Do not draw a short dorsal fin: the sail runs most of the back.', topdont='Do not make the body thick.')

S['severum'] = dict(common='severum', sci='Heros efasciatus', sl=6.5, cs='strongly laterally compressed',
 body=["Adult cichlid. Deep, disc-like, strongly laterally compressed body with an arched back and a rounded belly.",
  "Head with a steep forehead and a rounded snout; terminal mouth with thick lips.",
  "Greatest body depth at about a third of the length. Short, deep caudal peduncle.", "Eye round, high on the head."],
 colour="Adult (wild type). Olive-green to golden-brown body with eight faint dark vertical bars, the last one, across the rear body and into the soft dorsal and anal fins, darkest. Red-brown dots and wavy lines on the head and lower flank.\n\nEye: red-orange.",
 fins=["Dorsal: One continuous fin from the nape to the caudal peduncle: spiny front, soft rear extending into a point. Olive with red-brown spots. Drawn opaque.",
  "Anal: Long, spiny front and soft rear pointed, mirroring the dorsal. Olive with spots. Drawn opaque.",
  "Caudal: Rounded fan. Olive. Drawn opaque.",
  "Pectoral: Rounded, behind the gill cover, " + FOLD + ". Clear. Drawn translucent.",
  "Pelvic: Pointed with a trailing tip, below the pectoral base. Orange-red. Drawn opaque."],
 marks='the faint bars and the dark rear bar', top='laterally compressed body, widest just behind the eyes, tapering to the caudal peduncle',
 toppat='the olive back', row5='', scales=SMALL, pat='olive-gold disc cichlid with faint bars and a dark bar across the rear body',
 dont='Do not draw a torpedo.', topdont='Do not make the body spindle-shaped or thick.')

S['greenterror'] = dict(common='green terror (male)', sci='Andinoacara rivulatus', sl=6.5, cs='moderately laterally compressed',
 body=["Adult male cichlid. Oval, robust, laterally compressed body; a fatty nuchal hump on the forehead above the eyes.",
  "Head with the hump falling steeply to a rounded snout and thick lips; terminal mouth.",
  "Greatest body depth just behind the head. Deep caudal peduncle.", "Eye round, high on the head."],
 colour="Adult male. Green to blue-green body, each scale with a metallic blue-green centre. Blue-green wavy lines across the cheeks and gill covers. A dark blotch in the middle of the flank.\n\nEye: red-orange.",
 fins=["Dorsal: One continuous fin from the nape to the caudal peduncle, spiny front and pointed soft rear. Green with a broad orange-red edge. Drawn opaque.",
  "Anal: Spiny front, pointed soft rear. Green-blue. Drawn opaque.",
  "Caudal: Rounded fan with an orange-red rear edge. Drawn opaque.",
  "Pectoral: Rounded, behind the gill cover, " + FOLD + ". Clear. Drawn translucent.",
  "Pelvic: Pointed, below the pectoral base. Blue-green. Drawn opaque."],
 marks='the metallic blue-green scale centres and the mid-flank blotch', top='oval body, widest just behind the eyes, tapering to the caudal peduncle',
 toppat='the green back with the hump', row5='', scales=LARGE, pat='metallic green cichlid with blue face lines and orange-red fin edges',
 dont='Do not leave out the nuchal hump.', topdont='Do not make the body spindle-shaped.')

S['agassizii'] = dict(common="Agassiz's dwarf cichlid (male)", sci='Apistogramma agassizii', sl=2.4, cs='moderately laterally compressed',
 body=["Adult male dwarf cichlid. Elongate, laterally compressed body with a gently arched back and a straight belly.",
  "Head with a sloping forehead and a rounded snout; terminal mouth.",
  "Greatest body depth at the dorsal-fin origin. Deep caudal peduncle.", "Eye round, high on the head."],
 colour="Adult male. Yellow-tan body with a blue sheen on the flank; a dark stripe runs from the eye along the middle of the flank to the caudal peduncle. Blue lines on the cheek below the eye.\n\nEye: red-brown.",
 fins=["Dorsal: One continuous fin from the nape to the caudal peduncle, of even height, the rear rays extending into a point. Yellow-orange with a red edge. Drawn opaque.",
  "Anal: Pointed soft rear. Blue with orange. Drawn opaque.",
  "Caudal: Lanceolate (spade-shaped, pointed in the middle), blue-white with a broad orange-red edge band. Drawn opaque.",
  "Pectoral: Rounded, behind the gill cover, " + FOLD + ". Clear. Drawn translucent.",
  "Pelvic: Pointed with a trailing tip. Blue. Drawn opaque."],
 marks='the dark lateral stripe', top='elongate body, widest just behind the eyes, tapering to the caudal peduncle',
 toppat='the tan back', row5='', scales=SMALL, pat='yellow-tan body with a dark lateral stripe and a spade-shaped orange-edged tail',
 dont='Do not draw a deep disc.', topdont='Do not make the body thick.')

S['elephantnose'] = dict(common='elephantnose fish', sci='Gnathonemus petersii', sl=7.0, cs='strongly laterally compressed',
 body=["Adult elephantfish. Elongate, laterally compressed body with a straight back and a gently curved belly.",
  "Head rounded on top; the lower jaw extends forward and down into a trunk-like chin appendage (Schnauzenorgan), about as long as the head, curving down at its tip; small mouth at the base of the trunk.",
  "Greatest body depth at about the middle of the body. A thin caudal peduncle.", "Eye round, high on the head."],
 colour="Adult. Dark brown to black body with a purple sheen. Two thin white lines cross the body between the dorsal and anal fins, running from the front of the dorsal down to the front of the anal fin.\n\nEye: dark.",
 fins=["Dorsal: Far back on the body, directly above the anal fin, of the same length. Dark. Drawn opaque.",
  "Anal: Far back, below and mirroring the dorsal. Dark. Drawn opaque.",
  "Caudal: Deeply forked, two rounded lobes. Dark. Drawn opaque.",
  "Pectoral: Rounded, behind the gill cover, " + FOLD + ". Dark. Drawn translucent.",
  "Pelvic: Rounded, mid-belly. Dark. Drawn opaque.", "No adipose fin."],
 marks='the two thin white lines', top='elongate body, widest just behind the eyes, tapering to the thin caudal peduncle; the chin trunk ahead of the head',
 toppat='the dark back', row5='', scales=MINUTE, pat='dark brown body with a trunk-like chin and two thin white lines between the rear fins',
 dont='Do not draw a trunk on the upper jaw or nose: it is the chin. Do not draw a deep body.', topdont='Do not make the body thick.')

S['arowana'] = dict(common='silver arowana', sci='Osteoglossum bicirrhosum', sl=20.0, cs='strongly laterally compressed',
 body=["Adult arowana. Long, knife-shaped, strongly laterally compressed body with a nearly straight back and a deep, keeled belly.",
  "Head with a straight forehead; a steeply upturned mouth set at the top of the snout; two barbels on the tip of the lower jaw, pointing forward.",
  "Greatest body depth at about a third of the length. Body narrows steadily to a short caudal peduncle.", "Eye round, high on the head."],
 colour="Adult. Bright metallic silver with a faint blue-green and pink sheen; large scales outlined in pink.\n\nEye: silver with a dark pupil.",
 fins=["Dorsal: Long, low fin on the rear half of the back, running almost to the caudal. Silvery-green. Drawn semi-translucent.",
  "Anal: Long, low fin under the rear half, mirroring the dorsal and running almost to the caudal. Silvery. Drawn semi-translucent.",
  "Caudal: Pointed, rounded-lanceolate, close behind the dorsal and anal. Silvery. Drawn semi-translucent.",
  "Pectoral: Long and pointed, low behind the gill cover, " + FOLD + ". Clear. Drawn translucent.",
  "Pelvic: Pointed, under the middle of the body. Clear. Drawn translucent.", "No adipose fin."],
 marks='the large pink-edged scales', top='knife-shaped body, widest behind the head, tapering steadily to the tail',
 toppat='the silver-green back', row5='', scales=LARGE, pat='metallic silver knife body with large pink-edged scales and an upturned mouth with chin barbels',
 dont='Do not draw a short or deep body.', topdont='Do not make the body thick or round.')

S['upsidedowncat'] = dict(common='upside-down catfish', sci='Synodontis nigriventris', sl=2.8, cs='flattened below, laterally compressed toward the tail',
 body=["Adult catfish, shown upright in every row. Robust body with a high, arched back and a flat belly.",
  "Head with a rounded snout; underslung mouth with three pairs of barbels, the upper pair branched at its base and as long as the head.",
  "Greatest body depth at the dorsal-fin origin. Moderate caudal peduncle.", "Eye round, high on the side of the head."],
 colour="Adult. Light brown to beige with irregular dark brown blotches over the body and fins. The belly is darker than the back (countershading reversed).\n\nEye: dark.",
 fins=["Dorsal: Tall triangle with a stiff front spine, behind the head. Blotched. Drawn opaque.",
  "Anal: Short-based, rounded, behind the middle of the belly. Blotched. Drawn semi-translucent.",
  "Caudal: Forked. Blotched brown. Drawn semi-translucent.",
  "Pectoral: Pointed with a stiff spine, low behind the gill cover, " + FOLD + ". Blotched. Drawn semi-translucent.",
  "Pelvic: Rounded, under the dorsal. Blotched. Drawn semi-translucent.",
  "Adipose: A long, high adipose fin from behind the dorsal almost to the caudal. Blotched. Drawn opaque."],
 marks='the dark blotches', top='body widest at the head behind the eyes, tapering to the caudal peduncle',
 toppat='the blotched beige back', row5=ADIPOSE, scales='The species has no scales; skin should look smooth.',
 pat='beige catfish with dark blotches, a dark belly and branched barbels',
 dont='Do not draw the fish upside down. Do not draw a slender body.', topdont='Do not make the body narrow.')

S['dwarfchainloach'] = dict(common='dwarf chain loach', sci='Ambastaia sidthimunki', sl=1.8, cs='moderately laterally compressed',
 body=["Adult loach. Elongate body with a gently arched back and a flattish belly.",
  "Head with a sloping forehead and a downturned, pointed-rounded snout; underslung mouth with short barbels.",
  "Greatest body depth at the dorsal-fin origin. Moderate caudal peduncle.", "Eye round, high on the head."],
 colour="Adult. Cream to golden body with a chain-like black pattern: a black stripe along the back and another along the mid-flank, joined by short black vertical links, leaving rows of cream ovals. Belly plain cream.\n\nEye: dark.",
 fins=["Dorsal: Short-based, at the middle of the back. Clear with dark bands. Drawn translucent.",
  "Anal: Short, behind the middle of the belly. Clear. Drawn translucent.",
  "Caudal: Forked. Clear with dark bands. Drawn translucent.",
  "Pectoral: Rounded, low behind the gill cover, " + FOLD + ". Clear. Drawn translucent.",
  "Pelvic: Rounded, under the dorsal. Clear. Drawn translucent.", "No adipose fin."],
 marks='the black chain pattern', top='elongate body, widest just behind the eyes, tapering to the caudal peduncle',
 toppat='the black back stripe', row5='', scales=MINUTE, pat='cream body with a black chain-link pattern',
 dont='Do not draw a deep body or a pointed wedge head.', topdont='Do not make the body thick.')

S['maroonclown'] = dict(common='maroon clownfish', sci='Premnas biaculeatus', sl=4.5, cs='moderately laterally compressed',
 body=["Adult clownfish. Oval, robust, laterally compressed body with an arched back and a rounded belly.",
  "Head with a rounded forehead and a rounded snout; terminal mouth. Two sharp spines below each eye on the cheek, pointing back.",
  "Greatest body depth at about a third of the length. Deep caudal peduncle.", "Eye round, high on the head."],
 colour="Adult. Deep maroon-red body with three narrow white (or pale yellow) vertical bars: one behind the eye, one across the middle of the body below the dorsal notch, and one across the caudal peduncle.\n\nEye: dark red.",
 fins=["Dorsal: One continuous fin from the nape to the caudal peduncle: a spiny front part, a notch, then a soft rounded rear part. Maroon. Drawn opaque.",
  "Anal: Rounded soft rear. Maroon. Drawn opaque.", "Caudal: Rounded. Maroon. Drawn opaque.",
  "Pectoral: Rounded, behind the gill cover, " + FOLD + ". Maroon-orange. Drawn semi-translucent.",
  "Pelvic: Pointed, below the pectoral base. Maroon. Drawn opaque."],
 marks='the three narrow white bars and the cheek spines', top='oval body, widest just behind the eyes, tapering to the caudal peduncle',
 toppat='the maroon back crossed by the bar tops', row5='', scales=SMALL, pat='deep maroon body with three narrow white bars',
 dont='Do not draw orange with black-edged bars (that is the ocellaris).', topdont='Do not make the body spindle-shaped.')

S['boxfish'] = dict(common='yellow boxfish (juvenile)', sci='Ostracion cubicus', sl=3.0, cs='box-shaped, almost square in cross-section',
 body=["Juvenile boxfish. A rigid, cube-like body encased in bony plates, with flat sides, a flat belly and a flat back; the tail stalk projects behind the box.",
  "Head with a steep, flat forehead and a short snout; small, terminal mouth with full lips.",
  "Greatest body depth at about the middle of the box. The caudal peduncle is free of the box and flexible.", "Eye round, high on the side of the box."],
 colour="Juvenile. Bright lemon yellow all over, covered with small round black spots evenly spaced over the box and head.\n\nEye: dark with a yellow ring.",
 fins=["Dorsal: A single rounded fin on the rear of the back, just in front of the tail stalk. Yellow, clear. Drawn translucent.",
  "Anal: A single rounded fin below the dorsal. Yellow. Drawn translucent.",
  "Caudal: Rounded fan on the end of the tail stalk. Yellow with black spots. Drawn semi-translucent.",
  "Pectoral: Rounded fan behind the gill opening, " + FOLD + ". Clear yellow. Drawn translucent.",
  "Pelvic: No pelvic fins."],
 marks='the black spots', top='square box body, as wide as it is deep, tapering only at the tail stalk',
 toppat='the spotted yellow back', row5='', scales='The skin is a mosaic of hexagonal bony plates; draw them as a faint hexagon pattern.',
 pat='lemon-yellow box with even black spots', dont='Do not draw a rounded or fish-shaped body: it is a box.', topdont='Do not make the body narrow.', no_fins=['pelvic'])

S['valentini'] = dict(common='Valentini puffer', sci='Canthigaster valentini', sl=3.2, cs='rounded, slightly laterally compressed',
 body=["Adult sharpnose puffer, at rest (not inflated). Round-bellied body with a pointed head and a tapering rear.",
  "Head with a long, sloping forehead running to a pointed snout; terminal beak-like mouth.",
  "Greatest body depth just behind the eyes. Narrow caudal peduncle.", "Eye round, high on the head."],
 colour="Adult. White body with four dark brown to black saddle bars across the back, the middle two reaching down the flank to the belly. Small orange-brown spots over the face and lower body. Blue lines around the eye.\n\nEye: green-blue.",
 fins=["Dorsal: A single rounded fin far back on the back. Clear yellowish. Drawn translucent.",
  "Anal: A single rounded fin below the dorsal. Clear. Drawn translucent.",
  "Caudal: Rounded fan, yellow with dark edges. Drawn semi-translucent.",
  "Pectoral: Rounded fan behind the gill opening, " + FOLD + ". Clear. Drawn translucent.", "Pelvic: No pelvic fins."],
 marks='the four dark saddle bars', top='rounded body, widest behind the eyes, tapering to the caudal peduncle; pointed snout',
 toppat='the dark saddles across the back', row5='', scales='The species has no scales; skin should look smooth.',
 pat='white puffer with four dark saddles and orange spots', dont='Do not draw an inflated ball.', topdont='Do not make the body narrow.', no_fins=['pelvic'])

S['purpletang'] = dict(common='purple tang', sci='Zebrasoma xanthurum', sl=8.0, cs='strongly laterally compressed',
 body=["Adult tang. Deep, oval, strongly laterally compressed body, deep through the middle.",
  "Head with a concave forehead and a projecting snout; terminal mouth at its tip.",
  "Greatest body depth at the middle of the body. Narrow caudal peduncle with a scalpel spine on each side.", "Eye round, high on the head."],
 colour="Adult. Deep blue-purple body and head with fine dark dots on the head and front body and faint horizontal lines along the flank. Pectoral fin and tail fin bright yellow.\n\nEye: dark.",
 fins=["Dorsal: One continuous tall fin from the nape to the caudal peduncle, highest in the middle. Purple. Drawn opaque.",
  "Anal: Tall, from behind the pelvics to the caudal peduncle, mirroring the dorsal. Purple. Drawn opaque.",
  "Caudal: Square-cut fan, bright yellow. Drawn opaque.",
  "Pectoral: Pointed, behind the gill cover, " + FOLD + ". Yellow. Drawn semi-translucent.",
  "Pelvic: Pointed, below the pectoral base. Purple. Drawn opaque."],
 marks='the dark head dots and the flank lines', top='strongly laterally compressed body, widest behind the eyes, tapering to the caudal peduncle',
 toppat='the purple back', row5='', scales=MINUTE, pat='blue-purple tang with a bright yellow tail and yellow pectoral fins',
 dont='Do not draw a torpedo.', topdont='Do not make the body thick.')

S['bicolorblenny'] = dict(common='bicolor blenny', sci='Ecsenius bicolor', sl=3.0, cs='moderately laterally compressed',
 body=["Adult combtooth blenny. Elongate body with a straight back and belly, deepest at the head.",
  "Head with a steep, rounded forehead; terminal mouth below the eyes. A short cirrus above each eye.",
  "Body narrows gently to a deep caudal peduncle.", "Eye round, high on the head, near the top profile."],
 colour="Adult (common form). The front half of the body and the head are dark brown to blue-black; the rear half, from about the middle of the dorsal fin back, is bright orange-yellow, with a sharp boundary.\n\nEye: dark.",
 fins=["Dorsal: One continuous fin from behind the head to the caudal peduncle, with a shallow notch. Dark in front, orange behind. Drawn semi-translucent.",
  "Anal: From mid-belly to the caudal peduncle. Orange. Drawn semi-translucent.",
  "Caudal: Rounded, orange-yellow. Drawn semi-translucent.",
  "Pectoral: Rounded fan, held spread at the sides when resting on rock. Clear. Drawn translucent.",
  "Pelvic: Short, finger-like, under the throat. Dark. Drawn opaque."],
 marks='the dark front half and orange rear half', top='elongate body, widest across the head, tapering gently to the caudal peduncle',
 toppat='the dark front back and orange rear back', row5='', scales='The species has no scales; skin should look smooth.',
 pat='blenny with a dark blue-brown front half and an orange rear half', dont='Do not draw a pointed snout or a deep body.', topdont='Do not make the body narrow.')

S['neongoby'] = dict(common='neon goby', sci='Elacatinus oceanops', sl=1.6, cs='rounded, nearly cylindrical',
 body=["Adult goby. Slender, cylindrical body with a straight back and belly.",
  "Head with a rounded snout; underslung terminal mouth.",
  "Body even in depth from behind the head to a deep caudal peduncle.", "Eye round, high on the head."],
 colour="Adult. Black upper body. An electric-blue stripe runs from the front of the eye along the upper flank to the tail fin's end. Belly grey-white.\n\nEye: dark, crossed by the blue stripe.",
 fins=["Dorsal: Two separate dorsal fins: a rounded first dorsal and a longer second dorsal. Clear grey. Drawn translucent.",
  "Anal: Under the second dorsal. Clear grey. Drawn translucent.",
  "Caudal: Rounded, black with the blue stripe running into it. Drawn semi-translucent.",
  "Pectoral: Rounded fan, held spread when resting. Clear. Drawn translucent.",
  "Pelvic: Fused into a small round disc under the chest. Clear. Drawn translucent."],
 marks='the electric-blue stripe', top='cylindrical body, even width, tapering only at the tail',
 toppat='the black back with the two blue stripes', row5=DORSAL2, scales=MINUTE,
 pat='black goby with an electric-blue stripe from the eye to the tail', dont='Do not draw a compressed or deep body.', topdont='Do not make the body narrow.')

S['bluedamsel'] = dict(common='blue damselfish (male)', sci='Chrysiptera cyanea', sl=2.3, cs='moderately laterally compressed',
 body=["Adult damselfish. Oval, laterally compressed body with an evenly arched back and belly.",
  "Head with a rounded forehead and a short, rounded snout; terminal mouth.",
  "Greatest body depth at about the middle of the body. Deep caudal peduncle.", "Eye round, high on the head."],
 colour="Adult male. Bright electric blue all over, with a thin black line from the snout through the eye. The tail fin and the rear of the anal fin are yellow-orange in males.\n\nEye: dark.",
 fins=["Dorsal: One continuous fin from the nape to the caudal peduncle, spiny front and rounded soft rear. Blue. Drawn opaque.",
  "Anal: Rounded soft rear. Blue, the rear part yellow. Drawn opaque.",
  "Caudal: Forked. Yellow-orange. Drawn semi-translucent.",
  "Pectoral: Rounded, behind the gill cover, " + FOLD + ". Clear. Drawn translucent.",
  "Pelvic: Pointed, below the pectoral base. Blue. Drawn opaque."],
 marks='the black line through the eye', top='oval body, widest just behind the eyes, tapering to the caudal peduncle',
 toppat='the blue back', row5='', scales=SMALL, pat='electric blue damsel with a yellow-orange tail',
 dont='Do not draw a deep disc or a torpedo.', topdont='Do not make the body thick.')

S['melanurus'] = dict(common='melanurus wrasse (male)', sci='Halichoeres melanurus', sl=3.5, cs='moderately laterally compressed',
 body=["Adult male wrasse. Elongate, cigar-shaped, laterally compressed body with a straight back and belly.",
  "Head with a sloping forehead and a pointed snout; terminal mouth with visible lips.",
  "Greatest body depth just behind the head. Deep caudal peduncle.", "Eye round, high on the head."],
 colour="Adult male. Alternating horizontal stripes of turquoise-blue and orange along the whole body, about six of each; the face has orange lines on blue. A black spot at the base of the tail fin with a yellow area behind it.\n\nEye: red-orange.",
 fins=["Dorsal: One continuous low fin from behind the head to the caudal peduncle. Orange and blue stripes, with a dark spot at the front. Drawn opaque.",
  "Anal: Long, low, from mid-belly to the peduncle. Orange and blue. Drawn opaque.",
  "Caudal: Rounded to square, yellow centre with a black base spot and blue edges. Drawn opaque.",
  "Pectoral: Rounded, behind the gill cover, " + FOLD + ". Clear. Drawn translucent.",
  "Pelvic: Pointed, below the pectoral base. Blue. Drawn semi-translucent."],
 marks='the blue and orange stripes', top='elongate body, widest just behind the eyes, tapering to the caudal peduncle',
 toppat='the striped back', row5='', scales=SMALL, pat='turquoise-blue and orange horizontal stripes with a black tail-base spot',
 dont='Do not draw a deep body.', topdont='Do not make the body thick.')

M.S = S
ORDER = list(S)

if __name__ == '__main__':
    B = M.B
    if sys.argv[1:] == ['--finish']:
        REPO = os.path.dirname(HERE)
        for id in ORDER:
            p = B + id + '-b12-gen/prompt.txt'
            t = M.strip_fins(open(p, encoding='utf-8').read(), S[id].get('no_fins', []))
            open(p, 'w', encoding='utf-8').write(t)
            open(os.path.join(REPO, 'research', 'fish-sheets', 'prompts', id + '-b12-5row.md'), 'w', encoding='utf-8').write(t)
            print(id, len(t))
    else:
        for id in ORDER:
            open(B + id + '-b12-gen/species.txt', 'w', encoding='utf-8').write(M.block(id, S[id]))
        print(len(ORDER), 'species.txt written')
