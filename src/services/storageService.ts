import { SessionRecord, UserCognitiveProfile } from '../types/cognitive';
import { calculateCompositeWMC } from './psychometrics';

const STORAGE_KEY_SESSIONS = 'cognispan_sessions_v1';
const STORAGE_KEY_PROFILE = 'cognispan_profile_v1';

const DEFAULT_PROFILE: UserCognitiveProfile = {
  id: 'local_user',
  createdAtIso: new Date().toISOString(),
  lastTrainedDate: '',
  currentStreakDays: 0,
  longestStreakDays: 0,
  totalSessionsCompleted: 0,
  totalTrainingTimeMinutes: 0,
  baselines: {
    dualNBackLevel: 2,
    corsiSpanForward: 5,
    corsiSpanBackward: 4,
    digitSpanForward: 6,
    digitSpanBackward: 5,
    digitSpanAscending: 5,
    aospanAbsolute: 35,
    compositeWmcIndex: 100
  },
  preferences: {
    masterVolume: 0.8,
    colorblindPalette: false,
    reducedMotion: false,
    audioFeedbackEnabled: true,
    highContrastMode: false
  }
};

export class StorageService {
  /**
   * Requests persistent storage permission from host browser
   */
  public async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        return await navigator.storage.persist();
      } catch {
        return false;
      }
    }
    return false;
  }

  public getProfile(): UserCognitiveProfile {
    if (typeof window === 'undefined') return DEFAULT_PROFILE;
    try {
      const data = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (data) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(data) };
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_PROFILE;
  }

  public saveProfile(profile: UserCognitiveProfile): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save profile', e);
    }
  }

  public getSessions(): SessionRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fallback
    }
    return [];
  }

  public saveSession(session: SessionRecord): void {
    const sessions = this.getSessions();
    sessions.unshift(session); // Prepend latest
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
      this.updateProfileAfterSession(session);
    } catch (e) {
      console.error('Failed to save session record', e);
    }
  }

  private updateProfileAfterSession(session: SessionRecord): void {
    const profile = this.getProfile();
    const today = new Date().toISOString().split('T')[0];

    // Calculate streak (use Math.round to remain resilient against DST 23h/25h shifts)
    if (profile.lastTrainedDate) {
      const lastDate = new Date(profile.lastTrainedDate);
      const currDate = new Date(today);
      const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        profile.currentStreakDays += 1;
      } else if (diffDays > 1) {
        profile.currentStreakDays = 1;
      }
      // If diffDays === 0 (trained earlier today), maintain current streak
    } else {
      profile.currentStreakDays = 1;
    }

    if (profile.currentStreakDays > profile.longestStreakDays) {
      profile.longestStreakDays = profile.currentStreakDays;
    }

    profile.lastTrainedDate = today;
    profile.totalSessionsCompleted += 1;
    profile.totalTrainingTimeMinutes += Math.max(1, Math.round(session.durationSeconds / 60));

    const sessions = this.getSessions();
    const isFirstOfTask = !sessions.some(s => s.taskType === session.taskType && s.id !== session.id);

    // Update specific baselines: initialize directly if first time, or update if improved
    switch (session.taskType) {
      case 'dual_n_back':
        if (isFirstOfTask || session.level > profile.baselines.dualNBackLevel) {
          profile.baselines.dualNBackLevel = session.level;
        }
        break;
      case 'digit_span':
        if (session.mode === 'forward') {
          if (isFirstOfTask || (session.metrics.maxSpanReached ?? 0) > profile.baselines.digitSpanForward) {
            profile.baselines.digitSpanForward = session.metrics.maxSpanReached!;
          }
        } else if (session.mode === 'backward') {
          if (isFirstOfTask || (session.metrics.maxSpanReached ?? 0) > profile.baselines.digitSpanBackward) {
            profile.baselines.digitSpanBackward = session.metrics.maxSpanReached!;
          }
        } else if (session.mode === 'ascending') {
          if (isFirstOfTask || (session.metrics.maxSpanReached ?? 0) > profile.baselines.digitSpanAscending) {
            profile.baselines.digitSpanAscending = session.metrics.maxSpanReached!;
          }
        }
        break;
      case 'corsi_blocks':
        if (session.mode === 'forward') {
          if (isFirstOfTask || (session.metrics.maxSpanReached ?? 0) > profile.baselines.corsiSpanForward) {
            profile.baselines.corsiSpanForward = session.metrics.maxSpanReached!;
          }
        } else if (session.mode === 'backward') {
          if (isFirstOfTask || (session.metrics.maxSpanReached ?? 0) > profile.baselines.corsiSpanBackward) {
            profile.baselines.corsiSpanBackward = session.metrics.maxSpanReached!;
          }
        }
        break;
      case 'operation_span':
        if (isFirstOfTask || (session.metrics.aospanAbsoluteScore ?? 0) > profile.baselines.aospanAbsolute) {
          profile.baselines.aospanAbsolute = session.metrics.aospanAbsoluteScore!;
        }
        break;
    }

    // Recalculate Composite Working Memory Index
    profile.baselines.compositeWmcIndex = calculateCompositeWMC(profile.baselines);

    this.saveProfile(profile);
  }

  /**
   * Clears CogniSpan training sessions and profile
   */
  public clearAllData(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY_SESSIONS);
      localStorage.removeItem(STORAGE_KEY_PROFILE);
    } catch {
      // Ignore
    }
  }

  /**
   * Generates a tidy CSV string of all sessions and trial-by-trial records for data science analysis
   */
  public exportToCSV(): string {
    const sessions = this.getSessions();
    const headers = [
      'session_id',
      'timestamp_iso',
      'task_type',
      'mode',
      'level_or_span',
      'total_trials',
      'accuracy_percent',
      'hits',
      'misses',
      'false_alarms',
      'd_prime',
      'beta',
      'mean_reaction_time_ms',
      'aospan_score',
      'duration_seconds',
      'trial_index',
      'trial_reaction_time_ms',
      'is_visual_match',
      'is_audio_match',
      'lure_type',
      'pressed_visual',
      'pressed_audio',
      'trial_correct'
    ];

    const rows: string[] = [headers.join(',')];

    for (const s of sessions) {
      if (!s.trials || s.trials.length === 0) {
        rows.push([
          s.id,
          s.timestampIso,
          s.taskType,
          s.mode,
          s.level,
          s.totalTrials,
          s.metrics.accuracyPercent,
          s.metrics.hits,
          s.metrics.misses,
          s.metrics.falseAlarms,
          s.metrics.dPrime ?? 'NA',
          s.metrics.beta ?? 'NA',
          s.metrics.meanReactionTimeMs ?? 'NA',
          s.metrics.aospanAbsoluteScore ?? 'NA',
          s.durationSeconds,
          'NA',
          'NA',
          'NA',
          'NA',
          'NA',
          'NA',
          'NA',
          'NA'
        ].join(','));
      } else {
        for (const t of s.trials) {
          rows.push([
            s.id,
            s.timestampIso,
            s.taskType,
            s.mode,
            s.level,
            s.totalTrials,
            s.metrics.accuracyPercent,
            s.metrics.hits,
            s.metrics.misses,
            s.metrics.falseAlarms,
            s.metrics.dPrime ?? 'NA',
            s.metrics.beta ?? 'NA',
            s.metrics.meanReactionTimeMs ?? 'NA',
            s.metrics.aospanAbsoluteScore ?? 'NA',
            s.durationSeconds,
            t.trialIndex,
            t.reactionTimeMs ?? 'NA',
            t.isVisualMatch ? 1 : 0,
            t.isAudioMatch ? 1 : 0,
            t.lureType,
            t.pressedVisual ? 1 : 0,
            t.pressedAudio ? 1 : 0,
            t.overallCorrect ? 1 : 0
          ].join(','));
        }
      }
    }

    return rows.join('\n');
  }

  /**
   * Triggers a browser download of the telemetry database
   */
  public downloadExport(format: 'json' | 'csv'): void {
    const sessions = this.getSessions();
    const profile = this.getProfile();
    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'json') {
      content = JSON.stringify({ profile, sessions }, null, 2);
      filename = `cognispan_export_${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else {
      content = this.exportToCSV();
      filename = `cognispan_trials_${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Pre-populates realistic clinical and training telemetry so the user can
   * preview longitudinal analytics, trend lines, and serial position curves immediately.
   */
  public loadDemoData(): void {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const demoSessions: SessionRecord[] = [
      {
        id: crypto.randomUUID(),
        timestampIso: new Date(now - 4 * oneDayMs).toISOString(),
        epochMs: now - 4 * oneDayMs,
        taskType: 'digit_span',
        mode: 'forward',
        level: 6,
        totalTrials: 8,
        durationSeconds: 180,
        metrics: {
          accuracyPercent: 87.5,
          hits: 7,
          misses: 1,
          falseAlarms: 0,
          correctRejections: 0,
          dPrime: 0,
          beta: 0,
          meanReactionTimeMs: 0,
          medianReactionTimeMs: 0,
          rtStandardDeviationMs: 0,
          maxSpanReached: 6
        },
        trials: []
      },
      {
        id: crypto.randomUUID(),
        timestampIso: new Date(now - 3 * oneDayMs).toISOString(),
        epochMs: now - 3 * oneDayMs,
        taskType: 'corsi_blocks',
        mode: 'forward',
        level: 5,
        totalTrials: 6,
        durationSeconds: 210,
        metrics: {
          accuracyPercent: 83.3,
          hits: 5,
          misses: 1,
          falseAlarms: 0,
          correctRejections: 0,
          dPrime: 0,
          beta: 0,
          meanReactionTimeMs: 0,
          medianReactionTimeMs: 0,
          rtStandardDeviationMs: 0,
          maxSpanReached: 5
        },
        trials: []
      },
      {
        id: crypto.randomUUID(),
        timestampIso: new Date(now - 2 * oneDayMs).toISOString(),
        epochMs: now - 2 * oneDayMs,
        taskType: 'dual_n_back',
        mode: 'cross_modal_pitch',
        level: 2,
        totalTrials: 22,
        durationSeconds: 320,
        metrics: {
          accuracyPercent: 86.4,
          hits: 11,
          misses: 2,
          falseAlarms: 1,
          correctRejections: 8,
          dPrime: 2.74,
          beta: 1.05,
          aPrime: 0.91,
          bDoublePrime: 0.04,
          meanReactionTimeMs: 412,
          medianReactionTimeMs: 395,
          rtStandardDeviationMs: 55
        },
        trials: []
      },
      {
        id: crypto.randomUUID(),
        timestampIso: new Date(now - 1 * oneDayMs).toISOString(),
        epochMs: now - 1 * oneDayMs,
        taskType: 'operation_span',
        mode: 'automated_complex_span',
        level: 48,
        totalTrials: 5,
        durationSeconds: 380,
        metrics: {
          accuracyPercent: 92.0,
          hits: 23,
          misses: 2,
          falseAlarms: 1,
          correctRejections: 0,
          dPrime: 0,
          beta: 0,
          meanReactionTimeMs: 2840,
          medianReactionTimeMs: 2790,
          rtStandardDeviationMs: 310,
          aospanAbsoluteScore: 48,
          aospanPcuScore: 0.88,
          mathAccuracyPercent: 92.0
        },
        trials: []
      },
      {
        id: crypto.randomUUID(),
        timestampIso: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        epochMs: now - 2 * 60 * 60 * 1000,
        taskType: 'dual_n_back',
        mode: 'cross_modal_pitch',
        level: 3,
        totalTrials: 23,
        durationSeconds: 340,
        metrics: {
          accuracyPercent: 82.6,
          hits: 12,
          misses: 3,
          falseAlarms: 1,
          correctRejections: 7,
          dPrime: 2.88,
          beta: 0.98,
          aPrime: 0.92,
          bDoublePrime: -0.02,
          meanReactionTimeMs: 385,
          medianReactionTimeMs: 370,
          rtStandardDeviationMs: 48
        },
        trials: []
      },
      {
        id: crypto.randomUUID(),
        timestampIso: new Date(now - 30 * 60 * 1000).toISOString(),
        epochMs: now - 30 * 60 * 1000,
        taskType: 'corsi_blocks',
        mode: 'forward',
        level: 6,
        totalTrials: 8,
        durationSeconds: 240,
        metrics: {
          accuracyPercent: 87.5,
          hits: 7,
          misses: 1,
          falseAlarms: 0,
          correctRejections: 0,
          dPrime: 0,
          beta: 0,
          meanReactionTimeMs: 0,
          medianReactionTimeMs: 0,
          rtStandardDeviationMs: 0,
          maxSpanReached: 6
        },
        trials: []
      }
    ];

    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(demoSessions));
      const demoProfile: UserCognitiveProfile = {
        ...this.getProfile(),
        currentStreakDays: 5,
        longestStreakDays: 5,
        totalSessionsCompleted: demoSessions.length,
        totalTrainingTimeMinutes: 28,
        lastTrainedDate: new Date().toISOString().split('T')[0],
        baselines: {
          dualNBackLevel: 3,
          digitSpanForward: 7,
          digitSpanBackward: 5,
          digitSpanAscending: 6,
          corsiSpanForward: 6,
          corsiSpanBackward: 5,
          aospanAbsolute: 48,
          compositeWmcIndex: 109
        }
      };
      this.saveProfile(demoProfile);
    } catch (e) {
      console.error('Failed to load demo data', e);
    }
  }
}

export const storageService = new StorageService();
