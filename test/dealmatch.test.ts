import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { defaultProfile } from '../src/demand';
import { bestMatch, dealMatches, matchLine, sameTank, withDealGear } from '../src/demand/dealmatch';
import { pinTank, pinnedDeal, pinnedKit, unpinDeal } from '../src/demand/pinned';
import { DEALS, type Deal } from '../src/data/deals';
import { volume } from '../src/scene/physics';
import { parseScene } from '../src/scene/validate';
import type { TankSetup } from '../src/scene/types';

// Deal match (lane DM, 2026-10-19). Fixed `now` keeps expiry and price-age widening stable.
const NOW = Date.parse('2026-10-19');
const tankOf = (id: string) => parseScene(SCENES[id]).scene.tanks[0];
const P = defaultProfile();
const deal = (id: string) => DEALS.find(d => d.id === id)!;
/** A fresh 20 high with the blackwater fish and its wood, no plants: a plain community tank the 20 H bundles fit. */
function community20(): TankSetup {
  const S = tankOf('blackwater');
  S.tank = { ...tankOf('clownnano').tank };
  S.items = S.items.filter(i => i.kind !== 'plant');
  S.fish = S.fish.slice(0, 8);
  return S;
}

describe('deal match on the starter examples', () => {
  it('prints what each example is offered', () => {
    for (const id of Object.keys(SCENES)) {
      const S = tankOf(id), ms = dealMatches(S, P, { now: NOW });
      console.log(`${id} ${Math.round(volume(S.tank).gallons)} gal: ${ms.length} candidates` + ms.slice(0, 2).map(m => `\n  ${m.deal.id} save ${Math.round(m.savingUsd)} of ${Math.round(m.partsUsd)}${m.breaks.length ? ' BREAKS ' + m.breaks.join(' | ') : ''}\n    ${m.changes.join(' / ')}`).join(''));
    }
  });
});

describe('same tank size only', () => {
  it('never offers a deal of another size, nor one of the same gallons but another tank', () => {
    const S = community20(), gal = volume(S.tank).gallons;
    expect(dealMatches(S, P, { now: NOW }, DEALS.filter(d => !sameTank(S.tank, d)))).toEqual([]);
    // every match from the full list is a 20 high, within the gallons tolerance
    const all = dealMatches(S, P, { now: NOW });
    expect(all.length).toBeGreaterThan(0);
    for (const m of all) { expect(m.deal.tank).toBe('g20h'); expect(Math.abs(m.deal.gal - gal)).toBeLessThan(3); }
    // a 20 long holds about the same, but is a different tank
    const long: Deal = { ...deal('walmart-tetra-complete-20'), id: 'test-20l', tank: 'g20l', dims: undefined };
    expect(dealMatches(S, P, { now: NOW }, [long])).toEqual([]);
    // a 29 and a 10 are never offered on a 20
    expect(dealMatches(S, P, { now: NOW }, [deal('chewy-tetra-complete-29'), deal('walmart-tetra-led-10')])).toEqual([]);
    // a deal with no catalog tank (the hex) cannot be shown to be the same tank
    expect(dealMatches(S, P, { now: NOW }, [deal('petsmart-top-fin-captivate-hex-20')])).toEqual([]);
  });
});

describe('the offer', () => {
  it('a plain 20 high community tank gets one line with the changes', () => {
    const S = community20(), m = bestMatch(S, P, { now: NOW });
    expect(m).toBeDefined();
    console.log(matchLine(m!) + '\n  ' + m!.changes.join('\n  ') + (m!.guesses.length ? '\n  guessed: ' + m!.guesses.join('; ') : ''));
    expect(m!.breaks).toEqual([]);
    expect(m!.savingUsd).toBeGreaterThan(10);
    expect(m!.changes.length).toBeGreaterThan(0);
    expect(m!.changes.length).toBeLessThanOrEqual(5);
    expect(matchLine(m!)).toContain(m!.deal.retailer);
  });
  it('B keeps the tank, livestock, plants and hardscape; only the gear changes', () => {
    const S = tankOf('planted'), B = withDealGear(S, deal('petsmart-marineland-hd-45'));
    expect(B.tank).toEqual(S.tank); expect(B.fish).toEqual(S.fish); expect(B.items).toEqual(S.items); expect(B.substrate).toEqual(S.substrate);
    expect(B.lid).not.toBe(S.lid);
  });
  it('a deal that leaves corals too dim is not offered, and says what it breaks', () => {
    const S = tankOf('clownnano'), ms = dealMatches(S, P, { now: NOW });
    expect(ms.length).toBeGreaterThan(0);
    for (const m of ms) expect(m.breaks.join(' ')).toMatch(/dim/);
    expect(bestMatch(S, P, { now: NOW })).toBeUndefined();
  });
  it('a dismissed match stays out', () => {
    const S = community20(), m = bestMatch(S, P, { now: NOW })!;
    expect(bestMatch(S, P, { now: NOW }, id => id === m.deal.id)?.deal.id).not.toBe(m.deal.id);
  });
  it('a tank already priced as the deal is not offered it again', () => {
    const S = community20(), m = bestMatch(S, P, { now: NOW })!;
    pinTank(S, m.deal);
    expect(dealMatches(S, P, { now: NOW }).some(x => x.deal.id === m.deal.id)).toBe(false);
  });
});

describe('per-tank pins', () => {
  it('ride on the tank through a clone (undo, split) and price that tank only', () => {
    const A = community20(), d = deal('walmart-tetra-complete-20');
    const B = structuredClone(A); pinTank(B, d);
    expect(pinnedDeal(A)).toBeNull();
    expect(pinnedDeal(B)?.id).toBe(d.id);
    expect(pinnedKit(JSON.parse(JSON.stringify(B)))?.id).toBe(d.id);
    unpinDeal(B);
    expect(pinnedDeal(B)).toBeNull();
  });
  it('a saved file drops the pin', () => {
    const sc = parseScene(SCENES.planted).scene; pinTank(sc.tanks[0], deal('petsmart-marineland-hd-45'));
    expect(pinnedDeal(parseScene(JSON.stringify(sc)).scene.tanks[0])).toBeNull();
  });
});

describe('per-tank pins and deal drift', () => {
  it('a part the bundle covers changed on the tank: the bundle price lapses; put back, it holds again', () => {
    const B = community20(), d = deal('walmart-tetra-complete-20');
    pinTank(B, d);
    expect(pinnedKit(B, 1)?.id).toBe(d.id);
    const was = B.lid; B.lid = was === 'glass' ? 'open' : 'glass';
    expect(pinnedKit(B, 1)).toBeUndefined();
    B.lid = was;
    expect(pinnedKit(B, 1)?.id).toBe(d.id);
  });
});
