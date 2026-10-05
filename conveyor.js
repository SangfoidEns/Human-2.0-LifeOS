/**
 * HUMA 2.0 · Keller / Pasta / Decomp timers
 * Date.now() based · visibility-safe · Collision Guard
 */
import { checkCollision, suggestSafeStart, formatCountdown } from './chronoMatrix.js';
import { setActiveTimer, clearTimer, logTelemetry } from '../core/store.js';
import { chime, alertTone, whistle } from '../core/audio.js';
import { jarvisLine } from '../core/voice.js';

let tickId = null;
let current = null; // { id, label, endTs, type, onDone }

function tick() {
  if (!current) return;
  const left = current.endTs - Date.now();
  if (left <= 0) {
    const done = current;
    current = null;
    clearTimer();
    chime();
    jarvisLine('timerDone', done.label);
    logTelemetry('timer_done', { type: done.type, label: done.label });
    done.onDone?.();
    stopTick();
    return;
  }
  // soft whistle 60s before pasta
  if (doneNear(60) && current.type === 'pasta' && !current._whistled) {
    current._whistled = true;
    whistle();
  }
  setActiveTimer({
    id: current.id,
    label: current.label,
    endTs: current.endTs,
    type: current.type,
    left
  });
}

function doneNear(sec) {
  return current && (current.endTs - Date.now()) <= sec * 1000 && (current.endTs - Date.now()) > (sec - 2) * 1000;
}

function startTick() {
  stopTick();
  tickId = setInterval(tick, 250);
  tick();
}

function stopTick() {
  if (tickId) { clearInterval(tickId); tickId = null; }
}

export function startTimer({ label, minutes, type = 'generic', onDone, force = false }) {
  const durationMs = minutes * 60 * 1000;
  let start = Date.now();
  if (!force && (type === 'laundry' || type === 'pasta')) {
    const end = start + durationMs;
    const col = checkCollision(end);
    if (col.collision) {
      alertTone();
      jarvisLine('collision');
      return { ok: false, collision: true, safeStart: suggestSafeStart(minutes) };
    }
  }
  const endTs = start + durationMs;
  current = {
    id: 'tm' + Date.now(),
    label,
    endTs,
    type,
    onDone
  };
  setActiveTimer({ id: current.id, label, endTs, type, left: durationMs });
  startTick();
  logTelemetry('timer_start', { type, minutes, label });
  return { ok: true, endTs };
}

export function startPasta(onDone) {
  return startTimer({ label: 'Паста Al Dente', minutes: 8, type: 'pasta', onDone });
}

export function startLaundry(minutes = 45, onDone) {
  return startTimer({ label: `Прання ${minutes} хв`, minutes, type: 'laundry', onDone });
}

export function startDecomp(minutes = 7, onDone) {
  return startTimer({ label: 'Декомпресія 90/90', minutes, type: 'decomp', onDone });
}

export function stopCurrentTimer() {
  current = null;
  clearTimer();
  stopTick();
}

export function getRemaining() {
  if (!current) return 0;
  return Math.max(0, current.endTs - Date.now());
}

export function formatLeft() {
  return formatCountdown(getRemaining());
}

// visibility recovery
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && current) tick();
});
