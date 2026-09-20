import React, { useState } from 'react';
import { TaskType, SessionRecord } from '../../types/cognitive';
import { DigitSpanView } from '../tasks/DigitSpan/DigitSpanView';
import { CorsiView } from '../tasks/CorsiBlocks/CorsiView';
import { DualNBackView } from '../tasks/DualNBack/DualNBackView';
import { audioEngine } from '../../services/audioEngine';
import { storageService } from '../../services/storageService';
import { CheckCircle2, ArrowRight, Zap, Check } from 'lucide-react';

interface DailyProtocolRunnerProps {
  onExit: () => void;
}

export const DailyProtocolRunner: React.FC<DailyProtocolRunnerProps> = ({ onExit }) => {
  // Protocol sequence: 3 stages
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [completedRecords, setCompletedRecords] = useState<SessionRecord[]>([]);

  const stages: {
    taskType: TaskType;
    title: string;
    description: string;
    durationEstimate: string;
  }[] = [
    {
      taskType: 'digit_span',
      title: 'Stage 1: Phonological Warmup',
      description: 'WAIS-IV Ascending Digit Span to activate echoic buffer and executive re-indexing.',
      durationEstimate: '3 min'
    },
    {
      taskType: 'corsi_blocks',
      title: 'Stage 2: Visuospatial Sketchpad',
      description: 'Kessels Corsi Block-Tapping to engage right-hemisphere spatial coordinates.',
      durationEstimate: '3 min'
    },
    {
      taskType: 'dual_n_back',
      title: 'Stage 3: Deep Executive Updating',
      description: 'Dual N-Back with proactive interference lures for prefrontal cortex resistance.',
      durationEstimate: '6 min'
    }
  ];

  const handleTaskComplete = (record: SessionRecord) => {
    const updated = [...completedRecords, record];
    setCompletedRecords(updated);
    audioEngine.playFeedback('complete');

    if (currentStage + 1 < stages.length) {
      setIsTransitioning(true);
    } else {
      // Entire protocol complete
      setCurrentStage(stages.length);
      setIsTransitioning(false);
    }
  };

  const proceedToNextStage = () => {
    setIsTransitioning(false);
    setCurrentStage(prev => prev + 1);
  };

  // If in active task
  if (currentStage < stages.length && !isTransitioning) {
    const currentTask = stages[currentStage].taskType;

    return (
      <div className="w-full">
        {/* Top Protocol Status Bar */}
        <div className="bg-surface border-b border-surface-border py-2 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">
              Daily Protocol &bull; <strong className="text-zinc-200">Step {currentStage + 1} of {stages.length}</strong>
            </span>
            <div className="flex items-center gap-1">
              {stages.map((st, i) => (
                <div
                  key={st.taskType}
                  className={`w-6 h-1.5 rounded-full transition-all ${
                    i < currentStage
                      ? 'bg-accent-emerald'
                      : i === currentStage
                      ? 'bg-accent-cyan animate-pulse'
                      : 'bg-zinc-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {currentTask === 'digit_span' && (
          <DigitSpanView
            initialMode="ascending"
            onComplete={handleTaskComplete}
            onExit={onExit}
          />
        )}
        {currentTask === 'corsi_blocks' && (
          <CorsiView
            initialMode="forward"
            onComplete={handleTaskComplete}
            onExit={onExit}
          />
        )}
        {currentTask === 'dual_n_back' && (
          <DualNBackView
            initialN={2}
            onComplete={handleTaskComplete}
            onExit={onExit}
          />
        )}
      </div>
    );
  }

  // Inter-Stage Rest / Transition Screen
  if (isTransitioning) {
    const nextStage = stages[currentStage + 1];

    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-accent-emerald/10 border border-accent-emerald/30 flex items-center justify-center text-accent-emerald mb-6">
          <Check className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-1">Stage Completed!</h2>
        <p className="text-zinc-400 text-xs font-mono mb-8">Take a deep breath and center your focus.</p>

        <div className="w-full p-4 bg-surface border border-surface-border rounded-xl text-left mb-8">
          <span className="text-xs font-mono uppercase text-accent-cyan font-bold block mb-1">
            Up Next: Stage {currentStage + 2} of {stages.length}
          </span>
          <h3 className="text-base font-bold text-zinc-100 mb-1">{nextStage.title}</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">{nextStage.description}</p>
        </div>

        <button
          onClick={proceedToNextStage}
          className="w-full py-4 bg-accent-cyan hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl transition-all glow-cyan flex items-center justify-center gap-2 text-base"
        >
          Begin Next Stage <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Final Protocol Summary Screen
  const profile = storageService.getProfile();

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center flex flex-col items-center">
      <div className="w-20 h-20 rounded-3xl bg-accent-cyan/10 border-2 border-accent-cyan/30 flex items-center justify-center text-accent-cyan glow-cyan mb-6">
        <Zap className="w-10 h-10 fill-current" />
      </div>
      <h1 className="text-3xl font-bold mb-2">Daily Protocol Complete!</h1>
      <p className="text-zinc-400 text-sm mb-8">
        You successfully completed all 3 neurocognitive training modules for today.
      </p>

      {/* Composite Score Card */}
      <div className="w-full bg-surface border border-surface-border rounded-2xl p-6 mb-8 text-center">
        <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-1">
          Working Memory Capacity Index
        </span>
        <div className="text-5xl font-extrabold font-mono text-accent-cyan mb-2">
          {profile.baselines.compositeWmcIndex}
        </div>
        <span className="text-xs font-mono text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/20 px-2.5 py-1 rounded-full">
          Normalized Scale (Mean 100, SD 15)
        </span>
      </div>

      <div className="w-full space-y-3 mb-8 text-left">
        {completedRecords.map((rec) => (
          <div key={rec.id} className="p-3 bg-surface border border-surface-border rounded-xl flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
              <span className="text-zinc-300 font-semibold capitalize">{rec.taskType.replace(/_/g, ' ')}</span>
            </div>
            <span className="text-zinc-400">Level/Span: <strong className="text-zinc-100">{rec.level}</strong></span>
          </div>
        ))}
      </div>

      <button
        onClick={onExit}
        className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold rounded-xl transition-all border border-zinc-700 text-sm"
      >
        Return to Lab Dashboard
      </button>
    </div>
  );
};
