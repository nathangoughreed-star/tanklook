// Writes research/species-list.md from the catalogue (src/shell/logic/speciesList.ts). Run: node scripts/species-list.mjs
import { rolldown } from 'rolldown';
import { writeFileSync } from 'node:fs';
const b = await rolldown({ input: 'src/shell/logic/speciesList.ts', platform: 'node', logLevel: 'silent' });
const { output } = await b.generate({ format: 'esm' });
const url = 'data:text/javascript;base64,' + Buffer.from(output[0].code).toString('base64');
const { speciesListMarkdown } = await import(url);
writeFileSync('research/species-list.md', speciesListMarkdown());
console.log('wrote research/species-list.md');
