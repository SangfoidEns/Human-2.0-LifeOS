/**
 * HUMA 2.0 · Omni-Parser 3.0 · 90/10 Distillator
 * Local heuristic · UA / DE / EN · no network
 */
const TIME_RE = /(?:о|um|at|в)\s*(\d{1,2})[:.](\d{2})|(\d{1,2})[:.](\d{2})\s*(?:год|Uhr|h)?/gi;
const PAIN_RE = /бол(ить|ить|ю)|спазм|простріл|rückenschmerz|lumbago|l[45]|l5|поперек|хребец/i;
const WEIGHT_RE = /(\d+(?:[.,]\d+)?)\s*(кг|kg|кілограм)/i;
const PFAND_RE = /pfand|пляшк|flasche|залог|тару/i;
const PASTA_RE = /паста|спагеті|spaghetti|kochen|варити|обід|essen/i;
const LAUNDRY_RE = /пранн|пралка|wäsche|келлер|підвал|keller/i;
const FOOTBALL_RE = /футбол|тренуванн|матч|воротар|training|fussball|torwart/i;
const MONEY_RE = /(\d+(?:[.,]\d+)?)\s*(€|євро|euro)/i;
const WATER_RE = /вод(а|и)|trinken|гідрат/i;

export function parseRaw(text) {
  if (!text || typeof text !== 'string') return { actions: [], noise: true };
  const raw = text.trim();
  if (!raw) return { actions: [], noise: true };

  const actions = [];
  const lower = raw.toLowerCase();

  // Time slots
  let m;
  const times = [];
  TIME_RE.lastIndex = 0;
  while ((m = TIME_RE.exec(raw)) !== null) {
    const h = parseInt(m[1] || m[3], 10);
    const min = parseInt(m[2] || m[4], 10);
    if (h >= 0 && h < 24) times.push({ h, min, label: `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}` });
  }
  times.slice(0, 2).forEach(t => {
    actions.push({
      type: 'slot',
      title: `Слот ${t.label}`,
      meta: 'Захист буфера ±15 хв',
      icon: '⏱️',
      payload: t
    });
  });

  if (PAIN_RE.test(raw)) {
    actions.push({
      type: 'pain',
      title: 'Сигнал болю / спазму',
      meta: 'Підвищити Strain · 90/90',
      icon: '🦴',
      payload: { raiseStrain: true }
    });
  }

  if (WEIGHT_RE.test(raw)) {
    const wm = raw.match(WEIGHT_RE);
    const kg = parseFloat((wm?.[1] || '0').replace(',', '.'));
    actions.push({
      type: 'weight',
      title: `Вантаж ~${kg} кг`,
      meta: kg > 5 ? 'Симетрія 50/50 · лікті до корпусу' : 'Контроль постави',
      icon: '📦',
      payload: { kg }
    });
  }

  if (PFAND_RE.test(raw)) {
    actions.push({
      type: 'pfand',
      title: 'Pfand-Bon',
      meta: 'Пред’явити на касі до закриття чека',
      icon: '🧾',
      payload: {}
    });
  }

  if (PASTA_RE.test(raw)) {
    actions.push({
      type: 'pasta',
      title: 'Паста Al Dente',
      meta: 'Таймер 8 хв · Zero-Standing',
      icon: '🍝',
      payload: { minutes: 8 }
    });
  }

  if (LAUNDRY_RE.test(raw)) {
    actions.push({
      type: 'laundry',
      title: 'Келлер / прання',
      meta: 'Collision Guard перевірить розклад',
      icon: '🧺',
      payload: { minutes: 45 }
    });
  }

  if (FOOTBALL_RE.test(raw)) {
    actions.push({
      type: 'football',
      title: 'Футбольний блок',
      meta: 'Тактичний планшет · TRI',
      icon: '⚽',
      payload: {}
    });
  }

  if (MONEY_RE.test(raw)) {
    const mm = raw.match(MONEY_RE);
    actions.push({
      type: 'money',
      title: `Витрата ${mm?.[0] || ''}`,
      meta: 'Тижневий ліміт Rewe',
      icon: '💶',
      payload: {}
    });
  }

  if (WATER_RE.test(raw)) {
    actions.push({
      type: 'water',
      title: 'Гідратація',
      meta: '+1 склянка 250 мл',
      icon: '💧',
      payload: { cups: 1 }
    });
  }

  // 90/10 — keep max 3
  const distilled = actions.slice(0, 3);
  return {
    actions: distilled,
    noise: distilled.length === 0,
    originalLength: raw.length
  };
}
