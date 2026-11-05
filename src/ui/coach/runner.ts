// The coach runner (lane GW1): walks a list of CoachSteps through a CoachHost. No DOM in here: the host opens targets, draws the card and the spotlight and reads the scene, so
// the walk itself (opening, advancing on `done`, skipping a missing target, resuming) is tested without a browser (test/coach.test.ts).
import type { CoachCtx, CoachDone, CoachStep, CoachTarget } from './steps';

/** What the runner keeps in the project so a walk can resume: the step it was on and the ones the person skipped. */
export interface CoachProgress { at: string; skipped?: string[] }

/** What the host found when it opened a target. `el` is what to highlight (the control, the section's summary or the dialog), `dialog` is set when the card must live inside an open dialog. */
export interface CoachOpened { el: Element | null; dialog?: Element | null }

export interface CoachCard {
  step: CoachStep; n: number; m: number;
  done: boolean; canBack: boolean; canSkip: boolean; canNext: boolean; last: boolean;
}

export interface CoachHost {
  /** Open the target and say what to highlight, or null when it is not there (the runner skips the step with a warning). */
  open(t: CoachTarget): Promise<CoachOpened | null>;
  show(card: CoachCard, opened: CoachOpened): void;
  /** Update only the buttons / done tick of the card that is showing. */
  update(card: CoachCard): void;
  hide(): void;
  read(): CoachCtx;
  /** Called after every scene change and when a dialog the coach opened closes; returns the unsubscribe. */
  subscribe(fn: () => void): () => void;
  load(): CoachProgress | undefined;
  save(p: CoachProgress | undefined): void;
  warn(msg: string): void;
}

export interface CoachOptions {
  /** how long a finished step stays on screen before the walk moves on by itself (the person sees the tick); 0 in tests */
  settleMs?: number;
}

const snap = (d: Extract<CoachDone, { changes: unknown }>, c: CoachCtx) => JSON.stringify(d.changes(c) ?? null);

export function createCoach(steps: readonly CoachStep[], host: CoachHost, opt: CoachOptions = {}) {
  const settleMs = opt.settleMs ?? 600;
  let idx = -1, running = false, gen = 0, entry = '', wasDone = false, unsub: (() => void) | undefined, timer: ReturnType<typeof setTimeout> | undefined, skipped: string[] = [];
  const state = { get running() { return running; }, get index() { return idx; }, get step(): CoachStep | undefined { return steps[idx]; }, get skipped() { return skipped; } };

  const isDone = (s: CoachStep): boolean => {
    const d = s.done; if (!d) return true;
    const c = host.read();
    return 'test' in d ? d.test(c) : snap(d, c) !== entry;
  };
  const card = (): CoachCard => {
    const step = steps[idx], done = isDone(step);
    return { step, n: idx + 1, m: steps.length, done, canBack: idx > 0, canSkip: step.skippable && !done, canNext: done, last: idx === steps.length - 1 };
  };
  const clearTimer = () => { if (timer) { clearTimeout(timer); timer = undefined; } };
  const detach = () => { unsub?.(); unsub = undefined; };

  /** Show step `i`, moving by `dir` past any step whose target is not on the page. */
  async function goto(i: number, dir: 1 | -1) {
    const mine = ++gen; clearTimer(); detach();
    while (i >= 0 && i < steps.length) {
      const step = steps[i], opened = await host.open(step.target);
      if (mine !== gen) return;                                   // a newer move (Next pressed twice, stop) took over while the target opened
      if (!opened) { host.warn(`coach: step "${step.id}" skipped, its target is not on the page`); i += dir; continue; }
      idx = i; host.save({ at: step.id, ...(skipped.length ? { skipped: [...skipped] } : {}) });
      const d = step.done;
      entry = d && 'changes' in d ? snap(d, host.read()) : '';
      wasDone = !!d && isDone(step);                              // already true when the step opens: shown as done, never advanced past on its own
      host.show(card(), opened);
      unsub = host.subscribe(onChange);
      return;
    }
    if (i >= steps.length) finish();
    else if (idx >= 0) await goto(idx, 1);                        // stepping Back past the first showable step: stay on the one before
    else void end(false);
  }
  function onChange() {
    if (!running || idx < 0) return;
    const c = card(); host.update(c);
    if (steps[idx].done && c.done && !wasDone) {                  // turned true while showing: let the tick be seen, then move on
      wasDone = true; clearTimer();
      const at = idx;
      if (settleMs <= 0) void next(); else timer = setTimeout(() => { if (running && idx === at) void next(); }, settleMs);
    }
  }
  function finish() { running = false; gen++; clearTimer(); detach(); idx = -1; skipped = []; host.save(undefined); host.hide(); }
  function end(keep: boolean) { running = false; gen++; clearTimer(); detach(); if (!keep) host.save(undefined); host.hide(); }

  async function next() { if (!running || idx < 0 || !card().canNext) return; await goto(idx + 1, 1); }
  async function back() { if (!running || idx <= 0) return; await goto(idx - 1, -1); }
  async function skip() {
    if (!running || idx < 0 || !card().canSkip) return;
    const id = steps[idx].id; if (!skipped.includes(id)) skipped.push(id);
    await goto(idx + 1, 1);
  }
  return {
    state,
    /** Start at the saved step (the walk resumes after Esc or a reload), or at the first one (`fresh`, or nothing saved). */
    async start(fresh = false) {
      if (!steps.length) return;
      const saved = fresh ? undefined : host.load(), at = saved ? steps.findIndex(s => s.id === saved.at) : -1;
      skipped = at >= 0 ? (saved?.skipped ?? []).filter(id => steps.some(s => s.id === id)) : []; running = true;
      await goto(at < 0 ? 0 : at, 1);
    },
    /** Esc / the close button: the card goes, the place is kept so Guide me can resume. */
    stop() { end(true); },
    next, back, skip,
    /** Is there a saved place to resume from? */
    resumable: () => { const p = host.load(); return !!p && steps.some(s => s.id === p.at); },
  };
}
export type Coach = ReturnType<typeof createCoach>;
