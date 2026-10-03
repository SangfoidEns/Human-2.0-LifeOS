import { store } from '../core/store.js';
import { audio } from '../core/audio.js';

export class ParetoParser {
  static distill(rawText) {
    const text = rawText.toLowerCase();
    const insights = [];

    // Біомеханіка / Спина
    if (/спин|поперек|болит|тягн|спазм|нахил/.test(text)) {
      insights.push({
        type: 'SPINE',
        title: 'Зафіксовано спазм попереку',
        actionLabel: 'Увімкнути декомпресію 90/90',
        execute: () => {
          store.setStrain(7);
          audio.relaxPulse();
        }
      });
    }

    // Закупівлі / Pfand
    if (/pfand|пляшк|чек|rewe|куп|магаз/.test(text)) {
      insights.push({
        type: 'RESOURCE',
        title: 'Пріоритет: Чек Pfand у кишені',
        actionLabel: 'Віддати касиру на касі',
        execute: () => {
          store.setPfand(true);
          audio.click();
        }
      });
    }

    // Їжа / Паста
    if (/паст|макарон|спагет|їст|голод|тефтел/.test(text)) {
      insights.push({
        type: 'FUEL',
        title: 'Паливо: Спагеті Al Dente + тефтелі',
        actionLabel: 'Таймер пасти (8 хв)',
        execute: () => {
          document.querySelector('[data-tab="metabolic"]').click();
          audio.focusPulse();
        }
      });
    }

    // Прання
    if (/пран|стірк|підвал|келлер/.test(text)) {
      insights.push({
        type: 'CONVEYOR',
        title: 'Конвеєр: Партія білизни в келлері',
        actionLabel: 'Запустити партію 70 хв',
        execute: () => {
          store.addLaundry(70);
          audio.click();
        }
      });
    }

    return insights;
  }
}
