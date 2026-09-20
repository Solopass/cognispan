/**
 * Precision Timing Engine for Cognitive Psychology Experiments
 * Utilizes requestAnimationFrame + virtual monotonic clock to eliminate
 * event-loop jitter and tab-switch drift.
 */

/** What the UI needs to explain a pause to the participant. */
export interface TimingState {
  paused: boolean;
  /** Seconds left on the countdown before trials resume, or null if not counting. */
  resumingInSeconds: number | null;
}

/** Grace period after returning, so a stimulus never fires the instant the tab is refocused. */
const RESUME_COUNTDOWN_SECONDS = 3;

export class TimingEngine {
  private isPaused: boolean = false;
  private pauseStartTimestamp: number = 0;
  private totalPausedDuration: number = 0;
  private activeRafIds: Set<number> = new Set();

  private listeners: Set<(state: TimingState) => void> = new Set();
  private resumingInSeconds: number | null = null;
  private countdownIntervalId: number | null = null;

  constructor() {
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  /** Subscribe to pause/resume changes. Returns an unsubscribe function. */
  public subscribe(listener: (state: TimingState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): TimingState {
    return { paused: this.isPaused, resumingInSeconds: this.resumingInSeconds };
  }

  private emit(): void {
    const state = this.getState();
    for (const listener of this.listeners) listener(state);
  }

  /**
   * Return high-resolution timestamp adjusted for paused durations
   */
  public now(): number {
    const currentPause = this.isPaused ? performance.now() - this.pauseStartTimestamp : 0;
    return performance.now() - this.totalPausedDuration - currentPause;
  }

  /**
   * Schedules a task to execute after a specified duration in milliseconds.
   * Compares against engine virtual time on each V-Sync frame.
   * Returns an independent cancellation function.
   */
  public schedule(durationMs: number, onExecute: (actualOnsetMs: number, driftMs: number) => void): () => void {
    const targetEngineTime = this.now() + durationMs;
    let cancelled = false;
    let currentRafId: number | null = null;

    const checkFrame = () => {
      if (cancelled) return;

      if (this.isPaused) {
        currentRafId = requestAnimationFrame(checkFrame);
        this.activeRafIds.add(currentRafId);
        return;
      }

      const currentEngineTime = this.now();
      if (currentEngineTime >= targetEngineTime) {
        if (currentRafId !== null) {
          this.activeRafIds.delete(currentRafId);
        }
        const drift = currentEngineTime - targetEngineTime;
        onExecute(currentEngineTime, drift);
      } else {
        currentRafId = requestAnimationFrame(checkFrame);
        this.activeRafIds.add(currentRafId);
      }
    };

    currentRafId = requestAnimationFrame(checkFrame);
    this.activeRafIds.add(currentRafId);

    return () => {
      cancelled = true;
      if (currentRafId !== null) {
        cancelAnimationFrame(currentRafId);
        this.activeRafIds.delete(currentRafId);
      }
    };
  }

  public pause(): void {
    if (!this.isPaused) {
      this.isPaused = true;
      this.pauseStartTimestamp = performance.now();
    }
  }

  public resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.totalPausedDuration += performance.now() - this.pauseStartTimestamp;
    }
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.clearCountdown();
      this.pause();
      this.emit();
      return;
    }

    // Coming back: hold the clock for a moment instead of firing whatever was
    // due the instant the tab is looked at again. A timed recall task that
    // resumes mid-stimulus costs the participant the trial.
    if (!this.isPaused) return;

    this.resumingInSeconds = RESUME_COUNTDOWN_SECONDS;
    this.emit();

    this.countdownIntervalId = (typeof window !== 'undefined' ? window : globalThis).setInterval(() => {
      if (this.resumingInSeconds === null) return;
      this.resumingInSeconds -= 1;

      if (this.resumingInSeconds <= 0) {
        this.clearCountdown();
        this.resume();
      }
      this.emit();
    }, 1000) as unknown as number;
  }

  private clearCountdown(): void {
    if (this.countdownIntervalId !== null) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
    this.resumingInSeconds = null;
  }

  public cleanup(): void {
    for (const id of this.activeRafIds) {
      cancelAnimationFrame(id);
    }
    this.activeRafIds.clear();
    this.clearCountdown();
    this.listeners.clear();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
}

export const timingEngine = new TimingEngine();
