"""b11 (2026-11-27): write species.txt for the 20 new roster species into C:/Users/nreed/fish-sheets/<id>-b11-gen/.
DEPTH_PCT / EXTRA_RATIOS / front-view ratio come from each folder's fishshapes.json (PIPELINE step 3).
Looks written from the species' standard real-photo appearance; the Commons sources are listed in HANDOFF-batch-b11.md.
No blanket "blunt, gently rounded snout" bullet (R194 / lane FH1): each snout is described as the species has it.
Usage: python -I scripts/b11-species-blocks.py   (then fish-prompt-fill.py per folder)"""
import json, os, sys

B = 'C:/Users/nreed/fish-sheets/'
FRONT = ('Seen from the front, the closed mouth is a fine lip line on a solid head surface; the nostrils are faint marks '
         'on the skin, never dark holes or openings.')
SUBDUED = 'Natural colouring, slightly subdued, not neon-saturated.\n\n'
ADIPOSE = '* Adipose fin: red (#FF0000), like the dorsal.\\n'
DORSAL2 = '* Second dorsal fin: red (#FF0000), like the first dorsal.\\n'
NO_PED = {'blackghost', 'snowflakemoray'}   # no measurable caudal peduncle: leave the peduncle ratio out

S = {}

S['serpae'] = dict(common='serpae tetra', sci='Hyphessobrycon eques', sl=1.3, cs='moderately laterally compressed',
 body=["Adult tetra. Rhomboid, laterally compressed body: the back rises steeply from the head to the dorsal-fin origin and the belly curves down to the anal-fin origin.",
  "Head with a straight, gently sloping forehead and a rounded, short snout. Terminal mouth.",
  "Greatest body depth at the dorsal-fin origin, about the middle of the body. Narrow caudal peduncle.",
  "Eye round, set high and forward on the head."],
 colour="Adult. Body a deep red to red-orange, a little paler on the belly and darker along the back. A black comma-shaped shoulder spot, taller than it is wide, sits on the flank just behind the gill cover. No other body markings.\n\nEye: dark, with a red-orange upper rim.",
 fins=["Dorsal: Short-based, tall, pointed fin at the highest point of the back. Mostly black, with a white tip and a red base. Drawn opaque.",
  "Anal: Long base from mid-belly almost to the caudal peduncle, deepest at the front and tapering back. Red with a black rear margin and a white front tip. Drawn opaque.",
  "Caudal: Forked, with two pointed lobes. Red. Drawn semi-translucent.",
  "Pectoral: Rounded, emerging just behind the gill cover, naturally folded close against the flank. Clear with a faint red tint. Drawn translucent.",
  "Pelvic: Pointed, under the front of the dorsal. Red with white tips. Drawn semi-translucent.",
  "Adipose: A small rounded tab on the back between the dorsal and the caudal. Red-tinged. Drawn opaque."],
 marks='the black shoulder spot', top='laterally compressed body, widest just behind the eyes, tapering evenly to the caudal peduncle',
 toppat='the darker red back', row5=ADIPOSE,
 scales='The species has small, even scales; draw them as a faint, smooth texture, not as individually outlined scales.',
 pat='deep red body with a black shoulder spot and a black dorsal fin',
 dont='Do not draw a torpedo or an oval: the back rises to a peak at the dorsal-fin origin. Do not draw long trailing fin filaments.',
 topdont='Do not make the body spindle-shaped or excessively thick.')

S['congotetra'] = dict(common='Congo tetra (male)', sci='Phenacogrammus interruptus', sl=2.7, cs='moderately laterally compressed',
 body=["Adult male. Elongate, laterally compressed body with a gently arched back and a straighter belly.",
  "Head with a straight forehead and a short, rounded snout. Terminal, slightly upturned mouth.",
  "Greatest body depth at the dorsal-fin origin. Moderate caudal peduncle.",
  "Eye round, high on the head, with a red upper rim."],
 colour="Adult male. Iridescent body: blue-grey along the back, a broad gold-orange band along the middle of the flank from behind the gill cover to the caudal peduncle, and a blue-violet sheen over the lower flank and belly. Large, visible silvery scales give a glittering texture.\n\nEye: silver with a red upper half.",
 fins=["Dorsal: Tall, pointed fin from the middle of the back, its rear rays trailing into a short point. Grey-violet with a white margin. Drawn translucent.",
  "Anal: Long base from behind the pelvics to the caudal peduncle, deepest at the front. Grey-violet with a white edge. Drawn translucent.",
  "Caudal: Forked, with a frilly, ragged central extension of grey rays trailing beyond the two lobes; the lobes have white outer margins. Drawn translucent.",
  "Pectoral: Rounded, emerging behind the gill cover, naturally folded close against the flank. Clear. Drawn translucent.",
  "Pelvic: Pointed, below the dorsal origin. Grey-violet. Drawn translucent.",
  "Adipose: A small rounded tab on the back in front of the caudal. Grey. Drawn opaque."],
 marks='the gold-orange flank band', top='laterally compressed body, widest just behind the eyes, tapering evenly to the caudal peduncle',
 toppat='the blue-grey back', row5=ADIPOSE,
 scales='The species has large, visible, iridescent scales; draw them as a regular, gently reflective scale pattern.',
 pat='gold-orange band on an iridescent blue-violet body with white-edged fins',
 dont='Do not draw a deep disc or a round body. Do not split the frilly caudal extension into separate fins.',
 topdont='Do not make the body spindle-shaped or excessively thick.')

