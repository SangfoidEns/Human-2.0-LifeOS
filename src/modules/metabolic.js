import { audio } from '../core/audio.js';

export class MetabolicEngine {
  constructor(btnId, displayId) {
    this.btn = document.getElementById(btnId);
    this.display = document.getElementById(displayId);
    this.target = 0;
    this.interval = null;

    this.btn.addEventListener('click', () => this.toggle());
  }

  toggle() {
    audio.click();
    if (this.target === 0) {
      this.target = Date.now() + 8 * 60 * 1000;
      this.btn.innerText = 'Зупинити таймер пасти';
      this.interval = setInterval(() => this.tick(), 1000);
    } else {
      this.reset();
    }
  }

  tick() {
    const leftSec = Math.max(0, Math.floor((this.target - Date.now()) / 1000));
    const m = String(Math.floor(leftSec / 60)).padStart(2, '0');
    const s = String(leftSec % 60).padStart(2, '0');
    this.display.innerText = `${m}:${s}`;

    if (leftSec === 0) {
      audio.relaxPulse();
      this.btn.innerText = 'Паста Al Dente готова!';
      clearInterval(this.interval);
      this.target = 0;
    }
  }

  reset() {
    clearInterval(this.interval);
    this.target = 0;
    this.btn.innerText = 'Запустити таймер пасти (8 хв al dente)';
    this.display.innerText = '08:00';
  }
}
