class BiomorphicAudio {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  playTone(freq = 432, type = 'sine', duration = 0.25) {
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch(e) {}
  }

  click() { this.playTone(800, 'triangle', 0.04); }
  focusPulse() { this.playTone(432, 'sine', 0.3); }
  relaxPulse() { this.playTone(528, 'sine', 0.6); }
  alertPulse() {
    this.playTone(280, 'sawtooth', 0.2);
    setTimeout(() => this.playTone(240, 'sawtooth', 0.3), 150);
  }
}

export const audio = new BiomorphicAudio();