S['silverdollar'] = dict(common='silver dollar', sci='Metynnis argenteus', sl=4.5, cs='strongly laterally compressed',
 body=["Adult. Nearly round, strongly laterally compressed, disc-shaped body: the back and belly are evenly arched.",
  "Head with a steep, gently convex forehead and a short, rounded snout. Terminal mouth with a slightly projecting lower jaw.",
  "Greatest body depth at about the middle of the body. A sharp keel of serrated scales runs along the belly midline. Short caudal peduncle.",
  "Eye round, at mid-head height, close to the snout."],
 colour="Adult. Bright metallic silver all over, with a faint greenish-grey sheen along the back. A few faint dark spots may show high on the flank. No bars or stripes.\n\nEye: silver with a dark pupil.",
 fins=["Dorsal: Starts at the highest point of the back; short-based, tall and rounded at its tip. Clear to silvery. Drawn translucent.",
  "Anal: Long base from the middle of the belly to the caudal peduncle, deepest at the front where it is rounded; a red-orange front edge. Drawn semi-translucent.",
  "Caudal: Forked, two rounded lobes. Clear with a thin dark rear margin. Drawn translucent.",
  "Pectoral: Rounded, low behind the gill cover, naturally folded close against the flank. Clear. Drawn translucent.",
  "Pelvic: Pointed, mid-belly. Clear. Drawn translucent.",
  "Adipose: A long, low adipose fin along the rear of the back, in front of the caudal. Silvery-grey. Drawn opaque."],
 marks='the belly keel', top='strongly laterally compressed disc body, widest just behind the eyes, tapering to the caudal peduncle',
 toppat='the greenish-silver back', row5=ADIPOSE,
 scales='The species has minute scales; skin should look smooth and metallic rather than displaying individual scales.',
 pat='round metallic silver disc body with a red-edged anal fin',
 dont='Do not draw a piranha-like head, visible teeth or an oval: the body is an evenly arched disc.',
 topdont='Do not make the body thick or rounded in cross-section.')

S['denison'] = dict(common='Denison barb', sci='Sahyadria denisonii', sl=4.8, cs='moderately laterally compressed',
 body=["Adult barb. Slender, torpedo-shaped body, gently arched back and nearly straight belly.",
  "Head with a straight, sloping forehead and a pointed but rounded-tipped snout; terminal mouth with one pair of fine barbels at the corners.",
  "Greatest body depth at the dorsal-fin origin, just ahead of the middle. Slender caudal peduncle.",
  "Eye round, mid-head, close to the snout."],
 colour="Adult. Silver body, olive-green along the back. A black stripe runs from the snout tip through the eye along the lower flank to the caudal base. Above it a bright red stripe starts at the snout and runs through the eye to the middle of the flank, ending below the dorsal fin. A thin metallic green-gold line above the red stripe.\n\nEye: silver with the red stripe crossing it.",
 fins=["Dorsal: Short-based, triangular fin at the middle of the back. Clear, with a red front edge and a black tip. Drawn translucent.",
  "Anal: Short-based, triangular, behind the pelvics. Clear. Drawn translucent.",
  "Caudal: Deeply forked; each lobe has a yellow band then a black band near its tip and a clear tip. Drawn semi-translucent.",
  "Pectoral: Pointed, low behind the gill cover, naturally folded close against the flank. Clear. Drawn translucent.",
  "Pelvic: Pointed, under the dorsal origin. Clear. Drawn translucent.",
  "No adipose fin."],
 marks='the black body stripe and the red stripe', top='slender torpedo body, widest just behind the eyes, tapering evenly to the caudal peduncle',
 toppat='the olive-green back', row5='',
 scales='The species has small, even scales; draw them as a faint, smooth texture, not as individually outlined scales.',
 pat='silver torpedo body with a black lateral stripe and a red stripe through the eye, yellow-and-black banded tail lobes',
 dont='Do not draw a deep, barb-like body. Do not run the red stripe the whole length of the body: it ends below the dorsal fin.',
 topdont='Do not make the body thick or round in cross-section.')

S['paradisefish'] = dict(common='paradise fish (male)', sci='Macropodus opercularis', sl=2.7, cs='moderately laterally compressed',
 body=["Adult male labyrinth fish. Elongate oval, laterally compressed body, evenly arched back and belly.",
  "Head with a gently sloping forehead, a pointed snout and an upturned, terminal mouth.",
  "Greatest body depth just ahead of the middle of the body. Deep caudal peduncle.",
  "Eye round, high on the head.",
  "A dark blue-black spot with an orange rim on the rear corner of the gill cover."],
 colour="Adult male. Alternating vertical bars across the flank from behind the gill cover to the caudal peduncle: about ten bright red-orange bars and blue-green bars of similar width. The head is grey-brown with dark lines running back from the eye.\n\nEye: dark, with a gold ring.",
 fins=["Dorsal: Starts above the middle of the body and runs to the caudal peduncle, rear rays extending into a pointed tip. Blue-grey with red-orange spots and a white edge. Drawn opaque.",
  "Anal: Long base from behind the pelvics to the caudal peduncle, its rear rays extending into a pointed tip. Blue with red streaks and a white edge. Drawn opaque.",
  "Caudal: Forked with two lobes extending into pointed streamers. Red-orange with blue edges. Drawn opaque.",
  "Pectoral: Rounded, behind the gill cover, naturally folded close against the flank. Clear. Drawn translucent.",
  "Pelvic: A single pointed ray-like fin, below the pectoral base, red with a white tip. Drawn opaque.",
  "No adipose fin."],
 marks='the red and blue-green vertical bars and the gill-cover spot', top='laterally compressed oval body, widest just behind the eyes, tapering to a deep caudal peduncle',
 toppat='the barred grey-brown back', row5='',
 scales='The species has small, even scales; draw them as a faint, smooth texture, not as individually outlined scales.',
 pat='alternating red-orange and blue-green bars with pointed red-and-blue streamer fins',
 dont='Do not draw a round or betta-like veil fin; the caudal is forked. Do not draw a torpedo.',
 topdont='Do not make the body spindle-shaped or excessively thick.')

