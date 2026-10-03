import { audio } from '../core/audio.js';
import { store } from '../core/store.js';
import { voice } from '../core/voice.js';

export class GeofenceGuide {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.initControls();
  }

  initControls() {
    document.getElementById('btnCalcLoad')?.addEventListener('click', () => {
      audio.click();
      const totalKg = parseFloat(document.getElementById('cargoWeightInput')?.value || 6) || 6;
      const perHandKg = (totalKg / 2).toFixed(1);
      const resultEl = document.getElementById('loadCalcResult');

      let advisory = `Розподіліть по ${perHandKg} кг на руку. Притисніть лікті до корпусу.`;
      if (totalKg > 10) {
        advisory = `КРИТИЧНО: ${perHandKg} кг на руку! Не скручувати таз під час ходьби.`;
        store.setStrain(Math.max(store.state.strain, 6));
        audio.alertPulse();
      }

      if (resultEl) resultEl.innerHTML = `<b>${totalKg} кг загалом:</b> ${advisory}`;
      voice.speak(`Вага вантажу ${totalKg} кг. Розподіліть по ${perHandKg} кг на кожну руку.`);
      store.logEvent(`Ергономіка вантажу: розраховано ${totalKg} кг`);
    });
  }
}
