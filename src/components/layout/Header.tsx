import React, { useState } from 'react';
import { audioEngine } from '../../services/audioEngine';
import { storageService } from '../../services/storageService';
import { Volume2, VolumeX, Flame, Download, Brain } from 'lucide-react';

interface HeaderProps {
  currentStreak: number;
  onRefreshData?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentStreak }) => {
  const [isMuted, setIsMuted] = useState<boolean>(audioEngine.getIsMuted());
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  const toggleSound = () => {
    const nextState = !isMuted;
    audioEngine.setMuted(nextState);
    setIsMuted(nextState);
  };

  const handleDownload = (format: 'csv' | 'json') => {
    storageService.downloadExport(format);
    setShowExportMenu(false);
  };

  return (
    <header className="w-full border-b border-surface-border bg-surface/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-cyan/10 border border-accent-cyan/40 flex items-center justify-center text-accent-cyan glow-cyan">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight flex items-center gap-1.5">
              CogniSpan <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">WMC Lab</span>
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Streak Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-xs font-mono font-semibold">
            <Flame className={`w-4 h-4 ${currentStreak > 0 ? 'text-accent-amber fill-accent-amber' : 'text-zinc-500'}`} />
            <span className={currentStreak > 0 ? 'text-zinc-200' : 'text-zinc-500'}>
              {currentStreak} Day{currentStreak === 1 ? '' : 's'}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className="w-9 h-9 rounded-xl bg-surface border border-surface-border hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-accent-rose" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(prev => !prev)}
              aria-label="Export Data"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-surface-border hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-surface border border-surface-border rounded-xl shadow-2xl p-1 z-50">
                <button
                  onClick={() => handleDownload('csv')}
                  className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors font-mono"
                >
                  Download CSV (Trials)
                </button>
                <button
                  onClick={() => handleDownload('json')}
                  className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors font-mono"
                >
                  Download JSON (Full)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
