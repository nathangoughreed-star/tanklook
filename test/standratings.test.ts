// Lane PL1 part 3 (R108): stand ratings. A rating is only what the page states (never derived from the footprint); a stand
// holding a tank heavier than its stated weight capacity warns clearly, a tank over its rated gallons gets a softer note,
// and a stand with no stated rating says nothing new.
import { describe, expect, it } from 'vitest';
import { STAND_PRODUCTS, standCheck, standRatingLine } from '../src/data/stands';

describe('stand ratings: data', () => {
  it('ratings are positive numbers, and the product page row says where they were read', () => {
    for (const p of STAND_PRODUCTS) {
      if (p.ratedGal !== undefined) expect(p.ratedGal, p.id).toBeGreaterThan(0);
      if (p.maxLoadLb !== undefined) expect(p.maxLoadLb, p.id).toBeGreaterThan(20);
      if (p.ratedGal || p.maxLoadLb) { expect(p.ratingNote, p.id).toMatch(/Rating/); expect(p.url, p.id).toMatch(/^https?:\/\//); }
    }
  });
  it('most stands carry a rated size, a few a stated load; the rest stay blank (not guessed)', () => {
    expect(STAND_PRODUCTS.filter(p => p.ratedGal).length).toBeGreaterThan(25);
    expect(STAND_PRODUCTS.filter(p => p.maxLoadLb).length).toBeGreaterThanOrEqual(8);
    expect(STAND_PRODUCTS.filter(p => !p.ratedGal && !p.maxLoadLb).length).toBeGreaterThan(0);
  });
  it('known stated loads', () => {
    const load = (id: string) => STAND_PRODUCTS.find(p => p.id === id)?.maxLoadLb;
    expect(load('imagitarium-brooklyn-40')).toBe(660);
    expect(load('af-40b-cabinet')).toBe(400);
    expect(load('seapora-empress-24x12')).toBeUndefined();
  });
});

describe('stand ratings: tile line and warning', () => {
  const rated = { ratedGal: 40, maxLoadLb: 400 };
  it('the tile line shows only what is stated', () => {
    expect(standRatingLine(rated)).toBe('Rated 40 gal · 400 lb');
    expect(standRatingLine({ ratedGal: 20 })).toBe('Rated 20 gal');
    expect(standRatingLine({ maxLoadLb: 435 })).toBe('Rated 435 lb');
    expect(standRatingLine({})).toBeUndefined();
  });
  it('warns above the weight rating, not at or below it', () => {
    const over = standCheck(rated, 520, 40);
    expect(over?.level).toBe('over');
    expect(over?.text).toBe("Filled tank ~520 lb is over this stand's 400 lb rating");
    expect(standCheck(rated, 400, 40)).toBeUndefined();
    expect(standCheck(rated, 380, 40)).toBeUndefined();
  });
  it('a tank over the rated gallons is a softer note; within it, nothing', () => {
    const soft = standCheck({ ratedGal: 20 }, 300, 29);
    expect(soft?.level).toBe('soft');
    expect(soft?.text).toContain('rated for up to 20 gal');
    expect(standCheck({ ratedGal: 20 }, 300, 20)).toBeUndefined();
  });
  it('no stated rating, no warning (nothing implied, either way)', () => {
    expect(standCheck({}, 5000, 500)).toBeUndefined();
    expect(standCheck(undefined, 5000, 500)).toBeUndefined();
  });
  it('the weight warning wins over the gallons note', () => {
    expect(standCheck({ ratedGal: 10, maxLoadLb: 100 }, 130, 15)?.level).toBe('over');
  });
});
