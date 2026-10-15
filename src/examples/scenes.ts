// The example scene files (lane EF3, 2026-10-15): their own chunk, loaded by exampleScenes() in ./index.ts when the
// start menu or Open… shows, so the first download does not carry them. Keyed by the ids in EXAMPLES.
import planted from './planted.json?raw';
import iwagumi from './iwagumi.json?raw';
import betta from './betta-bowl.json?raw';
import paludarium from './paludarium.json?raw';
import terrarium from './terrarium.json?raw';
import reef from './reef.json?raw';

export const SCENES: Record<string, string> = { planted, iwagumi, betta, paludarium, terrarium, reef };