S['jackdempsey'] = dict(common='Jack Dempsey cichlid', sci='Rocio octofasciata', sl=8.0, cs='moderately laterally compressed',
 body=["Adult cichlid. Oval, robust, laterally compressed body with an arched back and a rounded belly.",
  "Head with a steep, slightly convex forehead and a rounded snout; thick lips, terminal mouth.",
  "Greatest body depth at about a third of the body length from the head. Deep caudal peduncle.",
  "Eye round, high on the head, above the mouth."],
 colour="Adult. Dark grey-brown to purple-black body and head densely covered with small iridescent blue-green and gold spots. A black spot in the middle of the flank and a black spot at the upper caudal base. Faint darker vertical bars may show.\n\nEye: dark, with a red-gold ring.",
 fins=["Dorsal: One continuous fin from above the gill cover to the caudal peduncle: a spiny front part and a soft rear part ending in a point; the edge is red and the fin is spotted with blue-green. Drawn opaque.",
  "Anal: Starts behind the middle of the belly, spiny front and soft rear ending in a point. Dark with blue-green spots. Drawn opaque.",
  "Caudal: Rounded fan. Dark with blue-green spots. Drawn opaque.",
  "Pectoral: Rounded, emerging behind the gill cover, naturally folded close against the flank. Clear brownish. Drawn translucent.",
  "Pelvic: Pointed, below the pectoral base. Dark with a blue edge. Drawn opaque."],
 marks='the blue-green spotting and the two black spots', top='oval body, widest just behind the eyes, tapering to the caudal peduncle',
 toppat='the dark spotted back', row5='',
 scales='The species has medium, visible scales; draw them as a regular pattern, each scale holding a spot of colour.',
 pat='dark body densely spotted with iridescent blue-green, red-edged dorsal',
 dont='Do not draw a disc or a torpedo. Do not draw a nuchal hump.',
 topdont='Do not make the body spindle-shaped or excessively thick.')

S['frontosa'] = dict(common='frontosa cichlid', sci='Cyphotilapia frontosa', sl=10.5, cs='moderately laterally compressed',
 body=["Adult cichlid. Deep, laterally compressed body with a high, arched back and a rounded belly.",
  "A rounded fatty hump (nuchal hump) rises on the forehead above the eyes; below it the snout slopes down to thick lips and a terminal mouth set low.",
  "Greatest body depth just behind the head. Deep caudal peduncle.",
  "Eye round, high on the side of the head below the hump."],
 colour="Adult. White to pale blue-white body with six broad black vertical bars: one through the eye down the cheek, one across the nape, then four on the flank, the last on the caudal peduncle. The bars run from the back almost to the belly. The face has a blue sheen.\n\nEye: dark, sitting in the black eye bar.",
 fins=["Dorsal: One continuous fin from the nape to the caudal peduncle, low spiny front and longer soft rear ending in a point. White with black bar continuations and a blue tint. Drawn opaque.",
  "Anal: Starts behind the middle of the belly, soft rear ending in a point. Blue-white with black. Drawn opaque.",
  "Caudal: Slightly forked fan with pointed tips. Blue-white. Drawn opaque.",
  "Pectoral: Rounded, emerging behind the gill cover, naturally folded close against the flank. Clear. Drawn translucent.",
  "Pelvic: Pointed with a trailing tip, below the pectoral base. Blue-white with a black edge. Drawn opaque."],
 marks='the six black vertical bars and the nuchal hump', top='deep body, widest just behind the eyes, tapering to the caudal peduncle',
 toppat='the white back crossed by the black bar tops', row5='',
 scales='The species has small, even scales; draw them as a faint, smooth texture, not as individually outlined scales.',
 pat='white body with six broad black vertical bars and a nuchal hump',
 dont='Do not leave out the nuchal hump. Do not draw a flat forehead.',
 topdont='Do not make the body spindle-shaped or excessively thick.')

S['blackghost'] = dict(common='black ghost knifefish', sci='Apteronotus albifrons', sl=7.5, cs='strongly laterally compressed',
 body=["Adult knifefish. Elongate, knife-shaped, strongly laterally compressed body: the back is almost straight, and the body tapers steadily from behind the head to a thin tail.",
  "Head with a rounded forehead and a short, rounded snout; terminal mouth.",
  "Greatest body depth just behind the head. No caudal peduncle: the body narrows to a thin tail stalk ending in a small caudal fin.",
  "Eye round, near the snout.",
  "No dorsal fin: a thin dorsal filament lies along the rear back, flush with the body."],
 colour="Adult. Velvet black all over. A white stripe runs along the snout and the top of the head to the nape. Two white bands circle the tail stalk near its end.\n\nEye: black.",
 fins=["Dorsal: No dorsal fin.",
  "Anal: One continuous ribbon fin from under the pectoral to near the tail tip, along almost the whole underside. Black. Drawn opaque.",
  "Caudal: Rounded fan at the end of the tail stalk, behind the white bands. Black. Drawn opaque.",
  "Pectoral: Rounded, behind the gill cover, naturally folded close against the flank. Black. Drawn translucent.",
  "Pelvic: No pelvic fins."],
 marks='the white head stripe and the two white bands near the end of the body', top='knife-shaped body, widest behind the head, tapering steadily to the tail',
 toppat='the white stripe along the top of the head', row5='',
 scales='The species has minute scales; skin should look smooth and velvety rather than displaying large individual scales.',
 pat='velvet black knife body with a white head stripe and two white tail bands',
 dont='Do not draw a dorsal fin or pelvic fins. Do not draw an eel or a round body.',
 topdont='Do not make the body thick or round in cross-section.', no_fins=['dorsal', 'pelvic'])

