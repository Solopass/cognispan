import { StaircaseConfig, StaircaseState } from '../types/psychometrics';

export class AdaptiveStaircase {
  private config: StaircaseConfig;
  private state: StaircaseState;

  constructor(config?: Partial<StaircaseConfig>) {
    this.config = {
      initialLevel: config?.initialLevel ?? 2,
      minLevel: config?.minLevel ?? 1,
      maxLevel: config?.maxLevel ?? 9,
      upThreshold: config?.upThreshold ?? 0.825,    // 82.5% accuracy to advance
      downThreshold: config?.downThreshold ?? 0.625, // 62.5% or lower to drop
      consecutivePassesRequired: config?.consecutivePassesRequired ?? 1,
      ...config
    };

    this.state = {
      currentLevel: this.config.initialLevel,
      consecutivePasses: 0,
      consecutiveFails: 0,
      history: []
    };
  }

  public getCurrentLevel(): number {
    return this.state.currentLevel;
  }

  public setLevel(level: number): void {
    this.state.currentLevel = Math.max(this.config.minLevel, Math.min(this.config.maxLevel, level));
  }

  /**
   * Evaluates a completed block and titrates difficulty level
   */
  public evaluateBlock(accuracyPercent: number): {
    previousLevel: number;
    newLevel: number;
    action: 'up' | 'down' | 'maintain';
  } {
    const accuracy = accuracyPercent / 100.0;
    const previousLevel = this.state.currentLevel;
    let action: 'up' | 'down' | 'maintain' = 'maintain';

    if (accuracy >= this.config.upThreshold) {
      this.state.consecutivePasses += 1;
      this.state.consecutiveFails = 0;

      if (this.state.consecutivePasses >= this.config.consecutivePassesRequired) {
        if (this.state.currentLevel < this.config.maxLevel) {
          this.state.currentLevel += 1;
          action = 'up';
          this.state.consecutivePasses = 0;
        }
      }
    } else if (accuracy <= this.config.downThreshold) {
      this.state.consecutiveFails += 1;
      this.state.consecutivePasses = 0;

      if (this.state.currentLevel > this.config.minLevel) {
        this.state.currentLevel -= 1;
        action = 'down';
      }
    } else {
      // Zone of proximal stability
      this.state.consecutivePasses = 0;
      this.state.consecutiveFails = 0;
      action = 'maintain';
    }

    this.state.history.push({
      blockIndex: this.state.history.length + 1,
      level: previousLevel,
      accuracyPercent,
      action
    });

    return { previousLevel, newLevel: this.state.currentLevel, action };
  }

  public getState(): StaircaseState {
    return { ...this.state };
  }
}
