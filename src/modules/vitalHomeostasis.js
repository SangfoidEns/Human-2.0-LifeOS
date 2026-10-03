import { audio } from '../core/audio.js';
import { store } from '../core/store.js';

export class VitalHomeostasis {
  constructor() {
    this.breathInterval = null;
    this.breathPhase = 0;
    this.isEmergencyActive = false;

    this.waterCountEl = document.getElementById('waterCounter');
    this.saltBadgeEl = document.getElementById('saltStatusBadge');
    this.jointsBadgeEl = document.getElementById('jointsStatusBadge');
    this.emergencyModal = document.getElementById('emergencyOverlay');
    this.breathVisual = document.getElementById('breathVisualizer');
    this.breathPhaseText = document.getElementById('breathPhaseText');
    this.circadianToggle = document.getElementById('toggleCircadian');

    this.initEvents();
    this.checkCircadianCycle();
  }

  initEvents() {
    document.getElementById('btnAddWater')?.addEventListener('click', () => {
      audio.click();
      store.state.vital.waterGlasses++;
      store.state.vital.lastWaterTimestamp = Date.now();
      store.recalculateTRI();
      store.logEvent(`Гідратація: склянка #${store.state.vital.waterGlasses} (осмос дисків підтримано)`);
      store.persist();
      this.updateUI();
    });

    this.saltBadgeEl?.addEventListener('click', () => {
      audio.click();
      store.state.vital.electrolytesTaken = !store.state.vital.electrolytesTaken;
      store.recalculateTRI();
      store.persist();
      this.updateUI();
    });

    this.jointsBadgeEl?.addEventListener('click', () => {
      audio.click();
      store.state.vital.jointVitaminsTaken = !store.state.vital.jointVitaminsTaken;
      store.recalculateTRI();
      store.persist();
      this.updateUI();
    });

    document.getElementById('btnEmergencyLockout')?.addEventListener('click', () => {
      audio.alertPulse();
      this.isEmergencyActive = true;
      store.setStrain(9);
      if (this.emergencyModal) this.emergencyModal.style.display = 'flex';
      this.startBoxBreathing();
    });

    document.getElementById('btnCloseEmergency')?.addEventListener('click', () => {
      audio.click();
      this.isEmergencyActive = false;
      clearInterval(this.breathInterval);
      if (this.emergencyModal) this.emergencyModal.style.display = 'none';
    });

    this.circadianToggle?.addEventListener('change', (e) => {
      this.setCircadianFilter(e.target.checked);
    });
  }

  startBoxBreathing() {
    clearInterval(this.breathInterval);
    this.breathPhase = 0;
    const phases = [
      { text: 'ВДИХ ЧЕРЕЗ НІС (4 сек)', scale: '1.3', tone: 432 },
      { text: 'ЗАТРИМКА ДИХАННЯ (4 сек)', scale: '1.3', tone: 528 },
      { text: 'ПОВІЛЬНИЙ ВИДИХ (4 сек)', scale: '0.8', tone: 320 },
      { text: 'ПОВНА ПАУЗА / РОЗСЛАБЛЕННЯ (4 сек)', scale: '0.8', tone: 240 }
    ];

    const runStep = () => {
      const p = phases[this.breathPhase];
      if (this.breathPhaseText) this.breathPhaseText.innerText = p.text;
      if (this.breathVisual) this.breathVisual.style.transform = `scale(${p.scale})`;
      audio.playHarmonicChord(p.tone, 1.5, 0.4, 'sine');
      this.breathPhase = (this.breathPhase + 1) % 4;
    };
    runStep();
    this.breathInterval = setInterval(runStep, 4000);
  }

  checkCircadianCycle() {
    const currentHour = new Date().getHours();
    const shouldDim = currentHour >= 19 || currentHour < 7;
    if (store.state.vital.circadianAuto && shouldDim) {
      this.setCircadianFilter(true);
      if (this.circadianToggle) this.circadianToggle.checked = true;
    }
  }

  setCircadianFilter(enabled) {
    if (enabled) {
      document.documentElement.classList.add('circadian-night');
    } else {
      document.documentElement.classList.remove('circadian-night');
    }
    store.state.vital.circadianActive = enabled;
    store.persist();
  }

  updateUI() {
    const v = store.state.vital;
    if (this.waterCountEl) {
      this.waterCountEl.innerText = `${v.waterGlasses} скл (${v.waterGlasses * 250} мл)`;
    }
    if (this.saltBadgeEl) {
      this.saltBadgeEl.className = `vital-chip ${v.electrolytesTaken ? 'chip-active' : ''}`;
      this.saltBadgeEl.innerText = v.electrolytesTaken ? '✓ СІЛЬ / ЕЛЕКТРОЛІТИ' : '+ СІЛЬ / ВОДА';
    }
    if (this.jointsBadgeEl) {
      this.jointsBadgeEl.className = `vital-chip ${v.jointVitaminsTaken ? 'chip-active' : ''}`;
      this.jointsBadgeEl.innerText = v.jointVitaminsTaken ? '✓ ВІТАМІНИ СУГЛОБІВ' : '+ ВІТАМІНИ СУГЛОБІВ';
    }
  }
}
