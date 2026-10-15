// Unused-export finder (lane E2, 2026-10-15). Dev only; no dependencies beyond what's installed.
// TypeScript 7 is the native compiler (no JS API), so this parses with rolldown's oxc parser.
//   node scripts/unused-exports.mjs            -> summary + list
//   node scripts/unused-exports.mjs --json f   -> also writes the full result to f
// Reports, per export of a src/ file:
//   dead        no import anywhere (src, test, vite.config.ts) and no use inside its own file
//   localOnly   used in its own file only (the `export` keyword is unneeded)
//   testOnly    imported only by test/ files (the app never uses it)
// and the src/ files the app entries (index.html -> src/main.ts, review.html -> src/review/main.ts) never reach.
// Namespace imports (import * as X) and dynamic import() count every export of the target as used.
import { parseAst } from 'rolldown/parseAst';
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const rel = (f) => relative(ROOT, f).replace(/\\/g, '/');

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|mts)$/.test(n) && !n.endsWith('.d.ts')) out.push(p);
  }
  return out;
}
const files = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'test')), join(ROOT, 'vite.config.ts')];

function resolveSpec(from, spec) {
  if (!spec.startsWith('.')) return null;
  const base = resolve(dirname(from), spec);
  for (const c of [base, base + '.ts', join(base, 'index.ts')]) if (existsSync(c) && statSync(c).isFile()) return c;
  return base.replace(/\.js$/, '.ts');
}

// Generic AST walk.
function visit(node, fn, parent) {
  if (!node || typeof node.type !== 'string') return;
  fn(node, parent);
  for (const k in node) {
    if (k === 'parent') continue;
    const v = node[k];
    if (Array.isArray(v)) for (const c of v) visit(c, fn, node);
    else if (v && typeof v === 'object' && typeof v.type === 'string') visit(v, fn, node);
  }
}

const info = new Map(); // file -> { exports: Map(name -> {kind, line}), idCount: Map, imports: [{target, names|'*'}] }
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const lineOf = (pos) => src.slice(0, pos).split('\n').length;
  let ast;
  try { ast = parseAst(src, { lang: 'ts' }, f); } catch (e) { console.error('parse failed', rel(f), e.message); continue; }
  const exports = new Map();
  const imports = [];
  const idCount = new Map();
  const declIds = new Map();
  const addExp = (name, kind, pos) => exports.set(name, { kind, line: lineOf(pos) });
  for (const n of ast.body) {
    if (n.type === 'ImportDeclaration') {
      const t = resolveSpec(f, n.source.value);
      if (!t) continue;
      const names = [];
      let star = false;
      for (const s of n.specifiers) {
        if (s.type === 'ImportNamespaceSpecifier') star = true;
        else if (s.type === 'ImportDefaultSpecifier') names.push('default');
        else names.push(s.imported.name ?? s.imported.value);
      }
      imports.push({ target: t, names: star ? '*' : names });
    } else if (n.type === 'ExportNamedDeclaration') {
      if (n.source) {
        const t = resolveSpec(f, n.source.value);
        if (t) imports.push({ target: t, names: n.specifiers.map((s) => s.local.name ?? s.local.value) });
        for (const s of n.specifiers) addExp(s.exported.name ?? s.exported.value, 're-export', n.start);
        continue;
      }
      const d = n.declaration;
      if (d) {
        const kind = d.type.replace('Declaration', '').replace('TS', '').replace('Alias', '');
        if (d.type === 'VariableDeclaration') for (const v of d.declarations) {
          if (v.id.type === 'Identifier') { addExp(v.id.name, d.kind, v.start); declIds.set(v.id.name, (declIds.get(v.id.name) ?? 0) + 1); }
        }
        else if (d.id) { addExp(d.id.name, kind, d.start); declIds.set(d.id.name, (declIds.get(d.id.name) ?? 0) + 1); }
      }
      for (const s of n.specifiers ?? []) addExp(s.exported.name ?? s.exported.value, 'specifier', n.start);
    } else if (n.type === 'ExportDefaultDeclaration') addExp('default', 'default', n.start);
    else if (n.type === 'ExportAllDeclaration') {
      const t = resolveSpec(f, n.source.value);
      if (t) imports.push({ target: t, names: '*' });
    }
  }
  visit(ast, (n) => {
    if (n.type === 'ImportExpression' && n.source?.type === 'Literal') {
      const t = resolveSpec(f, n.source.value);
      if (t) imports.push({ target: t, names: '*' });
    }
    if (n.type === 'Identifier' || n.type === 'JSXIdentifier') idCount.set(n.name, (idCount.get(n.name) ?? 0) + 1);
  });
  info.set(f, { exports, imports, idCount, declIds });
}

// Who imports what.
const usedBy = new Map(); // `${file}#${name}` -> Set(importer)
const starred = new Map(); // file -> Set(importer)
for (const [f, i] of info) for (const im of i.imports) {
  if (im.names === '*') { if (!starred.has(im.target)) starred.set(im.target, new Set()); starred.get(im.target).add(f); continue; }
  for (const n of im.names) {
    const k = `${im.target}#${n}`;
    if (!usedBy.has(k)) usedBy.set(k, new Set());
    usedBy.get(k).add(f);
  }
}

// Reachability from the app entries.
const entries = [join(ROOT, 'src/main.ts'), join(ROOT, 'src/review/main.ts')];
const reach = new Set();
const stack = [...entries];
while (stack.length) {
  const f = stack.pop();
  if (reach.has(f) || !info.has(f)) continue;
  reach.add(f);
  for (const im of info.get(f).imports) stack.push(im.target);
}

const isTest = (f) => rel(f).startsWith('test/');
const rows = [];
for (const [f, i] of info) {
  if (!rel(f).startsWith('src/')) continue;
  for (const [name, e] of i.exports) {
    const importers = new Set([...(usedBy.get(`${f}#${name}`) ?? []), ...(starred.get(f) ?? [])]);
    const appImporters = [...importers].filter((x) => !isTest(x) && reach.has(x));
    const local = (i.idCount.get(name) ?? 0) - (i.declIds.get(name) ?? 0);
    let status = null;
    if (importers.size === 0) status = local > 0 ? 'localOnly' : 'dead';
    else if (appImporters.length === 0 && reach.has(f)) status = local > 0 ? 'testOnly+local' : 'testOnly';
    if (status) rows.push({ file: rel(f), line: e.line, name, kind: e.kind, status, importers: [...importers].map(rel) });
  }
}
const unreached = [...info.keys()].filter((f) => rel(f).startsWith('src/') && !reach.has(f)).map(rel);

const order = { dead: 0, testOnly: 1, 'testOnly+local': 2, localOnly: 3 };
rows.sort((a, b) => order[a.status] - order[b.status] || a.file.localeCompare(b.file) || a.line - b.line);
const count = (s) => rows.filter((r) => r.status === s).length;
console.log(`src files never reached from index.html / review.html: ${unreached.length}`);
for (const u of unreached) console.log('  ' + u);
console.log(`exports: dead ${count('dead')}, testOnly ${count('testOnly')}, testOnly+local ${count('testOnly+local')}, localOnly ${count('localOnly')}`);
for (const r of rows) if (r.status !== 'localOnly') console.log(`  ${r.status.padEnd(15)} ${r.file}:${r.line} ${r.kind} ${r.name}${r.importers.length ? '  <- ' + r.importers.join(', ') : ''}`);
const j = process.argv.indexOf('--json');
if (j > 0) writeFileSync(process.argv[j + 1], JSON.stringify({ unreached, rows }, null, 1));
