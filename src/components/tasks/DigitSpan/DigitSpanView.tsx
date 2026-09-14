import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateDigitSequence, evaluateDigitResponse } from './digitSpanLogic';
import { timingEngine } from '../../../services/timingEngine';
import { audioEngine } from '../../../services/audioEngine';
import { storageService } from '../../../services/storageService';
import { calculatePercentile, calculateZScore } from '../../../types/norms';
import { DigitSpanMode, SessionRecord } from '../../../types/cognitive';
import { ArrowLeft, ArrowRight, Play, RotateCcw, Delete, CornerDownLeft, CheckCircle2, Award } from 'lucide-react';

interface DigitSpanViewProps {
  initialMode?: DigitSpanMode;
  onComplete?: (record: SessionRecord) => void;
  onExit?: () => void;
}

export const DigitSpanView: React.FC<DigitSpanViewProps> = ({
  initialMode = 'forward',
  onComplete,
  onExit
}) => {
  const [mode, setMode] = useState<DigitSpanMode>(initialMode);
  const [gameState, setGameState] = useState<'idle' | 'presenting' | 'recalling' | 'feedback' | 'summary'>('idle');
  const [currentSpan, setCurrentSpan] = useState<number>(3);
  const [trialInSpan, setTrialInSpan] = useState<number>(1);
  const [activeDigit, setActiveDigit] = useState<number | null>(null);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [lastTrialResult, setLastTrialResult] = useState<{ correct: boolean; expected: number[]; actual: number[] } | null>(null);

  // Scores
  const [maxSpanAchieved, setMaxSpanAchieved] = useState<number>(0);
  const [totalTrialsCorrect, setTotalTrialsCorrect] = useState<number>(0);
  const [totalTrialsAttempted, setTotalTrialsAttempted] = useState<number>(0);

  // Refs
  const targetSequenceRef = useRef<number[]>([]);
  const currentSpanRef = useRef<number>(3);
  const trialInSpanRef = useRef<number>(1);
  const passedCurrentSpanRef = useRef<boolean>(false);
  const activeTimersRef = useRef<Set<() => void>>(new Set());
  const sessionStartTimeRef = useRef<number>(0);
  const lastSessionRecordRef = useRef<SessionRecord | null>(null);

  const clearAllTimers = () => {
    activeTimersRef.current.forEach(cancel => cancel());
    activeTimersRef.current.clear();
  };

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  const startTest = async () => {
    await audioEngine.initialize();
    currentSpanRef.current = 3;
    trialInSpanRef.current = 1;
    passedCurrentSpanRef.current = false;
    setCurrentSpan(3);
    setTrialInSpan(1);
    setMaxSpanAchieved(0);
    setTotalTrialsCorrect(0);
    setTotalTrialsAttempted(0);
    sessionStartTimeRef.current = performance.now();
    startTrial(3);
  };

  const startTrial = (spanLen: number) => {
    clearAllTimers();
    const sequence = generateDigitSequence(spanLen);
    targetSequenceRef.current = sequence;
    setUserInput([]);
    setGameState('presenting');
    setActiveDigit(null);

    let idx = 0;
    const presentNext = () => {
      if (idx >= sequence.length) {
        setActiveDigit(null);
        const cancelShift = timingEngine.schedule(400, () => {
          setGameState('recalling');
          audioEngine.playFeedback('tick');
          activeTimersRef.current.delete(cancelShift);
        });
        activeTimersRef.current.add(cancelShift);
        return;
      }

      const digit = sequence[idx];
      setActiveDigit(digit);
      audioEngine.speakPhoneme(digit.toString());

      const cancelHide = timingEngine.schedule(800, () => {
        setActiveDigit(null);
        activeTimersRef.current.delete(cancelHide);
        const cancelGap = timingEngine.schedule(200, () => {
          idx += 1;
          presentNext();
          activeTimersRef.current.delete(cancelGap);
        });
        activeTimersRef.current.add(cancelGap);
      });
      activeTimersRef.current.add(cancelHide);
    };

    const cancelInitial = timingEngine.schedule(500, () => {
      presentNext();
      activeTimersRef.current.delete(cancelInitial);
    });
    activeTimersRef.current.add(cancelInitial);
  };

  const handleDigitPress = useCallback((digit: number) => {
    if (gameState !== 'recalling') return;
    if (userInput.length >= targetSequenceRef.current.length) return;

    audioEngine.playFeedback('tick');
    setUserInput(prev => [...prev, digit]);
  }, [gameState, userInput.length]);

  const handleBackspace = useCallback(() => {
    if (gameState !== 'recalling') return;
    setUserInput(prev => prev.slice(0, -1));
  }, [gameState]);

  const handleSubmit = useCallback(() => {
    if (gameState !== 'recalling' || userInput.length !== targetSequenceRef.current.length) return;

    const target = targetSequenceRef.current;
    const isCorrect = evaluateDigitResponse(target, userInput, mode);

    setTotalTrialsAttempted(prev => prev + 1);
    if (isCorrect) {
      setTotalTrialsCorrect(prev => prev + 1);
      audioEngine.playFeedback('hit');
      passedCurrentSpanRef.current = true;
      if (currentSpanRef.current > maxSpanAchieved) {
        setMaxSpanAchieved(currentSpanRef.current);
      }
    } else {
      audioEngine.playFeedback('miss');
    }

    setLastTrialResult({
      correct: isCorrect,
      expected: mode === 'backward' ? [...target].reverse() : mode === 'ascending' ? [...target].sort((a,b)=>a-b) : target,
      actual: userInput
    });

    setGameState('feedback');

    const cancelNext = timingEngine.schedule(1500, () => {
      activeTimersRef.current.delete(cancelNext);
      if (isCorrect) {
        currentSpanRef.current += 1;
        trialInSpanRef.current = 1;
        passedCurrentSpanRef.current = false;
        setCurrentSpan(currentSpanRef.current);
        setTrialInSpan(1);
        startTrial(currentSpanRef.current);
      } else {
        if (trialInSpanRef.current === 1) {
          trialInSpanRef.current = 2;
          setTrialInSpan(2);
          startTrial(currentSpanRef.current);
        } else {
          finishTest();
        }
      }
    });
    activeTimersRef.current.add(cancelNext);
  }, [gameState, userInput, mode, maxSpanAchieved]);

  // Physical keyboard listeners with repeat guard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'recalling') return;
      if (e.repeat) return;
      
      if (e.key >= '1' && e.key <= '9') {
        handleDigitPress(parseInt(e.key, 10));
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Escape') {
        clearAllTimers();
        setGameState('idle');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleDigitPress, handleBackspace, handleSubmit]);

  const finishTest = () => {
    clearAllTimers();
    setGameState('summary');
    audioEngine.playFeedback('complete');

    const durationSeconds = Math.round((performance.now() - sessionStartTimeRef.current) / 1000);
    const finalSpan = Math.max(3, currentSpanRef.current - 1);

    const record: SessionRecord = {
      id: crypto.randomUUID(),
      timestampIso: new Date().toISOString(),
      epochMs: Date.now(),
      taskType: 'digit_span',
      mode,
      level: finalSpan,
      totalTrials: totalTrialsAttempted + 1,
      durationSeconds,
      metrics: {
        accuracyPercent: totalTrialsAttempted > 0 ? Number(((totalTrialsCorrect / (totalTrialsAttempted + 1)) * 100).toFixed(1)) : 0,
        hits: totalTrialsCorrect,
        misses: (totalTrialsAttempted + 1) - totalTrialsCorrect,
        falseAlarms: 0,
        correctRejections: 0,
        dPrime: 0,
        beta: 0,
        meanReactionTimeMs: 0,
        medianReactionTimeMs: 0,
        rtStandardDeviationMs: 0,
        maxSpanReached: finalSpan
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

  const finalSpan = Math.max(3, currentSpan - 1);
  const normKey = `digit_span_${mode}`;
  const zScore = calculateZScore(finalSpan, normKey);
  const percentile = calculatePercentile(zScore);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col items-center">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between mb-8 pb-4 border-b border-surface-border">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Exit to Lab
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Mode:</span>
          <span className="px-3 py-1 bg-accent-violet/10 border border-accent-violet/30 text-accent-violet text-xs font-mono font-semibold rounded-full capitalize">
            {mode} Span
          </span>
        </div>
      </div>

      {/* Start / Mode Selection */}
      {gameState === 'idle' && (
        <div className="w-full max-w-md bg-surface border border-surface-border rounded-2xl p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-accent-violet/10 border border-accent-violet/30 flex items-center justify-center text-accent-violet mb-6">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">WAIS-IV Digit Span</h2>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            Measures phonological loop capacity and executive re-indexing. Digits flash at 1 per second.
          </p>

          <div className="grid grid-cols-3 gap-2 w-full mb-8 bg-surface-subtle p-1.5 rounded-xl border border-surface-border">
            {(['forward', 'backward', 'ascending'] as DigitSpanMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold transition-all capitalize ${
                  mode === m
                    ? 'bg-zinc-800 text-accent-violet shadow-sm border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="p-3 bg-surface-subtle border border-surface-border rounded-xl text-left text-xs text-zinc-400 mb-8 w-full leading-relaxed">
            {mode === 'forward' && '• Recall digits in the exact chronological order they were presented.'}
            {mode === 'backward' && '• Recall digits in REVERSE order (last digit first, first digit last).'}
            {mode === 'ascending' && '• Sort the digits mentally from LOWEST to HIGHEST (e.g. 7-2-9 becomes 2-7-9).'}
          </div>

          <button
            onClick={startTest}
            className="w-full py-4 bg-accent-violet hover:bg-purple-500 text-white font-bold rounded-xl transition-all glow-violet flex items-center justify-center gap-2 text-base"
          >
            <Play className="w-5 h-5 fill-current" />
            Begin Assessment
          </button>
        </div>
      )}

      {/* Presentation Stage */}
      {gameState === 'presenting' && (
        <div className="w-full max-w-md py-20 flex flex-col items-center justify-center">
          <span className="text-xs font-mono uppercase text-zinc-500 mb-8">
            Span Length: {currentSpan} (Trial {trialInSpan} of 2)
          </span>

          <div className="w-40 h-40 rounded-3xl bg-surface border-2 border-surface-border flex items-center justify-center shadow-2xl">
            <span className="text-7xl font-bold font-mono text-accent-violet transition-all">
              {activeDigit !== null ? activeDigit : ''}
            </span>
          </div>

          <span className="text-xs font-mono text-zinc-400 mt-8 animate-pulse">
            Listen & Memorize...
          </span>
        </div>
      )}

      {/* Recall Stage */}
      {(gameState === 'recalling' || gameState === 'feedback') && (
        <div className="w-full max-w-sm flex flex-col items-center">
          <div className="w-full flex items-center justify-between text-xs font-mono text-zinc-400 mb-4">
            <span>Recall ({mode})</span>
            <span>Target Length: <strong>{targetSequenceRef.current.length}</strong></span>
          </div>

          {/* User Input Sequence Display */}
          <div className="w-full h-16 bg-surface border border-surface-border rounded-xl mb-6 flex items-center justify-center gap-2 px-4 shadow-inner">
            {Array.from({ length: targetSequenceRef.current.length }).map((_, i) => (
              <div
                key={i}
                className={`w-9 h-11 rounded-lg flex items-center justify-center text-xl font-bold font-mono border transition-all ${
                  userInput[i] !== undefined
                    ? 'bg-zinc-800 border-accent-violet text-accent-violet'
                    : 'bg-surface-subtle border-zinc-800 text-transparent'
                }`}
              >
                {userInput[i] !== undefined ? userInput[i] : '•'}
              </div>
            ))}
          </div>

          {/* Feedback Overlay if validating */}
          {gameState === 'feedback' && lastTrialResult && (
            <div className={`w-full p-3 mb-4 rounded-xl border text-xs font-mono text-center ${
              lastTrialResult.correct
                ? 'bg-accent-emerald/10 border-accent-emerald/30 text-accent-emerald'
                : 'bg-accent-rose/10 border-accent-rose/30 text-accent-rose'
            }`}>
              {lastTrialResult.correct ? 'Correct! Advancing...' : `Incorrect. Expected: ${lastTrialResult.expected.join(' ')}`}
            </div>
          )}

          {/* High-Tactility On-Screen Numpad */}
          <div className="grid grid-cols-3 gap-3 w-full mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button
                key={n}
                disabled={gameState === 'feedback'}
                onClick={() => handleDigitPress(n)}
                className="py-4 bg-surface hover:bg-zinc-800 active:scale-95 border border-surface-border rounded-xl text-xl font-mono font-bold text-zinc-100 transition-all disabled:opacity-50"
              >
                {n}
              </button>
            ))}
            <button
              disabled={gameState === 'feedback'}
              onClick={handleBackspace}
              className="py-4 bg-surface-subtle hover:bg-zinc-800 active:scale-95 border border-surface-border rounded-xl flex items-center justify-center text-zinc-400 transition-all disabled:opacity-50"
            >
              <Delete className="w-5 h-5" />
            </button>
            <div className="py-4 bg-transparent" />
            <button
              disabled={gameState === 'feedback' || userInput.length !== targetSequenceRef.current.length}
              onClick={handleSubmit}
              className="py-4 bg-accent-violet hover:bg-purple-500 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center transition-all glow-violet disabled:opacity-50"
            >
              <CornerDownLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Final Summary Modal */}
      {gameState === 'summary' && (
        <div className="w-full max-w-lg bg-surface border border-surface-border rounded-2xl p-8 text-center flex flex-col items-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-accent-violet/10 border border-accent-violet/30 flex items-center justify-center text-accent-violet mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-1">Assessment Complete</h2>
          <p className="text-zinc-400 text-xs font-mono mb-6">Digit Span ({mode})</p>

          <div className="grid grid-cols-2 gap-4 w-full mb-6">
            <div className="p-4 bg-surface-subtle border border-surface-border rounded-xl">
              <span className="text-xs text-zinc-400 block mb-1">Maximum Span</span>
              <span className="text-3xl font-bold font-mono text-accent-violet">{finalSpan}</span>
              <span className="text-xs text-zinc-500 block mt-1">digits</span>
            </div>
            <div className="p-4 bg-surface-subtle border border-surface-border rounded-xl">
              <span className="text-xs text-zinc-400 block mb-1">Adult Percentile</span>
              <span className="text-3xl font-bold font-mono text-accent-cyan">{percentile}th</span>
              <span className="text-xs text-zinc-500 block mt-1">WAIS-IV Norms</span>
            </div>
          </div>

          <div className="w-full p-4 bg-surface-subtle border border-surface-border rounded-xl text-xs text-zinc-400 text-left mb-8 space-y-1">
            <p>• <strong>Average Adult Span</strong>: 7.0 digits (Forward), 5.2 (Backward), 6.1 (Ascending).</p>
            <p>• Your score indicates healthy phonological capacity and reliable executive ordering.</p>
          </div>

          {onComplete ? (
            <button
              onClick={handleContinueProtocol}
              className="w-full py-4 bg-accent-violet hover:bg-purple-500 text-white font-bold rounded-xl transition-all glow-violet flex items-center justify-center gap-2 text-sm mb-3"
            >
              Continue Protocol <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={startTest}
              className="w-full py-4 bg-accent-violet hover:bg-purple-500 text-white font-bold rounded-xl transition-all glow-violet flex items-center justify-center gap-2 text-sm mb-3"
            >
              <RotateCcw className="w-4 h-4" /> Retest Span
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
