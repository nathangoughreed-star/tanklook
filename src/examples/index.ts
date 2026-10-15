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

export interface Example { id: string; name: string; hint: string; thumb: string }

export const EXAMPLES: Example[] = [
  { id: 'planted', name: 'Planted community', hint: '40 breeder: neons, harlequins, honey gouramis, corys, otos, shrimp and snails among stem plants.', thumb: plantedPic },
  { id: 'iwagumi', name: 'Iwagumi', hint: 'Rimless 24 in nano: stones on a carpet, embers, cherry shrimp, otos.', thumb: iwagumiPic },
  { id: 'betta', name: 'Betta bowl', hint: 'A 30 cm bowl on a round side table: one betta, one nerite.', thumb: bettaPic },
  { id: 'paludarium', name: 'Paludarium', hint: 'A 24 in cylinder on a round cabinet: land around a pool, fire-bellied toads and dart frogs, chili rasboras and shrimp in the water.', thumb: paludariumPic },
  { id: 'terrarium', name: 'Tree frog terrarium', hint: 'A tall corner tank on a corner stand: wood, plants and three White’s tree frogs.', thumb: terrariumPic },
  { id: 'reef', name: 'Reef', hint: '72 gal bowfront reef: live rock islands and corals, a clownfish pair, royal gramma, firefish, watchman goby, cleaner shrimp, snails and hermits.', thumb: reefPic },
];

let scenes: Promise<Record<string, string>> | undefined;
/** The scene files by example id; the first call starts the download, later calls share it (a failed load is retried). */
export function exampleScenes() {
  return scenes ??= import('./scenes').then(m => m.SCENES, e => { scenes = undefined; throw e; });
}
