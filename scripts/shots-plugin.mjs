// Dev server only: POST a PNG to /__shot?name=foo and it is saved as shots/foo.png (review pictures).
import { mkdirSync, writeFileSync } from 'node:fs';

export const shots = () => ({
  name: 'shots', apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__shot', (req, res) => {
      const name = new URL(req.url ?? '', 'http://x').searchParams.get('name') ?? '';
      if (req.method !== 'POST' || !/^[\w-]+$/.test(name)) { res.statusCode = 400; res.end(); return; }
      const parts = [];
      req.on('data', b => parts.push(b));
      req.on('end', () => { mkdirSync('shots', { recursive: true }); writeFileSync(`shots/${name}.png`, Buffer.concat(parts)); res.end('ok'); });
    });
  },
});
