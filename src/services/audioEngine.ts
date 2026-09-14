/**
 * Zero-Latency Web Audio API Engine (v2.0)
 * Features dual-modality acoustic cues:
 * 1. Procedural musical pitch tones (0.0ms hardware latency, perfect for Dual N-Back)
 * 2. Pre-warmed monotone speech synthesis phonemes
 * 3. Anti-pop exponential envelope feedback chimes
 */

export interface PitchNote {
  letter: string;
  noteName: string;
  frequencyHz: number;
}

// 8 distinct musical pitches spanning C4 to C5 for 0ms latency Dual N-Back
export const DUAL_NBACK_PITCHES: PitchNote[] = [
  { letter: 'C', noteName: 'C4', frequencyHz: 261.63 },
  { letter: 'H', noteName: 'D4', frequencyHz: 293.66 },
  { letter: 'K', noteName: 'E4', frequencyHz: 329.63 },
  { letter: 'L', noteName: 'F4', frequencyHz: 349.23 },
  { letter: 'Q', noteName: 'G4', frequencyHz: 392.00 },
  { letter: 'R', noteName: 'A4', frequencyHz: 440.00 },
  { letter: 'S', noteName: 'B4', frequencyHz: 493.88 },
  { letter: 'T', noteName: 'C5', frequencyHz: 523.25 },
];

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private speechVoices: SpeechSynthesisVoice[] = [];
  private audioMode: 'pitch' | 'voice' = 'voice';
  private masterVolume: number = 0.8;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.speechVoices = window.speechSynthesis.getVoices();
      };
      // Pre-warm voices
      this.speechVoices = window.speechSynthesis.getVoices();
    }
  }

  private ensureContext(): void {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public async initialize(): Promise<void> {
    this.ensureContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setAudioMode(mode: 'pitch' | 'voice'): void {
    this.audioMode = mode;
  }

  public getAudioMode(): 'pitch' | 'voice' {
    return this.audioMode;
  }

  /**
   * Plays a clean procedural sine/triangle tone with anti-pop exponential gain ramp
   */
  public playTone(freqHz: number, durationSeconds: number = 0.2, type: OscillatorType = 'sine'): void {
    this.ensureContext();
    if (this.isMuted || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freqHz, now);

      // Envelope: 5ms attack, exponential decay
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + durationSeconds + 0.01);
    } catch {
      // Ignore audioContext state collisions
    }
  }

  /**
   * Plays letter either via 0ms-latency pitch or voice synthesis
   */
  public playLetter(letter: string): void {
    if (this.isMuted) return;

    if (this.audioMode === 'pitch') {
      const pitch = DUAL_NBACK_PITCHES.find(p => p.letter === letter);
      if (pitch) {
        this.playTone(pitch.frequencyHz, 0.45, 'triangle');
      } else {
        this.playTone(440, 0.45, 'sine');
      }
    } else {
      this.speakPhoneme(letter);
    }
  }

  /**
   * Plays procedural feedback cues
   */
  public playFeedback(type: 'hit' | 'miss' | 'speed_warning' | 'tick' | 'complete'): void {
    if (this.isMuted) return;

    switch (type) {
      case 'hit':
        // Ascending harmonic chime (C5 -> E5)
        this.playTone(523.25, 0.1, 'triangle');
        setTimeout(() => this.playTone(659.25, 0.15, 'triangle'), 80);
        break;
      case 'miss':
        // Soft low dissonance buzz
        this.playTone(164.81, 0.25, 'sawtooth');
        break;
      case 'speed_warning':
        // Double warning pulse
        this.playTone(440, 0.08, 'sine');
        setTimeout(() => this.playTone(440, 0.08, 'sine'), 100);
        break;
      case 'tick':
        // 10ms click impulse
        this.playTone(1200, 0.015, 'sine');
        break;
      case 'complete':
        // Success chord arpeggio (C5 -> G5 -> C6)
        this.playTone(523.25, 0.15, 'triangle');
        setTimeout(() => this.playTone(783.99, 0.15, 'triangle'), 100);
        setTimeout(() => this.playTone(1046.5, 0.3, 'sine'), 200);
        break;
    }
  }

  /**
   * Pronounces a phonemic letter or digit with flat monotone pitch
   */
  public speakPhoneme(text: string): void {
    if (this.isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0; // Strictly monotone to prevent prosodic chunking
    utterance.volume = 1.0;

    const enVoice = this.speechVoices.find(v => v.lang.startsWith('en') && v.localService) 
      || this.speechVoices.find(v => v.lang.startsWith('en'));
    if (enVoice) {
      utterance.voice = enVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
}

export const audioEngine = new AudioEngine();