S['pictus'] = dict(common='pictus catfish', sci='Pimelodus pictus', sl=3.5, cs='slightly depressed at the head, laterally compressed toward the tail',
 body=["Adult catfish. Elongate, streamlined body with a flat belly and a gently arched back.",
  "Head flattened from above, with a rounded snout; subterminal mouth. Three pairs of barbels: one pair of maxillary barbels from the upper jaw corners reach back past the anal fin; two pairs of shorter chin barbels.",
  "Greatest body depth at the dorsal-fin origin. Slender caudal peduncle.",
  "Eye round, on the upper side of the head."],
 colour="Adult. Silver-white body and head covered with round black spots of different sizes, scattered evenly over the flanks and back. Black streaks along the dorsal and caudal fins.\n\nEye: dark.",
 fins=["Dorsal: Tall triangle with a stiff front spine at the highest point of the back. Clear with a black stripe. Drawn translucent.",
  "Anal: Short-based, rounded, behind the middle of the belly. Clear. Drawn translucent.",
  "Caudal: Deeply forked with pointed lobes. Clear, each lobe with a black stripe along it. Drawn translucent.",
  "Pectoral: Pointed with a stiff front spine, emerging low behind the gill cover, naturally folded close against the flank. Clear. Drawn translucent.",
  "Pelvic: Rounded, under the dorsal. Clear. Drawn translucent.",
  "Adipose: A long, low adipose fin from behind the dorsal almost to the caudal. Silver with black spots. Drawn opaque."],
 marks='the black spots', top='body widest at the head behind the eyes, tapering to the caudal peduncle; the maxillary barbels trail along the sides',
 toppat='the spotted silver back', row5=ADIPOSE,
 scales='The species has no scales; skin should look smooth.',
 pat='silver-white body covered with black spots, with barbels longer than the body',
 dont='Do not draw a deep body or a whisker-like moustache; the barbels are fine and reach behind the anal fin.',
 topdont='Do not make the body spindle-shaped.')

S['greenspotpuffer'] = dict(common='green spotted puffer', sci='Dichotomyctere nigroviridis', sl=5.5, cs='rounded, almost as wide as it is deep',
 body=["Adult pufferfish, at rest (not inflated). Round-headed, tapering body: thick through the head and chest, tapering behind the dorsal and anal fins to a narrow caudal peduncle.",
  "Head with a rounded forehead and a short, rounded snout; terminal beak-like mouth.",
  "Greatest body depth just behind the eyes. Narrow caudal peduncle.",
  "Eye round, set high on the head, bulging slightly."],
 colour="Adult. Back and upper flanks yellow-green densely covered with round black spots of different sizes. The belly is pure white, with a sharp boundary to the green along the lower flank.\n\nEye: gold with a dark pupil.",
 fins=["Dorsal: A single small rounded fin far back on the back, just in front of the caudal peduncle. Clear yellowish. Drawn translucent.",
  "Anal: A single small rounded fin under the dorsal. Clear. Drawn translucent.",
  "Caudal: Rounded fan. Yellow-green with dark spots. Drawn semi-translucent.",
  "Pectoral: Rounded fan behind the gill opening, naturally folded close against the flank. Clear. Drawn translucent.",
  "Pelvic: No pelvic fins."],
 marks='the black spots on the green back and the white belly', top='rounded body, widest across the head behind the eyes, tapering to a narrow caudal peduncle',
 toppat='the black-spotted yellow-green back', row5='',
 scales='The species has no scales; skin should look smooth.',
 pat='yellow-green back densely spotted black over a pure white belly',
 dont='Do not draw an inflated, ball-shaped fish. Do not draw spines.',
 topdont='Do not make the body narrow or compressed.', no_fins=['pelvic'])

S['bumblebeegoby'] = dict(common='bumblebee goby', sci='Brachygobius doriae', sl=1.3, cs='rounded at the front, laterally compressed toward the tail',
 body=["Adult goby. Stocky, cylindrical body with a rounded head and a nearly straight back and belly.",
  "Head with a rounded forehead and a short, rounded snout; terminal mouth.",
  "Greatest body depth just behind the head. Deep caudal peduncle.",
  "Eye round, set high on the head."],
 colour="Adult. Yellow body with four broad black vertical bands: one across the head through the eye, one behind the head, one under the second dorsal, and one at the caudal base. The bands are about as wide as the yellow gaps between them.\n\nEye: dark, in the head band.",
 fins=["Dorsal: Two separate dorsal fins: a short rounded first dorsal above the pectoral, then a longer second dorsal to the caudal peduncle. Black and yellow. Drawn semi-translucent.",
  "Anal: Under the second dorsal, the same length. Black with a yellow edge. Drawn semi-translucent.",
  "Caudal: Rounded. Clear with a black base. Drawn translucent.",
  "Pectoral: Rounded fan, behind the gill cover; held spread at the sides when resting on the bottom. Clear. Drawn translucent.",
  "Pelvic: Fused into a single round suction disc under the chest. Clear yellowish. Drawn translucent."],
 marks='the four black bands', top='cylindrical body, widest across the head behind the eyes, tapering slightly to the caudal peduncle',
 toppat='the yellow back crossed by the black bands', row5=DORSAL2,
 scales='The species has small, even scales; draw them as a faint, smooth texture, not as individually outlined scales.',
 pat='yellow body with four broad black bands',
 dont='Do not draw a compressed tetra-like body or a single continuous dorsal.',
 topdont='Do not make the body narrow.')

