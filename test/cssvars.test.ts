// CV1: a CSS custom property used with no fallback must be defined for every element that uses it.
//
// Why: HM2 wrote `#app.collapsed #sideTab { top: calc(10px + var(--bb-h)) }`, but --bb-h is set only on #view and
// #sideTab is outside #view. A var() with no value is "invalid at computed-value time": the browser silently drops the
// whole declaration, so the panel's expand arrow never moved and nothing complained.
//
// What it checks, for every `var(--x)` with no fallback in the shipped CSS (and --x:/setProperty uses in src/**/*.ts):
//   (a) --x is defined somewhere (a CSS declaration, an inline style in index.html, or a TS setProperty / style string);
//   (b) every element the rule matches in the static DOM (index.html etc.) has an ancestor-or-self that gets --x from
//       some rule or inline style. Rules that match nothing in the static DOM (runtime-built UI) are checked against
//       the selector text only, and need an allowlist entry (RUNTIME) when the definer is not named in the selector.
// No DOM library is in the project, so this carries a small HTML parser and selector matcher (enough for this CSS).
import { describe, it, expect } from 'vitest';
import postcss from 'postcss';

// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const read = (p: string): string => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// ---- pages: the HTML each stylesheet is served with -------------------------------------------------------------
const PAGES: Array<{ html: string; css: string[] }> = [
  { html: 'index.html', css: ['src/style.css', 'src/ui/coach/coach.css'] },
  { html: 'review.html', css: ['src/review/review.css'] },
  { html: 'species-data.html', css: ['src/review/species-data.css'] },
];

// ---- allowlist: runtime-built elements the static DOM cannot see ------------------------------------------------
// key `--prop @ use-selector` -> why it is fine. The element using the var is created by TS, and the definer is set
// on an ancestor TS builds with it. Keep the reason specific so a future edit can tell when it stops being true.
const RUNTIME: Record<string, string> = {
  '--cl-n @ .clN': '.clN / .clV are rows built inside .clAx by data/climate.ts (the .clAx rule defines --cl-n / --cl-v)',
  '--cl-v @ .clV': 'same: .clV lives inside .clAx',
  '--lift @ .sgScene img': 'ui/stockGallery.ts builds <div class="sgScene" style="--tx:..;--tilt:..;--lift:.."><img> as one string',
  '--tx @ .sgScene img': 'same inline style on .sgScene',
  '--tilt @ .sgScene img': 'same inline style on .sgScene',
  '--ruler @ .sgImg[data-ruler]::before': 'ui/stockGallery.ts sets --ruler on the .sgImg box itself (box.style.setProperty) just before setting data-ruler',
};

