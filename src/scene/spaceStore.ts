// One store for "my space" (DX7, closes GW2's open item). The VALUE lives in the brief (`constraints.maxSpace`, what Constraints > Your limits edits);
// `layout.space` is its mirror, kept because the viewer outline, the fullness tile and the guardrails read it. Every writer goes through here:
//   writeSpace(T, sp)   "Set my space" on the fullness tile: writes both in one step
//   mirrorSpace(T)      brief -> layout.space (the brief wins); a tank that only has layout.space (an older file) gets it put in the brief
import { clearItem, emptyBrief, getItem, setItem } from './brief';
import type { SpaceLimit, TankSetup } from './types';

export function writeSpace(T: TankSetup, sp: SpaceLimit | undefined): void {
  if (sp) T.layout.space = { ...sp }; else delete T.layout.space;
  if (!sp && !T.brief) return;
  const b = T.brief ?? emptyBrief();
  T.brief = sp ? setItem(b, 'constraints.maxSpace', { ...sp }, getItem(b, 'constraints.maxSpace')?.status ?? 'hard') : clearItem(b, 'constraints.maxSpace');
}

export function mirrorSpace(T: TankSetup): void {
  const it = T.brief ? getItem(T.brief, 'constraints.maxSpace') : undefined;
  if (it?.value) { T.layout.space = { ...it.value }; return; }
  if (T.layout.space) writeSpace(T, T.layout.space);
}
