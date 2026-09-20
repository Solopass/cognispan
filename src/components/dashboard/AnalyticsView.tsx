import React, { useState } from 'react';
import { storageService } from '../../services/storageService';
import { calculateSerialPositionErrors } from '../../services/psychometrics';
import { calculateZScore } from '../../types/norms';
import { SessionRecord } from '../../types/cognitive';
import { protocolFromRecordMode } from '../tasks/OperationSpan/ospanProtocol';
import { Download, TrendingUp, Activity, Database, Trash2, ShieldAlert, Sparkles } from 'lucide-react';

/**
 * O-Span scores from different protocols are not comparable, so a history row
 * has to say which one it came from. The full assessment reports its absolute
 * score against the letters administered; a short practice run reports its
 * partial-credit unit, which is the scale-free measure and carries no
 * percentile claim.
 */
function describeOSpanSession(s: SessionRecord): string {
  const protocol = protocolFromRecordMode(s.mode);
  const score = s.metrics.aospanAbsoluteScore ?? s.level;

  if (protocol && !protocol.normReferenced) {
    const pcu = s.metrics.aospanPcuScore;
    return pcu !== undefined
      ? `PCU = ${pcu.toFixed(2)} (practice)`
      : `Score = ${score} (practice)`;
  }

  // Runs recorded before the protocol split stored no ceiling, and their set
  // plan is not recoverable. Show the bare score rather than pairing it with a
  // ceiling the run may never have had.
  const max = s.metrics.aospanMaxScore;

  return max ? `Score = ${score} / ${max}` : `Score = ${score}`;
}

