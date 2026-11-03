// Lane BL1 browser check (dev server on 6118): Budget vs Luxury split view of a Malawi rockscape and one planted look. Headless Chrome over raw CDP, one page. Pictures land in shots/bl1/.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:6118/', PORT = 9338;
mkdirSync('shots/bl1', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1800,1000', '--user-data-dir=' + (process.env.TEMP + '/bl1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }); writeFileSync(`shots/bl1/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('saved', name); };
const load = (arch, tankName, fish) => ev(`(async () => {
  const R = await import('/src/scene/recipes.ts'), A = await import('/src/scene/archetypes.ts'), T = await import('/src/data/tanks.ts'), B = await import('/src/scene/brief.ts');
  const a = A.archetype(${JSON.stringify(arch)}), m = T.TANK_MODELS.find(x => x.name === ${JSON.stringify(tankName)} && !x.terrarium);
  const S = R.recipeScene(a, 'balanced', m); S.brief = B.setVision(B.emptyBrief(), { secondaryLikes: [], archetypeId: a.id });
  const { store } = window.__gb; if (store.split) store.closeTank(1);
  store.edit(t => { Object.assign(t, structuredClone(S)); t.fish = []; });
  return S.items.length + ' items, ' + [...new Set(S.items.map(i => i.variant))].join(',');
})()`);
const compare = (a, b) => ev(`(() => { const e = document.querySelector('.tbcmp[data-a=${a}][data-b=${b}]'); if (!e) return 'missing button'; e.click(); return 'ok'; })()`);
try {
  await send('Page.enable'); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 90; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  await ev(`document.getElementById('modeTitle')?.closest('dialog')?.close()`);
  for (const [name, arch, tank] of [['malawi', 'african-cichlid-rockscape', '60 gal breeder'], ['planted', 'planted-community', '40 gal breeder']]) {
    console.log(name, await load(arch, tank)); await sleep(6000);
    console.log('box', await ev(`document.querySelector('.dmtier')?.innerText.slice(0, 500)`));
    console.log(await compare('budget', 'luxury')); await sleep(5000);
    console.log('after', await ev(`window.__gb.store.scene.tanks.map(t => t.items.map(i => i.variant).filter((v, k, a) => a.indexOf(v) === k).join('+')).join(' | ')`));
    console.log('box2', await ev(`document.querySelector('.dmtier')?.innerText.slice(0, 700)`));
    await shot(`${name}-budget-vs-luxury`);
  }
} catch (e) { console.log('ERR', e.message); }
ws.close(); ch.kill();
