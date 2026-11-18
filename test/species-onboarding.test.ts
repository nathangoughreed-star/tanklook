// Species onboarding checklist (R141, Nathan 2026-11-18; research/species-onboarding.md). One check per data touch point, run over every
// aquatic species. A species that fails a check must be listed for that check in research/species-onboarding-baseline.json (the old species,
// from before the list); a NEW species must pass them all. The baseline may only shrink: a species on it that now passes fails the test
// ("take it off the baseline"). GEN_ONBOARDING=1 npx vitest run test/species-onboarding.test.ts rewrites the baseline (never grow it by hand).
import { describe, expect, it } from 'vitest';
import { SPECIES, type Species } from '../src/data/species';
import { CARE } from '../src/data/care';
import { GROUPS } from '../src/data/groups';
import { CHEM } from '../src/data/waterchem';
import { WATER } from '../src/data/climatedata';
import { originOf } from '../src/data/origin';
import { SPACE_FACTOR } from '../src/data/spacefactor';
import { DWELLER } from '../src/data/substrateTraits';
import { NEEDS } from '../src/data/careNeeds';
import { HOVER } from '../src/scene/fishBehavior';
import { minDataOf } from '../src/scene/tankMin';
import bodymass from '../src/data/bodymass.json';
import aqadvisor from '../src/data/aqadvisor.json';
import demand from '../src/data/demand-items.json';
import versions from '../src/data/model-versions.json';

const BASE = 'research/species-onboarding-baseline.json';
// @ts-expect-error node only (no node types in this project)
const { readFileSync, writeFileSync, existsSync } = await import('node:fs');
const AQUATIC = SPECIES.filter(s => s.habitat === 'water' && CARE[s.id]);
const looksOf = (s: Species) => [s.look, ...(s.female ? [s.female.look] : [])];

/** Each check returns a problem string, or null when the species has the piece. */
const CHECKS: Record<string, (s: Species) => string | null> = {
  // 1. research and sources: the sources ratchet (test/sources.test.ts) covers the numbers; here the row itself
  species: s => (s.sci && s.tl > 0 && s.art ? null : 'species.json needs sci, tl and art'),
  // 6. minimum tank dimensions: the footprint, not only the volume
  'tank-footprint': s => { const r = minDataOf(s.id)?.red; return r && r.L > 0 && (r.W ?? 0) > 0 ? null : 'tankmin.json needs a red line with L and W (the footprint)'; },
  'tank-footprint-url': s => { const d = minDataOf(s.id) as any; return d?.red?.url ?? d?.red?.site ? null : 'tankmin.json red line needs its source page'; },
  'tank-volume': s => (CARE[s.id].minL ? null : 'care.ts needs minL (litres)'),
  'group-length': s => { const g = GROUPS[s.id], r = minDataOf(s.id)?.red; return g?.minLengthMm && (!r || g.minLengthMm >= r.L - 1) ? null : 'groups.ts minLengthMm is missing or shorter than the footprint length'; },
  // 3. specific needs
  care: s => { const c = CARE[s.id]; return c.care && c.minL && c.temp ? null : 'care.ts needs care, minL, temper and temp'; },
  water: s => (CHEM[s.id]?.ph ? null : 'waterchem.ts needs pH (and GH)'),
  climate: s => (WATER[s.id] ? null : 'climatedata.ts needs the comfortable and tolerable temperature'),
  substrate: s => (s.zone !== 'bottom' || DWELLER[s.id] ? null : 'a bottom dweller needs a DWELLER row (substrate.ts)'),
  // 4. checks and warnings
  needs: s => ((NEEDS[s.id]?.length ?? 0) > 0 ? null : 'careNeeds.ts needs at least one NEEDS line (a warning or essential condition)'),
  // 5. social needs and preferences
  social: s => { const g = GROUPS[s.id]; return g?.bands && (g.msg || g.sexed || g.territory || g.max) ? null : 'groups.ts needs bands and a social note (msg, sexed, max or territory)'; },
  groups: s => { const g = GROUPS[s.id]; return g?.bands && g.zone && g.flow && g.appeal?.length ? null : 'groups.ts needs bands, zone, flow and appeal'; },
  // 7. the rest of the touch points
  origin: s => (originOf(s.id) ? null : 'origin.json needs a row'),
  bodymass: s => ((bodymass as any).species[s.id] ? null : 'bodymass.json needs a row'),
  behaviour: s => (HOVER[s.id] ? null : 'fishBehavior.ts HOVER needs a row'),
  'space-factor': s => (SPACE_FACTOR[s.id] ? null : 'spacefactor.ts needs a row (a class-matched factor with its note)'),
  aqadvisor: s => ((aqadvisor as any)[s.id] ? null : 'aqadvisor.json needs an id (a stand-in is allowed, flagged standIn)'),
  demand: s => ((demand as any).rows['animal:' + s.id] ? null : 'demand-items.json needs an animal:<id> cost row'),
  gallery: s => { return existsSync(`public/gallery/${s.look}.webp`) ? null : 'no baked gallery picture (node scripts/bake-gallery.mjs)'; },
  'model-record': s => { const miss = looksOf(s).filter(l => !(versions as any).models[l]); return miss.length ? 'no model-versions record for ' + miss.join(', ') : null; },
};

