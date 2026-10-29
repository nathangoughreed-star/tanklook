// The gear card (lane GM2): tabs, locked product stats, generic sliders with warn-not-block limits, units per scene units.
import { describe, expect, it } from 'vitest';
import { defaultTab, flowText, galText, gearCard, lenText, outsideLimits, type GearCardSpec } from '../src/ui/gearCard';

const spec = (o: Partial<GearCardSpec> = {}): GearCardSpec => ({
  key: 'heater|0', type: 'heater', tab: 'generic', product: false, owned: false,
  sliders: [{ stat: 'watts', label: 'Power', min: 25, max: 500, step: 5, value: 100, show: '100 W', unit: ' W', typed: { min: 5, max: 2000 } }],
  library: { groups: [{ label: 'Near', options: [{ id: 'a', label: 'Brand A · 100 W' }] }], current: undefined, stats: [], notes: [] },
  ...o,
});

describe('gear card', () => {
  it('shows the three tabs with the active one marked', () => {
    const h = gearCard(spec({ tab: 'library' }));
    expect(h).toContain('data-gc-tab="heater|0|generic"');
    expect(h).toContain('data-gc-tab="heater|0|library"');
    expect(h).toContain('data-gc-tab="heater|0|own"');
    expect(h.match(/gc-tab on/g)).toHaveLength(1);
    expect(h).toMatch(/gc-tab on" aria-selected="true" data-gc-tab="heater\|0\|library"/);
  });
  it('generic tab: sliders for the stat block, clamped to the limits, a typed box that may pass them', () => {
    const h = gearCard(spec({ sliders: [{ ...spec().sliders[0], value: 900 }] }));
    expect(h).toContain('type="range"');
    expect(h).toContain('min="25" max="500"');
    expect(h).toContain('value="500"'); // the slider thumb is clamped, the typed box keeps 900
    expect(h).toContain('class="gc-num"');
    expect(h).toContain('value="900"');
    expect(h).toContain('Outside the usual 25-500 range'); // warns, never blocks
    expect(gearCard(spec())).not.toContain('Outside the usual');
  });
  it('library tab: a product shows locked stats (no inputs) and Tune as generic', () => {
    const h = gearCard(spec({ tab: 'library', product: true, library: { groups: [{ label: 'Near', options: [{ id: 'a', label: 'A' }] }], current: 'a', stats: [{ label: 'Power', value: '100 W', est: true }], notes: [], link: 'https://example.com' } }));
    expect(h).toContain('class="gc-stats"');
    expect(h).toContain('Tune as generic');
    expect(h).toContain('<option value="a" selected>');
    expect(h).toContain('>est<');
    expect(h).not.toContain('type="range"');
  });
  it('a product on the generic tab offers the tune button instead of sliders', () => {
    const h = gearCard(spec({ product: true }));
    expect(h).toContain('data-gc-tune="heater|0"');
    expect(h).not.toContain('type="range"');
  });
  it('library tab without a product has no stats block and no tune button', () => {
    const h = gearCard(spec({ tab: 'library' }));
    expect(h).toContain('Pick a product');
    expect(h).not.toContain('gc-stats');
    expect(h).not.toContain('Tune as generic');
  });
  it('I own one: a checkbox, session UI only', () => {
    expect(gearCard(spec({ tab: 'own' }))).toContain('data-gc-own="heater|0"');
    const h = gearCard(spec({ tab: 'own', owned: true }));
    expect(h).toContain(' checked');
    expect(h).toContain('I own one ✓');
  });
  it('escapes names', () => { expect(gearCard(spec({ tab: 'library', library: { groups: [{ label: '<b>', options: [{ id: 'x', label: 'A "q" <i>' }] }], stats: [], notes: [] } }))).not.toContain('<i>'); });
  it('opens on Library for a product, Generic otherwise, unless the owner chose', () => {
    expect(defaultTab(true)).toBe('library'); expect(defaultTab(false)).toBe('generic'); expect(defaultTab(true, 'own')).toBe('own');
  });
  it('units follow the scene: US gph / gal / in, metric L/h / L / cm', () => {
    expect(flowText(100, true)).toBe('100 gph'); expect(flowText(100, false)).toBe('379 L/h');
    expect(galText(10, true)).toBe('10 gal'); expect(galText(10, false)).toBe('38 L');
    expect(lenText(254, true)).toBe('10 in'); expect(lenText(254, false)).toBe('25.4 cm');
  });
  it('limits come from gearSpec', () => { expect(outsideLimits('heater', 'watts', 600)).toEqual([25, 500]); expect(outsideLimits('heater', 'watts', 100)).toBeUndefined(); expect(outsideLimits('light', 'watts', 2)).toEqual([3, 400]); });
});
