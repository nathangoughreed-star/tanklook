import { describe, expect, it } from 'vitest';
import { shellTarget } from '../src/shell/clickOpen';
import { scapeSec } from '../src/scene/itemEdit';

describe('CM2: click target -> shell section', () => {
  it('maps every target kind', () => {
    expect(shellTarget({ kind: 'fish', id: 3 }, scapeSec)).toEqual({ section: 'animals' });
    expect(shellTarget({ kind: 'item', id: 1, item: 'stone' }, scapeSec)).toEqual({ section: 'scape' });
    expect(shellTarget({ kind: 'item', id: 2, item: 'plant' }, scapeSec)).toEqual({ section: 'plants' });
    expect(shellTarget({ kind: 'gear', row: 'heater' }, scapeSec)).toEqual({ section: 'equipment', group: 'heater' });
    expect(shellTarget({ kind: 'light' }, scapeSec)).toEqual({ section: 'equipment', group: 'light' });
    expect(shellTarget({ kind: 'stand' }, scapeSec)).toEqual({ section: 'tank', group: 'sits' });
    expect(shellTarget({ kind: 'lid' }, scapeSec)).toEqual({ section: 'tank', group: 'lid' });
  });
});
