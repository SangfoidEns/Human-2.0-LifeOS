/**
 * HUMA 2.0 · Day gravity centers + buffers
 */
import { formatCountdown } from './chronoMatrix.js';

const DEFAULT_MEETINGS = [
  { id: 'm1', label: 'Дзвінок / Zoom', h: 14, min: 30, dur: 15 },
  { id: 'm2', label: 'Вечірній слот', h: 18, min: 0, dur: 20 }
];

export function getMeetings() {
  return DEFAULT_MEETINGS.map(m => {
    const start = new Date();
    start.setHours(m.h, m.min, 0, 0);
    return {
      ...m,
      startTs: start.getTime(),
      endTs: start.getTime() + m.dur * 60 * 1000
    };
  });
}

export function nextMeeting() {
  const now = Date.now();
  const list = getMeetings().filter(m => m.endTs > now).sort((a, b) => a.startTs - b.startTs);
  return list[0] || null;
}

export function countdownToNext() {
  const n = nextMeeting();
  if (!n) return null;
  return {
    meeting: n,
    left: n.startTs - Date.now(),
    text: formatCountdown(n.startTs - Date.now())
  };
}

export function germanPhraseOfDay() {
  const phrases = [
    { de: 'Einen schönen Tag noch.', uk: 'Гарного дня.' },
    { de: 'Wo ist der Ausgang?', uk: 'Де вихід?' },
    { de: 'Ich hätte gerne einen Termin.', uk: 'Я б хотів записатися.' },
    { de: 'Können Sie mir helfen?', uk: 'Ви можете мені допомогти?' },
    { de: 'Die Rechnung, bitte.', uk: 'Рахунок, будь ласка.' },
    { de: 'Ich verstehe das nicht.', uk: 'Я цього не розумію.' },
    { de: 'Einen Moment, bitte.', uk: 'Хвилинку, будь ласка.' }
  ];
  const day = new Date().getDate();
  return phrases[day % phrases.length];
}
