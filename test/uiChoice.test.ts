import { describe, expect, it } from 'vitest';
import { chooseUi, newUiHref, oldUiHref } from '../src/uiChoice';

describe('UF1: which interface boots', () => {
  it('no param and ?ui=2 boot the new shell; ?ui=1 boots the old UI', () => {
    expect(chooseUi('')).toBe('shell');
    expect(chooseUi('?ui=2')).toBe('shell');
    expect(chooseUi('?ui=1')).toBe('old');
    expect(chooseUi('?x=1&ui=1')).toBe('old');
    expect(chooseUi('?ui=3')).toBe('shell');
  });
  it('the old-interface link keeps other params and the hash', () => {
    expect(oldUiHref({ pathname: '/', search: '', hash: '' })).toBe('/?ui=1');
    expect(oldUiHref({ pathname: '/', search: '?ui=2&a=b', hash: '#tank=abc' })).toBe('/?ui=1&a=b#tank=abc');
    expect(newUiHref({ pathname: '/', search: '?ui=1', hash: '#x' })).toBe('/#x');
  });
});
