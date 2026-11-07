// DA4 (2026-11-06): sex-mix verdicts only for species commonly sold by sex (data/soldSex.ts). Set DA4_AUDIT=1 to rewrite
// research/design/da4-sold-by-sex.md (every species with a sex-ratio, males or pair rule, its call, its basis).
import { describe, expect, it } from 'vitest';
import { CARE } from '../src/data/care';
import { PAIR_FORMERS } from '../src/data/groups';
import { SOLD_BY, soldBySex } from '../src/data/soldSex';
import { SPECIES } from '../src/data/species';
import { notesOf, overWarn } from '../src/ui/stockPlanLogic';
import { speciesLive } from '../src/ui/discovery/animalsLive';
import { TANK_MODELS } from '../src/data/tanks';

const ruled = SPECIES.map(s => s.id).filter(id => CARE[id]?.sexed || CARE[id]?.males || PAIR_FORMERS.has(id));
const tank = TANK_MODELS.find(m => !m.terrarium && m.ratedGal >= 20)!;

describe('DA4 sold-by-sex gate', () => {
  it('every species with a sex-ratio, males or pair rule has a recorded call with a basis', () => {
    for (const id of ruled) { expect(SOLD_BY[id], id).toBeDefined(); expect(SOLD_BY[id].basis.length, id).toBeGreaterThan(15); }
  });
  it('celestial pearl danio: a mixed group gets no ratio caution, only a grey tip', () => {
    for (const [n, f] of [[3, 3], [4, 2], [6, 0], [2, 4]]) {
      const nt = notesOf({ id: 'cpd', n, f });
      expect(nt.ratio, `${n}M ${f}F`).toMatch(/^Tip: usually sold unsexed/);
      expect(nt.ratio).not.toMatch(/Your mix|short on females/);
    }
    const lines = speciesLive([{ species: 'cpd', n: 6, f: 3 }], tank)[0].lines;
    expect(lines.some(l => /Your mix|short on females|males fight/.test(l.text))).toBe(false);
    expect(lines.find(l => /^Tip:/.test(l.text))?.tone).toBe('note');
  });
  it('the males-fight line is not shown for an unsexed-sold species, but stays for dwarf gouramis and cockatoos', () => {
    expect(overWarn({ id: 'cpd', n: 40 }, 75) ?? '').not.toMatch(/males fight/);
    expect(overWarn({ id: 'cockatoo', n: 3 }, 75)).toMatch(/males fight/);
    expect(overWarn({ id: 'dwarfgourami', n: 6 }, 75)).toMatch(/males/);
  });
  it('guppy 3 male / 0 female still warns short on females (livebearers kept)', () => {
    expect(notesOf({ id: 'guppy', n: 3 }).ratio).toMatch(/short on females/);
    expect(notesOf({ id: 'guppy', n: 3, f: 1 }).ratio).toMatch(/short on females/);
    expect(speciesLive([{ species: 'guppy', n: 3 }], tank)[0].lines.find(l => /Your mix/.test(l.text))?.tone).toBe('warn');
  });
  it('species sold by sex keep their rule (peacock, cockatoo, kribensis, cpo)', () => {
    for (const id of ['peacock', 'cockatoo', 'kribensis', 'cpo', 'cherrybarb']) expect(soldBySex(id), id).toBe(true);
    expect(notesOf({ id: 'peacock', n: 3, f: 1 }).ratio).toMatch(/short on females/);
    expect(notesOf({ id: 'cpo', n: 3, f: 1 }).ratio).toMatch(/short on females/);
  });
  it('no unsexed-sold species ever reads "Your mix" or a keep-N-males-to-M-females advice; breeding tips stay', () => {
    for (const id of ruled) if (!soldBySex(id) && CARE[id]?.sexed) for (const [n, f] of [[5, 0], [3, 1], [1, 3], [2, 2], [0, 4]]) {
      const r = notesOf({ id, n, f }).ratio ?? '';
      expect(r, `${id} ${n}/${f}`).toMatch(/^Tip: /); expect(r).not.toMatch(/Your mix|short on/);
    }
    expect(notesOf({ id: 'cherryshrimp', n: 3, f: 1 }).ratio).toMatch(/breeds best/);
  });
});

