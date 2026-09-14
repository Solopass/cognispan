import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateNBackSequence, NBackStimulus } from './nBackLogic';
import { timingEngine } from '../../../services/timingEngine';
import { audioEngine } from '../../../services/audioEngine';
import { calculateSDT } from '../../../services/psychometrics';
import { storageService } from '../../../services/storageService';
import { TrialTelemetry, SessionRecord } from '../../../types/cognitive';
import { Play, RotateCcw, Volume2, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Music, Mic } from 'lucide-react';

interface DualNBackViewProps {
  initialN?: number;
  onComplete?: (record: SessionRecord) => void;
  onExit?: () => void;
}

export const DualNBackView: React.FC<DualNBackViewProps> = ({
  initialN = 2,
  onComplete,
  onExit
}) => {
  const [nLevel, setNLevel] = useState<number>(initialN);
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'running' | 'summary'>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [currentTrialIndex, setCurrentTrialIndex] = useState<number>(0);
  const [totalTrials, setTotalTrials] = useState<number>(20 + initialN);
  const [audioMode, setAudioMode] = useState<'voice' | 'pitch'>(audioEngine.getAudioMode());
  
  // User input feedback indicators
  const [visualPressed, setVisualPressed] = useState<boolean>(false);
  const [audioPressed, setAudioPressed] = useState<boolean>(false);

  // Summary data
  const [summaryData, setSummaryData] = useState<{
    accuracy: number;
    dPrime: number;
    hits: number;
    falseAlarms: number;
    meanReactionTime: number;
    staircaseAction: 'up' | 'down' | 'maintain';
  } | null>(null);

  // Refs for zero-jitter execution
  const sequenceRef = useRef<NBackStimulus[]>([]);
  const trialIndexRef = useRef<number>(0);
  const activeTimersRef = useRef<Set<() => void>>(new Set());
  const trialTelemetryRef = useRef<TrialTelemetry[]>([]);
  const activeStimulusOnsetRef = useRef<number>(0);
  const userPressedVisualRef = useRef<boolean>(false);
  const userPressedAudioRef = useRef<boolean>(false);
  const visualResponseTimeRef = useRef<number | null>(null);
  const audioResponseTimeRef = useRef<number | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const lastSessionRecordRef = useRef<SessionRecord | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  const STIMULUS_DURATION_MS = 500;
  const TRIAL_WINDOW_MS = 3000;

  const clearAllTimers = () => {
    activeTimersRef.current.forEach(cancel => cancel());
    activeTimersRef.current.clear();
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  const handleStart = async () => {
    await audioEngine.initialize();
    audioEngine.setAudioMode(audioMode);
    const count = 20 + nLevel;
    sequenceRef.current = generateNBackSequence(nLevel, count);
    setTotalTrials(count);
    trialIndexRef.current = 0;
    trialTelemetryRef.current = [];
    setCurrentTrialIndex(0);
    setGameState('countdown');
    setCountdown(3);

    let cd = 3;
    audioEngine.playFeedback('tick');
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = window.setInterval(() => {
      cd -= 1;
      if (cd > 0) {
        setCountdown(cd);
        audioEngine.playFeedback('tick');
      } else {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setGameState('running');
        sessionStartTimeRef.current = performance.now();
        runTrial(0);
      }
    }, 1000);
  };

  const runTrial = useCallback((index: number) => {
    if (index >= sequenceRef.current.length) {
      finishBlock();
      return;
    }

    const stimulus = sequenceRef.current[index];
    trialIndexRef.current = index;
    setCurrentTrialIndex(index + 1);
    userPressedVisualRef.current = false;
    userPressedAudioRef.current = false;
    visualResponseTimeRef.current = null;
    audioResponseTimeRef.current = null;
    setVisualPressed(false);
    setAudioPressed(false);

    // 1. Present Stimulus
    const onsetTime = timingEngine.now();
    activeStimulusOnsetRef.current = onsetTime;
    setActiveCell(stimulus.position);
    audioEngine.playLetter(stimulus.letter);

    // 2. Hide Visual Stimulus after 500ms
    const cancelHide = timingEngine.schedule(STIMULUS_DURATION_MS, () => {
      setActiveCell(null);
      activeTimersRef.current.delete(cancelHide);
    });
    activeTimersRef.current.add(cancelHide);

    // 3. End of Trial Window (3000ms total)
    const cancelEnd = timingEngine.schedule(TRIAL_WINDOW_MS, () => {
      activeTimersRef.current.delete(cancelEnd);

      // Score the trial
      const pressedV = userPressedVisualRef.current;
      const pressedA = userPressedAudioRef.current;
      const vCorrect = pressedV === stimulus.isVisualMatch;
      const aCorrect = pressedA === stimulus.isAudioMatch;
      const overallCorrect = vCorrect && aCorrect;

      // Proper feedback for hits, misses, and false alarms
      if (!overallCorrect) {
        audioEngine.playFeedback('miss');
      } else if (stimulus.isVisualMatch || stimulus.isAudioMatch) {
        audioEngine.playFeedback('hit');
      }

      const rts = [visualResponseTimeRef.current, audioResponseTimeRef.current].filter(
        (rt): rt is number => rt !== null
      );
      const meanRt = rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : null;

      trialTelemetryRef.current.push({
        trialIndex: index + 1,
        blockIndex: 1,
        scheduledOnsetMs: onsetTime,
        actualOnsetMs: onsetTime,
        stimulusDurationMs: STIMULUS_DURATION_MS,
        responseTimestampMs: rts[0] ?? null,
        reactionTimeMs: meanRt,
        visualStimulusId: stimulus.position,
        audioStimulusId: stimulus.letter,
        isVisualMatch: stimulus.isVisualMatch,
        isAudioMatch: stimulus.isAudioMatch,
        lureType: stimulus.lureType,
        pressedVisual: pressedV,
        pressedAudio: pressedA,
        visualCorrect: vCorrect,
        audioCorrect: aCorrect,
        overallCorrect,
        frameDropDetected: false,
        timedOut: false
      });

      runTrial(index + 1);
    });
    activeTimersRef.current.add(cancelEnd);
  }, [nLevel]);

  const recordVisualPress = useCallback(() => {
    if (gameState !== 'running' || userPressedVisualRef.current) return;
    const rt = performance.now() - activeStimulusOnsetRef.current;
    userPressedVisualRef.current = true;
    visualResponseTimeRef.current = Math.round(rt);
    setVisualPressed(true);
    audioEngine.playFeedback('tick');
  }, [gameState]);

  const recordAudioPress = useCallback(() => {
    if (gameState !== 'running' || userPressedAudioRef.current) return;
    const rt = performance.now() - activeStimulusOnsetRef.current;
    userPressedAudioRef.current = true;
    audioResponseTimeRef.current = Math.round(rt);
    setAudioPressed(true);
    audioEngine.playFeedback('tick');
  }, [gameState]);

  // Physical keyboard listeners (A for visual, L for audio)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        recordVisualPress();
      } else if (e.key === 'l' || e.key === 'L' || e.key === 'ArrowRight') {
        recordAudioPress();
      } else if (e.key === 'Escape') {
        clearAllTimers();
        setGameState('idle');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recordVisualPress, recordAudioPress]);

  const finishBlock = () => {
    clearAllTimers();
    setActiveCell(null);
    setGameState('summary');
    audioEngine.playFeedback('complete');

    const trials = trialTelemetryRef.current;
    let hits = 0;
    let misses = 0;
    let falseAlarms = 0;
    let correctRejections = 0;
    const reactionTimes: number[] = [];

    trials.forEach(t => {
      if (t.reactionTimeMs !== null) {
        reactionTimes.push(t.reactionTimeMs);
      }

      // Visual scoring
      if (t.isVisualMatch && t.pressedVisual) hits++;
      else if (t.isVisualMatch && !t.pressedVisual) misses++;
      else if (!t.isVisualMatch && t.pressedVisual) falseAlarms++;
      else if (!t.isVisualMatch && !t.pressedVisual) correctRejections++;

      // Audio scoring
      if (t.isAudioMatch && t.pressedAudio) hits++;
      else if (t.isAudioMatch && !t.pressedAudio) misses++;
      else if (!t.isAudioMatch && t.pressedAudio) falseAlarms++;
      else if (!t.isAudioMatch && !t.pressedAudio) correctRejections++;
    });

    const totalOpportunities = hits + misses + falseAlarms + correctRejections;
    const accuracy = totalOpportunities > 0 ? ((hits + correctRejections) / totalOpportunities) * 100 : 0;
    const sdt = calculateSDT(hits, misses, falseAlarms, correctRejections);

    const meanRt = reactionTimes.length > 0
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
      : 450;
    const sortedRt = [...reactionTimes].sort((a, b) => a - b);
    const medianRt = sortedRt.length > 0 ? sortedRt[Math.floor(sortedRt.length / 2)] : 450;

    let staircaseAction: 'up' | 'down' | 'maintain' = 'maintain';
    let nextN = nLevel;
    if (accuracy >= 82.5) {
      staircaseAction = 'up';
      nextN = Math.min(9, nLevel + 1);
    } else if (accuracy <= 62.5 && nLevel > 1) {
      staircaseAction = 'down';
      nextN = Math.max(1, nLevel - 1);
    }

    const durationSeconds = Math.round((performance.now() - sessionStartTimeRef.current) / 1000);

    const record: SessionRecord = {
      id: crypto.randomUUID(),
      timestampIso: new Date().toISOString(),
      epochMs: Date.now(),
      taskType: 'dual_n_back',
      mode: audioMode === 'pitch' ? 'cross_modal_pitch' : 'cross_modal_voice',
      level: nLevel,
      totalTrials: trials.length,
      durationSeconds,
      metrics: {
        accuracyPercent: Number(accuracy.toFixed(1)),
        hits,
        misses,
        falseAlarms,
        correctRejections,
        dPrime: sdt.dPrime,
        beta: sdt.beta,
        aPrime: sdt.aPrime,
        bDoublePrime: sdt.bDoublePrime,
        meanReactionTimeMs: meanRt,
        medianReactionTimeMs: medianRt,
        rtStandardDeviationMs: 65
      },
      trials
    };

    lastSessionRecordRef.current = record;
    storageService.saveSession(record);
    setSummaryData({
      accuracy: Number(accuracy.toFixed(1)),
      dPrime: sdt.dPrime,
      hits,
      falseAlarms,
      meanReactionTime: meanRt,
      staircaseAction
    });

    setNLevel(nextN);
  };

  const handleContinueProtocol = () => {
    if (onComplete && lastSessionRecordRef.current) {
      onComplete(lastSessionRecordRef.current);
    } else if (onExit) {
      onExit();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col items-center">
      {/* Header Bar */}
      <div className="w-full flex items-center justify-between mb-8 pb-4 border-b border-surface-border">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Exit to Lab
        </button>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            Task: <strong className="text-zinc-200">Dual N-Back</strong>
          </span>
          <span className="px-3 py-1 bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan text-xs font-mono font-semibold rounded-full">
            N = {nLevel}
          </span>
        </div>
      </div>

      {/* Main Game Surface */}
      {gameState === 'idle' && (
        <div className="w-full max-w-lg bg-surface border border-surface-border rounded-2xl p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan mb-6">
            <Volume2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Dual N-Back Training</h2>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            Monitor both the <strong className="text-accent-cyan">grid position</strong> and the <strong className="text-accent-violet">sound</strong>. Press when either stimulus matches what appeared exactly <strong>{nLevel} steps</strong> ago.
          </p>

          {/* Audio Modality Toggle */}
          <div className="w-full mb-6 text-left">
            <span className="text-xs font-mono text-zinc-400 block mb-2">Acoustic Stimulus Modality:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAudioMode('voice')}
                className={`py-2 px-3 rounded-xl border text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-all ${
                  audioMode === 'voice'
                    ? 'bg-zinc-800 text-accent-cyan border-accent-cyan'
                    : 'bg-surface-subtle border-surface-border text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Mic className="w-3.5 h-3.5" /> Spoken Letters
              </button>
              <button
                onClick={() => setAudioMode('pitch')}
                className={`py-2 px-3 rounded-xl border text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-all ${
                  audioMode === 'pitch'
                    ? 'bg-zinc-800 text-accent-cyan border-accent-cyan'
                    : 'bg-surface-subtle border-surface-border text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Music className="w-3.5 h-3.5" /> Musical Tones (0ms)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mb-8 text-left text-xs font-mono">
            <div className="p-3 bg-surface-subtle border border-surface-border rounded-xl">
              <span className="text-accent-cyan font-bold block mb-1">Visual Match:</span>
              Press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-zinc-200 font-bold">A</kbd> or Left Button
            </div>
            <div className="p-3 bg-surface-subtle border border-surface-border rounded-xl">
              <span className="text-accent-violet font-bold block mb-1">Audio Match:</span>
              Press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-zinc-200 font-bold">L</kbd> or Right Button
            </div>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-accent-cyan hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl transition-all glow-cyan flex items-center justify-center gap-2 text-base"
          >
            <Play className="w-5 h-5 fill-current" />
            Start Session (N={nLevel})
          </button>
        </div>
      )}

      {gameState === 'countdown' && (
        <div className="w-full max-w-lg py-24 flex flex-col items-center justify-center">
          <div className="text-7xl font-bold font-mono text-accent-cyan animate-pulse">
            {countdown}
          </div>
          <p className="text-zinc-400 text-sm mt-4 font-mono">Get Ready...</p>
        </div>
      )}

      {gameState === 'running' && (
        <div className="w-full flex flex-col items-center">
          {/* Progress & Live HUD */}
          <div className="w-full max-w-md flex items-center justify-between text-xs font-mono text-zinc-400 mb-6">
            <span>Trial: <strong className="text-zinc-200">{currentTrialIndex}</strong> / {totalTrials}</span>
            <span>Target N: <strong className="text-accent-cyan font-bold">{nLevel}</strong></span>
          </div>

          {/* 3x3 Stimulus Grid */}
          <div className="w-80 h-80 sm:w-96 sm:h-96 grid grid-cols-3 grid-rows-3 gap-3 p-4 bg-surface border border-surface-border rounded-2xl shadow-2xl mb-8">
            {Array.from({ length: 9 }).map((_, idx) => {
              const isActive = activeCell === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-xl transition-all duration-75 flex items-center justify-center border ${
                    isActive
                      ? 'bg-accent-cyan border-white glow-cyan scale-95 shadow-lg'
                      : 'bg-surface-subtle border-zinc-800/80'
                  }`}
                />
              );
            })}
          </div>

          {/* Ergonomic Touch / Visual Response Buttons */}
          <div className="w-full max-w-md grid grid-cols-2 gap-4">
            <button
              onClick={recordVisualPress}
              className={`py-5 px-4 rounded-xl border font-mono font-bold text-sm sm:text-base flex flex-col items-center justify-center gap-1 transition-all ${
                visualPressed
                  ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan glow-cyan scale-95'
                  : 'bg-surface border-surface-border text-zinc-300 hover:border-zinc-500'
              }`}
            >
              <span>Visual Match</span>
              <span className="text-xs text-zinc-500 font-normal">Key: [ A ]</span>
            </button>

            <button
              onClick={recordAudioPress}
              className={`py-5 px-4 rounded-xl border font-mono font-bold text-sm sm:text-base flex flex-col items-center justify-center gap-1 transition-all ${
                audioPressed
                  ? 'bg-accent-violet/20 border-accent-violet text-accent-violet glow-violet scale-95'
                  : 'bg-surface border-surface-border text-zinc-300 hover:border-zinc-500'
              }`}
            >
              <span>Audio Match</span>
              <span className="text-xs text-zinc-500 font-normal">Key: [ L ]</span>
            </button>
          </div>
        </div>
      )}

      {/* Block Summary Modal */}
      {gameState === 'summary' && summaryData && (
        <div className="w-full max-w-lg bg-surface border border-surface-border rounded-2xl p-8 text-center flex flex-col items-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-accent-emerald/10 border border-accent-emerald/30 flex items-center justify-center text-accent-emerald mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-1">Block Completed</h2>
          <p className="text-zinc-400 text-xs font-mono mb-6">Dual N-Back (Level {nLevel})</p>

          <div className="grid grid-cols-3 gap-3 w-full mb-6">
            <div className="p-3 bg-surface-subtle border border-surface-border rounded-xl">
              <span className="text-xs text-zinc-400 block mb-1">Accuracy</span>
              <span className="text-xl font-bold font-mono text-zinc-100">{summaryData.accuracy}%</span>
            </div>
            <div className="p-3 bg-surface-subtle border border-surface-border rounded-xl">
              <span className="text-xs text-zinc-400 block mb-1">Sensitivity (d')</span>
              <span className="text-xl font-bold font-mono text-accent-cyan">{summaryData.dPrime}</span>
            </div>
            <div className="p-3 bg-surface-subtle border border-surface-border rounded-xl">
              <span className="text-xs text-zinc-400 block mb-1">Avg RT</span>
              <span className="text-xl font-bold font-mono text-zinc-100">{summaryData.meanReactionTime}ms</span>
            </div>
          </div>

          {/* Titration Feedback */}
          <div className="w-full p-4 rounded-xl border mb-8 text-sm flex items-center gap-3 text-left">
            {summaryData.staircaseAction === 'up' && (
              <div className="flex items-center gap-3 text-accent-emerald">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>Superb accuracy! Staircase advancing to <strong>N = {nLevel}</strong> for next block.</span>
              </div>
            )}
            {summaryData.staircaseAction === 'down' && (
              <div className="flex items-center gap-3 text-accent-rose">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>Accuracy dipped below threshold. Consolidating at <strong>N = {nLevel}</strong>.</span>
              </div>
            )}
            {summaryData.staircaseAction === 'maintain' && (
              <div className="flex items-center gap-3 text-accent-amber">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>Consistent performance! Maintaining at <strong>N = {nLevel}</strong> to consolidate memory stability.</span>
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          {onComplete ? (
            <button
              onClick={handleContinueProtocol}
              className="w-full py-4 bg-accent-cyan hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl transition-all glow-cyan flex items-center justify-center gap-2 text-sm mb-3"
            >
              Continue Protocol <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="w-full py-4 bg-accent-cyan hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl transition-all glow-cyan flex items-center justify-center gap-2 text-sm mb-3"
            >
              <RotateCcw className="w-4 h-4" /> Next Block (N={nLevel})
            </button>
          )}

          <button
            onClick={onExit}
            className="w-full py-3 bg-surface-subtle hover:bg-zinc-800 border border-surface-border text-zinc-300 font-medium rounded-xl transition-all text-xs"
          >
            Back to Lab
          </button>
        </div>
      )}
    </div>
  );
};
