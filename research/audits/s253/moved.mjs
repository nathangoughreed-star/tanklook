import { execSync } from 'node:child_process'; import fs from 'node:fs';
for (const f of ['round-1','round-2','round-3','round-3a','v4']) {
  const p = `research/calib/tables/${f}.json`;
  const a = JSON.parse(execSync(`git show HEAD:${p}`, { maxBuffer: 1 << 28 }).toString()), b = JSON.parse(fs.readFileSync(p, 'utf8'));
  let n = 0, tot = 0, bandMoves = 0; const ex = [];
  const walk = (x, y, path) => {
    if (typeof x === 'number' && typeof y === 'number') { tot++; if (Math.abs(x - y) > 0.5) { n++; if (ex.length < 3) ex.push(`${path}: ${x.toFixed(1)} -> ${y.toFixed(1)}`); } }
    else if (typeof x === 'string' && typeof y === 'string') { if (x !== y && ['ok','near','over','caution','problem','compatible','good','info'].includes(x)) { bandMoves++; if (ex.length < 40) ex.push(`${path}: ${x} -> ${y}`); } }
    else if (x && y && typeof x === 'object') for (const k of Object.keys(x)) walk(x[k], y[k], path + '/' + k);
  };
  walk(a, b, f); console.log(f, 'numbers', tot, 'moved >0.5:', n, 'band/state moves:', bandMoves, ex.join(' ; '));
}
