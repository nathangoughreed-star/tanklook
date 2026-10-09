// Local stand-in for the Cloudflare Worker: node worker/dev.mjs [port]  (default 8787), then run the app with
// VITE_AQ_PROXY=http://localhost:8787. In-memory cache instead of caches.default.
import { createServer } from 'node:http';
import worker from './aqadvisor-proxy.js';

const store = new Map();
globalThis.caches = { default: { match: async k => store.get(k.url)?.clone(), put: async (k, r) => { store.set(k.url, r); } } };
const port = Number(process.argv[2] ?? 8787);

createServer(async (req, res) => {
  const r = await worker.fetch(new Request(`http://localhost:${port}${req.url}`, { headers: req.headers }), {}, { waitUntil: () => {} });
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(await r.text());
  console.log(r.status, req.url);
}).listen(port, () => console.log(`AqAdvisor proxy on http://localhost:${port}`));
