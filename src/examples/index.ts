// Example tanks (lane F, 2026-10-13): ready-made scenes listed in Open… so a first visit has something to look at.
// Each is an ordinary downloaded scene file plus a small picture, bundled into the build (no fetch: the single-file
// build opens from disk). To refresh one: open it, change it, Download, and replace its .json here (and its .jpg).
import planted from './planted.json?raw';
import plantedPic from './planted.jpg?inline';
import iwagumi from './iwagumi.json?raw';
import iwagumiPic from './iwagumi.jpg?inline';
import betta from './betta-bowl.json?raw';
import bettaPic from './betta-bowl.jpg?inline';
import paludarium from './paludarium.json?raw';
import paludariumPic from './paludarium.jpg?inline';
import terrarium from './terrarium.json?raw';
import terrariumPic from './terrarium.jpg?inline';
import reef from './reef.json?raw';
import reefPic from './reef.jpg?inline';

export interface Example { id: string; name: string; hint: string; scene: string; thumb: string }

export const EXAMPLES: Example[] = [
  { id: 'planted', name: 'Planted community', hint: '40 breeder: neons, harlequins, honey gouramis, corys, otos, shrimp and snails among stem plants.', scene: planted, thumb: plantedPic },
  { id: 'iwagumi', name: 'Iwagumi', hint: 'Rimless 24 in nano: stones on a carpet, embers, cherry shrimp, otos.', scene: iwagumi, thumb: iwagumiPic },
  { id: 'betta', name: 'Betta bowl', hint: 'A 30 cm bowl on a round side table: one betta, one nerite.', scene: betta, thumb: bettaPic },
  { id: 'paludarium', name: 'Paludarium', hint: 'Land around a pool: fire-bellied toads and dart frogs, chili rasboras and shrimp in the water.', scene: paludarium, thumb: paludariumPic },
  { id: 'terrarium', name: 'Tree frog terrarium', hint: 'A tall dry tank: wood, plants and three White’s tree frogs.', scene: terrarium, thumb: terrariumPic },
  { id: 'reef', name: 'Reef', hint: '24 in nano reef: live rock and corals, a clownfish pair, royal gramma, firefish, watchman goby, cleaner shrimp, snails and hermits.', scene: reef, thumb: reefPic },
];
