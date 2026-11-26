// FD unit 2 (R162): the result card. An example from the landing, or a tank planned around animals, opens full-width (no panel) with one card:
// name, cost, verdict with its reason, Make it mine / See another. This is the card's state; the card hides at the first edit (landing.untouched, logic/start.ts).
export type ResultKind = 'example' | 'animal';
export interface Result { kind: ResultKind; /** the example ids to step through (empty for an animal plan) */ list: string[]; i: number }
let cur: Result | null = null;
const subs = new Set<() => void>();
export const getResult = (): Result | null => cur;
export function setResult(r: Result | null): void { cur = r; subs.forEach(f => f()); }
export function subscribeResult(f: () => void): () => void { subs.add(f); return () => { subs.delete(f); }; }
/** The next example in the list, wrapping round. */
export const nextIndex = (i: number, n: number): number => n > 0 ? (i + 1) % n : 0;