S['scarletbadis'] = dict(common='scarlet badis (male)', sci='Dario dario', sl=0.7, cs='moderately laterally compressed',
 body=["Adult male. Oval, laterally compressed body with an arched back and a rounded belly.",
  "Head with a gently sloping forehead and a short, rounded snout; terminal mouth.",
  "Greatest body depth at the dorsal-fin origin. Deep caudal peduncle.",
  "Eye round, high on the head."],
 colour="Adult male. Seven vertical scarlet-red bars across the body and head, from behind the eye to the caudal peduncle, separated by narrow silvery-blue lines. The head is red.\n\nEye: dark, with a red ring.",
 fins=["Dorsal: One continuous fin from the nape to the caudal peduncle: spiny front and soft rear. Red with a bright white-blue edge and a black front. Drawn opaque.",
  "Anal: From mid-belly to the caudal peduncle. Red with a white-blue edge. Drawn opaque.",
  "Caudal: Rounded fan. Clear with red rays. Drawn translucent.",
  "Pectoral: Rounded, behind the gill cover, naturally folded close against the flank. Clear. Drawn translucent.",
  "Pelvic: Pointed with a trailing tip, below the pectoral base. Red with a white edge. Drawn opaque."],
 marks='the seven red vertical bars', top='laterally compressed oval body, widest just behind the eyes, tapering to the caudal peduncle',
 toppat='the red back', row5='',
 scales='The species has small, even scales; draw them as a faint, smooth texture, not as individually outlined scales.',
 pat='scarlet vertical bars separated by silvery-blue lines with white-edged dorsal and anal fins',
 dont='Do not draw a torpedo or a disc.',
 topdont='Do not make the body spindle-shaped or excessively thick.')

S['powderbluetang'] = dict(common='powder blue tang', sci='Acanthurus leucosternon', sl=7.5, cs='strongly laterally compressed',
 body=["Adult surgeonfish. Oval, strongly laterally compressed body, deep through the middle, with an evenly arched back and belly.",
  "Head with a steep, slightly convex forehead and a projecting, rounded-tipped snout; small terminal mouth.",
  "Greatest body depth at about the middle of the body. Narrow caudal peduncle with a scalpel-like spine on each side, set in a yellow patch.",
  "Eye round, high on the head."],
 colour="Adult. Body powder blue. The face is black from the snout to behind the eye, ending at the gill cover. A white band runs from under the chin across the throat. The belly is white to pale blue.\n\nEye: dark, within the black face.",
 fins=["Dorsal: One continuous fin from the nape to the caudal peduncle, of even height. Bright yellow with a black and pale-blue edge. Drawn opaque.",
  "Anal: Starts behind the pelvics and runs to the caudal peduncle. White with a blue edge. Drawn opaque.",
  "Caudal: Lunate (crescent), with pointed lobes. White with black bands at the base and along the rear edge. Drawn opaque.",
  "Pectoral: Pointed, emerging behind the gill cover, naturally folded close against the flank. Yellow. Drawn semi-translucent.",
  "Pelvic: Pointed, below the pectoral base. White. Drawn opaque."],
 marks='the black face and the white throat band', top='strongly laterally compressed body, widest just behind the eyes, tapering to the caudal peduncle',
 toppat='the yellow dorsal-fin base on the blue back', row5='',
 scales='The species has minute scales; skin should look smooth and velvety rather than displaying large individual scales.',
 pat='powder blue body, black face, white throat band and yellow dorsal fin',
 dont='Do not draw a round disc or a torpedo.',
 topdont='Do not make the body spindle-shaped or excessively thick.')

S['nasotang'] = dict(common='naso tang', sci='Naso elegans', sl=10.0, cs='strongly laterally compressed',
 body=["Adult unicornfish without a horn. Elongate oval, strongly laterally compressed body with an evenly arched back and belly.",
  "Head with a steep, straight forehead sloping to a projecting snout; small terminal mouth.",
  "Greatest body depth at about the middle of the body. Narrow caudal peduncle with two fixed orange keeled plates on each side.",
  "Eye round, high on the head, set well back from the snout."],
 colour="Adult. Grey to blue-grey body with a darker back. The face is grey with a black curved band from the eye to the mouth corner, and the lips are orange-yellow. A bright yellow patch on the forehead between the eyes. The pair of plates on the caudal peduncle are orange.\n\nEye: dark.",
 fins=["Dorsal: One continuous fin from the nape to the caudal peduncle. Yellow-orange with a black base line and a blue-white edge. Drawn opaque.",
  "Anal: Starts behind the pelvics and runs to the caudal peduncle, mirroring the dorsal. Yellow-orange with a black base line. Drawn opaque.",
  "Caudal: Lunate, with a white rear margin; on adult males each lobe ends in a long thin streamer. Grey with yellow. Drawn opaque.",
  "Pectoral: Pointed, emerging behind the gill cover, naturally folded close against the flank. Grey. Drawn semi-translucent.",
  "Pelvic: Pointed, below the pectoral base. Grey-black. Drawn opaque."],
 marks='the yellow forehead patch and the orange plates near the end of the body', top='strongly laterally compressed body, widest just behind the eyes, tapering to the caudal peduncle',
 toppat='the grey back with the yellow forehead patch', row5='',
 scales='The species has minute scales; skin should look smooth and velvety rather than displaying large individual scales.',
 pat='grey body with orange lips, a yellow forehead patch, orange tail plates and a yellow-orange dorsal fin',
 dont='Do not draw a horn on the forehead. Do not draw a round, deep tang disc.',
 topdont='Do not make the body spindle-shaped or excessively thick.')

