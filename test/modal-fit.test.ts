// DG1: every modal / dialog CSS rule must stay inside the visible viewport (dvh, not vh), centred, with its own scroll.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const css = ['src/shell/shell.css', 'src/style.css'].map(f => readFileSync(f, 'utf8')).join('\n');
const rule = (sel: string) => {
  const i = css.split(/\r?\n/).join('\n');
  const esc = sel.replace(/[.*+?^${}()|[\]\\:]/g, '\\$&');
  const m = new RegExp('(?:^|[\\s}/])' + esc + '\\s*\\{([^}]*)\\}', 'm').exec(i);
  return m ? m[1] : '';
};
describe('modals fit the viewport', () => {
  it('shared shell dialog: capped by dvh, centred, scrim exactly one dvh tall', () => {
    expect(rule('.scrim')).toMatch(/height:\s*100dvh/); expect(rule('.scrim')).toMatch(/place-items:\s*center/);
    expect(rule('.scrim')).toMatch(/minmax\(0,\s*1fr\)/);
    expect(rule('.dlg')).toMatch(/max-height:[^;]*100dvh/);
    expect(rule('.dlg.tall')).toMatch(/max-height:[^;]*100dvh/);
    expect(rule('.dlgbody')).toMatch(/overflow:\s*auto/);
  });
  it('other overlays use dvh caps', () => {
    for (const s of ['.envov', '.envcard', '.libdlg', '.dq9-panel', '.abdock .abmodal', '.abdock .abmbox']) expect(rule(s), s).toMatch(/100dvh/);
    expect(rule('dialog:modal')).toMatch(/margin:\s*auto/);
  });
  it('no modal rule caps its height with vh', () => {
    for (const s of ['.scrim', '.dlg', '.dlg.tall', '.envov', '.envcard', '.libdlg', '.dq9-panel', '.abdock .abmbox', 'dialog:modal'])
      expect(rule(s), s).not.toMatch(/\d\s*vh/);
  });
  it('native dialogs are not top-anchored', () => { expect(rule('.startdlg')).not.toMatch(/margin:\s*\d+px/); });
});
