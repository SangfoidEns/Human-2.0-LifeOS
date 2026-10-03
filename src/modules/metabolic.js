import { audio } from '../core/audio.js';
import { store } from '../core/store.js';

export class MetabolicEngine {
  constructor(btnId, displayId) {
    this.btn = document.getElementById(btnId);
    this.display = document.getElementById(displayId);
    this.targetTimestamp = 0;
    this.timerInterval = null;

    if (this.btn) {
      this.btn.addEventListener('click', () => this.togglePastaTimer());
    }
  }

  togglePastaTimer() {
    audio.click();

    if (this.targetTimestamp === 0) {
      this.targetTimestamp = Date.now() + 8 * 60 * 1000;
      this.btn.innerText = 'ЗУПИНИТИ КУЛІНАРНИЙ ТАЙМЕР';
      this.btn.classList.add('primary');

      store.logEvent('Запущено таймер спагеті Al Dente (8 хв). Zero-Standing активний');
      clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => this.tick(), 1000);
      this.tick();
    } else {
      this.reset();
    }
  }

  tick() {
    const now = Date.now();
    const remainingSec = Math.max(0, Math.floor((this.targetTimestamp - now) / 1000));
    const mins = String(Math.floor(remainingSec / 60)).padStart(2, '0');
    const secs = String(remainingSec % 60).padStart(2, '0');

    if (this.display) this.display.innerText = `${mins}:${secs}`;

    if (remainingSec === 60) {
      audio.focusPulse();
      const jarvisLog = document.getElementById('jarvisLog');
      if (jarvisLog) jarvisLog.innerText = '«Хума, 60 секунд до готовності пасти. Соус розігрітий, підготуйте тарілку».';
    }

    if (remainingSec === 0) {
      clearInterval(this.timerInterval);
      this.targetTimestamp = 0;
      audio.relaxPulse();
      if (this.btn) {
        this.btn.innerText = 'ПАСТА AL DENTE ГОТОВА!';
        this.btn.classList.remove('primary');
      }
      store.logEvent('Кулінарний цикл завершено. Паста готова');
    }
  }

  reset() {
    clearInterval(this.timerInterval);
    this.targetTimestamp = 0;
    if (this.btn) {
      this.btn.innerText = 'Запустити таймер пасти (8 хв al dente)';
      this.btn.classList.remove('primary');
    }
    if (this.display) this.display.innerText = '08:00';
  }
}
