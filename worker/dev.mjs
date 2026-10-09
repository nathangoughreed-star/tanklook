// Local stand-in for the Cloudflare Worker: node worker/dev.mjs [port]  (default 8787), then run the app with
// VITE_AQ_PROXY=http://localhost:8787. In-memory KV and rate limiter (2 new AqAdvisor
// requests a minute) instead of Cloudflare's.
import { createServer } from 'node:http';
import worker from './aqadvisor-proxy.js';

const store = new Map(), sent = [];
const env = {
  AQ_CACHE: { get: async k => store.get(k) ?? null, put: async (k, v) => { store.set(k, v); } },
  AQ_GATE: { limit: async () => { const now = Date.now(); while (sent.length && now - sent[0] > 60000) sent.shift();
    return { success: sent.length < 2 && sent.push(now) > 0 }; } },
};
const port = Number(process.argv[2] ?? 8787);

createServer(async (req, res) => {
  const r = await worker.fetch(new Request(`http://localhost:${port}${req.url}`, { headers: req.headers }), env, { waitUntil: () => {} });
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(await r.text());
  console.log(r.status, req.url);
}).listen(port, () => console.log(`AqAdvisor proxy on http://localhost:${port}`));
