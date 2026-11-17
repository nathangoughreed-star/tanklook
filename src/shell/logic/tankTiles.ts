// VT1 (2026-11-17): the picture tiles of the Tank workspace's "Sits on" and "Background" groups. Pure lists and mapping, no DOM.
// The pictures are baked stills of our own 3D viewer (scripts/vt1-shot.ts + scripts/vt1-tiles.py -> public/gallery/tank-ui/<img>.webp, same pipeline as the
// TP1 tank tiles): one per base type (a typical tank on the floor / a stand / a table) and one per BACKGROUNDS entry (a typical tank in front of it).
import { BACKGROUNDS } from '../../render/build';
import { placementOf, type Placement } from '../../scene/placement';
import type { TankSetup } from '../../scene/types';

type Bg = TankSetup['render']['bg'];
export interface SitsTile { id: Placement; label: string; sub: string; img: string }
export interface BgTile { id: Bg; label: string; img: string }

export const SITS_TILES: SitsTile[] = [
  { id: 'floor', label: 'Floor', sub: 'No stand', img: 'sits-floor' },
  { id: 'stand', label: 'Stand', sub: 'Cabinet or open frame', img: 'sits-stand' },
  { id: 'furniture', label: 'My own furniture', sub: 'Table or counter you have', img: 'sits-furniture' },
];

/** The tile that shows as chosen; none while the stand question is still open (the budget counts a typical stand until you pick). */
export const sitsTileOn = (S: TankSetup): Placement | '' => (S.stand.need === 'ask' && !S.stand.show ? '' : placementOf(S));

/** "Deep-sea fade (blue to black)" -> "Deep-sea fade": the tile's label is the part before the bracket. */
export const bgShort = (label: string) => label.replace(/\s*\(.*\)$/, '');

/** One tile per BACKGROUNDS key, in that order. */
export const BG_TILES: BgTile[] = (Object.keys(BACKGROUNDS) as Bg[]).map(id => ({ id, label: bgShort(BACKGROUNDS[id].label), img: 'bg-' + id }));

export const tileSrc = (base: string, img: string) => `${base}gallery/tank-ui/${img}.webp`;
