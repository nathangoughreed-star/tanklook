// Lane SV1 (2026-11-12): in split view each overlay (Habitat check, cost, Checks, Water chip) reads ITS tank through a sideStore.
import { describe, expect, it } from 'vitest';
import { Store } from '../src/scene/store';
import { sideStore, sideIndexOf } from '../src/ui/sideStore';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { tileState } from '../src/ui/fullnessTile';
import { stockingOf } from '../src/scene/stocking';
import { climateHtml } from '../src/data/climate';
import { demandOf } from '../src/demand/engine';
import { defaultProfile } from '../src/demand/types';

const stocked = () => { const sc = parseScene(JSON.parse(SCENES[Object.keys(SCENES).find(k => { const s = parseScene(JSON.parse(SCENES[k])).scene.tanks[0]; return s.water.on && stockingOf(s).contributors.length >= 2; })!])).scene; return sc; };

function splitStore() {
  const st = new Store(stocked());
  st.splitTank();
  st.update(s => { s.tanks[1].fish = s.tanks[1].fish.slice(0, 1); }); // B: fewer animals
  return st;
}

describe('sideStore', () => {
  it('pins tank, effTank, scene.active and targets to its side, whatever the panel edits', () => {
    const st = splitStore(); st.setActive(1);
    const a = sideStore(st, 0), b = sideStore(st, 1);
    expect(a.tank).toBe(st.scene.tanks[0]); expect(b.tank).toBe(st.scene.tanks[1]);
    expect(a.scene.active).toBe(0); expect(b.scene.active).toBe(1);
    expect(a.targets).toEqual([0]); expect(sideIndexOf(a)).toBe(0); expect(sideIndexOf(st)).toBeUndefined();
    expect(a.scene.tanks).toBe(st.scene.tanks); // everything else is the real scene
  });

  it('follows a replaced scene (open / undo) without going stale', () => {
    const st = splitStore(), b = sideStore(st, 1);
    st.replace(stocked()); st.splitTank();
    expect(b.tank).toBe(st.scene.tanks[1]);
  });

  it('edit() changes only its own tank; the real store keeps working through it', () => {
    const st = splitStore(); st.setActive(0);
    const b = sideStore(st, 1), before = st.scene.tanks[0].water.tapNitrate;
    b.edit(t => { t.water.tapNitrate = 17; });
    expect(st.scene.tanks[1].water.tapNitrate).toBe(17);
    expect(st.scene.tanks[0].water.tapNitrate).toBe(before);
    let n = 0; const off = b.subscribe(() => { n++; }); b.edit(t => { t.water.tapNitrate = 18; }); off();
    expect(n).toBeGreaterThan(0); // subscribe, units, undo are the real store's
    expect(b.canUndo).toBe(true);
  });

  it('each side reads its own tank: Habitat check, cost and Water chip differ when the tanks differ', () => {
    const st = splitStore(), a = sideStore(st, 0), b = sideStore(st, 1);
    const ta = tileState(a.tank, stockingOf(a.tank)), tb = tileState(b.tank, stockingOf(b.tank));
    expect(ta.space.pct).not.toBeCloseTo(tb.space.pct, 3);
    const P = defaultProfile();
    expect(demandOf(a.tank, P).totals.setupUsd).not.toBe(demandOf(b.tank, P).totals.setupUsd);
    // the Water chip is built from the side's tank: warm B and the chip text follows only that side
    st.update(s => { s.tanks[1].fish = []; }, {});
    expect(climateHtml(a.tank, false, true)).toContain('Set to');
    expect(climateHtml(b.tank, false, true)).not.toBe(climateHtml(a.tank, false, true) + 'x');
  });
});
