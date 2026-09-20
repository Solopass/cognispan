import { describe, expect, test } from 'bun:test';
import { TimingEngine, TimingState } from '../src/services/timingEngine';

// The visibilitychange path (pause on hide, countdown on return) needs a real
// document and is verified in the browser; these cover the clock and the
// subscription surface the overlay depends on.

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// The engine drives itself off requestAnimationFrame, which a non-DOM runtime
// has no notion of. A timer-backed stand-in is enough to exercise scheduling.
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  const handles = new Map<number, ReturnType<typeof setTimeout>>();
  let nextHandle = 1;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    const handle = nextHandle++;
    handles.set(handle, setTimeout(() => { handles.delete(handle); cb(performance.now()); }, 16));
    return handle;
  }) as typeof globalThis.requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((handle: number) => {
    const timer = handles.get(handle);
    if (timer !== undefined) { clearTimeout(timer); handles.delete(handle); }
  }) as typeof globalThis.cancelAnimationFrame;
}

describe('TimingEngine clock', () => {
  test('starts unpaused with no countdown', () => {
    const e = new TimingEngine();
    expect(e.getState()).toEqual({ paused: false, resumingInSeconds: null });
    e.cleanup();
  });

  test('virtual time advances while running', async () => {
    const e = new TimingEngine();
    const t0 = e.now();
    await sleep(60);
    expect(e.now() - t0).toBeGreaterThanOrEqual(40);
    e.cleanup();
  });

  test('paused time does not count toward the virtual clock', async () => {
    const e = new TimingEngine();
    const before = e.now();
    e.pause();
    await sleep(120);
    const during = e.now();
    // While paused the clock is frozen, so barely any virtual time passes.
    expect(during - before).toBeLessThan(40);
    e.resume();
    e.cleanup();
  });

  test('the clock keeps moving after a pause/resume cycle', async () => {
    const e = new TimingEngine();
    e.pause();
    await sleep(80);
    e.resume();
    const t0 = e.now();
    await sleep(60);
    expect(e.now() - t0).toBeGreaterThanOrEqual(40);
    e.cleanup();
  });

  test('repeated pause calls do not compound the offset', async () => {
    const e = new TimingEngine();
    e.pause();
    e.pause();
    await sleep(60);
    e.resume();
    const t0 = e.now();
    await sleep(60);
    const advanced = e.now() - t0;
    expect(advanced).toBeGreaterThanOrEqual(40);
    expect(advanced).toBeLessThan(200);
    e.cleanup();
  });

  test('resume without a preceding pause is a no-op', () => {
    const e = new TimingEngine();
    const before = e.now();
    e.resume();
    expect(e.now()).toBeGreaterThanOrEqual(before);
    expect(e.getState().paused).toBe(false);
    e.cleanup();
  });
});

describe('TimingEngine subscriptions', () => {
  test('a new subscriber is given the current state immediately', () => {
    const e = new TimingEngine();
    const seen: TimingState[] = [];
    e.subscribe(s => seen.push(s));
    expect(seen).toHaveLength(1);
    expect(seen[0].paused).toBe(false);
    e.cleanup();
  });

  test('unsubscribing stops further delivery', () => {
    const e = new TimingEngine();
    const seen: TimingState[] = [];
    const off = e.subscribe(s => seen.push(s));
    const afterInitial = seen.length;
    off();
    e.pause();
    e.resume();
    expect(seen).toHaveLength(afterInitial);
    e.cleanup();
  });

  test('scheduled work can be cancelled without running', async () => {
    const e = new TimingEngine();
    let ran = false;
    const cancel = e.schedule(10, () => { ran = true; });
    cancel();
    await sleep(60);
    expect(ran).toBe(false);
    e.cleanup();
  });
});
