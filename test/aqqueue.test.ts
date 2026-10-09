import { afterEach, describe, expect, it, vi } from 'vitest';

describe('stocking request queue', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

  it('sends one request at a time and waits 30 s after a fresh answer, showing the wait', async () => {
    vi.useFakeTimers();
    vi.stubEnv('VITE_AQ_PROXY', 'https://proxy.test');
    const sent: number[] = [];
    vi.stubGlobal('fetch', vi.fn(async () => { sent.push(Date.now()); return new Response(JSON.stringify({ stocking: 50 })); }));
    const aq = await import('../src/data/aqadvisor');
    const q = { sel: '1:1::', l: 24, d: 12, h: 12, skipped: [], standIns: [], counted: 1 };
    const started: string[] = [];
    const a = aq.fetchStocking(q, () => started.push('a')), b = aq.fetchStocking(q, () => started.push('b'));
    await vi.advanceTimersByTimeAsync(0);
    expect(await a).toBe(50);
    expect(started).toEqual(['a']);
    expect(aq.aqWaitS()).toBe(30);
    await vi.advanceTimersByTimeAsync(20000);
    expect(aq.aqWaitS()).toBe(10);
    expect(started).toEqual(['a']);
    await vi.advanceTimersByTimeAsync(10000);
    expect(await b).toBe(50);
    expect(sent[1] - sent[0]).toBeGreaterThanOrEqual(30000);
  });

  it('does not wait after a cached answer', async () => {
    vi.useFakeTimers();
    vi.stubEnv('VITE_AQ_PROXY', 'https://proxy.test');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ stocking: 50, cached: true }))));
    const aq = await import('../src/data/aqadvisor');
    const q = { sel: '1:1::', l: 24, d: 12, h: 12, skipped: [], standIns: [], counted: 1 };
    await aq.fetchStocking(q);
    expect(aq.aqWaitS()).toBe(0);
  });
});
