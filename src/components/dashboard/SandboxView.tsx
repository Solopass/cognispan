import React, { useState } from 'react';
import { TaskType } from '../../types/cognitive';
import { audioEngine } from '../../services/audioEngine';
import { Brain, Award, Grid, Calculator, Layers, Play, Sliders, Music, Mic } from 'lucide-react';

interface SandboxViewProps {
  onLaunchCustomTask: (task: TaskType, options?: Record<string, unknown>) => void;
}

export const SandboxView: React.FC<SandboxViewProps> = ({ onLaunchCustomTask }) => {
  const [selectedTask, setSelectedTask] = useState<TaskType>('dual_n_back');

  // Custom configuration states
  const [nLevel, setNLevel] = useState<number>(2);
  const [audioMode, setAudioMode] = useState<'voice' | 'pitch'>('voice');
  const [digitMode, setDigitMode] = useState<'forward' | 'backward' | 'ascending'>('forward');
  const [corsiMode, setCorsiMode] = useState<'forward' | 'backward'>('forward');
  const [targetCatCount, setTargetCatCount] = useState<number>(3);

  const handleLaunch = () => {
    audioEngine.setAudioMode(audioMode);
    onLaunchCustomTask(selectedTask, {
      nLevel,
      audioMode,
      digitMode,
      corsiMode,
      targetCatCount
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="pb-6 border-b border-surface-border">
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-accent-cyan" />
          Cognitive Sandbox Workbench
        </h1>
        <p className="text-zinc-400 text-xs font-mono mt-1">
          Custom parameters &bull; Experimental difficulty &bull; Targeted neurocognitive training
        </p>
      </div>

      {/* Task Selection Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <button
          onClick={() => setSelectedTask('dual_n_back')}
          className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-mono font-semibold transition-all ${
            selectedTask === 'dual_n_back'
              ? 'bg-zinc-800 border-accent-cyan text-accent-cyan shadow-lg'
              : 'bg-surface border-surface-border text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Brain className="w-4 h-4" /> Dual N-Back
        </button>

        <button
          onClick={() => setSelectedTask('digit_span')}
          className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-mono font-semibold transition-all ${
            selectedTask === 'digit_span'
              ? 'bg-zinc-800 border-accent-violet text-accent-violet shadow-lg'
              : 'bg-surface border-surface-border text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Award className="w-4 h-4" /> Digit Span
        </button>

        <button
          onClick={() => setSelectedTask('corsi_blocks')}
          className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-mono font-semibold transition-all ${
            selectedTask === 'corsi_blocks'
              ? 'bg-zinc-800 border-accent-cyan text-accent-cyan shadow-lg'
              : 'bg-surface border-surface-border text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Grid className="w-4 h-4" /> Corsi Blocks
        </button>

        <button
          onClick={() => setSelectedTask('operation_span')}
          className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-mono font-semibold transition-all ${
            selectedTask === 'operation_span'
              ? 'bg-zinc-800 border-accent-amber text-accent-amber shadow-lg'
              : 'bg-surface border-surface-border text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Calculator className="w-4 h-4" /> O-Span
        </button>

        <button
          onClick={() => setSelectedTask('keep_track')}
          className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-mono font-semibold transition-all ${
            selectedTask === 'keep_track'
              ? 'bg-zinc-800 border-accent-emerald text-accent-emerald shadow-lg'
              : 'bg-surface border-surface-border text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-4 h-4" /> Keep Track
        </button>
      </div>

      {/* Task Customization Card */}
      <div className="p-6 bg-surface border border-surface-border rounded-2xl shadow-xl space-y-6">
        {selectedTask === 'dual_n_back' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-zinc-100 mb-1">Dual N-Back Sandbox Setup</h3>
              <p className="text-xs text-zinc-400">Configure starting memory load and acoustic sensory channel.</p>
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-2">Starting N-Level (Memory Depth):</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => setNLevel(n)}
                    className={`flex-1 py-2.5 rounded-xl border font-mono font-bold text-xs transition-all ${
                      nLevel === n
                        ? 'bg-zinc-800 border-accent-cyan text-accent-cyan'
                        : 'bg-surface-subtle border-surface-border text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    N={n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-2">Audio Stimulus Channel:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setAudioMode('voice')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    audioMode === 'voice'
                      ? 'bg-zinc-800 border-accent-cyan text-zinc-100'
                      : 'bg-surface-subtle border-surface-border text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    <Mic className="w-3.5 h-3.5 text-accent-cyan" /> Spoken Letters
                  </div>
                  <span className="text-[11px] text-zinc-500 block">Monotone consonants (C, H, K, L, Q, R, S, T)</span>
                </button>

                <button
                  onClick={() => setAudioMode('pitch')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    audioMode === 'pitch'
                      ? 'bg-zinc-800 border-accent-cyan text-zinc-100'
                      : 'bg-surface-subtle border-surface-border text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    <Music className="w-3.5 h-3.5 text-accent-cyan" /> Musical Tones (0ms Latency)
                  </div>
                  <span className="text-[11px] text-zinc-500 block">C4-C5 diatonic synthesizer pitches</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedTask === 'digit_span' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-zinc-100 mb-1">WAIS-IV Digit Span Setup</h3>
              <p className="text-xs text-zinc-400">Choose phonological retention and executive manipulation modality.</p>
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-2">Recall Protocol Mode:</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { mode: 'forward', label: 'Forward Span', desc: 'Direct echoic buffer playback' },
                  { mode: 'backward', label: 'Backward Span', desc: 'Reverse sequence manipulation' },
                  { mode: 'ascending', label: 'Ascending Sort', desc: 'Mental numeric sorting' }
                ].map(item => (
                  <button
                    key={item.mode}
                    onClick={() => setDigitMode(item.mode as typeof digitMode)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      digitMode === item.mode
                        ? 'bg-zinc-800 border-accent-violet text-zinc-100'
                        : 'bg-surface-subtle border-surface-border text-zinc-400'
                    }`}
                  >
                    <span className="font-bold text-xs text-accent-violet block mb-1">{item.label}</span>
                    <span className="text-[11px] text-zinc-500 block">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTask === 'corsi_blocks' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-zinc-100 mb-1">Corsi Spatial Span Setup</h3>
              <p className="text-xs text-zinc-400">Standardized Kessels (2000) 9-point spatial layout.</p>
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-2">Direction of Recall:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCorsiMode('forward')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    corsiMode === 'forward'
                      ? 'bg-zinc-800 border-accent-cyan text-zinc-100'
                      : 'bg-surface-subtle border-surface-border text-zinc-400'
                  }`}
                >
                  <span className="font-bold text-xs text-accent-cyan block mb-1">Forward Spatial Path</span>
                  <span className="text-[11px] text-zinc-500 block">Tap blocks in exact chronological order</span>
                </button>
                <button
                  onClick={() => setCorsiMode('backward')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    corsiMode === 'backward'
                      ? 'bg-zinc-800 border-accent-cyan text-zinc-100'
                      : 'bg-surface-subtle border-surface-border text-zinc-400'
                  }`}
                >
                  <span className="font-bold text-xs text-accent-cyan block mb-1">Backward Spatial Path</span>
                  <span className="text-[11px] text-zinc-500 block">Reverse chronological path reconstruction</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedTask === 'operation_span' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-zinc-100 mb-1">Automated O-Span Setup</h3>
              <p className="text-xs text-zinc-400">
                Calibrates your personal arithmetic reaction time ($M + 2.5 \times SD$) then tests sets of 3 to 5 letters under strict speed gating.
              </p>
            </div>
            <div className="p-4 bg-surface-subtle border border-surface-border rounded-xl text-xs text-zinc-400 leading-relaxed">
              • <strong>Clinical Integrity Rule</strong>: Requires maintaining &ge; 85% arithmetic accuracy to avoid memory score invalidation.
            </div>
          </div>
        )}

        {selectedTask === 'keep_track' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-zinc-100 mb-1">Keep Track Category Updating Setup</h3>
              <p className="text-xs text-zinc-400">Select the number of simultaneous categories to update in real time.</p>
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-2">Simultaneous Target Categories:</label>
              <div className="grid grid-cols-3 gap-3">
                {[2, 3, 4].map(num => (
                  <button
                    key={num}
                    onClick={() => setTargetCatCount(num)}
                    className={`py-3 rounded-xl border font-mono font-bold text-xs transition-all ${
                      targetCatCount === num
                        ? 'bg-zinc-800 border-accent-emerald text-accent-emerald'
                        : 'bg-surface-subtle border-surface-border text-zinc-400'
                    }`}
                  >
                    {num} Categories
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleLaunch}
          className="w-full py-4 bg-accent-cyan hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl transition-all glow-cyan flex items-center justify-center gap-2 text-base"
        >
          <Play className="w-5 h-5 fill-current" />
          Launch Custom Sandbox Drill
        </button>
      </div>
    </div>
  );
};
