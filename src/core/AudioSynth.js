/**
 * LifeOS Core 2031 · AudioSynth
 * Biomorphic procedural synthesizer.
 * Frequencies: 432 Hz, 528 Hz, Solfeggio harmonics + light binaural pulses.
 * Zero external audio files.
 */

export class AudioSynth {
  constructor() {
    this.ctx = null;
    this.master = null;
  }

  _ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Single tone with exponential release
   */
  tone(freq = 528, duration = 0.18, type = 'sine', gain = 0.12) {
    try {
      this._ensure();
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      g.gain.setValueAtTime(gain, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(g);
      g.connect(this.master);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + duration + 0.05);
    } catch (_) {
      // AudioContext may be blocked until user gesture
    }
  }

  /**
   * Soft completion chime (432 → 528 → 639)
   */
  chimeComplete() {
    this.tone(432, 0.13, 'sine', 0.10);
    setTimeout(() => this.tone(528, 0.18, 'sine', 0.12), 110);
    setTimeout(() => this.tone(639, 0.11, 'sine', 0.07), 260);

    if (navigator.vibrate) {
      navigator.vibrate([130, 50, 130]);
    }
  }

  /**
   * Soft UI feedback
   */
  chimeSoft() {
    this.tone(432, 0.07, 'sine', 0.06);
  }

  /**
   * Binaural-style pulse (slight detune between two oscillators)
   * Useful for short focus / release cues
   */
  binauralPulse(base = 200, beat = 6, duration = 1.2) {
    try {
      this._ensure();
      const now = this.ctx.currentTime;

      const left = this.ctx.createOscillator();
      const right = this.ctx.createOscillator();
      const merger = this.ctx.createChannelMerger(2);
      const g = this.ctx.createGain();

      left.frequency.value = base;
      right.frequency.value = base + beat;
      left.type = 'sine';
      right.type = 'sine';

      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.08, now + 0.15);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      left.connect(merger, 0, 0);
      right.connect(merger, 0, 1);
      merger.connect(g);
      g.connect(this.master);

      left.start(now);
      right.start(now);
      left.stop(now + duration + 0.1);
      right.stop(now + duration + 0.1);
    } catch (_) {}
  }

  /**
   * Short release sequence tuned for muscle relaxation cues
   */
  releaseSequence() {
    this.tone(396, 0.2, 'sine', 0.09);
    setTimeout(() => this.tone(417, 0.22, 'sine', 0.08), 180);
    setTimeout(() => this.tone(528, 0.28, 'sine', 0.10), 400);
  }
}

export const synth = new AudioSynth();
