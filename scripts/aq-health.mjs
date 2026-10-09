// AqAdvisor uptime vs our own calls: node scripts/aq-health.mjs [days]   (reads the proxy's /log)
// Prints each outage (consecutive failed checks), how long it lasted, and how many of our calls came in the hour before.
const PROXY = 'https://tanklook-aq.tanklook.workers.dev';
const days = Number(process.argv[2] ?? 2);
const log = await (await fetch(`${PROXY}/log?days=${days}`)).json();
const health = log.flatMap(d => d.health).sort((a, b) => a.t - b.t), calls = log.flatMap(d => d.calls).sort((a, b) => a.t - b.t);
const hm = t => new Date(t).toISOString().slice(5, 16).replace('T', ' ');
const up = health.filter(h => h.up);
console.log(`${health.length} checks, ${up.length} up (${health.length ? Math.round(up.length / health.length * 100) : 0} %), ` +
  `median ${up.length ? up.map(h => h.ms).sort((a, b) => a - b)[up.length >> 1] : '-'} ms; our calls: ${calls.length} (${calls.filter(c => !c.ok).length} failed)`);
let start = null;
for (const [i, h] of health.entries()) {
  if (!h.up && start === null) start = h;
  const end = start && (h.up || i === health.length - 1);
  if (!end) continue;
  const last = h.up ? health[i - 1] : h, before = calls.filter(c => c.t <= start.t && c.t > start.t - 3600e3);
  console.log(`DOWN ${hm(start.t)} -> ${h.up ? hm(h.t) : 'still down'} UTC (${Math.round((last.t - start.t) / 60e3) + 10} min, ` +
    `${start.why ?? 'http ' + start.status}); our calls in the hour before: ${before.length}` +
    (before.length ? `, last ${Math.round((start.t - before.at(-1).t) / 60e3)} min before` : ''));
  start = null;
}