export const AnalyticsView: React.FC = () => {
  const [sessions, setSessions] = useState(storageService.getSessions());
  const [profile, setProfile] = useState(storageService.getProfile());
  const [filterTask, setFilterTask] = useState<string>('all');
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);

  const refreshData = () => {
    setSessions(storageService.getSessions());
    setProfile(storageService.getProfile());
  };

  const handleLoadDemo = () => {
    storageService.loadDemoData();
    refreshData();
  };

  const filteredSessions = filterTask === 'all'
    ? sessions
    : sessions.filter(s => s.taskType === filterTask);

  const nBackSessions = sessions.filter(s => s.taskType === 'dual_n_back');
  const avgDPrime = nBackSessions.length > 0
    ? (nBackSessions.reduce((acc, s) => acc + s.metrics.dPrime, 0) / nBackSessions.length).toFixed(2)
    : '0.00';

  // Cognitive Domain Scores (relative to population mean = 100).
  // Standardized through the shared norm table rather than repeating its
  // constants here, so the two cannot drift apart.
  const domainIndex = (raw: number, normKey: string) =>
    Math.round(100 + calculateZScore(raw, normKey) * 15);

  const domainScores = [
    { name: 'Executive Updating', value: domainIndex(profile.baselines.dualNBackLevel, 'dual_n_back_level'), baseline: 'Jaeggi (2.6 N)' },
    { name: 'Verbal / Echoic', value: domainIndex(profile.baselines.digitSpanForward, 'digit_span_forward'), baseline: 'Typical adult (7.0 digits)' },
    { name: 'Visuospatial', value: domainIndex(profile.baselines.corsiSpanForward, 'corsi_blocks_forward'), baseline: 'Kessels (6.2 Blocks)' },
    { name: 'Complex Span', value: domainIndex(profile.baselines.aospanAbsolute, 'operation_span_absolute'), baseline: 'Unsworth (43.3 Pts)' },
  ];

  // Serial position curve, computed from the recall trials actually recorded
  // by the span tasks. Trials of different lengths are pooled by position.
  const spanTrials = sessions.flatMap(s => s.spanTrials ?? []);
  const serialPositions = calculateSerialPositionErrors(spanTrials);
  const serialCurve = serialPositions.map((p, i) => ({
    pos: p.position,
    errorRate: Math.round(p.errorRate * 100),
    label:
      i === 0
        ? `Position ${p.position} (Primacy)`
        : i === serialPositions.length - 1
        ? `Position ${p.position} (Recency)`
        : `Position ${p.position}`
  }));
  const serialTrialCount = spanTrials.length;
  const peakSerialError = serialCurve.reduce((m, c) => Math.max(m, c.errorRate), 0);

  const handleResetData = () => {
    storageService.clearAllData();
    setShowConfirmReset(false);
    refreshData();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Top Banner & Export Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            Working Memory Capacity Analytics
          </h1>
          <p className="text-zinc-400 text-xs font-mono mt-1">
            Local telemetry &bull; Longitudinal psychometrics &bull; Zero cloud tracking
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleLoadDemo}
            className="flex items-center gap-1.5 py-2 px-3 bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/30 rounded-xl text-xs font-mono text-accent-cyan transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> Sample Data
          </button>
          <button
            onClick={() => storageService.downloadExport('csv')}
            className="flex items-center gap-2 py-2 px-3.5 bg-surface hover:bg-zinc-800 border border-surface-border rounded-xl text-xs font-mono text-zinc-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={() => storageService.downloadExport('json')}
            className="flex items-center gap-2 py-2 px-3.5 bg-surface hover:bg-zinc-800 border border-surface-border rounded-xl text-xs font-mono text-zinc-200 transition-colors"
          >
            <Database className="w-3.5 h-3.5" /> Export JSON
          </button>
          <button
            onClick={() => setShowConfirmReset(true)}
            className="flex items-center gap-2 py-2 px-3 bg-surface hover:bg-rose-950/40 border border-surface-border hover:border-rose-800/50 rounded-xl text-xs font-mono text-zinc-400 hover:text-rose-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Aggregate Quantified-Self KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-surface border border-surface-border rounded-2xl">
          <span className="text-xs font-mono text-zinc-400 block mb-1">Composite WMC</span>
          <span className="text-3xl font-extrabold font-mono text-accent-cyan">
            {profile.baselines.compositeWmcIndex}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 block mt-1">Standardized (Mean 100)</span>
        </div>

        <div className="p-4 bg-surface border border-surface-border rounded-2xl">
          <span className="text-xs font-mono text-zinc-400 block mb-1">Highest N-Back</span>
          <span className="text-3xl font-extrabold font-mono text-accent-cyan">
            N = {profile.baselines.dualNBackLevel}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 block mt-1">Avg d': {avgDPrime}</span>
        </div>

        <div className="p-4 bg-surface border border-surface-border rounded-2xl">
          <span className="text-xs font-mono text-zinc-400 block mb-1">Max Verbal Span</span>
          <span className="text-3xl font-extrabold font-mono text-accent-violet">
            {profile.baselines.digitSpanForward}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 block mt-1">Digit span</span>
        </div>

        <div className="p-4 bg-surface border border-surface-border rounded-2xl">
          <span className="text-xs font-mono text-zinc-400 block mb-1">Max Spatial Span</span>
          <span className="text-3xl font-extrabold font-mono text-accent-emerald">
            {profile.baselines.corsiSpanForward}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 block mt-1">Kessels Blocks</span>
        </div>
      </div>

      {/* Domain Breakdown & Serial Position Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cognitive Domain Breakdown */}
        <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-zinc-100 mb-1">Cognitive Domain Breakdown</h3>
          <p className="text-xs text-zinc-400 font-mono mb-6">Standardized Index (Population Average = 100)</p>

          <div className="space-y-4">
            {domainScores.map(d => {
              const pct = Math.min(100, Math.max(10, (d.value / 150) * 100));
              return (
                <div key={d.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-200 font-semibold">{d.name}</span>
                    <span className="text-accent-cyan font-bold">{d.value}</span>
                  </div>
                  <div className="w-full h-2.5 bg-surface-subtle border border-surface-border rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-gradient-to-r from-accent-cyan to-accent-violet rounded-full transition-all duration-500"
                    />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 block">Norm: {d.baseline}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Serial Position Error Curve */}
        <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-zinc-100 mb-1">Serial Position Error Diagnostic</h3>
          <p className="text-xs text-zinc-400 font-mono mb-6">
            {serialTrialCount > 0
              ? `Your recall errors by position, pooled over ${serialTrialCount} span ${serialTrialCount === 1 ? 'trial' : 'trials'}`
              : 'Primacy effect vs Recency effect error frequency'}
          </p>

          {serialCurve.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center px-4 text-zinc-500 text-xs font-mono border-b border-surface-border">
              <Activity className="w-6 h-6 mb-3 text-zinc-600" />
              <span>No span trials recorded yet.</span>
              <span className="mt-1 text-zinc-600">
                Run Digit Span or Corsi Blocks to build your curve.
              </span>
            </div>
          ) : (
            <div className="h-44 flex items-end justify-between gap-3 px-2 border-b border-surface-border pb-2">
              {serialCurve.map(sc => {
                const scale = Math.max(40, peakSerialError);
                const barHeight = Math.max(15, (sc.errorRate / scale) * 140);
                return (
                  <div key={sc.pos} className="flex-1 flex flex-col items-center group relative">
                    <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-[10px] font-mono py-1 px-2 rounded border border-zinc-700 whitespace-nowrap pointer-events-none z-20">
                      {sc.label}: {sc.errorRate}% error
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 mb-1">{sc.errorRate}%</span>
                    <div
                      style={{ height: `${barHeight}px` }}
                      className="w-full rounded-t-md bg-accent-rose/70 group-hover:bg-accent-rose transition-colors"
                    />
                    <span className="text-[10px] font-mono text-zinc-500 mt-2">P{sc.pos}</span>
                  </div>
                );
              })}
            </div>
          )}
          <span className="text-[10px] font-mono text-zinc-500 block mt-3">
            {serialCurve.length === 0
              ? 'A typical curve dips at the first position (primacy rehearsal) and the last (recency echo), peaking in the middle.'
              : 'Longer trials contribute to the early positions only, so later positions rest on fewer observations.'}
          </span>
        </div>
      </div>

      {/* Visual Progression Trend Chart */}
      <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent-cyan" /> Longitudinal Performance Trend
            </h3>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">Chronological session levels</p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-zinc-500 text-xs font-mono">
            <Activity className="w-8 h-8 mb-2 opacity-40" />
            <p className="mb-3">No training sessions recorded yet.</p>
            <button
              onClick={handleLoadDemo}
              className="py-2 px-4 bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/30 text-accent-cyan rounded-xl transition-colors flex items-center gap-1.5 font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5" /> Load Sample Telemetry to Preview Charts
            </button>
          </div>
        ) : (
          <div className="h-48 w-full flex items-end gap-2 pt-8 pb-2 px-2 border-b border-surface-border overflow-x-auto">
            {sessions.slice(0, 24).reverse().map((s, idx) => {
              const maxH = 140;
              const height = Math.min(maxH, Math.max(20, (s.level / 9) * maxH));
              const color = s.taskType === 'dual_n_back' ? 'bg-accent-cyan' : s.taskType === 'digit_span' ? 'bg-accent-violet' : 'bg-accent-emerald';

              return (
                <div key={s.id} className="flex-1 min-w-[28px] max-w-[48px] flex flex-col items-center group relative">
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-zinc-100 text-[10px] font-mono py-1 px-2 rounded border border-zinc-700 pointer-events-none whitespace-nowrap z-20 shadow-lg">
                    {s.taskType.replace(/_/g, ' ')}: Level {s.level} ({s.metrics.accuracyPercent}%)
                  </div>

                  <span className="text-[10px] font-mono text-zinc-400 mb-1">{s.level}</span>
                  <div
                    style={{ height: `${height}px` }}
                    className={`w-full rounded-t-md ${color} opacity-80 group-hover:opacity-100 transition-all`}
                  />
                  <span className="text-[9px] font-mono text-zinc-500 mt-2 truncate max-w-full">
                    #{idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Session History Table */}
      <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-6 border-b border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-base font-bold text-zinc-100">Session History Log</h3>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">Filter:</span>
            <select
              value={filterTask}
              onChange={e => setFilterTask(e.target.value)}
              className="bg-surface-subtle border border-surface-border text-zinc-300 text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent-cyan"
            >
              <option value="all">All Tasks</option>
              <option value="dual_n_back">Dual N-Back</option>
              <option value="digit_span">Digit Span</option>
              <option value="corsi_blocks">Corsi Blocks</option>
              <option value="operation_span">Operation Span</option>
              <option value="keep_track">Keep Track</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-surface-subtle text-zinc-400 border-b border-surface-border">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Task</th>
                <th className="py-3 px-4">Level / Span</th>
                <th className="py-3 px-4">Accuracy</th>
                <th className="py-3 px-4">Key Metric</th>
                <th className="py-3 px-4">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    No sessions match filter.
                  </td>
                </tr>
              ) : (
                filteredSessions.map(s => (
                  <tr key={s.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 text-zinc-400">
                      {new Date(s.timestampIso).toLocaleDateString()} {new Date(s.timestampIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-zinc-200 font-semibold capitalize">
                      {s.taskType.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 text-accent-cyan font-bold">
                      {s.level}
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      {s.metrics.accuracyPercent}%
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {s.taskType === 'dual_n_back' && `d' = ${s.metrics.dPrime}`}
                      {s.taskType === 'operation_span' && describeOSpanSession(s)}
                      {s.taskType === 'digit_span' && `${s.mode} mode`}
                      {s.taskType === 'corsi_blocks' && `${s.mode} spatial`}
                      {s.taskType === 'keep_track' && `${s.level} categories`}
                    </td>
                    <td className="py-3 px-4 text-zinc-500">
                      {s.durationSeconds}s
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showConfirmReset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-surface border border-rose-800/60 rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-800/50 flex items-center justify-center text-accent-rose mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Reset All Training Data?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              This will permanently delete your session history, streak, and calibrated baselines. This action cannot be undone. Consider exporting a CSV backup first.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="py-2.5 bg-surface-subtle hover:bg-zinc-800 border border-surface-border text-zinc-300 font-medium rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleResetData}
                className="py-2.5 bg-accent-rose hover:bg-rose-600 text-white font-bold rounded-xl text-xs shadow-lg"
              >
                Permanently Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