S['flamehawk'] = dict(common='flame hawkfish', sci='Neocirrhitus armatus', sl=2.8, cs='moderately laterally compressed',
 body=["Adult hawkfish. Stocky, deep, laterally compressed body with a strongly arched back and a flattish belly.",
  "Head with a steep, slightly convex forehead and a short, rounded snout; terminal mouth.",
  "Greatest body depth at the dorsal-fin origin. Deep caudal peduncle.",
  "Eye round, high on the head, ringed in black."],
 colour="Adult. Brilliant red all over. A black band runs along the base of the dorsal fin, from the nape to the caudal peduncle. A black ring around the eye.\n\nEye: dark, in a black ring.",
 fins=["Dorsal: One continuous fin from the nape to the caudal peduncle: a spiny front part with a small tuft (cirri) at each spine tip, a notch, then a soft rounded rear part. Red with the black band at its base. Drawn opaque.",
  "Anal: Short, rounded, behind the middle of the belly. Red. Drawn opaque.",
  "Caudal: Slightly rounded fan. Red. Drawn opaque.",
  "Pectoral: Lower rays thickened and unbranched, used to perch on coral; the fin rests spread below the body. Red. Drawn opaque.",
  "Pelvic: Rounded, below the pectoral base. Red. Drawn opaque."],
 marks='the black band along the back', top='stocky body, widest just behind the eyes, tapering to the caudal peduncle',
 toppat='the black band down the back', row5='',
 scales='The species has small, even scales; draw them as a faint, smooth texture, not as individually outlined scales.',
 pat='brilliant red body with a black band along the dorsal-fin base',
 dont='Do not draw a slender or torpedo body.',
 topdont='Do not make the body spindle-shaped.')

S['copperband'] = dict(common='copperband butterflyfish', sci='Chelmon rostratus', sl=6.3, cs='strongly laterally compressed',
 body=["Adult butterflyfish. Disc-like, strongly laterally compressed body, deep through the middle, with a high arched back and a rounded belly.",
  "Head with a straight, steep forehead running down into a long, narrow tubular snout, about as long as the head behind it, with a tiny terminal mouth at the tip. The snout is truly elongate in this species.",
  "Greatest body depth at about the middle of the body. Short caudal peduncle.",
  "Eye round, high on the head, set far back from the snout tip."],
 colour="Adult. White to silvery-white body with four vertical copper-orange bands, each edged in thin black lines: one through the eye, one behind the head, one across the middle of the body continuing into the dorsal and anal fins, and one across the rear of the body. A black vertical bar on the caudal peduncle. A black eyespot, ringed in white, on the soft rear dorsal fin.\n\nEye: dark, in the first band.",
 fins=["Dorsal: One continuous fin from the nape to the caudal peduncle: a spiny front part and a soft rounded rear part. White with copper bands and the white-ringed black eyespot on the rear part. Drawn opaque.",
  "Anal: Starts behind the pelvics, soft rear rounded. White with a copper band. Drawn opaque.",
  "Caudal: Square-edged fan. Clear with a thin black and white base band. Drawn translucent.",
  "Pectoral: Pointed, behind the gill cover, naturally folded close against the flank. Clear. Drawn translucent.",
  "Pelvic: Pointed, below the pectoral base. Copper-orange. Drawn opaque."],
 marks='the copper-orange bands', top='strongly laterally compressed disc body with a narrow tube snout, widest just behind the eyes',
 toppat='the white back crossed by the copper bands', row5='',
 scales='The species has small, even scales; draw them as a faint, smooth texture, not as individually outlined scales.',
 pat='white disc body with copper-orange black-edged bands, a long tube snout and a dorsal eyespot',
 dont='Do not draw a short, blunt snout. Do not draw a torpedo.',
 topdont='Do not make the body thick or rounded.')

S['lionfish'] = dict(common='red lionfish', sci='Pterois volitans', sl=9.5, cs='moderately laterally compressed',
 body=["Adult scorpionfish. Robust, laterally compressed body with an arched back and a rounded belly.",
  "Head with a gently sloping forehead, bony ridges and a short rounded snout; upturned, terminal mouth. Fleshy tentacles above each eye and tassels on the lower jaw.",
  "Greatest body depth at the dorsal-fin origin. Deep caudal peduncle.",
  "Eye round, high on the head."],
 colour="Adult. White to cream body and head with many maroon-red to brown vertical bars of alternating width, narrow and wide, from the head to the caudal peduncle. The bars also cross the face and eye.\n\nEye: red-brown, crossed by a bar.",
 fins=["Dorsal: Thirteen separate, venomous dorsal spines rising from the back, each longer than the body is deep, joined at their bases by a thin membrane and banded maroon and white; behind them a rounded soft dorsal with rows of dark spots. Drawn opaque spines, translucent membrane.",
  "Anal: Rounded, behind the middle of the belly, with three spines and rows of dark spots. Drawn translucent.",
  "Caudal: Rounded fan, clear with rows of dark spots. Drawn translucent.",
  "Pectoral: Wing-like fans, with rays extending beyond the membrane, reaching to the caudal fin; banded maroon and white. At rest they are half-open and lie along the sides of the body. Drawn semi-translucent.",
  "Pelvic: Pointed, below the pectoral base, banded. Drawn opaque."],
 marks='the maroon and white vertical bars', top='body widest just behind the eyes, tapering to the caudal peduncle, with the pectoral fans along each side',
 toppat='the barred back and the base of the dorsal spines', row5='',
 scales='The species has small scales; draw them as a faint, smooth texture, not as individually outlined scales.',
 pat='white body with maroon vertical bars, separated banded dorsal spines and wing-like banded pectoral fans',
 dont='Do not merge the dorsal spines into one solid fin. Do not draw a deep disc.',
 topdont='Do not make the body spindle-shaped.')

