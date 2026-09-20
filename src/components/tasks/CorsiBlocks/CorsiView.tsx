import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KESSELS_CORSI_BLOCKS, generateCorsiSequence, evaluateCorsiResponse } from './corsiLogic';
import { timingEngine } from '../../../services/timingEngine';
import { audioEngine } from '../../../services/audioEngine';
import { storageService } from '../../../services/storageService';
import { calculatePercentile, calculateZScore } from '../../../types/norms';
import { calculateSerialPositionErrors } from '../../../services/psychometrics';
import { CorsiMode, SessionRecord, SpanTrial } from '../../../types/cognitive';
import { ArrowLeft, ArrowRight, Play, RotateCcw, CheckCircle2, Grid } from 'lucide-react';

interface CorsiViewProps {
  initialMode?: CorsiMode;
  onComplete?: (record: SessionRecord) => void;
  onExit?: () => void;
}

export const CorsiView: React.FC<CorsiViewProps> = ({
  initialMode = 'forward',
  onComplete,
  onExit
}) => {
  const [mode, setMode] = useState<CorsiMode>(initialMode);
  const [gameState, setGameState] = useState<'idle' | 'presenting' | 'tapping' | 'feedback' | 'summary'>('idle');
  const [currentSpan, setCurrentSpan] = useState<number>(3);
  const [trialInSpan, setTrialInSpan] = useState<number>(1);
  const [illuminatedBlockId, setIlluminatedBlockId] = useState<number | null>(null);
  const [justTappedBlockId, setJustTappedBlockId] = useState<number | null>(null);
  const [userTaps, setUserTaps] = useState<number[]>([]);
  // Authoritative tap buffer. `handleBlockTap` is re-created per render and the
  // keydown listener is re-bound with it, so two taps landing inside one render
  // would both read the same stale `userTaps` and the second would overwrite
  // the first. That dropped a tap, and because the task auto-submits when the
  // count reaches the target, the submit never fired and the trial stalled with
  // no way to finish it.
  const userTapsRef = useRef<number[]>([]);
  // Per-trial recall, in a ref so the end-of-session record includes the last
  // trial rather than trailing it by a tick.
  const spanTrialsRef = useRef<SpanTrial[]>([]);
  const [lastFeedback, setLastFeedback] = useState<{ correct: boolean } | null>(null);

  // Scores
  const [maxSpanAchieved, setMaxSpanAchieved] = useState<number>(0);
  const [totalTrialsAttempted, setTotalTrialsAttempted] = useState<number>(0);
  const [totalTrialsCorrect, setTotalTrialsCorrect] = useState<number>(0);

  // Refs
  const targetSequenceRef = useRef<number[]>([]);
  const currentSpanRef = useRef<number>(3);
  const trialInSpanRef = useRef<number>(1);
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
    spanTrialsRef.current = [];
    currentSpanRef.current = 3;
    trialInSpanRef.current = 1;
    setCurrentSpan(3);
    setTrialInSpan(1);
    setMaxSpanAchieved(0);
    setTotalTrialsAttempted(0);
    setTotalTrialsCorrect(0);
    sessionStartTimeRef.current = performance.now();
    startTrial(3);
  };

  const startTrial = (spanLen: number) => {
    clearAllTimers();
    const sequence = generateCorsiSequence(spanLen);
    targetSequenceRef.current = sequence;
    setUserTaps([]);
    userTapsRef.current = [];
    setGameState('presenting');
    setIlluminatedBlockId(null);
    setJustTappedBlockId(null);

    let idx = 0;
    const illuminateNext = () => {
      if (idx >= sequence.length) {
        setIlluminatedBlockId(null);
        const cancelShift = timingEngine.schedule(400, () => {
          setGameState('tapping');
          audioEngine.playFeedback('tick');
          activeTimersRef.current.delete(cancelShift);
        });
        activeTimersRef.current.add(cancelShift);
        return;
      }

      const blockId = sequence[idx];
      setIlluminatedBlockId(blockId);
      audioEngine.playTone(350 + blockId * 45, 0.25, 'sine');

      const cancelHide = timingEngine.schedule(800, () => {
        setIlluminatedBlockId(null);
        activeTimersRef.current.delete(cancelHide);
        const cancelGap = timingEngine.schedule(300, () => {
          idx += 1;
          illuminateNext();
          activeTimersRef.current.delete(cancelGap);
        });
        activeTimersRef.current.add(cancelGap);
      });
      activeTimersRef.current.add(cancelHide);
    };

    const cancelInitial = timingEngine.schedule(600, () => {
      illuminateNext();
      activeTimersRef.current.delete(cancelInitial);
    });
    activeTimersRef.current.add(cancelInitial);
  };

  const handleBlockTap = useCallback((id: number) => {
    if (gameState !== 'tapping') return;
    if (userTapsRef.current.length >= targetSequenceRef.current.length) return;

    audioEngine.playTone(450 + id * 45, 0.1, 'sine');
    setJustTappedBlockId(id);
    setTimeout(() => setJustTappedBlockId(null), 180);

    const newTaps = [...userTapsRef.current, id];
    userTapsRef.current = newTaps;
    setUserTaps(newTaps);

    if (newTaps.length === targetSequenceRef.current.length) {
      evaluateSubmission(newTaps);
    }
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (gameState === 'tapping') {
        if (e.key >= '1' && e.key <= '9') {
          e.preventDefault();
          handleBlockTap(parseInt(e.key, 10));
        }
      }
      if (e.key === 'Escape') {
        clearAllTimers();
        setGameState('idle');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleBlockTap]);

  const evaluateSubmission = (taps: number[]) => {
    const target = targetSequenceRef.current;
    const isCorrect = evaluateCorsiResponse(target, taps, mode);

    setTotalTrialsAttempted(prev => prev + 1);
    if (isCorrect) {
      setTotalTrialsCorrect(prev => prev + 1);
      audioEngine.playFeedback('hit');
      if (currentSpanRef.current > maxSpanAchieved) {
        setMaxSpanAchieved(currentSpanRef.current);
      }
    } else {
      audioEngine.playFeedback('miss');
    }

    // Compare against the order the participant had to produce, so position i
    // of target lines up with position i of the taps.
    const expected = mode === 'backward' ? [...target].reverse() : target;
    spanTrialsRef.current.push({
      trialIndex: spanTrialsRef.current.length,
      spanLength: target.length,
      target: expected,
      recalled: [...taps],
      correct: isCorrect
    });

    setLastFeedback({ correct: isCorrect });
    setGameState('feedback');

    const cancelNext = timingEngine.schedule(1500, () => {
      activeTimersRef.current.delete(cancelNext);
      if (isCorrect) {
        currentSpanRef.current += 1;
        trialInSpanRef.current = 1;
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
  };

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
      taskType: 'corsi_blocks',
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
        maxSpanReached: finalSpan,
        serialPositionErrors: calculateSerialPositionErrors(spanTrialsRef.current).map(p => p.errorRate)
      },
      trials: [],
      spanTrials: spanTrialsRef.current
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
  const normKey = `corsi_blocks_${mode}`;
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
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Task:</span>
          <span className="px-3 py-1 bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan text-xs font-mono font-semibold rounded-full capitalize">
            Corsi Spatial ({mode})
          </span>
        </div>
      </div>

      {/* Intro / Idle */}
      {gameState === 'idle' && (
        <div className="w-full max-w-md bg-surface border border-surface-border rounded-2xl p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan mb-6">
            <Grid className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Corsi Block-Tapping</h2>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            Standardized visuospatial working memory test. Watch the spatial sequence illuminate across 9 irregular blocks, then tap them in order.
          </p>

          <div className="grid grid-cols-2 gap-2 w-full mb-6 bg-surface-subtle p-1.5 rounded-xl border border-surface-border">
            {(['forward', 'backward'] as CorsiMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold transition-all capitalize ${
                  mode === m
                    ? 'bg-zinc-800 text-accent-cyan shadow-sm border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {m} Span
              </button>
            ))}
          </div>

          <div className="p-3 bg-surface-subtle border border-surface-border rounded-xl text-left text-xs text-zinc-400 mb-8 w-full leading-relaxed">
            {mode === 'forward' ? '• Tap the blocks in the EXACT forward order shown.' : '• Tap the blocks in REVERSE chronological order (last block first).'}
          </div>

          <button
            onClick={startTest}
            className="w-full py-4 bg-accent-cyan hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl transition-all glow-cyan flex items-center justify-center gap-2 text-base"
          >
            <Play className="w-5 h-5 fill-current" />
            Start Spatial Assessment
          </button>
        </div>
      )}

      {/* Active Presentation or Tapping Stage */}
      {(gameState === 'presenting' || gameState === 'tapping' || gameState === 'feedback') && (
        <div className="w-full flex flex-col items-center">
          <div className="w-full max-w-lg flex items-center justify-between text-xs font-mono text-zinc-400 mb-4">
            <span>Span: <strong className="text-zinc-200">{currentSpan}</strong> (Trial {trialInSpan} of 2)</span>
            <span className="text-accent-cyan font-semibold uppercase">
              {gameState === 'presenting' ? 'Memorize Sequence' : gameState === 'tapping' ? 'Tap Sequence' : 'Validating...'}
            </span>
          </div>

          {gameState === 'feedback' && lastFeedback && (
            <div className={`w-full max-w-lg p-3 mb-4 rounded-xl border text-xs font-mono text-center transition-all ${
              lastFeedback.correct
                ? 'bg-accent-emerald/10 border-accent-emerald/30 text-accent-emerald'
                : 'bg-accent-rose/10 border-accent-rose/30 text-accent-rose'
            }`}>
              {lastFeedback.correct ? 'Sequence Correct! Increasing Span...' : 'Sequence Incorrect.'}
            </div>
          )}

          {/* Kessels Spatial Board with Responsive Aspect-Ratio Lock */}
          <div className="relative w-full max-w-lg aspect-[4/3] bg-surface border border-surface-border rounded-2xl shadow-2xl p-4 overflow-hidden mb-6 select-none">
            {KESSELS_CORSI_BLOCKS.map(block => {
              const isIlluminated = illuminatedBlockId === block.id;
              const isJustTapped = justTappedBlockId === block.id;

              return (
                <button
                  key={block.id}
                  disabled={gameState !== 'tapping'}
                  onClick={() => handleBlockTap(block.id)}
                  style={{
                    left: `${block.x * 82 + 5}%`,
                    top: `${block.y * 78 + 6}%`
                  }}
                  className={`absolute w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border-2 transition-all duration-100 flex items-center justify-center font-mono font-bold text-sm sm:text-base ${
                    isIlluminated
                      ? 'bg-accent-cyan border-white text-zinc-950 glow-cyan scale-110 shadow-2xl z-20'
                      : isJustTapped
                      ? 'bg-zinc-700 border-accent-cyan text-accent-cyan scale-95 shadow-md z-10'
                      : 'bg-surface-subtle border-zinc-800 hover:border-zinc-600 text-zinc-500'
                  } active:scale-95 disabled:cursor-default`}
                >
                  <span className="text-[11px] font-mono text-zinc-500 opacity-40 pointer-events-none select-none">
                    {block.id}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-xs font-mono text-zinc-400">
            {gameState === 'tapping' ? (
              <span>
                Tapped <strong className="text-accent-cyan">{userTaps.length}</strong> of {targetSequenceRef.current.length} &bull; Click blocks or press keys <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300">1–9</kbd>
              </span>
            ) : (
              'Standardized Kessels (2000) Geometry'
            )}
          </div>
        </div>
      )}

      {/* Summary Stage */}
      {gameState === 'summary' && (
        <div className="w-full max-w-lg bg-surface border border-surface-border rounded-2xl p-8 text-center flex flex-col items-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-1">Spatial Assessment Complete</h2>
          <p className="text-zinc-400 text-xs font-mono mb-6">Corsi Block-Tapping ({mode})</p>

          <div className="grid grid-cols-2 gap-4 w-full mb-6">
            <div className="p-4 bg-surface-subtle border border-surface-border rounded-xl">
              <span className="text-xs text-zinc-400 block mb-1">Max Spatial Span</span>
              <span className="text-3xl font-bold font-mono text-accent-cyan">{finalSpan}</span>
              <span className="text-xs text-zinc-500 block mt-1">blocks</span>
            </div>
            <div className="p-4 bg-surface-subtle border border-surface-border rounded-xl">
              <span className="text-xs text-zinc-400 block mb-1">Adult Percentile</span>
              <span className="text-3xl font-bold font-mono text-accent-emerald">{percentile}th</span>
              <span className="text-xs text-zinc-500 block mt-1">Kessels Norms</span>
            </div>
          </div>

          <div className="w-full p-4 bg-surface-subtle border border-surface-border rounded-xl text-xs text-zinc-400 text-left mb-8 space-y-1">
            <p>• <strong>Average Adult Spatial Span</strong>: 6.2 blocks (Forward), 5.6 blocks (Backward).</p>
            <p>• Spatial span evaluates the capacity of your right-hemisphere frontoparietal sketchpad network.</p>
          </div>

          {onComplete ? (
            <button
              onClick={handleContinueProtocol}
              className="w-full py-4 bg-accent-cyan hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl transition-all glow-cyan flex items-center justify-center gap-2 text-sm mb-3"
            >
              Continue Protocol <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={startTest}
              className="w-full py-4 bg-accent-cyan hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl transition-all glow-cyan flex items-center justify-center gap-2 text-sm mb-3"
            >
              <RotateCcw className="w-4 h-4" /> Retest Spatial
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
