import React from 'react';
import { TaskType, UserCognitiveProfile } from '../../types/cognitive';
import { Play, Sparkles, Brain, Clock, Grid, Award, Layers, Calculator, ChevronRight } from 'lucide-react';

interface DashboardProps {
  profile: UserCognitiveProfile;
  onStartProtocol: () => void;
  onLaunchTask: (task: TaskType) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  profile,
  onStartProtocol,
  onLaunchTask
}) => {
  const tasks: {
    type: TaskType;
    title: string;
    sub: string;
    bestLabel: string;
    bestValue: string | number;
    color: string;
    icon: React.ReactNode;
  }[] = [
    {
      type: 'dual_n_back',
      title: 'Dual N-Back',
      sub: 'Audio-Visual Executive Updating & Lure Inhibition',
      bestLabel: 'Current Level',
      bestValue: `N = ${profile.baselines.dualNBackLevel}`,
      color: 'border-accent-cyan/30 text-accent-cyan',
      icon: <Brain className="w-5 h-5" />
    },
    {
      type: 'digit_span',
      title: 'WAIS-IV Digit Span',
      sub: 'Phonological Buffer & Ascending Sequence Sort',
      bestLabel: 'Max Span',
      bestValue: `${profile.baselines.digitSpanForward} digits`,
      color: 'border-accent-violet/30 text-accent-violet',
      icon: <Award className="w-5 h-5" />
    },
    {
      type: 'corsi_blocks',
      title: 'Corsi Block-Tapping',
      sub: 'Visuospatial Sketchpad (Kessels Standardized)',
      bestLabel: 'Max Spatial',
      bestValue: `${profile.baselines.corsiSpanForward} blocks`,
      color: 'border-accent-cyan/30 text-accent-cyan',
      icon: <Grid className="w-5 h-5" />
    },
    {
      type: 'operation_span',
      title: 'Automated O-Span',
      sub: 'Complex Working Memory Under Speed-Gated Load',
      bestLabel: 'Absolute Score',
      bestValue: `${profile.baselines.aospanAbsolute} pts`,
      color: 'border-accent-amber/30 text-accent-amber',
      icon: <Calculator className="w-5 h-5" />
    },
    {
      type: 'keep_track',
      title: 'Keep Track Task',
      sub: 'Selective Memory Overwrite & Semantic Updating',
      bestLabel: 'Target Load',
      bestValue: '3-4 Cats',
      color: 'border-accent-emerald/30 text-accent-emerald',
      icon: <Layers className="w-5 h-5" />
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Hero Section: Daily Protocol Callout & WMC Composite Index */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Protocol Hero Card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-surface to-zinc-900 border border-surface-border rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-accent-cyan/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan text-xs font-mono font-semibold rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Recommended Routine
              </span>
              <span className="text-xs text-zinc-500 font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> 12 Minutes
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 mb-2">
              Today's Working Memory Protocol
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xl mb-6">
              A scientifically curated cognitive routine covering <strong className="text-zinc-200">Phonological Activation</strong>, <strong className="text-zinc-200">Spatial Coordination</strong>, and <strong className="text-zinc-200">Deep Executive Updating</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <button
              onClick={onStartProtocol}
              className="py-4 px-8 bg-accent-cyan hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl transition-all glow-cyan flex items-center justify-center gap-2 text-base"
            >
              <Play className="w-5 h-5 fill-current" />
              Start Daily Protocol
            </button>
            <span className="text-xs text-zinc-500 font-mono text-center sm:text-left">
              Streak active: {profile.currentStreakDays} days trained
            </span>
          </div>
        </div>

        {/* Composite WMC Score Gauge */}
        <div className="bg-surface border border-surface-border rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Cognitive Composite
              </span>
              <Brain className="w-4 h-4 text-accent-cyan" />
            </div>
            <div className="text-5xl font-extrabold font-mono text-zinc-100 mb-1">
              {profile.baselines.compositeWmcIndex}
            </div>
            <span className="text-xs font-mono text-accent-cyan">
              Working Memory Capacity (CWMI)
            </span>
            <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
              Standardized across your verbal, spatial, and updating test baselines (Population Mean = 100, SD = 15).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-surface-border mt-4 text-xs font-mono">
            <div>
              <span className="text-zinc-500 block">Total Sessions</span>
              <strong className="text-zinc-200 text-sm">{profile.totalSessionsCompleted}</strong>
            </div>
            <div>
              <span className="text-zinc-500 block">Training Time</span>
              <strong className="text-zinc-200 text-sm">{profile.totalTrainingTimeMinutes}m</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Task Sandbox Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            Individual Cognitive Drills <span className="text-xs font-mono text-zinc-500 font-normal">Free Practice & Benchmarks</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map(t => (
            <div
              key={t.type}
              onClick={() => onLaunchTask(t.type)}
              className="group bg-surface hover:bg-zinc-800/80 border border-surface-border hover:border-zinc-600 rounded-2xl p-5 cursor-pointer transition-all shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-surface-subtle border ${t.color} flex items-center justify-center`}>
                    {t.icon}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">{t.bestLabel}</span>
                    <span className="text-xs font-mono font-bold text-zinc-200">{t.bestValue}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-zinc-100 group-hover:text-accent-cyan transition-colors mb-1">
                  {t.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  {t.sub}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-surface-border/50 text-xs font-mono text-zinc-400 group-hover:text-zinc-200">
                <span>Launch Drill</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-zinc-500 group-hover:text-accent-cyan" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