if ((globalThis as any).process?.env.DA4_AUDIT) it('writes the audit', async () => {
  // @ts-expect-error node only (no node types in this project)
  const { writeFileSync } = await import('node:fs');
  const rows = ruled.map(id => { const c = SOLD_BY[id], g = CARE[id] as any; return `| ${id} | ${SPECIES.find(s => s.id === id)!.name} | ${g?.sexed ? g.sexed.ratio.join(':') : ''}${g?.males ? ' males-rule' : ''}${PAIR_FORMERS.has(id) ? ' pair' : ''} | ${c.by} | ${c.sure ? 'sourced' : 'UNSURE'} | ${c.basis} |`; });
  const n = ruled.filter(id => !soldBySex(id) && CARE[id]?.sexed).length;
  writeFileSync('research/design/da4-sold-by-sex.md', `# DA4 sold-by-sex audit (2026-11-06)\n\nSex-mix verdicts ("Your mix is short on females", males-fight, "keep 1 male to N females") show only where a species is commonly sold by sex. ${ruled.length} species have a sex-ratio, males or pair rule; ${n} of the ones with a ratio rule lose the verdict (grey tip instead). Source: data/soldSex.ts. Regenerate: \`DA4_AUDIT=1 npx vitest run test/da4SoldSex.test.ts\`.\n\n| id | species | rule | sold | confidence | basis |\n|---|---|---|---|---|---|\n${rows.join('\n')}\n`);
});

// Before / after cards for the Social needs category (the same lines stockSummary (b) builds), written as an HTML page.
if ((globalThis as any).process?.env.DA4_CARDS) it('writes the before / after cards', async () => {
  const { summaryHtml } = await import('../src/ui/stockSummary');
  // @ts-expect-error node only (no node types in this project)
  const { writeFileSync, readFileSync } = await import('node:fs');
  const css = (readFileSync('src/style.css', 'utf8') as string).split('\n').filter((l: string) => /^\.ft(Cats|Cat |Chip|c-|Pill|CatWhat)|^\.ftc-|^li\.ftc|^\.ftCat/.test(l) || /ftChip|ftCat|ftc-/.test(l)).join('\n');
  const social = (id: string, name: string, n: number, f: number) => {
    const nt = notesOf({ id, n, f }, 'in'), items: any[] = [];
    if (nt.band === 'avoid') items.push({ level: 'caution', text: `${name}: group of ${n + f}: ${nt.line}` });
    if (nt.ratio && /Your mix (has|is short)/.test(nt.ratio)) items.push({ level: 'caution', text: `${name}: ${nt.ratio}` });
    const level = items.length ? 'caution' : 'ok';
    return summaryHtml({ cats: [{ id: 'social', label: 'Social needs', what: 'group size, sex ratio, pairs', level, word: level === 'ok' ? 'Compatible' : 'Caution', items }], worst: level, worstWord: '', noData: 0, noDataFor: [] } as any, (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')).replace(/<details class="ftCat"/g, '<details class="ftCat" open') + (nt.ratio && !items.length ? `<div style="color:#8a93a3;font-size:11px;margin:2px 0 6px 2px">(animal card line: ${nt.ratio.replace(/&/g, '&amp;')})</div>` : '');
  };
  const saved = SOLD_BY.cpd; delete (SOLD_BY as any).cpd;
  const beforeCpd = social('cpd', 'Celestial pearl danio', 3, 3);
  (SOLD_BY as any).cpd = saved;
  const afterCpd = social('cpd', 'Celestial pearl danio', 3, 3), guppy = social('guppy', 'Guppy', 3, 0);
  const card = (tag: string, t: string, h: string) => `<div class=c><small>${tag}</small><h4>${t}</h4>${h}</div>`;
  writeFileSync('research/design/da4-cards-before-after.html', `<!doctype html><meta charset=utf-8><title>DA4 Social needs before / after</title><style>${css}\nbody{font:14px system-ui;margin:20px;background:#1b2130;color:#e4e8ef}.row{display:flex;gap:20px;flex-wrap:wrap;margin-bottom:22px}.c{width:380px;background:#252c3d;border-radius:8px;padding:10px 14px}h2{font-size:15px}h4{margin:2px 0 4px}small{color:#8a93a3}.ftChip{font-size:12px}</style>
<h2>Celestial pearl danio, 3 males + 3 females (a mixed bag)</h2><div class=row>${card('BEFORE', 'CPD 3M 3F', beforeCpd)}${card('AFTER', 'CPD 3M 3F', afterCpd)}</div>
<h2>Guppy, 3 males + 0 females (sold by sex: unchanged)</h2><div class=row>${card('BEFORE', 'Guppy 3M 0F', guppy)}${card('AFTER', 'Guppy 3M 0F', guppy)}</div>`);
});
