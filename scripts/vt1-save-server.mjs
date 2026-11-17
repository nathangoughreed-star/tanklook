// VT1 helper (dev only): receives canvas images POSTed from the browser pane and writes them under scratch/vt1/. node scripts/vt1-save-server.mjs
import http from 'node:http';
import fs from 'node:fs';
fs.mkdirSync('scratch/vt1', { recursive: true });
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.end(); return; }
  const name = new URL(req.url, 'http://x').searchParams.get('name') || 'x';
  let b = ''; req.on('data', c => (b += c)); req.on('end', () => {
    const m = /^data:image\/(\w+);base64,(.*)$/.exec(b);
    if (m) fs.writeFileSync(`scratch/vt1/${name.replace(/[^\w-]/g, '_')}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`, Buffer.from(m[2], 'base64'));
    res.end(m ? 'ok' : 'bad');
  });
}).listen(5196, () => console.log('listening 5196'));
