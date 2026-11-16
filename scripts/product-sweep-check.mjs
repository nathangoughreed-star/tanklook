#!/usr/bin/env node
// Is this product already in our catalogues? Zero-install (node only).
//   node scripts/product-sweep-check.mjs titles.txt        (one title or URL per line)
//   echo "Aqueon Metal 10 Gallon Stand" | node scripts/product-sweep-check.mjs
// Reports KNOWN (with the matching id + file), MAYBE or NEW per line. Fuzzy: brand + model/size tokens (see research/product-library/README.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'gear');
const STOP = new Set(['the', 'for', 'and', 'with', 'in', 'of', 'a', 'to', 'aquarium', 'fish', 'tank', 'tanks', 'gallon', 'gallons', 'gal', 'inch', 'black', 'white', 'https', 'http', 'www', 'com', 'html', 'dp']);
const toks = s => String(s).toLowerCase().replace(/[^a-z0-9.]+/g, ' ')
  .split(' ').map(t => t.replace(/^\.+|\.+$/g, '')).filter(t => t && !STOP.has(t));

const catalogue = [];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'meta.json')) {
  let rows; try { rows = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
  if (!Array.isArray(rows)) continue;
  for (const r of rows) {
    if (!r || typeof r !== 'object' || !r.brand) continue;
    const text = [r.brand, r.model, r.line, r.id, ...(r.names || [])].filter(Boolean).join(' ');
    catalogue.push({ file: f, id: r.id, brand: toks(r.brand), tokens: new Set(toks(text)), url: r.url || '', price: r.priceUsd });
  }
}

const input = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : fs.readFileSync(0, 'utf8');
const lines = input.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
let known = 0, fresh = 0;
for (const line of lines) {
  const tset = new Set(toks(line));
  const isUrl = /^https?:/.test(line);
  let best = null;
  for (const c of catalogue) {
    const urlHit = isUrl && c.url && c.url.split('?')[0] === line.split('?')[0];
    const brandOk = c.brand.every(b => tset.has(b));
    const shared = [...c.tokens].filter(x => tset.has(x));
    const nums = shared.filter(x => /\d/.test(x)).length; // sizes and model numbers carry extra weight
    const score = urlHit ? 99 : brandOk ? shared.length + nums : 0;
    if (!best || score > best.score) best = { c, score };
  }
  // KNOWN = same URL, or brand plus enough shared tokens (a size counts double); MAYBE = brand plus a little
  const verdict = !best ? 'NEW' : best.score >= 4 ? 'KNOWN' : best.score >= 2 ? 'MAYBE' : 'NEW';
  if (verdict === 'KNOWN') known++; else if (verdict === 'NEW') fresh++;
  console.log(`${verdict.padEnd(5)} ${line.slice(0, 90)}${best && verdict !== 'NEW' ? `  ->  ${best.c.file}:${best.c.id} ($${best.c.price})` : ''}`);
}
console.log(`\n${lines.length} lines: ${known} known, ${fresh} new, ${lines.length - known - fresh} maybe (check by eye)`);
