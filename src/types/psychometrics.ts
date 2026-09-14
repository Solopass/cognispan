export interface SDTResult {
  hitRate: number;
  falseAlarmRate: number;
  dPrime: number;
  beta: number;
  criterionC: number;
  aPrime: number;
  bDoublePrime: number;
}

export interface StaircaseConfig {
  initialLevel: number;
  minLevel: number;
  maxLevel: number;
  upThreshold: number;   // e.g. 0.825 (82.5% accuracy to advance)
  downThreshold: number; // e.g. 0.625 (62.5% or below to drop)
  consecutivePassesRequired: number;
}

export interface StaircaseState {
  currentLevel: number;
  consecutivePasses: number;
  consecutiveFails: number;
  history: {
    blockIndex: number;
    level: number;
    accuracyPercent: number;
    action: 'up' | 'down' | 'maintain';
  }[];
}
