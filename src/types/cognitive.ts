export type TaskType = 
  | 'dual_n_back' 
  | 'operation_span' 
  | 'corsi_blocks' 
  | 'digit_span' 
  | 'keep_track';

export type TaskModality = 
  | 'visual_spatial' 
  | 'auditory_phoneme' 
  | 'dual_cross_modal' 
  | 'complex_span' 
  | 'serial_order';

export type DigitSpanMode = 'forward' | 'backward' | 'ascending';
export type CorsiMode = 'forward' | 'backward';

export interface TrialTelemetry {
  trialIndex: number;
  blockIndex: number;
  scheduledOnsetMs: number;
  actualOnsetMs: number;
  stimulusDurationMs: number;
  responseTimestampMs: number | null;
  reactionTimeMs: number | null;
  
  // Stimulus Details
  visualStimulusId?: string | number;
  audioStimulusId?: string;
  isVisualMatch: boolean;
  isAudioMatch: boolean;
  
  // Lure Detection
  lureType: 'none' | 'n_minus_1' | 'n_plus_1';
  
  // Responses
  pressedVisual: boolean;
  pressedAudio: boolean;
  visualCorrect: boolean;
  audioCorrect: boolean;
  overallCorrect: boolean;
  
  // Quality Flags
  frameDropDetected: boolean;
  timedOut: boolean;
}

/**
 * One recall trial of a span task (digit span, Corsi).
 *
 * `target` is the sequence the participant was required to produce, i.e. after
 * the mode transform (reversed for backward, sorted for ascending), so that
 * position i of `target` and position i of `recalled` are directly comparable.
 * That is what makes a serial position curve meaningful.
 */
export interface SpanTrial {
  trialIndex: number;
  spanLength: number;
  target: (string | number)[];
  recalled: (string | number)[];
  correct: boolean;
}

export interface SessionMetrics {
  accuracyPercent: number;
  hits: number;
  misses: number;
  falseAlarms: number;
  correctRejections: number;
  dPrime: number;
  beta: number;
  aPrime?: number;
  bDoublePrime?: number;
  meanReactionTimeMs: number;
  medianReactionTimeMs: number;
  rtStandardDeviationMs: number;
  
  // Task specific metrics
  aospanAbsoluteScore?: number;
  /** Letters administered in that run, i.e. the highest score it could reach. */
  aospanMaxScore?: number;
  aospanPcuScore?: number;
  mathAccuracyPercent?: number;
  maxSpanReached?: number;
  serialPositionErrors?: number[];
}

export interface SessionRecord {
  id: string;
  timestampIso: string;
  epochMs: number;
  taskType: TaskType;
  mode: string;
  protocolId?: 'daily_protocol' | 'sandbox';
  level: number;
  totalTrials: number;
  durationSeconds: number;
  metrics: SessionMetrics;
  trials: TrialTelemetry[];
  /** Per-trial recall data for span tasks; absent for non-span tasks. */
  spanTrials?: SpanTrial[];
}

export interface UserCognitiveProfile {
  id: string;
  createdAtIso: string;
  lastTrainedDate: string;
  currentStreakDays: number;
  longestStreakDays: number;
  totalSessionsCompleted: number;
  totalTrainingTimeMinutes: number;
  baselines: {
    dualNBackLevel: number;
    corsiSpanForward: number;
    corsiSpanBackward: number;
    digitSpanForward: number;
    digitSpanBackward: number;
    digitSpanAscending: number;
    aospanAbsolute: number;
    compositeWmcIndex: number;
  };
  preferences: {
    masterVolume: number;
    colorblindPalette: boolean;
    reducedMotion: boolean;
    audioFeedbackEnabled: boolean;
    highContrastMode: boolean;
  };
}

export interface DailyProtocolStep {
  taskType: TaskType;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  mode?: string;
  targetLevel?: number;
  completed: boolean;
  sessionRecord?: SessionRecord;
}