const failing = Object.fromEntries(Object.entries(CHECKS).map(([k, f]) => [k, AQUATIC.filter(s => f(s) !== null).map(s => s.id).sort()]));

describe('species onboarding checklist (research/species-onboarding.md)', () => {
  if ((globalThis as any).process?.env.GEN_ONBOARDING) {
    // only ever shrinks: keep an existing baseline entry only if it still fails
    const old = existsSync(BASE) ? JSON.parse(readFileSync(BASE, 'utf8')) : null;
    const next = Object.fromEntries(Object.entries(failing).map(([k, ids]) => [k, old ? ids.filter(i => (old[k] ?? []).includes(i)) : ids]));
    writeFileSync(BASE, JSON.stringify(next, null, 1) + '\n');
  }
  const base: Record<string, string[]> = JSON.parse(readFileSync(BASE, 'utf8'));
  for (const [check, f] of Object.entries(CHECKS)) {
    it(`${check}: no new species misses it, and the baseline only shrinks`, () => {
      const allowed = new Set(base[check] ?? []);
      const fresh = AQUATIC.filter(s => f(s) !== null && !allowed.has(s.id)).map(s => `${s.id}: ${f(s)}`);
      expect(fresh, 'a new species is missing a piece of the onboarding checklist (research/species-onboarding.md)').toEqual([]);
      const stale = [...allowed].filter(id => !failing[check].includes(id));
      expect(stale, 'these species now pass: take them off research/species-onboarding-baseline.json (GEN_ONBOARDING=1 rewrites it)').toEqual([]);
    });
  }
  it('every Phase 1 species (RX1, R139) passes every check', () => {
    const PHASE1 = ['endler', 'threespot', 'pleco', 'glowlight', 'convict', 'electricblueacara', 'clownkilli', 'peacockgudgeon', 'falsejulii', 'neonrainbow', 'firemouth', 'saltpepper', 'clownpleco', 'yoyoloach', 'glasscatfish'];
    const miss = PHASE1.flatMap(id => Object.entries(CHECKS).filter(([, f]) => f(AQUATIC.find(s => s.id === id)!) !== null).map(([k]) => `${id}: ${k}`));
    expect(miss).toEqual([]);
  });
  it('a species with a footprint also has a volume, and the footprint is a real tank (length at least width, volume near L x W x 30 cm or more)', () => {
    const bad = AQUATIC.filter(s => { const r = minDataOf(s.id)?.red, v = CARE[s.id].minL; return r && v && r.L < (r.W ?? 0); }).map(s => s.id);
    expect(bad).toEqual([]);
  });
});
