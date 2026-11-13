import { connect, sleep, URL } from './ui1-lib.mjs';
const c = await connect(); await c.send('Page.navigate', { url: process.argv[2] ?? URL });
for (let i = 0; i < 90; i++) { if (await c.ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
await sleep(3000); console.log(await c.ev(`document.title+' dlg:'+[...document.querySelectorAll('dialog[open]')].map(d=>d.id)`)); c.close();