S['snowflakemoray'] = dict(common='snowflake moray eel', sci='Echidna nebulosa', sl=24.0, cs='round at the front, laterally compressed toward the tail',
 body=["Adult moray eel. Long, snake-like body of nearly even depth along most of its length, round at the front and becoming laterally compressed toward the tail tip.",
  "Head with a rounded snout and jaws that close fully; the lower jaw is slightly shorter. Two tube nostrils on the snout tip.",
  "Greatest body depth at about a third of the way along the body. No caudal peduncle: the body tapers to a rounded tail tip.",
  "Eye round, small, high on the head, above the middle of the mouth."],
 colour="Adult. Creamy-white body covered with large black dendritic (branching, star-shaped) blotches, each containing small yellow spots, in two or three rows along the body, with smaller black specks between them.\n\nEye: yellow with a dark pupil.",
 fins=["Dorsal: One continuous low fin starting just behind the head and running along the whole back, joining the caudal and anal fins around the tail tip. Patterned like the body. Drawn opaque.",
  "Anal: One continuous low fin from the middle of the belly to the tail tip, joined to the dorsal around it. Drawn opaque.",
  "Caudal: Joined with the dorsal and anal fins, rounded at the tail tip. Drawn opaque.",
  "Pectoral: No pectoral fins.",
  "Pelvic: No pelvic fins."],
 marks='the black branching blotches with yellow spots', top='long, even-width body, widest just behind the head, tapering to the tail tip',
 toppat='the black blotches along the back', row5='',
 scales='The species has no scales; skin should look smooth.',
 pat='creamy-white eel body with branching black blotches, yellow-spotted',
 front='Seen from the front, the closed mouth is a fine lip line on a solid head surface; the two nostrils at the snout tip are short skin tubes, never dark holes.',
 dont='Do not draw a fish with pectoral fins or a separate tail. Do not draw open jaws with teeth showing.',
 topdont='Do not draw a flattened ribbon.', no_fins=['pectoral', 'pelvic'])

S['picasso'] = dict(common='Picasso triggerfish', sci='Rhinecanthus aculeatus', sl=8.0, cs='laterally compressed',
 body=["Adult triggerfish. Rhomboid, laterally compressed body with a straight sloping forehead and a deep belly.",
  "Head with a long sloping face: the snout projects, with a terminal mouth at its tip, and the eyes are set high and far back on the head.",
  "Greatest body depth at the first dorsal fin. Narrow caudal peduncle with rows of small black spines.",
  "Eye round, high on the head, far behind the mouth."],
 colour="Adult. Tan-beige back, white belly. A blue-and-yellow banded stripe runs from the eye down to the mouth corner, which is yellow, and blue lines cross between the eyes. A black diagonal area across the flank with four white-edged diagonal bands, running from behind the gill to the anal fin. A black patch outlined in white with an orange line around the pectoral base.\n\nEye: dark.",
 fins=["Dorsal: Two separate dorsal fins: a first dorsal of three spines (the trigger), folded flat into a groove in the back, and a second, soft dorsal with a rounded edge on the rear back. Clear. Drawn translucent.",
  "Anal: Soft, rounded, mirroring the second dorsal. Clear. Drawn translucent.",
  "Caudal: Rounded fan. Clear tan. Drawn semi-translucent.",
  "Pectoral: Rounded, behind the gill slit, naturally folded close against the flank. Clear. Drawn translucent.",
  "Pelvic: No pelvic fins; a single short spine at the end of the belly."],
 marks='the black diagonal bands with white edges and the blue-and-yellow face stripes', top='laterally compressed rhomboid body, widest just behind the eyes, tapering to the caudal peduncle',
 toppat='the tan back with the blue lines between the eyes', row5=DORSAL2,
 scales='The species has plate-like scales forming a tough skin; draw them as a faint grid texture.',
 pat='tan and white body with black-and-white diagonal bands and a blue-and-yellow face stripe',
 dont='Do not draw a rounded head or an oval body. Do not draw the first dorsal spines raised.',
 topdont='Do not make the body spindle-shaped.', no_fins=['pelvic'])

