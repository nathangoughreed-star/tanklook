// Dev server only: the review sheet (review.html) POSTs the models' new versions to /__model-versions and they are
// written to src/data/model-versions.json, one model per line.
import { writeFileSync } from 'node:fs';

const FILE = 'src/data/model-versions.json';
const NOTE = 'Model versions for the review sheet (review.html). hash = fingerprint of the model (geometry + texture thumbnails + colours); v rises by one each time it changes; build = the build that change shipped in. Written by the sheet\'s Record button on the dev server; commit it with the model change.';

export const modelVersions = () => ({
  name: 'model-versions', apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__model-versions', (req, res) => {
      if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
      const parts = [];
      req.on('data', b => parts.push(b));
      req.on('end', () => {
        let models;
        try { models = JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { res.statusCode = 400; res.end(); return; }
        const ok = m => m && Number.isInteger(m.v) && /^[0-9a-f]{8}$/.test(m.hash) && Number.isInteger(m.build) && /^\d{4}-\d\d-\d\d$/.test(m.date);
        if (!models || typeof models !== 'object' || !Object.values(models).every(ok)) { res.statusCode = 400; res.end(); return; }
        const lines = Object.keys(models).sort().map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(models[k])}`);
        writeFileSync(FILE, `{\n "note": ${JSON.stringify(NOTE)},\n "models": {\n${lines.join(',\n')}\n }\n}\n`);
        res.end('ok');
      });
    });
  },
});
