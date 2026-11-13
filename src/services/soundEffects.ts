/**
 * Audio Notification System for MUSCAB CRT PRO
 * Uses Web Audio API for zero-dependency, ultra-crisp audio chimes:
 * 1. BUY Signal Chime: Ascending harmonic major chord (C5 -> E5 -> G5 -> C6)
 * 2. SELL Signal Chime: Descending harmonic chord (G5 -> Eb5 -> C5)
 * 3. Price Alert Chime: Crisp high-pitch double ping (880Hz -> 1760Hz)
 *
 * Fully toggleable and persisted in localStorage.
 */

const STORAGE_KEY = 'muscab_sound_enabled';

class SoundEffectsManager {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.soundEnabled = stored !== null ? stored === 'true' : true;
    } catch {
      this.soundEnabled = true;
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
      // Ignore storage errors
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Play distinct chime for CRT Signal (BUY = Ascending, SELL = Descending)
   */
  public playSignalChime(verdict: 'BUY' | 'SELL'): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (verdict === 'BUY') {
        // Ascending harmonic chime: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.5Hz)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);

          // Subtle bell-like envelope
          gain.gain.setValueAtTime(0, now + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.45);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.5);
        });
      } else {
        // Descending harmonic chime: G5 (783.99Hz), Eb5 (622.25Hz), C5 (523.25Hz)
        const notes = [783.99, 622.25, 523.25];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);

          gain.gain.setValueAtTime(0, now + idx * 0.1);
          gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.1 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.5);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.55);
        });
      }
    } catch (err) {
      console.warn('[SoundEffects] Playback error:', err);
    }
  }

  /**
   * Play high-resonance double ping for Price Alerts
   */
  public playAlertChime(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // High ping 880Hz then 1760Hz
      const pings = [880, 1760];
      pings.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.12 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.4);
      });
    } catch (err) {
      console.warn('[SoundEffects] Alert chime error:', err);
    }
  }
}

export const soundEffects = new SoundEffectsManager();
