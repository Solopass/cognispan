import React, { useEffect, useState } from 'react';
import { timingEngine, TimingState } from '../../services/timingEngine';
import { PauseCircle } from 'lucide-react';

/**
 * Explains a paused trial.
 *
 * The timing engine stops the clock whenever the document is hidden, which is
 * correct for a timed experiment but silent: a task left mid-trial simply stops
 * moving, and there is nothing on screen to say why. This covers the task while
 * paused and counts the participant back in, so no stimulus lands the instant
 * they return.
 *
 * Rendered only while a task is running; pausing means nothing on a dashboard.
 */
export const PauseOverlay: React.FC = () => {
  const [state, setState] = useState<TimingState>(() => timingEngine.getState());

  useEffect(() => timingEngine.subscribe(setState), []);

  if (!state.paused) return null;

  const counting = state.resumingInSeconds !== null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-sm px-6 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan mb-6">
        <PauseCircle className="w-8 h-8" />
      </div>

      <h2 className="text-2xl font-bold text-zinc-100 mb-2">Paused</h2>

      {counting ? (
        <>
          <p className="text-zinc-400 text-sm max-w-sm">
            Timing stopped while this tab was in the background. Resuming in
          </p>
          <span className="text-6xl font-bold font-mono text-accent-cyan mt-4 tabular-nums">
            {state.resumingInSeconds}
          </span>
        </>
      ) : (
        <p className="text-zinc-400 text-sm max-w-sm">
          Timing is stopped while this tab is in the background. Return to this tab to continue
          where you left off — no trial is lost.
        </p>
      )}
    </div>
  );
};
