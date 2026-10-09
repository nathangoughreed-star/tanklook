# AqAdvisor stocking proxy

TankLook shows "Stocking: 92% (per AqAdvisor)". AqAdvisor (aqadvisor.com) has no API, serves http only and sends no
CORS headers, so the page can't ask it directly. This Cloudflare Worker forwards a well-formed stocking request,
reads the percentage from the results page and returns `{"stocking": 92}`. It is not an open proxy: only
`/stocking?sel=<id>:<n>::,...&l=&d=&h=` is accepted. Each answer is cached for 7 days.

Without the worker, the app still shows the "AqAdvisor ↗" link, which opens the same calculation on aqadvisor.com.

## Deploy (once, free plan)

1. Create a Cloudflare account (personal) if you don't have one.
2. From this folder:
   ```bash
   npx wrangler login
   npx wrangler deploy
   ```
   It prints the URL, e.g. `https://tanklook-aq.<account>.workers.dev`.
3. Put that URL in `.env.production` at the repo root: `VITE_AQ_PROXY=https://tanklook-aq.<account>.workers.dev`,
   commit and push. The next Pages build picks it up.

Allowed page origins (CORS): tanklook.com, www.tanklook.com, localhost. Edit `ORIGINS` in `aqadvisor-proxy.js` for others.

## Local

`node worker/dev.mjs` runs the same code on http://localhost:8787. Start Vite with `VITE_AQ_PROXY=http://localhost:8787`.

## Species ids

`python scripts/aqadvisor-ids.py` rebuilds `src/data/aqadvisor.json` (TankLook species -> AqAdvisor ids). When a
species is added to TankLook, add its AqAdvisor list name to `NAMES` in that script and rerun it.
