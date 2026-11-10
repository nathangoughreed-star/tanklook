// Lane AB5 Combine browser check (dev server, URL env): the quick sheet's Combine buttons and the combined pair.
// Pictures in research/screens/ab5/, a JSON log of the checks to stdout. Run through scripts/lowprio.ps1 on the shared machine.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5195/', PORT = 9375;
mkdirSync('research/screens/ab5', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/ab5-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 90) + ' => ' + (r.result.exceptionDetails.exception?.description ?? '').slice(0, 100)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 25 }); writeFileSync(`research/screens/ab5/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; e.click(); return 'ok'})()`);
const clickText = (sel, text) => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>x.textContent.includes(${JSON.stringify(text)})); if(!e) return 'missing ${text}'; e.click(); return 'ok'})()`);
const view = (w, h, mobile) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
const waitPair = async () => { for (let i = 0; i < 60; i++) { if (await ev(`!!document.querySelector('.abx .abcard, .abx .abnone[role=status]')`)) break; await sleep(500); } await sleep(2500); };
const IN = 25.4, log = (k, v) => console.log(k, JSON.stringify(v));
try {
  await send('Page.enable');
  const setup = async (w, h, mob) => {
    await view(w, h, mob); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 90; i++) { if (await ev(`!!window.__gb && !!document.getElementById('discoverBtn')`).catch(() => false)) break; await sleep(1000); }
  await sleep(3000);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`); await sleep(300);
  await ev(`window.__gb.store.edit(S => { delete S.discoverOn; S.locks = undefined; })`);
  await sleep(1500);
  };
  const results = {};
  for (const [w, h, mob, tag] of (process.env.ONLY ? [[375, 812, true, 'm375']] : [[1280, 800, false, 'desktop'], [375, 812, true, 'm375']])) {
    await setup(w, h, mob); await sleep(800);
    // MIXED HABITATS: a freshwater aquarium against a terrarium / a reef / a paludarium, straight through the viewer's pair layer
    const kinds = JSON.parse(await ev(`(async () => {
      const pool = await import('/src/explore/pool.ts'), arch = await import('/src/scene/archetypes.ts'), sug = await import('/src/demand/suggest.ts'), br = await import('/src/scene/brief.ts'), sb = await import('/src/ui/setupBrief.ts'), dt = await import('/src/demand/types.ts'), uid = await import('/src/scene/uid.ts');
      const w = sug.customTankWants(sb.getBrief(), br.briefToWants(sb.getBrief())), P = dt.defaultProfile(), out = {}, pick = {};
      for (const a of arch.ARCHETYPES) { if (!pool.isBuildable(a)) continue; const k = a.env === 'terrarium' ? 'terrarium' : a.env === 'paludarium' ? 'paludarium' : a.water === 'saltwater' ? 'reef' : 'fresh'; if (!pick[k]) pick[k] = a.id; }
      for (const [k, id] of Object.entries(pick)) { try { const r = pool.explorePool(w, P, 'in', Date.now(), { only: [id], sizes: 1, explain: false }); const c = [...r.eligible, ...r.provisional][0]; if (c) out[k] = uid.ensureUids(structuredClone(c.scene)); } catch (e) {} }
      window.__mix = out; return JSON.stringify(Object.keys(out));
    })()`));
    log(tag + ' kinds', kinds);
    for (const k of kinds.filter(k => k !== 'fresh')) {
      await ev(`document.body.classList.add('discovering')`); await ev(`(() => { const m = window.__mix; window.__gb.viewer.showPair([m.fresh, m['${k}']], { info: ['★ Favourite', 'Challenger'], ${mob ? "only: 1" : ""} }); })()`); await sleep(2500);
      log(tag + ' ' + k, await ev(`[...document.querySelectorAll('#labA, #labB')].map(e=>e.innerText.replace(/\s+/g,' ').slice(0,90)).join(' || ')`));
      await shot(`${tag}-mixed-fresh-vs-${k}`);
    }
    await ev(`window.__gb.viewer.showPair(null)`);
  }
} catch (e) { console.log("ERR", e.message); } finally { ch.kill(); process.exit(0); }
