// R117: the "Fix it" destinations on check rows; navigation only.
import { describe, it, expect } from 'vitest';
import { goTargetOf, GO_LID } from '../src/shell/logic/noteFixes';

describe('goTargetOf', () => {
  it('sends the open top to Tank > Lid and top', () => { expect(goTargetOf('lid:open')).toEqual(GO_LID); expect(GO_LID).toMatchObject({ section: 'tank', group: 'lid' }); });
  it('sends temperature and substrate issues to their sections', () => {
    expect(goTargetOf('temp:hold:weak')).toMatchObject({ section: 'equipment', group: 'heater' });
    expect(goTargetOf('temp:chiller')).toMatchObject({ section: 'equipment', group: 'chiller' });
    expect(goTargetOf('substrate:needs:depth:x')).toMatchObject({ section: 'scape' });
  });
  it('has no button for an issue with no obvious home', () => { expect(goTargetOf('limit:time')).toBeUndefined(); });
});