S['domino'] = dict(common='domino damselfish', sci='Dascyllus trimaculatus', sl=4.3, cs='moderately laterally compressed',
 body=["Adult damselfish. Deep, laterally compressed body, almost round from the side, with an evenly arched back and belly.",
  "Head with a steep, convex forehead and a short, rounded snout; terminal mouth.",
  "Greatest body depth at about the middle of the body. Deep, short caudal peduncle.",
  "Eye round, high on the head."],
 colour="Adult. Black all over. One round white spot on the forehead between the eyes and one round white spot on each upper flank below the middle of the dorsal fin; the flank spot is larger.\n\nEye: dark.",
 fins=["Dorsal: One continuous fin from the nape to the caudal peduncle: a spiny front part and a soft, rounded rear part. Black. Drawn opaque.",
  "Anal: Soft rear rounded, behind the middle of the belly. Black. Drawn opaque.",
  "Caudal: Slightly forked fan. Black to grey. Drawn opaque.",
  "Pectoral: Rounded, behind the gill cover, naturally folded close against the flank. Clear grey. Drawn translucent.",
  "Pelvic: Pointed, below the pectoral base. Black. Drawn opaque."],
 marks='the three white spots', top='laterally compressed body, widest just behind the eyes, tapering to the caudal peduncle',
 toppat='the black back with the white forehead spot', row5='',
 scales='The species has medium, visible scales; draw them as a faint, regular pattern.',
 pat='black body with three white spots',
 dont='Do not draw a torpedo or an oval body.',
 topdont='Do not make the body spindle-shaped or excessively thick.')

ORDER = list(S)


def block(id, s):
    fs = json.load(open(B + id + '-b11-gen/fishshapes.json'))
    depth = round(fs['depth'])
    # FishShapes gives the snowflake moray a head depth of 3% SL (half its body depth): a measuring artifact, left out
    ratios = '' if id == 'snowflakemoray' else '* Head depth = approximately %d%% of standard length.\\n' % round(fs['head'])
    if id not in NO_PED:
        ratios += '* Minimum caudal-peduncle depth = approximately %d%% of standard length.\\n' % round(fs['ped'])
    r = fs['depth'] / fs['width']
    front = ('nearly round, about as wide as it is tall' if r < 1.15 else
             'an upright oval, about %.1f times as tall as it is wide' % r)
    body = [s['body'][0], s['body'][1], s.get('front', FRONT)] + s['body'][2:]
    L = ['COMMON              = ' + s['common'], 'SCI                 = ' + s['sci'], 'SL_IN               = %s' % s['sl'],
         'DEPTH_PCT           = %d' % depth, 'EXTRA_RATIOS        = ' + ratios, 'BODY_BULLETS        =']
    L += ['* ' + b for b in body]
    L += ['CROSS_SECTION_WORDS = ' + s['cs'], 'COLORATION          =', SUBDUED + s['colour'], 'FIN_BULLETS         =']
    L += ['* ' + f for f in s['fins']]
    L += ['MARKS_SHORT         = ' + s['marks'], 'TOP_VIEW_SHAPE      = ' + s['top'], 'TOP_PATTERN         = ' + s['toppat'],
          'FRONT_VIEW_SHAPE    = ' + front, 'ROW5_EXTRA          = ' + (s['row5'] or '(empty)'), 'SCALES              = ' + s['scales'],
          'PATTERN_SHORT       = ' + s['pat'], 'SHAPE_DONT          = ' + s['dont'], 'TOP_DONT            = ' + s['topdont']]
    return '\n'.join(L) + '\n'


def strip_fins(text, none):
    """Template rule 'Fins the species lacks': delete that fin's lines in rows 4 right and 5 (peapuffer precedent)."""
    if 'pelvic' in none:
        text = text.replace('* Left and right pelvic fins: solid cyan (#00FFFF).\n', '')
        text = text.replace('* Pelvic fin: cyan (#00FFFF).\n', '')
        text = text.replace('with the pectoral and pelvic fins added at their attachment points', 'with the pectoral fins added at their attachment points')
        text = text.replace('The pectoral and pelvic fins extend from', 'The pectoral fins extend from')
    if 'pectoral' in none:   # moray: no paired fins at all; row 4 right stays the bare body silhouette
        text = text.replace('* Left and right pectoral fins: solid yellow (#FFFF00).\n', '')
        text = text.replace('* Pectoral fin: yellow (#FFFF00).\n', '')
        text = text.replace('with the pectoral fins added at their attachment points', 'with no fins added: this species has no pectoral or pelvic fins')
        text = text.replace('The pectoral fins extend from their anatomically correct attachment positions at the same resting angles established in row 1.\n\n', '')
        text = text.replace("Preserve the pectoral fin's actual overlapping shape from row 1. Mark its attachment point with a small solid black dot.\n\n", '')
        text = text.replace('* Continue the natural body coloration beneath the removed pectoral fin.\n', '')
    if 'dorsal' in none:
        text = text.replace('* Dorsal fin: red (#FF0000).\n', '')
    return text


if __name__ == '__main__' and sys.argv[1:] == ['--finish']:
    # after fish-prompt-fill.py: strip absent fins, copy to the committed prompt queue
    REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for id in ORDER:
        p = B + id + '-b11-gen/prompt.txt'
        t = strip_fins(open(p, encoding='utf-8').read(), S[id].get('no_fins', []))
        open(p, 'w', encoding='utf-8').write(t)
        open(os.path.join(REPO, 'research', 'fish-sheets', 'prompts', id + '-b11-5row.md'), 'w', encoding='utf-8').write(t)
        print(id, len(t))
elif __name__ == '__main__':
    for id in ORDER:
        open(B + id + '-b11-gen/species.txt', 'w', encoding='utf-8').write(block(id, S[id]))
        print(id, 'no fins: ' + ','.join(S[id].get('no_fins', [])) if S[id].get('no_fins') else id)
    json.dump({id: S[id].get('no_fins', []) for id in ORDER}, open(B + 'b11-no-fins.json', 'w'))
