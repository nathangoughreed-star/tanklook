// Example tanks (lane F, 2026-10-13): ready-made scenes listed in Open… so a first visit has something to look at.
// Each is an ordinary downloaded scene file plus a small picture. To refresh one: open it, change it, Download, and replace
// its .json here (and its .jpg).
// First download (lane EF3, 2026-10-15): the scene files are a lazy chunk (./scenes.ts, ~125 kB) fetched when the start
// menu or Open… shows, and the pictures are plain image files (they were base64 in the main bundle); together that was
// about 100 kB gzip of the first load. The single-file build inlines both again (lane SF's pass).
// Shapes and stands (Nathan 2026-10-14): rectangles (planted, iwagumi), bowl (betta), cylinder (paludarium), corner pie
// (terrarium), 72 gal bowfront (reef); every one on a stand.
import plantedPic from './planted.jpg?url';
import iwagumiPic from './iwagumi.jpg?url';
import bettaPic from './betta-bowl.jpg?url';
import paludariumPic from './paludarium.jpg?url';
import terrariumPic from './terrarium.jpg?url';
import reefPic from './reef.jpg?url';
import rainforestPic from './ss2-rainforest.jpg?url';
import aridPic from './ss2-arid.jpg?url';
import pythonPic from './ss2-python.jpg?url';
import blackwaterPic from './ss2-blackwater.jpg?url';
import clownnanoPic from './ss2-clownnano.jpg?url';

export interface Example { id: string; name: string; hint: string; thumb: string }

export const EXAMPLES: Example[] = [
  { id: 'planted', name: 'Planted community', hint: '40 breeder: neons, harlequins, honey gouramis, corys, otos, shrimp and snails among stem plants.', thumb: plantedPic },
  { id: 'iwagumi', name: 'Iwagumi', hint: 'Rimless 24 in nano: stones on a carpet, embers, cherry shrimp, otos.', thumb: iwagumiPic },
  { id: 'betta', name: 'Betta bowl', hint: 'A 30 cm bowl on a round side table: one betta, one nerite.', thumb: bettaPic },
  { id: 'paludarium', name: 'Paludarium', hint: 'A 24 in cylinder on a round cabinet: land around a pool, fire-bellied toads and dart frogs, chili rasboras and shrimp in the water.', thumb: paludariumPic },
  { id: 'terrarium', name: 'Tree frog terrarium', hint: 'A tall corner tank on a corner stand: wood, plants and three White’s tree frogs.', thumb: terrariumPic },
  { id: 'reef', name: 'Reef', hint: '72 gal bowfront reef: live rock islands and corals, a clownfish pair, royal gramma, firefish, watchman goby, cleaner shrimp, snails and hermits.', thumb: reefPic },
  { id: 'rainforest', name: 'Crested gecko rainforest', hint: 'A tall humid vivarium: climbing branches, cork, vines, bromeliads and leaf litter, two crested geckos.', thumb: rainforestPic },
  { id: 'arid', name: 'Leopard gecko desert', hint: 'Dry terrarium on a long low tank: stacked rock ledges to bask on, a hide at each end, two leopard geckos.', thumb: aridPic },
  { id: 'python', name: 'Ball python enclosure', hint: 'Bark floor, a hide at each end, a basking ledge and a climbing branch for a ball python.', thumb: pythonPic },
  { id: 'blackwater', name: 'Amazon blackwater', hint: 'Tea-stained water, tangled roots, leaf litter and floating plants; cardinals, rummynoses and more.', thumb: blackwaterPic },
  { id: 'clownnano', name: 'Clownfish and anemone nano', hint: 'A small live rock stack with a bubble-tip anemone for the clownfish pair, and a few corals.', thumb: clownnanoPic },
];

let scenes: Promise<Record<string, string>> | undefined;
/** The scene files by example id; the first call starts the download, later calls share it (a failed load is retried). */
export function exampleScenes() {
  return scenes ??= import('./scenes').then(m => m.SCENES, e => { scenes = undefined; throw e; });
}