// ---- tiny HTML parser ---------------------------------------------------------------------------------------------
interface El { tag: string; attrs: Record<string, string>; parent: El | null; kids: El[] }
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
function parseHtml(src: string): El[] {
  const root: El = { tag: '#root', attrs: {}, parent: null, kids: [] };
  let cur = root; const all: El[] = [];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  let m: RegExpExecArray | null; let last = 0;
  while ((m = re.exec(src))) {
    last = re.lastIndex;
    if (m[0].startsWith('<!--')) continue;
    const tag = m[2].toLowerCase();
    if (m[1]) { // close tag: pop to the nearest matching open element
      for (let e: El | null = cur; e && e !== root; e = e.parent) if (e.tag === tag) { cur = e.parent!; break; }
      continue;
    }
    const attrs: Record<string, string> = {};
    for (const a of m[3].matchAll(/([^\s=\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? '';
    const el: El = { tag, attrs, parent: cur, kids: [] };
    cur.kids.push(el); all.push(el);
    if (tag === 'script' || tag === 'style') { // raw text: skip to the closing tag
      const end = src.toLowerCase().indexOf('</' + tag, last); re.lastIndex = end < 0 ? src.length : end;
    } else if (!VOID.has(tag) && !m[0].endsWith('/>')) cur = el;
  }
  return all;
}

// ---- tiny selector matcher ---------------------------------------------------------------------------------------
type Combi = ' ' | '>' | '+' | '~';
interface Compound { tag?: string; id?: string; classes: string[]; attrs: Array<{ n: string; op?: string; v?: string }>; nots: Compound[][]; iss: Compound[][][]; root: boolean }
interface Chain { compounds: Compound[]; combis: Combi[] } // combis[i] joins compounds[i] and compounds[i+1]

function splitTop(s: string, sep: string): string[] {
  const out: string[] = []; let d = 0, q = '', cur = '';
  for (const ch of s) {
    if (q) { if (ch === q) q = ''; cur += ch; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[') d++; if (ch === ')' || ch === ']') d--;
    if (ch === sep && d === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur); return out.map(x => x.trim()).filter(Boolean);
}
function parseChain(sel: string): Chain {
  const compounds: Compound[] = []; const combis: Combi[] = [];
  let i = 0; let pending: Combi | null = null;
  const n = sel.length;
  while (i < n) {
    const ch = sel[i];
    if (/\s/.test(ch)) { if (!pending) pending = ' '; i++; continue; }
    if (ch === '>' || ch === '+' || ch === '~') { pending = ch; i++; continue; }
    // read one compound
    const c: Compound = { classes: [], attrs: [], nots: [], iss: [], root: false };
    let any = false;
    while (i < n && !/[\s>+~]/.test(sel[i])) {
      const s = sel[i];
      if (s === '*') { i++; any = true; }
      else if (s === '#') { const m = /^#([\w-]+)/.exec(sel.slice(i))!; c.id = m[1]; i += m[0].length; any = true; }
      else if (s === '.') { const m = /^\.([\w-]+)/.exec(sel.slice(i))!; c.classes.push(m[1]); i += m[0].length; any = true; }
      else if (s === '[') {
        const end = sel.indexOf(']', i); const body = sel.slice(i + 1, end);
        const m = /^\s*([\w-]+)\s*(?:([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+)))?/.exec(body)!;
        c.attrs.push({ n: m[1].toLowerCase(), op: m[2], v: m[3] ?? m[4] ?? m[5] }); i = end + 1; any = true;
      } else if (s === ':') {
        if (sel[i + 1] === ':') { const m = /^::[\w-]+(\([^)]*\))?/.exec(sel.slice(i))!; i += m[0].length; continue; } // pseudo-element: the originating element is what matters
        const m = /^:([\w-]+)/.exec(sel.slice(i))!; i += m[0].length;
        let arg: string | null = null;
        if (sel[i] === '(') { let d = 0, j = i; for (; j < n; j++) { if (sel[j] === '(') d++; else if (sel[j] === ')' && --d === 0) break; } arg = sel.slice(i + 1, j); i = j + 1; }
        const name = m[1].toLowerCase(); any = true;
        if (name === 'root') c.root = true;
        else if (name === 'not' && arg != null) c.nots.push(splitTop(arg, ',').map(a => parseChain(a).compounds[0]));
        else if ((name === 'is' || name === 'where' || name === 'matches') && arg != null) c.iss.push(splitTop(arg, ',').map(a => [parseChain(a).compounds[0]]));
        // every other pseudo-class (:hover, :focus, :first-child, :checked, ...) depends on state: treated as matching
      } else if (/[a-zA-Z]/.test(s)) { const m = /^[\w-]+/.exec(sel.slice(i))!; c.tag = m[0].toLowerCase(); i += m[0].length; any = true; }
      else { i++; }
    }
    if (!any && !c.tag) { i++; continue; }
    if (compounds.length) combis.push(pending ?? ' ');
    compounds.push(c); pending = null;
  }
  return { compounds, combis };
}
function matchCompound(e: El, c: Compound): boolean {
  if (c.root) { if (e.tag !== 'html') return false; }
  if (c.tag && e.tag !== c.tag) return false;
  if (c.id && e.attrs.id !== c.id) return false;
  if (c.classes.length) { const cl = (e.attrs.class ?? '').split(/\s+/); for (const k of c.classes) if (!cl.includes(k)) return false; }
  for (const a of c.attrs) {
    const v = e.attrs[a.n]; if (v === undefined) return false;
    if (!a.op) continue; const t = a.v ?? '';
    if (a.op === '=' && v !== t) return false;
    if (a.op === '^=' && !v.startsWith(t)) return false;
    if (a.op === '$=' && !v.endsWith(t)) return false;
    if (a.op === '*=' && !v.includes(t)) return false;
    if (a.op === '~=' && !v.split(/\s+/).includes(t)) return false;
    if (a.op === '|=' && v !== t && !v.startsWith(t + '-')) return false;
  }
  for (const group of c.nots) if (group.some(g => g && matchCompound(e, g))) return false;
  for (const group of c.iss) if (!group.some(g => matchCompound(e, g[0]))) return false;
  return true;
}
/** relaxed: ancestor compounds that carry an #id ignore their classes / attributes, because JS toggles state classes (#app.collapsed) the static HTML lacks. */
function matches(e: El, ch: Chain, idx = ch.compounds.length - 1, relaxed = false): boolean {
  const cp = ch.compounds[idx];
  if (!matchCompound(e, relaxed && idx < ch.compounds.length - 1 && cp.id ? { ...cp, classes: [], attrs: [], nots: [], iss: [] } : cp)) return false;
  if (idx === 0) return true;
  const cb = ch.combis[idx - 1];
  if (cb === '>') return !!e.parent && e.parent.tag !== '#root' && matches(e.parent, ch, idx - 1, relaxed);
  if (cb === ' ') { for (let p = e.parent; p && p.tag !== '#root'; p = p.parent) if (matches(p, ch, idx - 1, relaxed)) return true; return false; }
  const sibs = e.parent ? e.parent.kids : []; const at = sibs.indexOf(e);
  if (cb === '+') return at > 0 && matches(sibs[at - 1], ch, idx - 1, relaxed);
  for (let k = at - 1; k >= 0; k--) if (matches(sibs[k], ch, idx - 1, relaxed)) return true; return false;
}

// ---- var() extraction ---------------------------------------------------------------------------------------------
/** Every var(--x) in a value with NO fallback (a fallback of its own var() is scanned too). */
function bareVars(value: string): string[] {
  const out: string[] = [];
  const re = /var\(\s*(--[\w-]+)\s*([,)])/g; let m: RegExpExecArray | null;
  while ((m = re.exec(value))) if (m[2] === ')') out.push(m[1]);
  return out;
}

// ---- CSS facts ----------------------------------------------------------------------------------------------------
interface Def { prop: string; selector: string; chains: Chain[]; file: string; line: number }
interface Use { prop: string; selector: string; chains: Chain[]; file: string; line: number; decl: string }

function collect(files: string[]) {
  const defs: Def[] = []; const uses: Use[] = [];
  for (const f of files) {
    postcss.parse(read(f), { from: f }).walkDecls(d => {
      const rule = d.parent; if (!rule || rule.type !== 'rule') return;
      const selector = (rule as postcss.Rule).selector; const chains = splitTop(selector, ',').map(parseChain);
      const line = d.source?.start?.line ?? 0;
      if (d.prop.startsWith('--')) defs.push({ prop: d.prop, selector, chains, file: f, line });
      for (const p of bareVars(d.value)) uses.push({ prop: p, selector, chains, file: f, line, decl: `${d.prop}: ${d.value}` });
    });
  }
  return { defs, uses };
}
/** Custom properties set by inline style="--x:..." in the HTML, and by TS (setProperty / style strings / template styles). */
function tsFiles(dir: string, out: string[] = []): string[] {
  for (const d of fs.readdirSync(new URL('../' + dir, import.meta.url), { withFileTypes: true }) as Array<{ name: string; isDirectory(): boolean }>) { const p = dir + '/' + d.name; if (d.isDirectory()) tsFiles(p, out); else if (p.endsWith('.ts')) out.push(p); }
  return out;
}
const TS = tsFiles('src');
const tsDefined = new Set<string>(); const tsUses: Array<{ prop: string; file: string; line: number }> = [];
for (const f of TS) {
  const src = read(f); const lineOf = (i: number) => src.slice(0, i).split('\n').length;
  for (const m of src.matchAll(/setProperty\(\s*['"`](--[\w-]+)/g)) tsDefined.add(m[1]);
  for (const m of src.matchAll(/(?<![\w-])(--[a-zA-Z][\w-]*)\s*:/g)) tsDefined.add(m[1]); // style="--x:..." / cssText strings
  for (const m of src.matchAll(/var\(\s*(--[\w-]+)\s*([,)])/g)) if (m[2] === ')') tsUses.push({ prop: m[1], file: f, line: lineOf(m.index!) });
}

describe('CSS custom properties are defined where they are used (CV1)', () => {
  for (const page of PAGES) {
    it(`${page.html}: every fallback-less var() resolves for the elements it styles`, () => {
      const els = parseHtml(read(page.html));
      const { defs, uses } = collect(page.css);
      const inlineDef = new Map<string, El[]>(); // prop -> elements with an inline definition
      for (const e of els) for (const m of (e.attrs.style ?? '').matchAll(/(--[\w-]+)\s*:/g)) (inlineDef.get(m[1]) ?? inlineDef.set(m[1], []).get(m[1])!).push(e);
      const problems: string[] = [];
      const seen = new Set<string>();

      for (const u of uses) {
        const where = `${u.file}:${u.line}`;
        const key = `${u.prop} @ ${u.selector}`;
        const dd = defs.filter(d => d.prop === u.prop);
        const ii = inlineDef.get(u.prop) ?? [];
        const tsSet = tsDefined.has(u.prop);
        if (!dd.length && !ii.length && !tsSet) {
          problems.push(`${where}  \`${u.decl}\`  (rule \`${u.selector}\`)\n    ${u.prop} is never defined anywhere (no CSS declaration, inline style or setProperty), so var(${u.prop}) has no value and the browser drops this declaration. Define it or give var() a fallback: var(${u.prop}, <default>).`);
          continue;
        }
        // :root / html / body / * definers reach every element
        if (dd.some(d => d.chains.some(c => { const last = c.compounds[c.compounds.length - 1]; return c.compounds.length === 1 && (last.root || last.tag === 'html' || last.tag === 'body') && !last.classes.length && !last.id; }))) continue;

        // static DOM: every element this rule matches must see a definer on itself or an ancestor
        const subjects = new Set<El>();
        for (const c of u.chains) for (const e of els) if (matches(e, c)) subjects.add(e);
        if (!subjects.size) for (const c of u.chains) for (const e of els) if (matches(e, c, c.compounds.length - 1, true)) subjects.add(e);
        const definers = (e: El): boolean => {
          for (let p: El | null = e; p && p.tag !== '#root'; p = p.parent) {
            if (ii.includes(p)) return true;
            for (const d of dd) for (const c of d.chains) if (matches(p, c)) return true;
          }
          return false;
        };
        if (subjects.size) {
          const bad = [...subjects].filter(e => !definers(e));
          if (bad.length) {
            const eg = bad[0]; const desc = `<${eg.tag}${eg.attrs.id ? ' id="' + eg.attrs.id + '"' : ''}${eg.attrs.class ? ' class="' + eg.attrs.class + '"' : ''}>`;
            const defAt = dd.map(d => `${d.file}:${d.line} \`${d.selector}\``).join(', ') || 'only set at runtime by TS';
            const k2 = `${where}|${u.prop}`; if (seen.has(k2)) continue; seen.add(k2);
            problems.push(`${where}  \`${u.decl}\`  (rule \`${u.selector}\`)\n    ${u.prop} is defined only on: ${defAt}. ${bad.length} matched element(s) such as ${desc} are not inside any of them, so the var is invalid at computed-value time and the browser drops this declaration. Move the definition up (e.g. to :root), add a fallback var(${u.prop}, <default>), or fix the selector.`);
          }
          continue;
        }
        // runtime-built UI (no static match): the definer must be named in the selector chain, or be allowlisted
        const named = u.chains.every(c => dd.some(d => d.chains.some(dc => {
          const dl = dc.compounds[dc.compounds.length - 1];
          return c.compounds.some(cc => (!dl.id || dl.id === cc.id) && dl.classes.every(k => cc.classes.includes(k)) && (!dl.tag || dl.tag === cc.tag) && (dl.id || dl.classes.length || dl.tag));
        })));
        if (named || RUNTIME[key]) continue;
        const k2 = `${where}|${u.prop}`; if (seen.has(k2)) continue; seen.add(k2);
        problems.push(`${where}  \`${u.decl}\`  (rule \`${u.selector}\`)\n    ${u.prop} is defined on ${dd.map(d => `${d.file}:${d.line} \`${d.selector}\``).join(', ') || 'TS only'}, but this rule matches nothing in ${page.html} and its selector does not name that element, so the var may be unset here and the declaration dropped. If TS builds the element inside the definer, add \`'${key}'\` to RUNTIME in test/cssvars.test.ts with the reason; otherwise fix it.`);
      }
      expect(problems, '\n' + problems.join('\n')).toEqual([]);
    });
  }

  it('src/**/*.ts: a var(--x) written into inline styles refers to a property defined somewhere', () => {
    const allCss = new Set<string>();
    for (const p of PAGES) for (const f of p.css) for (const d of collect([f]).defs) allCss.add(d.prop);
    const html = PAGES.map(p => read(p.html)).join('\n');
    const problems = tsUses.filter(u => !allCss.has(u.prop) && !tsDefined.has(u.prop) && !html.includes(u.prop + ':'))
      .map(u => `${u.file}:${u.line}  var(${u.prop}) with no fallback, and ${u.prop} is never defined (CSS, inline style, setProperty): the declaration is dropped.`);
    expect(problems, '\n' + problems.join('\n')).toEqual([]);
  });

  it('the matcher catches the HM2 bug (self-test on a fixture)', () => {
    const els = parseHtml('<div id="app"><div id="view"><i class="sp"></i></div><b id="sideTab"></b></div>');
    const def = parseChain('#view'); const use = parseChain('#app.collapsed #sideTab');
    const tab = els.find(e => e.attrs.id === 'sideTab')!;
    expect(matches(tab, parseChain('#sideTab'))).toBe(true);
    const underView = (e: El) => { for (let p: El | null = e; p; p = p.parent) if (matches(p, def)) return true; return false; };
    expect(underView(tab)).toBe(false);
    expect(underView(els.find(e => e.attrs.class === 'sp')!)).toBe(true);
    expect(use.compounds.length).toBe(2);
  });
});
