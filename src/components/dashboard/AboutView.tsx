import React from 'react';
import { BookOpen, ShieldCheck, Keyboard, Brain, Activity } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Title */}
      <div className="pb-6 border-b border-surface-border">
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
          <BookOpen className="w-6 h-6 text-accent-cyan" />
          Neurocognitive Science & Operator's Manual
        </h1>
        <p className="text-zinc-400 text-xs font-mono mt-1">
          Theoretical architecture, transfer mechanisms, and keyboard reference.
        </p>
      </div>

      {/* 3 Core Systems */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-surface border border-surface-border rounded-2xl">
          <Brain className="w-6 h-6 text-accent-cyan mb-3" />
          <h3 className="font-bold text-sm text-zinc-100 mb-1">Central Executive (dlPFC)</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Trained via <strong>Dual N-Back</strong> and <strong>AOSPAN</strong>. Exercises goal maintenance under proactive interference and active unbinding of stale memory traces.
          </p>
        </div>

        <div className="p-5 bg-surface border border-surface-border rounded-2xl">
          <Activity className="w-6 h-6 text-accent-violet mb-3" />
          <h3 className="font-bold text-sm text-zinc-100 mb-1">Phonological Loop</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Trained via <strong>Digit Span</strong> (Forward, Backward, Ascending). Exercises subvocal acoustic rehearsal and executive mental sequence re-indexing.
          </p>
        </div>

        <div className="p-5 bg-surface border border-surface-border rounded-2xl">
          <ShieldCheck className="w-6 h-6 text-accent-emerald mb-3" />
          <h3 className="font-bold text-sm text-zinc-100 mb-1">Visuospatial Sketchpad</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Trained via <strong>Corsi Block-Tapping</strong>. Exercises right-hemisphere frontoparietal spatial coordinate retention and trajectory reconstruction.
          </p>
        </div>
      </div>

      {/* Keyboard Controls Reference */}
      <div className="p-6 bg-surface border border-surface-border rounded-2xl shadow-xl">
        <h3 className="text-base font-bold text-zinc-100 mb-4 flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-accent-cyan" />
          Ergonomic Keyboard Shortcuts
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 bg-surface-subtle border border-surface-border rounded-xl space-y-2">
            <span className="text-accent-cyan font-bold block mb-1">Dual N-Back</span>
            <div className="flex justify-between">
              <span className="text-zinc-400">Visual Match:</span>
              <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200">A / ←</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Audio Match:</span>
              <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200">L / →</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Dual Match:</span>
              <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200">A + L</kbd>
            </div>
          </div>

          <div className="p-3 bg-surface-subtle border border-surface-border rounded-xl space-y-2">
            <span className="text-accent-violet font-bold block mb-1">Digit Span</span>
            <div className="flex justify-between">
              <span className="text-zinc-400">Number Input:</span>
              <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200">1 - 9 / Numpad</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Backspace:</span>
              <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200">Backspace</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Submit Sequence:</span>
              <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200">Enter</kbd>
            </div>
          </div>

          <div className="p-3 bg-surface-subtle border border-surface-border rounded-xl space-y-2">
            <span className="text-accent-amber font-bold block mb-1">Automated O-Span</span>
            <div className="flex justify-between">
              <span className="text-zinc-400">Math True:</span>
              <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200">T / 1 / ←</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Math False:</span>
              <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200">F / 2 / →</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Letter Recall:</span>
              <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200">F,H,J.. / Enter</kbd>
            </div>
          </div>

          <div className="p-3 bg-surface-subtle border border-surface-border rounded-xl space-y-2">
            <span className="text-accent-emerald font-bold block mb-1">Corsi Blocks</span>
            <div className="flex justify-between">
              <span className="text-zinc-400">Block Tapping:</span>
              <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200">1 - 9 / Numpad</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Mouse / Touch:</span>
              <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200">Tap Block</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Cancel / Exit:</span>
              <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200">Escape</kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Scientific Invariants & References */}
      <div className="p-6 bg-surface border border-surface-border rounded-2xl text-xs space-y-3 text-zinc-400 leading-relaxed">
        <h4 className="font-bold text-zinc-200 text-sm">Scientific Citations & Primary Literature</h4>
        <p>
          1. <strong>Jaeggi, S. M., et al. (2008)</strong>. <em>Improving fluid intelligence with training on working memory</em>. PNAS, 105(19), 6829–6833.
        </p>
        <p>
          2. <strong>Unsworth, N., et al. (2005)</strong>. <em>An automated version of the operation span task</em>. Behavior Research Methods, 37(3), 498–505.
        </p>
        <p>
          3. <strong>Kessels, R. P., et al. (2000)</strong>. <em>Neuropsychological assessment of visuospatial memory: An overview of the Corsi Block-Tapping Task</em>. Journal of Clinical and Experimental Neuropsychology, 22(1), 114–124.
        </p>
        <p>
          4. <strong>Wechsler, D. (2008)</strong>. <em>Wechsler Adult Intelligence Scale – Fourth Edition (WAIS-IV)</em>. San Antonio, TX: Pearson.
        </p>
      </div>
    </div>
  );
};
