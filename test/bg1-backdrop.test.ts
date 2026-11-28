import { describe, it, expect } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { bdShown, bdDepthShown, BD_KINDS, bgSummary } from '../src/shell/logic/tank';

describe('BG1: 3D background in the Tank screen', () => {
  it('lists every engine backdrop kind', () => { expect(BD_KINDS.map(k => k[0])).toEqual(['none', 'rock', 'rockblock', 'river', 'reef', 'cork', 'corkplate', 'moss', 'jungle']); });
  it('hidden on bowls; depth hidden when none', () => {
    const S = defaultSetup(); expect(bdShown(S)).toBe(true); expect(bdDepthShown(S)).toBe(S.backdrop.kind !== 'none');
    S.backdrop.kind = 'rock'; expect(bdDepthShown(S)).toBe(true); expect(bgSummary(S)).toMatch(/rock wall/);
    S.backdrop.kind = 'none'; expect(bdDepthShown(S)).toBe(false);
    S.tank.shape = 'bowl'; S.backdrop.kind = 'rock'; expect(bdShown(S)).toBe(false); expect(bdDepthShown(S)).toBe(false);
  });
});
