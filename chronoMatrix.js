/**
 * HUMA 2.0 · Temporal engine · Feiertag · Collision Guard
 */
const BW_FEIERTAGE_FIXED = [
  { m: 1, d: 1, name: 'Neujahr' },
  { m: 5, d: 1, name: 'Tag der Arbeit' },
  { m: 10, d: 3, name: 'Tag der Deutschen Einheit' },
  { m: 12, d: 25, name: '1. Weihnachtstag' },
  { m: 12, d: 26, name: '2. Weihnachtstag' }
];

/** Simplified Easter (Anonymous Gregorian) for movable feasts */
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function isFeiertag(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  // fixed
  if (BW_FEIERTAGE_FIXED.some(f => f.m === m && f.d === d)) {
    return BW_FEIERTAGE_FIXED.find(f => f.m === m && f.d === d);
  }
  // movable relative to Easter
  const easter = easterSunday(y);
  const movable = [
    { offset: -2, name: 'Karfreitag' },
    { offset: 1, name: 'Ostermontag' },
    { offset: 39, name: 'Christi Himmelfahrt' },
    { offset: 50, name: 'Pfingstmontag' },
    { offset: 60, name: 'Fronleichnam' }
  ];
  for (const mv of movable) {
    const dt = addDays(easter, mv.offset);
    if (dt.getMonth() + 1 === m && dt.getDate() === d) return { name: mv.name };
  }
  // Sunday
  if (date.getDay() === 0) return { name: 'Sonntag' };
  return null;
}

export function isRuhetag(date = new Date()) {
  return !!isFeiertag(date);
}

/** Collision Guard: does [endTs] fall into protected window around meetings */
export function checkCollision(endTs, meetings = []) {
  // default protected slots often used
  const defaults = [
    { start: setHM(14, 30), end: setHM(14, 45) },
    { start: setHM(18, 0), end: setHM(18, 20) }
  ];
  const windows = meetings.length ? meetings : defaults;
  for (const w of windows) {
    const bufStart = w.start - 15 * 60 * 1000;
    const bufEnd = w.end + 10 * 60 * 1000;
    if (endTs >= bufStart && endTs <= bufEnd) {
      return { collision: true, window: w };
    }
  }
  return { collision: false };
}

function setHM(h, m) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function suggestSafeStart(durationMin, meetings = []) {
  let t = Date.now() + 60 * 1000;
  for (let i = 0; i < 48; i++) {
    const end = t + durationMin * 60 * 1000;
    if (!checkCollision(end, meetings).collision) return t;
    t += 15 * 60 * 1000;
  }
  return Date.now() + 60 * 60 * 1000;
}

export function formatCountdown(ms) {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
