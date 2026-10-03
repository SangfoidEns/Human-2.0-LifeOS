import { audio } from '../core/audio.js';
import { store } from '../core/store.js';

export class SlouchDetector {
  constructor(statusElemId, toggleBtnId) {
    this.statusElem = document.getElementById(statusElemId);
    this.toggleBtn = document.getElementById(toggleBtnId);
    this.isActive = false;
    this.slouchCounter = 0;
    this.checkInterval = null;
    this.currentBeta = 0;

    this.handleOrientation = this.handleOrientation.bind(this);
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggle());
    }
  }

  async toggle() {
    audio.click();
    if (!this.isActive) await this.start();
    else this.stop();
  }

  async start() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') {
          this.updateUIStatus('ВІДХИЛЕНО', false);
          return;
        }
      } catch (err) {
        this.updateUIStatus('ПОМИЛКА', false);
        return;
      }
    }

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', this.handleOrientation, true);
      this.isActive = true;
      store.setSlouchGuard(true);
      this.updateUIStatus('АКТИВНИЙ // КІНЕТИКА', true);
      store.logEvent('Сенсор постави підключено');
      this.checkInterval = setInterval(() => this.auditPosture(), 1000);
    } else {
      this.updateUIStatus('НЕ ПІДТРИМУЄТЬСЯ', false);
    }
  }

  stop() {
    window.removeEventListener('deviceorientation', this.handleOrientation, true);
    clearInterval(this.checkInterval);
    this.isActive = false;
    this.slouchCounter = 0;
    store.setSlouchGuard(false);
    this.updateUIStatus('ВІМКНЕНО', false);
    store.logEvent('Сенсор постави зупинено');
  }

  handleOrientation(e) {
    if (e.beta !== null) this.currentBeta = e.beta;
  }

  auditPosture() {
    if (!this.isActive) return;
    const isSlouchingAngle = this.currentBeta > 15 && this.currentBeta < 55;

    if (isSlouchingAngle) {
      this.slouchCounter++;
      if (this.slouchCounter >= 15) {
        audio.alertPulse();
        const jarvisLog = document.getElementById('jarvisLog');
        if (jarvisLog) jarvisLog.innerText = '«Хума, зафіксовано статичну сутулість понад 15 сек. Підніміть екран, розправте плечі».';
        if (store.state.strain < 7) store.setStrain(store.state.strain + 1);
        this.slouchCounter = 0;
      }
    } else if (this.slouchCounter > 0) {
      this.slouchCounter--;
    }
  }

  updateUIStatus(text, active) {
    if (this.statusElem) {
      this.statusElem.innerText = text;
      this.statusElem.style.color = active ? 'var(--bio-jade)' : 'var(--text-muted)';
    }
    if (this.toggleBtn) {
      this.toggleBtn.innerText = active ? 'ЗУПИНИТИ СЕНСОР' : 'УВІМКНУТИ СЕНСОР ПОСТАВИ';
      if (active) this.toggleBtn.classList.add('primary');
      else this.toggleBtn.classList.remove('primary');
    }
  }
}
