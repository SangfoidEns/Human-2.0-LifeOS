class BiomorphicAudio {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  vibrate(pattern = [20]) {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  playHarmonicChord(baseFreq, harmonicMultiplier, duration = 0.4, type = 'sine') {
    try {
      this.init();
      const now = this.ctx.currentTime;

      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = type;
      osc1.frequency.setValueAtTime(baseFreq, now);
      gain1.gain.setValueAtTime(0.09, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * harmonicMultiplier, now);
      gain2.gain.setValueAtTime(0.04, now);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.8);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    } catch (e) {}
  }

  click() {
    this.vibrate(15);
    this.playHarmonicChord(880, 1.5, 0.05, 'triangle');
  }

  focusPulse() {
    this.vibrate([25, 40, 25]);
    this.playHarmonicChord(432, 2.0, 0.5, 'sine');
  }

  relaxPulse() {
    this.vibrate([40, 80, 60]);
    this.playHarmonicChord(528, 1.5, 0.9, 'sine');
  }

  alertPulse() {
    this.vibrate([80, 50, 80, 50, 120]);
    try {
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.35);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }
}

export const audio = new BiomorphicAudio();
