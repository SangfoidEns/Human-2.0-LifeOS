import { store } from '../core/store.js';

export class ConveyorDaemon {
  constructor(listElemId, bannerElemId) {
    this.listElem = document.getElementById(listElemId);
    this.bannerElem = document.getElementById(bannerElemId);
  }

  update() {
    const list = this.listElem;
    list.innerHTML = '';
    const now = Date.now();
    let collisionDetected = false;

    // Фіксовані слоти: 14:30 та 18:00
    const today = new Date();
    const m1430 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 30).getTime();
    const m1800 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0).getTime();
    const criticalSlots = [m1430, m1800];

    store.state.laundry.forEach((b) => {
      const row = document.createElement('div');
      row.className = 'slot-row';
      let statusStr = 'ГОТОВО';

      if (b.endTimestamp > now) {
        const leftSec = Math.floor((b.endTimestamp - now) / 1000);
        const mins = Math.floor(leftSec / 60);
        statusStr = `${mins} хв залишок`;

        criticalSlots.forEach((slot) => {
          if (Math.abs(b.endTimestamp - slot) < 15 * 60 * 1000) {
            collisionDetected = true;
          }
        });
      }

      row.innerHTML = `<span>${b.name}</span><b style="font-family:monospace; margin-left:auto;">${statusStr}</b>`;
      list.appendChild(row);
    });

    this.bannerElem.style.display = collisionDetected ? 'block' : 'none';
  }
}
