/**
 * Precision Timing Engine for Cognitive Psychology Experiments
 * Utilizes requestAnimationFrame + virtual monotonic clock to eliminate
 * event-loop jitter and tab-switch drift.
 */

export class TimingEngine {
  private isPaused: boolean = false;
  private pauseStartTimestamp: number = 0;
  private totalPausedDuration: number = 0;
  private activeRafIds: Set<number> = new Set();

  constructor() {
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
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
      this.pause();
    } else {
      this.resume();
    }
  }

  public cleanup(): void {
    for (const id of this.activeRafIds) {
      cancelAnimationFrame(id);
    }
    this.activeRafIds.clear();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
}

export const timingEngine = new TimingEngine();
