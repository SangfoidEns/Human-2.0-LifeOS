import { store } from '../core/store.js';
import { audio } from '../core/audio.js';
import { voice } from '../core/voice.js';

export class ParetoParser {
  static distill(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];

    const text = rawText.trim();
    const lower = text.toLowerCase();
    const candidates = [];

    const timeMatch = text.match(/(?:о|в|at|um)?\s*([0-1]?[0-9]|2[0-3])[:.]([0-5][0-9])/i) ||
                      text.match(/(?:о|в|um)\s*([0-1]?[0-9]|2[0-3])\s*(?:uhr|годині|год|h)?/i);
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, '0');
      const mins = timeMatch[2] ? timeMatch[2] : '00';
      const parsedTime = `${hours}:${mins}`;

      candidates.push({
        id: 'time_' + Date.now(),
        type: 'TEMPORAL',
        score: 95,
        title: `Фіксація слота: ${parsedTime}`,
        desc: `Часовий якір зафіксовано: ${parsedTime}`,
        actionLabel: `Захистити буфер ${parsedTime}`,
        execute: () => {
          audio.focusPulse();
          store.logEvent(`Слот ${parsedTime} захищено від колізій`);
          voice.speak(`Слот о ${parsedTime} додано до системи.`);
        }
      });
    }

    if (/спин|поперек|болит|тягн|ломит|спазм|диск|криж|l3|l4|l5|rücken|schmerz|lenden|wirbel/i.test(lower)) {
      let detectedLevel = 6;
      if (/сильн|гостр|не можу|пече|блок|простріл|stark|akut|block/i.test(lower)) detectedLevel = 8;
      if (/трохи|легк|фонов|leicht|etwas/i.test(lower)) detectedLevel = 4;

      candidates.push({
        id: 'spine_' + Date.now(),
        type: 'BIOMECHANICS',
        score: 92,
        title: `Сигнал хребта: Напруга L${detectedLevel}`,
        desc: `Зафіксовано тонус попереку. Zero-Standing активний.`,
        actionLabel: `Активувати L${detectedLevel} + 90/90`,
        execute: () => {
          store.setStrain(detectedLevel);
          audio.relaxPulse();
          document.getElementById('btnDecomp')?.click();
          voice.speak(`Рівень напруги L${detectedLevel}. Стояння скасовано, переходимо в позу 90/90.`);
        }
      });
    }

    if (/футбол|тренуван|матч|воротар|fussball|training|spiel|torwart/i.test(lower)) {
      candidates.push({
        id: 'football_' + Date.now(),
        type: 'FOOTBALL',
        score: 88,
        title: `⚽ Тактичний план тренування`,
        desc: `Схеми 4х2, 3х3 та воротарський захист L4-S1.`,
        actionLabel: `Відкрити планшет поля`,
        execute: () => {
          document.querySelector('[data-tab="tactics"]')?.click();
          voice.speak(`Тактичний планшет тренування відкрито.`);
        }
      });
    }

    if (/pfand|пляшк|чек|rewe|кас|hbf|bahnhof|einkauf/i.test(lower)) {
      candidates.push({
        id: 'resource_' + Date.now(),
        type: 'RESOURCE',
        score: 82,
        title: `Логістика: Rewe Hbf / Pfand`,
        desc: `3 жовтня свято: відкритий тільки Hauptbahnhof.`,
        actionLabel: `Координати Hbf / Pfand`,
        execute: () => {
          document.getElementById('btnHbfInfo')?.click();
        }
      });
    }

    if (/паст|макарон|спагет|їст|голод|вечер|обід|тефтел|pasta|spaghetti|kochen|essen/i.test(lower)) {
      candidates.push({
        id: 'metabolic_' + Date.now(),
        type: 'METABOLIC',
        score: 75,
        title: `Паливо: Спагеті Al Dente + тефтелі`,
        desc: `8 хв варіння. Zero-Standing стандарт.`,
        actionLabel: `Старт таймера 8 хв`,
        execute: () => {
          document.querySelector('[data-tab="metabolic"]')?.click();
          document.getElementById('btnPastaTimer')?.click();
        }
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 3);
  }
}
