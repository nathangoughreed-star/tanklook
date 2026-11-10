import { describe, it, expect } from 'vitest';
import { HABITAT_CHOICES, kindOfDirection, stepForMenu, backOf, routeChoice, CHOICES } from '../src/ui/startScreenLogic';
import { INTRO_TITLE, INTRO_LINES, INTRO_BUTTON, showsIntro, introHtml, type StartDoor } from '../src/ui/introPopup';
import { HABITAT_PICS } from '../src/ui/habitatPics';
import { emptyBrief, projectExtras, parseProject } from '../src/scene/brief';
import { setDirection, setNoNewEquipment } from '../src/scene/project';
import { SETUP_KINDS } from '../src/scene/pickerKind';

// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const read = (f: string) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8') as string;

describe('AB4 habitat question', () => {
  it('five answers, in spec order, each with a picture', () => {
    expect(HABITAT_CHOICES.map(c => c.label)).toEqual(['Freshwater aquarium', 'Saltwater aquarium', 'Terrarium', 'Paludarium', 'I don’t know yet']);
    for (const c of HABITAT_CHOICES) expect(HABITAT_PICS[c.id]).toContain('<svg');
  });
  it('every answer maps to a supported kind; paludarium is the vivarium kind; unsure is the default empty project', () => {
    const kinds = SETUP_KINDS.map(k => k[0]);
    for (const c of HABITAT_CHOICES) expect(kinds).toContain(kindOfDirection(c.id));
    expect(kindOfDirection('paludarium')).toBe('vivarium'); expect(kindOfDirection('unsure')).toBe('freshwater');
  });
  it('SL1 is intact: three choices, every visit; no kinds step, Back goes home', () => {
    expect(CHOICES.map(c => routeChoice(c.id))).toEqual(['new', 'starters', 'open']);
    expect(stepForMenu('new')).toBe('new'); expect(backOf('new')).toBe('home');
  });
  it('the direction is stored in the project extras, soft: no lock, nothing else changes, clearable, survives validation', () => {
    const b = setDirection(emptyBrief(), 'saltwater');
    expect(projectExtras(b).direction).toBe('saltwater');
    expect(parseProject(projectExtras(b))?.direction).toBe('saltwater');
    expect(b.items).toEqual(emptyBrief().items); // not a brief item, so no constraint and no lock
    expect(projectExtras(setNoNewEquipment(b, true)).direction).toBe('saltwater'); // other extras keep it
    expect(projectExtras(setDirection(b, 'terrarium')).direction).toBe('terrarium'); // changeable
    expect(projectExtras(setDirection(b, undefined)).direction).toBeUndefined();
    expect(parseProject({ direction: 'moon' })).toBeUndefined();
  });
});

describe('AB4 intro popup', () => {
  it('spec 2.2 copy, one button', () => {
    expect(INTRO_TITLE).toBe("Let's build your habitat.");
    expect(INTRO_BUTTON).toBe('Start Building');
    expect(introHtml(INTRO_LINES[0])).toContain('<b>Lock anything you’re sure about.</b>');
    expect(introHtml(INTRO_LINES[1])).toContain('hit <b>Discover</b> to explore setups built around your choices. If you’re starting from scratch, you can jump straight into Discover!');
  });
  it('shows on New Setup and toolbar New, never on Open Existing, a starter, a deal, a file or Continue', () => {
    const doors: Record<StartDoor, boolean> = { 'new-setup': true, 'toolbar-new': true, 'open-existing': false, starter: false, deal: false, continue: false, 'open-file': false };
    for (const [d, want] of Object.entries(doors)) expect(showsIntro(d as StartDoor)).toBe(want);
  });
  it('wiring: only the habitat tiles call showIntro; no "don’t show again"; DX5 shortcuts are gone', () => {
    const sm = read('src/ui/startMode.ts'), pn = read('src/ui/panels.ts'), ip = read('src/ui/introPopup.ts');
    expect(sm.match(/showIntro\(/g)?.length).toBe(1);
    expect(pn).not.toContain('showIntro'); // starters, saved tanks, files, deals and Continue never reach it
    expect(sm + pn).not.toMatch(/modeExploring|modeIdeas|modeExisting|START_ENTRIES|showKinds/);
    expect(ip.toLowerCase()).not.toContain("don't show"); expect(ip).not.toContain('localStorage');
    expect(read('index.html')).toContain('id="startDeals"'); // Deals and bundles stays
  });
});
