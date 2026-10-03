import { store } from '../core/store.js';
import { audio } from '../core/audio.js';
import { voice } from '../core/voice.js';

export class ConveyorDaemon {
  constructor(listElemId, bannerElemId) {
    this.listElem = document.getElementById(listElemId);
    this.bannerElem = document.getElementById(bannerElemId);
    this.lastCollisionState = false;
    this.currentCollidingBatch = null;

    this.initControls();
  }

  initControls() {
    const btnWarp = document.getElementById('btnAutoWarpCollision');
    if (btnWarp) {
      btnWarp.addEventListener('click', () => this.autoWarpCollisions());
    }
  }

  getGravitationalSlots() {
    const today = new Date();
    const createSlot = (h, m, label, durationMins = 15) => {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0, 0).getTime();
      return {
        label,
        start,
        end: start + durationMins * 60 * 1000,
        bufferStart: start - 15 * 60 * 1000
      };
    };

    return [
      createSlot(11, 0, 'Короткі переговори', 20),
      createSlot(14, 30, 'Ділова зустріч #1', 15),
      createSlot(18, 0, 'Ключова угода #2', 45)
    ];
  }

  update() {
    if (!this.listElem || !this.bannerElem) return;
    this.listElem.innerHTML = '';
    const now = Date.now();
    const gravitationalSlots = this.getGravitationalSlots();
    let collisionDetected = false;
    let collisionDetails = '';
    this.currentCollidingBatch = null;

    store.state.laundry.forEach((batch) => {
      const row = document.createElement('div');
      row.className = 'slot-row';

      if (batch.done || batch.endTimestamp <= now) {
        row.classList.add('done');
        row.innerHTML = `
          <span>${batch.name}</span>
          <b style="font-family: var(--font-mono); margin-left: auto; color: var(--bio-jade);">ГОТОВО В КЕЛЛЕРІ</b>
        `;
      } else {
        const remainingSec = Math.floor((batch.endTimestamp - now) / 1000);
        const mins = Math.floor(remainingSec / 60);
        const secs = remainingSec % 60;
        const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        gravitationalSlots.forEach((slot) => {
          if (batch.endTimestamp >= slot.bufferStart && batch.endTimestamp <= slot.end) {
            collisionDetected = true;
            this.currentCollidingBatch = batch;
            collisionDetails = `«${batch.name}» фінішує під час «${slot.label}»!`;
            row.style.borderLeftColor = 'var(--alert-red)';
          }
        });

        row.innerHTML = `
          <span>${batch.name}</span>
          <span style="font-family: var(--font-mono); margin-left: auto; color: var(--neon-cyan);">${timeStr}</span>
        `;
      }

      this.listElem.appendChild(row);
    });

    if (collisionDetected) {
      this.bannerElem.style.display = 'flex';
      const labelEl = document.getElementById('collisionMessageText');
      if (labelEl) labelEl.innerText = `⚠️ КОЛІЗІЯ: ${collisionDetails}`;

      if (!this.lastCollisionState) {
        audio.alertPulse();
        store.logEvent(`Попередження: накладання прання на розклад`);
      }
    } else {
      this.bannerElem.style.display = 'none';
    }

    this.lastCollisionState = collisionDetected;
  }

  calculateSafeWindow(durationMins) {
    const now = Date.now();
    const durationMs = durationMins * 60 * 1000;
    const slots = this.getGravitationalSlots();

    let proposedStart = now;
    let safe = false;

    while (!safe) {
      safe = true;
      const proposedEnd = proposedStart + durationMs;

      for (const slot of slots) {
        if (proposedEnd >= slot.bufferStart && proposedStart <= slot.end) {
          proposedStart = slot.end + 10 * 60 * 1000;
          safe = false;
          break;
        }
      }
    }

    return proposedStart;
  }

  autoWarpCollisions() {
    if (!this.currentCollidingBatch) return;

    audio.focusPulse();
    const batch = this.currentCollidingBatch;
    const now = Date.now();
    const remainingMins = Math.max(15, Math.ceil((batch.endTimestamp - now) / (60 * 1000)));

    const safeStartTimestamp = this.calculateSafeWindow(remainingMins);
    batch.endTimestamp = safeStartTimestamp + remainingMins * 60 * 1000;

    const safeDate = new Date(batch.endTimestamp);
    const safeTimeStr = `${String(safeDate.getHours()).padStart(2, '0')}:${String(safeDate.getMinutes()).padStart(2, '0')}`;

    store.persist();
    this.update();

    const msg = `Колізію усунено. Фініш партії зміщено на безпечний час: ${safeTimeStr}.`;
    const jarvisLog = document.getElementById('jarvisLog');
    if (jarvisLog) jarvisLog.innerText = `«${msg}»`;
    voice.speak(msg);
    store.logEvent(`Auto-Warp: таймер «${batch.name}» зміщено на ${safeTimeStr}`);
  }
}
