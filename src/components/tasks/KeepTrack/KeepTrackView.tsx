import React, { useState, useEffect, useRef } from 'react';
import { generateKeepTrackTrial, KeepTrackTrialData, CATEGORIES } from './keepTrackLogic';
import { timingEngine } from '../../../services/timingEngine';
import { audioEngine } from '../../../services/audioEngine';
import { storageService } from '../../../services/storageService';
import { SessionRecord } from '../../../types/cognitive';
import { ArrowLeft, ArrowRight, Play, RotateCcw, CheckCircle2, Layers, Check, X } from 'lucide-react';

interface KeepTrackViewProps {
  initialTargetCount?: number;
  onComplete?: (record: SessionRecord) => void;
  onExit?: () => void;
}

export const KeepTrackView: React.FC<KeepTrackViewProps> = ({ initialTargetCount, onComplete, onExit }) => {
  const [targetCount, setTargetCount] = useState<number>(initialTargetCount ?? 3);
  const [gameState, setGameState] = useState<'idle' | 'running' | 'recall' | 'summary'>('idle');
  const [trialData, setTrialData] = useState<KeepTrackTrialData | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [scoreResult, setScoreResult] = useState<{ correctCount: number; total: number } | null>(null);

  const cancelTimerRef = useRef<(() => void) | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const lastSessionRecordRef = useRef<SessionRecord | null>(null);

  useEffect(() => {
    return () => {
      if (cancelTimerRef.current) cancelTimerRef.current();
    };
  }, []);

  const startTest = async () => {
    await audioEngine.initialize();
    const data = generateKeepTrackTrial(targetCount, 18);
    setTrialData(data);
    setUserAnswers({});
    setCurrentWordIndex(0);
    setGameState('running');
    sessionStartTimeRef.current = performance.now();

    let idx = 0;
    const playStream = () => {
      if (idx >= data.wordStream.length) {
        setActiveWord(null);
        cancelTimerRef.current = timingEngine.schedule(500, () => {
          setGameState('recall');
          audioEngine.playFeedback('complete');
        });
        return;
      }

      const item = data.wordStream[idx];
      setActiveWord(item.word);
      setCurrentWordIndex(idx + 1);
      audioEngine.playTone(600, 0.08, 'sine');

      // 1200ms display
      cancelTimerRef.current = timingEngine.schedule(1200, () => {
        setActiveWord(null);
        // 300ms blank
        cancelTimerRef.current = timingEngine.schedule(300, () => {
          idx += 1;
          playStream();
        });
      });
    };

    cancelTimerRef.current = timingEngine.schedule(1000, () => {
      playStream();
    });
  };

  const handleSelectAnswer = (category: string, exemplar: string) => {
    setUserAnswers(prev => ({ ...prev, [category]: exemplar }));
  };

  const handleSubmitRecall = () => {
    if (!trialData) return;

    let correct = 0;
    for (const cat of trialData.targetCategories) {
      if (userAnswers[cat]?.toLowerCase() === trialData.expectedAnswers[cat]?.toLowerCase()) {
        correct += 1;
      }
    }

    setScoreResult({ correctCount: correct, total: trialData.targetCategories.length });
    setGameState('summary');
    audioEngine.playFeedback(correct === trialData.targetCategories.length ? 'complete' : 'tick');

    const durationSeconds = Math.round((performance.now() - sessionStartTimeRef.current) / 1000);
    const accuracy = (correct / trialData.targetCategories.length) * 100;

    const record: SessionRecord = {
      id: crypto.randomUUID(),
      timestampIso: new Date().toISOString(),
      epochMs: Date.now(),
      taskType: 'keep_track',
      mode: `${targetCount}_categories`,
      level: targetCount,
      totalTrials: trialData.targetCategories.length,
      durationSeconds,
      metrics: {
        accuracyPercent: Number(accuracy.toFixed(1)),
        hits: correct,
        misses: trialData.targetCategories.length - correct,
        falseAlarms: 0,
        correctRejections: 0,
        dPrime: 0,
        beta: 0,
        meanReactionTimeMs: 0,
        medianReactionTimeMs: 0,
        rtStandardDeviationMs: 0
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
          <span className="px-3 py-1 bg-accent-emerald/10 border border-accent-emerald/30 text-accent-emerald text-xs font-mono font-semibold rounded-full">
            Keep Track ({targetCount} Categories)
          </span>
        </div>
      </div>

      {/* Idle / Options */}
      {gameState === 'idle' && (
        <div className="w-full max-w-md bg-surface border border-surface-border rounded-2xl p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-accent-emerald/10 border border-accent-emerald/30 flex items-center justify-center text-accent-emerald mb-6">
            <Layers className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Keep Track Task</h2>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            Miyake et al. executive updating drill. A rapid stream of words flashes. Continuously update your mental slate to hold only the <strong>most recent word</strong> for each target category.
          </p>

          <div className="w-full mb-6 text-left">
            <label className="text-xs font-mono text-zinc-400 block mb-2">Number of Target Categories:</label>
            <div className="grid grid-cols-3 gap-2">
              {[2, 3, 4].map(num => (
                <button
                  key={num}
                  onClick={() => setTargetCount(num)}
                  className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold border transition-all ${
                    targetCount === num
                      ? 'bg-zinc-800 text-accent-emerald border-accent-emerald'
                      : 'bg-surface-subtle border-surface-border text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {num} Targets
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startTest}
            className="w-full py-4 bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-all glow-emerald flex items-center justify-center gap-2 text-base"
          >
            <Play className="w-5 h-5 fill-current" />
            Start Updating Drill
          </button>
        </div>
      )}

      {/* Running Stream */}
      {gameState === 'running' && trialData && (
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="w-full flex items-center justify-between text-xs font-mono text-zinc-400 mb-6">
            <span>Word {currentWordIndex} of {trialData.wordStream.length}</span>
            <span className="text-accent-emerald animate-pulse">Monitoring...</span>
          </div>

          {/* Center Word Flash Card */}
          <div className="w-full h-48 rounded-3xl bg-surface border-2 border-surface-border flex items-center justify-center shadow-2xl mb-8">
            <span className="text-4xl sm:text-5xl font-bold text-zinc-100 transition-all tracking-wide">
              {activeWord ?? ''}
            </span>
          </div>

          {/* Bottom Pinned Target Categories */}
          <div className="w-full">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block mb-2 text-center">
              Active Target Categories
            </span>
            <div className="flex flex-wrap gap-2 justify-center">
              {trialData.targetCategories.map(cat => (
                <span
                  key={cat}
                  className="px-4 py-2 bg-zinc-800/80 border border-accent-emerald/40 text-accent-emerald font-mono font-semibold text-xs rounded-xl shadow-sm"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recall Stage */}
      {gameState === 'recall' && trialData && (
        <div className="w-full max-w-lg bg-surface border border-surface-border rounded-2xl p-8 flex flex-col items-center">
          <h2 className="text-xl font-bold mb-2 text-center">Recall Final Exemplars</h2>
          <p className="text-zinc-400 text-xs mb-6 text-center">
            Select the LAST word shown for each designated target category:
          </p>

          <div className="w-full space-y-4 mb-8">
            {trialData.targetCategories.map(cat => {
              const catObj = CATEGORIES.find(c => c.name === cat)!;
              return (
                <div key={cat} className="p-4 bg-surface-subtle border border-surface-border rounded-xl">
                  <span className="text-xs font-mono font-bold text-accent-emerald uppercase block mb-3">
                    Category: {cat}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {catObj.exemplars.map(ex => {
                      const isSelected = userAnswers[cat] === ex;
                      return (
                        <button
                          key={ex}
                          onClick={() => handleSelectAnswer(cat, ex)}
                          className={`py-2 px-2 rounded-lg text-xs font-mono font-medium border transition-all ${
                            isSelected
                              ? 'bg-accent-emerald/20 border-accent-emerald text-accent-emerald font-bold'
                              : 'bg-surface border-surface-border text-zinc-300 hover:border-zinc-500'
                          }`}
                        >
                          {ex}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSubmitRecall}
            disabled={Object.keys(userAnswers).length < trialData.targetCategories.length}
            className="w-full py-4 bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-all glow-emerald text-sm disabled:opacity-50"
          >
            Submit Updating Recall
          </button>
        </div>
      )}

      {/* Summary Stage */}
      {gameState === 'summary' && scoreResult && trialData && (
        <div className="w-full max-w-lg bg-surface border border-surface-border rounded-2xl p-8 text-center flex flex-col items-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-accent-emerald/10 border border-accent-emerald/30 flex items-center justify-center text-accent-emerald mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-1">Updating Assessment Complete</h2>
          <p className="text-zinc-400 text-xs font-mono mb-6">Keep Track ({targetCount} Categories)</p>

          <div className="p-4 bg-surface-subtle border border-surface-border rounded-xl w-full mb-6">
            <span className="text-xs text-zinc-400 block mb-1">Categories Correctly Updated</span>
            <span className="text-3xl font-bold font-mono text-accent-emerald">
              {scoreResult.correctCount} / {scoreResult.total}
            </span>
          </div>

          {/* Breakdown per category */}
          <div className="w-full space-y-2 mb-8 text-left text-xs font-mono">
            {trialData.targetCategories.map(cat => {
              const expected = trialData.expectedAnswers[cat];
              const answered = userAnswers[cat];
              const isMatch = expected?.toLowerCase() === answered?.toLowerCase();
              return (
                <div key={cat} className="p-3 bg-surface-subtle border border-surface-border rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-zinc-300 font-semibold">{cat}:</span>{' '}
                    <span className={isMatch ? 'text-accent-emerald' : 'text-accent-rose'}>
                      {answered ?? 'None'}
                    </span>
                    {!isMatch && (
                      <span className="text-zinc-500 ml-2">(Correct: {expected})</span>
                    )}
                  </div>
                  {isMatch ? <Check className="w-4 h-4 text-accent-emerald" /> : <X className="w-4 h-4 text-accent-rose" />}
                </div>
              );
            })}
          </div>

          {onComplete ? (
            <button
              onClick={handleContinueProtocol}
              className="w-full py-4 bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-all glow-emerald flex items-center justify-center gap-2 text-sm mb-3"
            >
              Continue Protocol <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                onClick={startTest}
                className="py-3 px-4 bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-all glow-emerald flex items-center justify-center gap-2 text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Retest Updating
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
