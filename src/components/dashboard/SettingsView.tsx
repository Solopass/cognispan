import React, { useState, useEffect } from 'react';
import { audioEngine, DUAL_NBACK_PITCHES } from '../../services/audioEngine';
import { storageService } from '../../services/storageService';
import { Settings, Volume2, ShieldCheck, CheckCircle2, Eye } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const profile = storageService.getProfile();
  const [volume, setVolume] = useState<number>(profile.preferences.masterVolume);
  const [audioMode, setAudioMode] = useState<'pitch' | 'voice'>(audioEngine.getAudioMode());
  const [colorblind, setColorblind] = useState<boolean>(profile.preferences.colorblindPalette);
  const [isPersisted, setIsPersisted] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(p => setIsPersisted(p));
    }
  }, []);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioEngine.setMasterVolume(newVol);
    audioEngine.playFeedback('tick');
  };

  const handleModeChange = (mode: 'pitch' | 'voice') => {
    setAudioMode(mode);
    audioEngine.setAudioMode(mode);
    audioEngine.playFeedback('tick');
  };

  const handleSavePreferences = () => {
    const updated = {
      ...profile,
      preferences: {
        ...profile.preferences,
        masterVolume: volume,
        colorblindPalette: colorblind
      }
    };
    storageService.saveProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="pb-6 border-b border-surface-border flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-accent-cyan" />
            Acoustic & Hardware Settings
          </h1>
          <p className="text-zinc-400 text-xs font-mono mt-1">
            Audio calibration, zero-latency synthesizer test, and persistence.
          </p>
        </div>

        {savedSuccess && (
          <span className="flex items-center gap-1 text-xs font-mono text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/30 px-3 py-1.5 rounded-xl">
            <CheckCircle2 className="w-4 h-4" /> Saved
          </span>
        )}
      </div>

      {/* Audio Calibration & Mode Selector */}
      <div className="p-6 bg-surface border border-surface-border rounded-2xl shadow-xl space-y-6">
        <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-accent-cyan" />
          Acoustic Engine Calibration
        </h3>

        {/* Master Volume Slider */}
        <div className="p-4 bg-surface-subtle border border-surface-border rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-200 font-semibold">Master Audio Volume</span>
            <span className="text-accent-cyan font-bold">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={e => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* Mode Selector */}
        <div>
          <label className="text-xs font-mono text-zinc-400 block mb-2">Dual N-Back Audio Modality:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleModeChange('voice')}
              className={`p-4 rounded-xl border text-left transition-all ${
                audioMode === 'voice'
                  ? 'bg-zinc-800 border-accent-cyan text-zinc-100'
                  : 'bg-surface-subtle border-surface-border text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="font-bold text-sm block mb-1">Spoken Phonemes (WAIS Style)</span>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Uses pre-warmed monotonic speech synthesis. Familiar linguistic consonants (C, H, K, L, Q, R, S, T).
              </p>
            </button>

            <button
              onClick={() => handleModeChange('pitch')}
              className={`p-4 rounded-xl border text-left transition-all ${
                audioMode === 'pitch'
                  ? 'bg-zinc-800 border-accent-cyan text-zinc-100'
                  : 'bg-surface-subtle border-surface-border text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="font-bold text-sm block mb-1">Harmonic Pitch Notes (0ms Latency)</span>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Uses pure Web Audio API sine/triangle oscillators (C4 to C5). Zero OS speech latency risk.
              </p>
            </button>
          </div>
        </div>

        {/* Pitch Test Soundboard */}
        <div>
          <span className="text-xs font-mono text-zinc-400 block mb-3">Test Calibrated Frequencies:</span>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {DUAL_NBACK_PITCHES.map(p => (
              <button
                key={p.letter}
                onClick={async () => {
                  await audioEngine.initialize();
                  audioEngine.playTone(p.frequencyHz, 0.4, 'triangle');
                }}
                className="py-3 bg-surface-subtle hover:bg-zinc-800 border border-surface-border rounded-xl text-center transition-all group"
              >
                <span className="text-xs font-mono font-bold text-accent-cyan block group-hover:scale-110 transition-transform">
                  {p.letter}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 block">
                  {p.noteName}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Accessibility & High-Contrast Options */}
      <div className="p-6 bg-surface border border-surface-border rounded-2xl shadow-xl space-y-4">
        <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
          <Eye className="w-4 h-4 text-accent-violet" />
          Accessibility & Contrast
        </h3>

        <div className="flex items-center justify-between p-4 bg-surface-subtle border border-surface-border rounded-xl text-xs font-mono">
          <div>
            <span className="text-zinc-200 font-semibold block">High-Contrast & Colorblind Indicators</span>
            <span className="text-zinc-500 text-[11px]">Reinforces color cues with distinct geometric shapes and dashed borders.</span>
          </div>
          <button
            onClick={() => setColorblind(prev => !prev)}
            className={`w-12 h-6 rounded-full transition-colors relative ${colorblind ? 'bg-accent-cyan' : 'bg-zinc-800'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${colorblind ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Storage & Privacy Invariant */}
      <div className="p-6 bg-surface border border-surface-border rounded-2xl shadow-xl space-y-4">
        <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-accent-emerald" />
          Data Sovereignty & Offline Storage
        </h3>

        <div className="flex items-center justify-between p-4 bg-surface-subtle border border-surface-border rounded-xl text-xs font-mono">
          <div>
            <span className="text-zinc-200 font-semibold block">Browser Persistent Storage:</span>
            <span className="text-zinc-500 text-[11px]">Protects session logs from eviction during low disk space.</span>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
            isPersisted
              ? 'bg-accent-emerald/10 border border-accent-emerald/30 text-accent-emerald'
              : 'bg-accent-amber/10 border border-accent-amber/30 text-accent-amber'
          }`}>
            {isPersisted ? 'Granted' : 'Standard'}
          </span>
        </div>
      </div>

      <button
        onClick={handleSavePreferences}
        className="w-full py-4 bg-accent-cyan hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl transition-all glow-cyan text-sm font-bold"
      >
        Save Settings
      </button>
    </div>
  );
};
