import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateMathProblem, generateLetterSequence, MathProblem, OSPAN_LETTERS } from './oSpanLogic';
import {
  OSPAN_PROTOCOLS,
  OSpanProtocolId,
  buildSetSizePlan,
  maxAbsoluteScore
} from './ospanProtocol';
import { timingEngine } from '../../../services/timingEngine';
import { audioEngine } from '../../../services/audioEngine';
import { storageService } from '../../../services/storageService';
import { calculatePercentile, calculateZScore } from '../../../types/norms';
import { SessionRecord } from '../../../types/cognitive';
import { ArrowLeft, ArrowRight, Play, RotateCcw, CheckCircle2, AlertTriangle, Calculator, Check, X, Delete } from 'lucide-react';

interface OSpanViewProps {
  onComplete?: (record: SessionRecord) => void;
  onExit?: () => void;
}

export const OSpanView: React.FC<OSpanViewProps> = ({ onComplete, onExit }) => {
  const [gameState, setGameState] = useState<
    'idle' | 'calibrating' | 'ready_test' | 'math_solve' | 'letter_flash' | 'recall' | 'summary'
  >('idle');

  // Calibration stats
  const [calibrationTrialsLeft, setCalibrationTrialsLeft] = useState<number>(10);
  const [mathDeadlineMs, setMathDeadlineMs] = useState<number>(3500);

  // Active Trial State
  const [currentSetSize, setCurrentSetSize] = useState<number>(3);
  const [currentSetIndex, setCurrentSetIndex] = useState<number>(0);
  const [currentItemInSet, setCurrentItemInSet] = useState<number>(0);
  const [currentMath, setCurrentMath] = useState<MathProblem | null>(null);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [userRecalledLetters, setUserRecalledLetters] = useState<string[]>([]);
  const [mathTimeoutProgress, setMathTimeoutProgress] = useState<number>(100);

  // Scoring records
  const [mathCorrectCount, setMathCorrectCount] = useState<number>(0);
  const [mathTotalCount, setMathTotalCount] = useState<number>(0);
  const [speedErrorCount, setSpeedErrorCount] = useState<number>(0);
  const [absoluteScore, setAbsoluteScore] = useState<number>(0);
  const [pcuTotalEarned, setPcuTotalEarned] = useState<number>(0);

  // Refs
  const calibrationTimesRef = useRef<number[]>([]);
  const mathStartTimeRef = useRef<number>(0);
  const currentSetLettersRef = useRef<string[]>([]);
  const activeTimersRef = useRef<Set<() => void>>(new Set());
  const mathTimerIntervalRef = useRef<number | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const lastSessionRecordRef = useRef<SessionRecord | null>(null);

  // Which protocol this run administers. The plan is rebuilt per run, because
  // the full assessment shuffles its set sizes. The ref is what the running
  // trial logic reads, so it never sees a stale plan mid-run.
  const [protocolId, setProtocolId] = useState<OSpanProtocolId>('assessment');
  const setSizesPlanRef = useRef<number[]>(buildSetSizePlan('assessment'));
  const setSizesPlan = setSizesPlanRef.current;
  const runProtocolRef = useRef<OSpanProtocolId>('assessment');

  // The last set's score is submitted and the session finished in the same
  // tick, so `finishAospan` cannot read the score off React state - it would
  // still hold the pre-update value and the saved record would be short by the
  // final set. These refs carry the authoritative running totals.
  const absoluteScoreRef = useRef<number>(0);
  const pcuTotalEarnedRef = useRef<number>(0);

  const clearAllTimers = () => {
    activeTimersRef.current.forEach(cancel => cancel());
    activeTimersRef.current.clear();
    if (mathTimerIntervalRef.current) {
      clearInterval(mathTimerIntervalRef.current);
      mathTimerIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  const startCalibration = async () => {
    await audioEngine.initialize();
    calibrationTimesRef.current = [];
    setCalibrationTrialsLeft(10);
    setGameState('calibrating');
    nextCalibrationProblem();
  };

  const nextCalibrationProblem = () => {
    const prob = generateMathProblem();
    setCurrentMath(prob);
    mathStartTimeRef.current = performance.now();
  };

  const handleCalibrationAnswer = useCallback((userTrue: boolean) => {
    if (!currentMath) return;
    const rt = performance.now() - mathStartTimeRef.current;
    if (userTrue === currentMath.isCorrect) {
      audioEngine.playFeedback('tick');
      calibrationTimesRef.current.push(rt);
    } else {
      audioEngine.playFeedback('miss');
    }

    const remaining = calibrationTrialsLeft - 1;
    setCalibrationTrialsLeft(remaining);

    if (remaining > 0) {
      nextCalibrationProblem();
    } else {
      finishCalibration();
    }
  }, [currentMath, calibrationTrialsLeft]);

  const finishCalibration = () => {
    const times = calibrationTimesRef.current;
    let mean = 2500;
    let sd = 600;

    if (times.length > 2) {
      mean = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / times.length;
      sd = Math.sqrt(variance);
    }

    const calculatedDeadline = Math.max(2500, Math.min(6000, Math.round(mean + 2.5 * sd)));
    setMathDeadlineMs(calculatedDeadline);
    setGameState('ready_test');
    audioEngine.playFeedback('complete');
  };

  const startActualTest = () => {
    setMathCorrectCount(0);
    setMathTotalCount(0);
    setSpeedErrorCount(0);
    setAbsoluteScore(0);
    setPcuTotalEarned(0);
    absoluteScoreRef.current = 0;
    pcuTotalEarnedRef.current = 0;
    setSizesPlanRef.current = buildSetSizePlan(protocolId);
    runProtocolRef.current = protocolId;
    sessionStartTimeRef.current = performance.now();

    setCurrentSetIndex(0);
    startSet(0);
  };

  const startSet = (setIdx: number) => {
    if (setIdx >= setSizesPlanRef.current.length) {
      finishAospan();
      return;
    }

    const setSize = setSizesPlanRef.current[setIdx];
    setCurrentSetSize(setSize);
    currentSetLettersRef.current = generateLetterSequence(setSize);
    setCurrentItemInSet(0);
    startMathTrial(0, setSize);
  };

  const startMathTrial = (itemIdx: number, setSize: number) => {
    setCurrentItemInSet(itemIdx);
    const prob = generateMathProblem();
    setCurrentMath(prob);
    setGameState('math_solve');
    mathStartTimeRef.current = performance.now();

    const deadline = mathDeadlineMs;
    const startTime = performance.now();

    if (mathTimerIntervalRef.current) clearInterval(mathTimerIntervalRef.current);
    mathTimerIntervalRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.max(0, 100 - (elapsed / deadline) * 100);
      setMathTimeoutProgress(pct);

      if (elapsed >= deadline) {
        if (mathTimerIntervalRef.current) {
          clearInterval(mathTimerIntervalRef.current);
          mathTimerIntervalRef.current = null;
        }
        handleMathTimeout(itemIdx, setSize);
      }
    }, 50);
  };

  const handleMathTimeout = (itemIdx: number, setSize: number) => {
    audioEngine.playFeedback('speed_warning');
    setSpeedErrorCount(prev => prev + 1);
    setMathTotalCount(prev => prev + 1);
    flashLetter(itemIdx, setSize);
  };

  const handleMathAnswer = useCallback((userSaysTrue: boolean) => {
    if (mathTimerIntervalRef.current) {
      clearInterval(mathTimerIntervalRef.current);
      mathTimerIntervalRef.current = null;
    }
    if (!currentMath) return;

    const isCorrect = userSaysTrue === currentMath.isCorrect;
    setMathTotalCount(prev => prev + 1);
    if (isCorrect) {
      setMathCorrectCount(prev => prev + 1);
      audioEngine.playFeedback('tick');
    } else {
      audioEngine.playFeedback('miss');
    }

    flashLetter(currentItemInSet, currentSetSize);
  }, [currentMath, currentItemInSet, currentSetSize]);

  const flashLetter = (itemIdx: number, setSize: number) => {
    const letter = currentSetLettersRef.current[itemIdx];
    setActiveLetter(letter);
    setGameState('letter_flash');
    audioEngine.playTone(800, 0.1, 'triangle');

    const cancelFlash = timingEngine.schedule(800, () => {
      setActiveLetter(null);
      activeTimersRef.current.delete(cancelFlash);
      const cancelGap = timingEngine.schedule(300, () => {
        activeTimersRef.current.delete(cancelGap);
        if (itemIdx + 1 < setSize) {
          startMathTrial(itemIdx + 1, setSize);
        } else {
          setUserRecalledLetters([]);
          setGameState('recall');
          audioEngine.playFeedback('tick');
        }
      });
      activeTimersRef.current.add(cancelGap);
    });
    activeTimersRef.current.add(cancelFlash);
  };

  const handleLetterSelect = useCallback((letter: string) => {
    if (gameState !== 'recall') return;
    if (userRecalledLetters.length >= currentSetSize) return;

    audioEngine.playFeedback('tick');
    setUserRecalledLetters(prev => [...prev, letter]);
  }, [gameState, userRecalledLetters, currentSetSize]);

  const handleRecallBackspace = useCallback(() => {
    if (gameState !== 'recall') return;
    setUserRecalledLetters(prev => prev.slice(0, -1));
  }, [gameState]);

  const handleRecallSubmit = useCallback(() => {
    if (gameState !== 'recall') return;

    const target = currentSetLettersRef.current;
    let correctInThisSet = 0;
    for (let i = 0; i < target.length; i++) {
      if (userRecalledLetters[i] === target[i]) {
        correctInThisSet += 1;
      }
    }

    const is100Percent = correctInThisSet === target.length;
    if (is100Percent) {
      audioEngine.playFeedback('hit');
      absoluteScoreRef.current += target.length;
      setAbsoluteScore(prev => prev + target.length);
    } else {
      audioEngine.playFeedback('miss');
    }

    pcuTotalEarnedRef.current += correctInThisSet / target.length;
    setPcuTotalEarned(prev => prev + (correctInThisSet / target.length));

    const nextIdx = currentSetIndex + 1;
    setCurrentSetIndex(nextIdx);
    startSet(nextIdx);
  }, [gameState, userRecalledLetters, currentSetIndex]);

  // Physical keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (gameState === 'calibrating') {
        if (e.key === 't' || e.key === 'T' || e.key === '1' || e.key === 'ArrowLeft') {
          e.preventDefault();
          handleCalibrationAnswer(true);
        } else if (e.key === 'f' || e.key === 'F' || e.key === '2' || e.key === 'ArrowRight') {
          e.preventDefault();
          handleCalibrationAnswer(false);
        }
      } else if (gameState === 'math_solve') {
        if (e.key === 't' || e.key === 'T' || e.key === '1' || e.key === 'ArrowLeft') {
          e.preventDefault();
          handleMathAnswer(true);
        } else if (e.key === 'f' || e.key === 'F' || e.key === '2' || e.key === 'ArrowRight') {
          e.preventDefault();
          handleMathAnswer(false);
        }
      } else if (gameState === 'recall') {
        const keyUpper = e.key.toUpperCase();
        if (OSPAN_LETTERS.includes(keyUpper)) {
          e.preventDefault();
          handleLetterSelect(keyUpper);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          handleRecallBackspace();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleRecallSubmit();
        }
      } else if (e.key === 'Escape') {
        clearAllTimers();
        setGameState('idle');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleCalibrationAnswer, handleMathAnswer, handleLetterSelect, handleRecallBackspace, handleRecallSubmit]);

  const finishAospan = () => {
    clearAllTimers();
    setGameState('summary');
    audioEngine.playFeedback('complete');

    const durationSeconds = Math.round((performance.now() - sessionStartTimeRef.current) / 1000);
    const mathAccuracy = mathTotalCount > 0 ? (mathCorrectCount / mathTotalCount) * 100 : 0;
    const setsAdministeredNow = setSizesPlanRef.current.length;
    const finalAbsolute = absoluteScoreRef.current;
    const pcuScore = setsAdministeredNow > 0 ? pcuTotalEarnedRef.current / setsAdministeredNow : 0;

    const record: SessionRecord = {
      id: crypto.randomUUID(),
      timestampIso: new Date().toISOString(),
      epochMs: Date.now(),
      taskType: 'operation_span',
      mode: OSPAN_PROTOCOLS[runProtocolRef.current].recordMode,
      level: finalAbsolute,
      totalTrials: setSizesPlanRef.current.length,
      durationSeconds,
      metrics: {
        accuracyPercent: Number(mathAccuracy.toFixed(1)),
        hits: mathCorrectCount,
        misses: mathTotalCount - mathCorrectCount,
        falseAlarms: speedErrorCount,
        correctRejections: 0,
        dPrime: 0,
        beta: 0,
        meanReactionTimeMs: mathDeadlineMs,
        medianReactionTimeMs: mathDeadlineMs,
        rtStandardDeviationMs: 0,
        aospanAbsoluteScore: finalAbsolute,
        aospanMaxScore: maxAbsoluteScore(setSizesPlanRef.current),
        aospanPcuScore: Number(pcuScore.toFixed(2)),
        mathAccuracyPercent: Number(mathAccuracy.toFixed(1))
      },
      trials: []
    };

    lastSessionRecordRef.current = record;
    storageService.saveSession(record);
  };

  const handleContinueProtocol = () => {
    if (onComplete && lastSessionRecordRef.current) {
      onComplete(lastSessionRecordRef.current);
    } else if (onExit) {
      onExit();
    }
  };

  const mathAccuracy = mathTotalCount > 0 ? (mathCorrectCount / mathTotalCount) * 100 : 0;
  const isProtocolValid = mathAccuracy >= 85;

  // The run that produced the score on screen, which may differ from the
  // protocol currently selected for the next run.
  const scoredProtocol = OSPAN_PROTOCOLS[runProtocolRef.current];
  const setsAdministered = setSizesPlanRef.current.length;
  const maxScore = maxAbsoluteScore(setSizesPlanRef.current);
  const pcuScore = setsAdministered > 0 ? pcuTotalEarned / setsAdministered : 0;

  // Only the full protocol is comparable to the Unsworth norms; a short run
  // has a lower ceiling and gets no percentile.
  const zScore = calculateZScore(absoluteScore, 'operation_span_absolute');
  const percentile = scoredProtocol.normReferenced ? calculatePercentile(zScore) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-8 pb-4 border-b border-surface-border">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Exit to Lab
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Task:</span>
          <span className="px-3 py-1 bg-accent-amber/10 border border-accent-amber/30 text-accent-amber text-xs font-mono font-semibold rounded-full">
            Automated O-Span
          </span>
        </div>
      </div>

      {/* Intro Stage */}
      {gameState === 'idle' && (
        <div className="w-full max-w-md bg-surface border border-surface-border rounded-2xl p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center text-accent-amber mb-6">
            <Calculator className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Automated O-Span</h2>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            The gold standard for Working Memory Capacity. Interleaves rapid arithmetic verification with letter sequence retention.
          </p>

          <div className="w-full mb-6">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 block mb-2 text-left">
              Protocol
            </span>
            <div className="space-y-2">
              {(Object.keys(OSPAN_PROTOCOLS) as OSpanProtocolId[]).map(id => {
                const p = OSPAN_PROTOCOLS[id];
                const selected = protocolId === id;
                return (
                  <button
                    key={id}
                    onClick={() => setProtocolId(id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      selected
                        ? 'bg-accent-amber/10 border-accent-amber text-accent-amber'
                        : 'bg-surface-subtle border-surface-border text-zinc-300 hover:border-zinc-500'
                    }`}
                  >
                    <span className="flex items-center justify-between text-xs font-mono font-bold">
                      {p.label}
                      <span className="text-zinc-500">
                        {maxAbsoluteScore(id === 'assessment' ? buildSetSizePlan('assessment') : buildSetSizePlan('practice'))} letters · ~{p.approxMinutes} min
                      </span>
                    </span>
                    <span className="block text-[11px] text-zinc-400 mt-1 leading-relaxed">{p.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-surface-subtle border border-surface-border rounded-xl text-left text-xs text-zinc-400 mb-8 w-full space-y-2">
            <p>• <strong>Phase 1: Speed Calibration</strong>. 10 simple math equations to determine your personal speed baseline.</p>
            <p>• <strong>Phase 2: Complex Retention</strong>. Verify math before the deadline, then memorize the flashed letter.</p>
            <p className="text-accent-amber font-semibold">• Critical: Math accuracy must remain &ge; 85% for a valid clinical score.</p>
          </div>

          <button
            onClick={startCalibration}
            className="w-full py-4 bg-accent-amber hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition-all glow-amber flex items-center justify-center gap-2 text-base"
          >
            <Play className="w-5 h-5 fill-current" />
            Calibrate Speed & Begin
          </button>
        </div>
      )}

      {/* Calibration Stage */}
      {gameState === 'calibrating' && currentMath && (
        <div className="w-full max-w-md bg-surface border border-surface-border rounded-2xl p-8 text-center flex flex-col items-center">
          <span className="text-xs font-mono text-zinc-500 mb-2">
            Calibration Trials Remaining: {calibrationTrialsLeft}
          </span>
          <h3 className="text-lg font-semibold mb-6">Solve as quickly & accurately as possible:</h3>

          <div className="p-6 bg-surface-subtle border border-surface-border rounded-xl w-full mb-6">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-zinc-100">
              {currentMath.problemString} = {currentMath.displayedAnswer}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              onClick={() => handleCalibrationAnswer(true)}
              className="py-4 bg-accent-emerald/20 border border-accent-emerald text-accent-emerald font-bold rounded-xl hover:bg-accent-emerald/30 active:scale-95 transition-all flex items-center justify-center gap-2 text-base font-mono"
            >
              <Check className="w-5 h-5" /> True <span className="text-xs opacity-70 font-normal">[T / 1]</span>
            </button>
            <button
              onClick={() => handleCalibrationAnswer(false)}
              className="py-4 bg-accent-rose/20 border border-accent-rose text-accent-rose font-bold rounded-xl hover:bg-accent-rose/30 active:scale-95 transition-all flex items-center justify-center gap-2 text-base font-mono"
            >
              <X className="w-5 h-5" /> False <span className="text-xs opacity-70 font-normal">[F / 2]</span>
            </button>
          </div>
        </div>
      )}

      {/* Ready for Test */}
      {gameState === 'ready_test' && (
        <div className="w-full max-w-md bg-surface border border-surface-border rounded-2xl p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-accent-emerald/10 border border-accent-emerald/30 flex items-center justify-center text-accent-emerald mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Baseline Calibrated</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Your personalized math deadline is <strong>{(mathDeadlineMs / 1000).toFixed(1)}s</strong> per equation.
          </p>

          <button
            onClick={startActualTest}
            className="w-full py-4 bg-accent-cyan hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl transition-all glow-cyan flex items-center justify-center gap-2 text-base"
          >
            <Play className="w-5 h-5 fill-current" />
            Begin O-Span Test Sets
          </button>
        </div>
      )}

      {/* Math Verification Stage */}
      {gameState === 'math_solve' && currentMath && (
        <div className="w-full max-w-md bg-surface border border-surface-border rounded-2xl p-8 text-center flex flex-col items-center">
          <div className="w-full flex items-center justify-between text-xs font-mono text-zinc-400 mb-4">
            <span>Set {currentSetIndex + 1} of {setSizesPlan.length}</span>
            <span>Item {currentItemInSet + 1} of {currentSetSize}</span>
          </div>

          {/* Speed Deadline Progress Bar */}
          <div className="w-full h-2 bg-surface-subtle rounded-full overflow-hidden mb-6">
            <div
              className={`h-full transition-all duration-75 ${
                mathTimeoutProgress > 30 ? 'bg-accent-cyan' : 'bg-accent-rose'
              }`}
              style={{ width: `${mathTimeoutProgress}%` }}
            />
          </div>

          <div className="p-6 bg-surface-subtle border border-surface-border rounded-xl w-full mb-6">
            <span className="text-3xl font-mono font-bold text-zinc-100">
              {currentMath.problemString} = {currentMath.displayedAnswer}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              onClick={() => handleMathAnswer(true)}
              className="py-4 bg-accent-emerald/20 border border-accent-emerald text-accent-emerald font-bold rounded-xl hover:bg-accent-emerald/30 active:scale-95 transition-all flex items-center justify-center gap-2 text-lg font-mono"
            >
              <Check className="w-5 h-5" /> True <span className="text-xs opacity-70 font-normal">[T / 1 / &larr;]</span>
            </button>
            <button
              onClick={() => handleMathAnswer(false)}
              className="py-4 bg-accent-rose/20 border border-accent-rose text-accent-rose font-bold rounded-xl hover:bg-accent-rose/30 active:scale-95 transition-all flex items-center justify-center gap-2 text-lg font-mono"
            >
              <X className="w-5 h-5" /> False <span className="text-xs opacity-70 font-normal">[F / 2 / &rarr;]</span>
            </button>
          </div>
        </div>
      )}

      {/* Letter Flash Stage */}
      {gameState === 'letter_flash' && (
        <div className="w-full max-w-md py-20 flex flex-col items-center justify-center">
          <div className="w-40 h-40 rounded-3xl bg-surface border-2 border-accent-amber flex items-center justify-center glow-amber shadow-2xl">
            <span className="text-7xl font-bold font-mono text-accent-amber">
              {activeLetter}
            </span>
          </div>
          <span className="text-xs font-mono text-zinc-400 mt-6">Memorize Letter...</span>
        </div>
      )}

      {/* Serial Letter Recall Stage */}
      {gameState === 'recall' && (
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="w-full flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
            <span>Recall Letters in Exact Order</span>
            <span>Target: <strong className="text-accent-amber">{currentSetSize}</strong> letters</span>
          </div>
          <p className="text-[11px] font-mono text-zinc-500 mb-4 text-center">
            Type on keyboard or click letters below &bull; <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-zinc-300">Enter</kbd> submit &bull; <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-zinc-300">Backspace</kbd> delete
          </p>

          {/* User Recalled Slot Display */}
          <div className="w-full h-16 bg-surface border border-surface-border rounded-xl mb-6 flex items-center justify-center gap-2 px-4">
            {Array.from({ length: currentSetSize }).map((_, i) => (
              <div
                key={i}
                className={`w-10 h-11 rounded-lg flex items-center justify-center text-xl font-bold font-mono border transition-all ${
                  userRecalledLetters[i] !== undefined
                    ? 'bg-zinc-800 border-accent-amber text-accent-amber'
                    : 'bg-surface-subtle border-zinc-800 text-zinc-600'
                }`}
              >
                {userRecalledLetters[i] !== undefined ? userRecalledLetters[i] : '_'}
              </div>
            ))}
          </div>

          {/* 12-Letter Matrix */}
          <div className="grid grid-cols-4 gap-3 w-full mb-6">
            {OSPAN_LETTERS.map(letter => (
              <button
                key={letter}
                onClick={() => handleLetterSelect(letter)}
                className="py-3.5 bg-surface hover:bg-zinc-800 active:scale-95 border border-surface-border rounded-xl text-lg font-mono font-bold text-zinc-100 transition-all"
              >
                {letter}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              onClick={handleRecallBackspace}
              className="py-3 bg-surface-subtle hover:bg-zinc-800 border border-surface-border rounded-xl flex items-center justify-center gap-2 text-zinc-400 text-sm font-medium"
            >
              <Delete className="w-4 h-4" /> Clear Last
            </button>
            <button
              disabled={userRecalledLetters.length === 0}
              onClick={handleRecallSubmit}
              className="py-3 bg-accent-amber hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition-all glow-amber text-sm disabled:opacity-50"
            >
              Submit Set
            </button>
          </div>
        </div>
      )}

      {/* Summary Stage */}
      {gameState === 'summary' && (
        <div className="w-full max-w-lg bg-surface border border-surface-border rounded-2xl p-8 text-center flex flex-col items-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center text-accent-amber mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-1">
            {scoredProtocol.normReferenced ? 'O-Span Assessment Complete' : 'O-Span Practice Complete'}
          </h2>
          <p className="text-zinc-400 text-xs font-mono mb-6">
            {scoredProtocol.label} · {setsAdministered} sets · {maxScore} letters
          </p>

          <div className="grid grid-cols-3 gap-3 w-full mb-6">
            <div className="p-3 bg-surface-subtle border border-surface-border rounded-xl">
              <span className="text-xs text-zinc-400 block mb-1">Absolute Score</span>
              <span className="text-xl font-bold font-mono text-accent-amber">
                {absoluteScore}
                <span className="text-xs text-zinc-500"> / {maxScore}</span>
              </span>
            </div>
            <div className="p-3 bg-surface-subtle border border-surface-border rounded-xl">
              <span className="text-xs text-zinc-400 block mb-1">Math Accuracy</span>
              <span className={`text-xl font-bold font-mono ${isProtocolValid ? 'text-accent-emerald' : 'text-accent-rose'}`}>
                {mathAccuracy.toFixed(1)}%
              </span>
            </div>
            {scoredProtocol.normReferenced ? (
              <div className="p-3 bg-surface-subtle border border-surface-border rounded-xl">
                <span className="text-xs text-zinc-400 block mb-1">Percentile</span>
                <span className="text-xl font-bold font-mono text-accent-cyan">{percentile}th</span>
              </div>
            ) : (
              <div className="p-3 bg-surface-subtle border border-surface-border rounded-xl">
                <span className="text-xs text-zinc-400 block mb-1">Partial Credit</span>
                <span className="text-xl font-bold font-mono text-accent-cyan">{pcuScore.toFixed(2)}</span>
              </div>
            )}
          </div>

          {!scoredProtocol.normReferenced && (
            <div className="w-full p-4 bg-surface-subtle border border-surface-border text-zinc-400 rounded-xl text-xs text-left mb-6 leading-relaxed">
              Practice runs are scored by <strong className="text-zinc-200">partial-credit unit</strong> — the mean
              proportion of each set recalled correctly, so runs stay comparable to each other. No percentile is
              shown: the published norms describe the full 75-letter protocol, and a short run cannot be read
              against them. Run the <strong className="text-zinc-200">Full Assessment</strong> for a norm-referenced
              score that counts toward your WMC composite.
            </div>
          )}

          {!isProtocolValid && (
            <div className="w-full p-4 bg-accent-rose/10 border border-accent-rose/30 text-accent-rose rounded-xl text-xs text-left mb-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>
                Math accuracy fell below the 85% threshold ({mathAccuracy.toFixed(1)}%). Clinical protocols require balancing processing speed with storage. Focus on solving math accurately on your next run.
              </span>
            </div>
          )}

          {onComplete ? (
            <button
              onClick={handleContinueProtocol}
              className="w-full py-4 bg-accent-amber hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition-all glow-amber flex items-center justify-center gap-2 text-sm mb-3"
            >
              Continue Protocol <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                onClick={startActualTest}
                className="py-3 px-4 bg-accent-amber hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition-all glow-amber flex items-center justify-center gap-2 text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Retest O-Span
              </button>
              <button
                onClick={onExit}
                className="py-3 px-4 bg-surface-subtle hover:bg-zinc-800 border border-surface-border text-zinc-300 font-medium rounded-xl transition-all text-sm"
              >
                Back to Lab
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
