import { audio } from '../core/audio.js';
import { voice } from '../core/voice.js';
import { store } from '../core/store.js';

export class NeuroAcousticEngine {
  constructor() {
    this.ctx = null;
    this.leftOsc = null;
    this.rightOsc = null;
    this.masterGain = null;
    this.isPlaying = false;
    this.timerInterval = null;
    this.remainingSec = 0;

    document.getElementById('btnStartTheta')?.addEventListener('click', () => {
      this.startSession(432, 6, 600);
    });
    document.getElementById('btnStopBinaural')?.addEventListener('click', () => {
      this.stopSession();
    });
  }

  initAudioContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startSession(baseCarrier = 432, beatFreq = 6, durationSec = 600) {
    audio.click();
    this.stopSession();
    this.initAudioContext();

    const now = this.ctx.currentTime;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.001, now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.08, now + 3);
    this.masterGain.connect(this.ctx.destination);

    this.leftOsc = this.ctx.createOscillator();
    this.leftOsc.type = 'sine';
    this.leftOsc.frequency.setValueAtTime(baseCarrier, now);
    const leftPanner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (leftPanner) {
      leftPanner.pan.setValueAtTime(-1.0, now);
      this.leftOsc.connect(leftPanner);
      leftPanner.connect(this.masterGain);
    } else {
      this.leftOsc.connect(this.masterGain);
    }

    this.rightOsc = this.ctx.createOscillator();
    this.rightOsc.type = 'sine';
    this.rightOsc.frequency.setValueAtTime(baseCarrier + beatFreq, now);
    const rightPanner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (rightPanner) {
      rightPanner.pan.setValueAtTime(1.0, now);
      this.rightOsc.connect(rightPanner);
      rightPanner.connect(this.masterGain);
    } else {
      this.rightOsc.connect(this.masterGain);
    }

    this.leftOsc.start(now);
    this.rightOsc.start(now);
    this.isPlaying = true;
    this.remainingSec = durationSec;

    this.updateUI(true);
    store.logEvent(`Бінауральний релакс: 432 Гц + ${beatFreq} Гц Тета-ритм`);
    voice.speak('Нейроакустичний режим увімкнено. Одягніть навушники, позу 90/90 і відпустіть напругу в попереку.');

    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.remainingSec--;
      const disp = document.getElementById('binauralTimerDisplay');
      if (disp) {
        const m = String(Math.floor(this.remainingSec / 60)).padStart(2, '0');
        const s = String(this.remainingSec % 60).padStart(2, '0');
        disp.innerText = `${m}:${s}`;
      }
      if (this.remainingSec <= 0) {
        this.stopSession();
        audio.relaxPulse();
      }
    }, 1000);
  }

  stopSession() {
    if (!this.isPlaying) return;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      setTimeout(() => {
        try {
          if (this.leftOsc) this.leftOsc.stop();
          if (this.rightOsc) this.rightOsc.stop();
        } catch (e) {}
      }, 1500);
    }
    clearInterval(this.timerInterval);
    this.isPlaying = false;
    this.updateUI(false);
  }

  updateUI(active) {
    const btnStart = document.getElementById('btnStartTheta');
    const btnStop = document.getElementById('btnStopBinaural');
    const disp = document.getElementById('binauralTimerDisplay');
    if (btnStart) btnStart.style.display = active ? 'none' : 'inline-block';
    if (btnStop) btnStop.style.display = active ? 'inline-block' : 'none';
    if (disp) {
      disp.style.display = active ? 'block' : 'none';
      if (!active) disp.innerText = '10:00';
    }
  }
}
