// Web Audio API Synthesized Sound Effects & UI Animation Preferences Manager
// Zero external audio files required — works 100% offline in the mountains and on shared cPanel hosting.

export interface UIEffectsPreferences {
  soundEnabled: boolean;
  volume: number; // 0.0 to 1.0
  hapticsEnabled: boolean;
  startupLoaderEnabled: boolean;
  syncProgressBarEnabled: boolean;
  smoothTransitionsEnabled: boolean;
}

const PREFS_STORAGE_KEY = 'trippool_ui_effects_prefs_v1';

const DEFAULT_PREFS: UIEffectsPreferences = {
  soundEnabled: true,
  volume: 0.75,
  hapticsEnabled: true,
  startupLoaderEnabled: true,
  syncProgressBarEnabled: true,
  smoothTransitionsEnabled: true,
};

export type SoundEffectType =
  | 'tap'
  | 'expense'
  | 'deposit'
  | 'shutter'
  | 'copy'
  | 'sync'
  | 'delete'
  | 'error'
  | 'welcome';

class SoundAndEffectsManager {
  private ctx: AudioContext | null = null;
  private prefs: UIEffectsPreferences;
  private listeners: Set<(prefs: UIEffectsPreferences) => void> = new Set();

  constructor() {
    this.prefs = this.loadPrefs();
  }

  private loadPrefs(): UIEffectsPreferences {
    try {
      const raw = localStorage.getItem(PREFS_STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
      }
    } catch {
      // ignore storage errors
    }
    return { ...DEFAULT_PREFS };
  }

  public getPrefs(): UIEffectsPreferences {
    return this.prefs;
  }

  public updatePrefs(partial: Partial<UIEffectsPreferences>): UIEffectsPreferences {
    this.prefs = { ...this.prefs, ...partial };
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(this.prefs));
    } catch {
      // ignore storage errors
    }
    this.listeners.forEach((listener) => listener(this.prefs));
    return this.prefs;
  }

  public subscribe(listener: (prefs: UIEffectsPreferences) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          return null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public triggerHaptic(pattern: number | number[] = 12): void {
    if (!this.prefs.hapticsEnabled) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // ignore unsupported devices
    }
  }

  public play(type: SoundEffectType, forcePlay = false): void {
    if (!forcePlay && !this.prefs.soundEnabled) {
      if (type !== 'tap') {
        this.triggerHaptic(15);
      }
      return;
    }

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const masterVolume = Math.max(0.05, Math.min(1, this.prefs.volume));
    const now = ctx.currentTime;

    switch (type) {
      case 'tap': {
        this.triggerHaptic(8);
        this.playTone(ctx, 680, 320, 0.028, masterVolume * 0.16, 'sine', now);
        break;
      }

      case 'expense': {
        // Crisp 2-note confirmation pop (A5 -> E6)
        this.triggerHaptic([12, 30, 18]);
        this.playNote(ctx, 587.33, now, 0.08, masterVolume * 0.28, 'triangle'); // D5
        this.playNote(ctx, 880.0, now + 0.065, 0.16, masterVolume * 0.34, 'sine'); // A5
        break;
      }

      case 'deposit': {
        // Ascending emerald coin chime arpeggio (C5 -> E5 -> G5 -> C6)
        this.triggerHaptic([15, 25, 25]);
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          this.playNote(ctx, freq, now + idx * 0.055, 0.18, masterVolume * 0.3, 'sine');
        });
        break;
      }

      case 'shutter': {
        // Realistic camera mechanical double-click shutter
        this.triggerHaptic(20);
        this.playNoiseBurst(ctx, now, 0.025, masterVolume * 0.38);
        this.playTone(ctx, 1200, 240, 0.03, masterVolume * 0.25, 'triangle', now + 0.04);
        break;
      }

      case 'copy': {
        // Quick double chime for WhatsApp / Viber copy
        this.triggerHaptic(12);
        this.playNote(ctx, 659.25, now, 0.06, masterVolume * 0.24, 'sine'); // E5
        this.playNote(ctx, 987.77, now + 0.05, 0.13, masterVolume * 0.28, 'sine'); // B5
        break;
      }

      case 'sync': {
        // Warm harmonic cloud sync completion chord
        this.triggerHaptic([10, 40, 10]);
        this.playNote(ctx, 440, now, 0.12, masterVolume * 0.22, 'sine'); // A4
        this.playNote(ctx, 554.37, now + 0.05, 0.14, masterVolume * 0.22, 'sine'); // C#5
        this.playNote(ctx, 659.25, now + 0.1, 0.22, masterVolume * 0.26, 'sine'); // E5
        break;
      }

      case 'delete': {
        // Soft descending wooden muted tone
        this.triggerHaptic(22);
        this.playTone(ctx, 360, 150, 0.12, masterVolume * 0.28, 'triangle', now);
        break;
      }

      case 'error': {
        // Double low alert pulse
        this.triggerHaptic([30, 40, 30]);
        this.playNote(ctx, 220, now, 0.09, masterVolume * 0.3, 'sawtooth');
        this.playNote(ctx, 196, now + 0.1, 0.14, masterVolume * 0.3, 'sawtooth');
        break;
      }

      case 'welcome': {
        // Welcoming 3-note chord on login
        this.triggerHaptic(15);
        const welcomeNotes = [440, 554.37, 659.25, 880];
        welcomeNotes.forEach((freq, idx) => {
          this.playNote(ctx, freq, now + idx * 0.065, 0.24, masterVolume * 0.24, 'sine');
        });
        break;
      }
    }
  }

  private playNote(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    peakGain: number,
    type: OscillatorType
  ): void {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    } catch {
      // ignore audio node errors
    }
  }

  private playTone(
    ctx: AudioContext,
    startFreq: number,
    endFreq: number,
    duration: number,
    peakGain: number,
    type: OscillatorType,
    startTime: number
  ): void {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);

      gain.gain.setValueAtTime(peakGain, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.015);
    } catch {
      // ignore audio node errors
    }
  }

  private playNoiseBurst(ctx: AudioContext, startTime: number, duration: number, peakGain: number): void {
    try {
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, startTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(peakGain, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(startTime);
      noise.stop(startTime + duration);
    } catch {
      // ignore noise burst errors
    }
  }
}

export const SoundEffects = new SoundAndEffectsManager();
