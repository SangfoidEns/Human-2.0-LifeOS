import { store } from '../core/store.js';
import { audio } from '../core/audio.js';

/**
 * HUMA2.0 Omni-Parser & 10% Pareto Distiller Engine v2031.2
 * Автономний семантичний розбір без хмарних API.
 * Відсікає 90% мовного шуму, виділяючи 10% критичних дій із розрахунком ваги (Impact Score).
 */
export class ParetoParser {
  static distill(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];
    
    const text = rawText.trim();
    const lower = text.toLowerCase();
    const candidates = [];

    // 1. ДЕТЕКЦІЯ ЧАСУ ТА ЗУСТРІЧЕЙ (HH:MM або 'о 14', 'в 18:30')
    const timeMatch = text.match(/(?:о|в|at)?\s*([0-1]?[0-9]|2[0-3])[:.]([0-5][0-9])/i) ||
                      text.match(/(?:о|в)\s*([0-1]?[0-9]|2[0-3])\s*(?:годині|год|h)?/i);
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, '0');
      const mins = timeMatch[2] ? timeMatch[2] : '00';
      const parsedTime = `${hours}:${mins}`;
      
      candidates.push({
        id: 'time_' + Date.now(),
        type: 'TEMPORAL',
        score: 95, // Критичний пріоритет
        title: `Фіксація слота: ${parsedTime}`,
        desc: `Виявлено часовий якір у нотатках: ${parsedTime}`,
        actionLabel: `Захистити буфер ${parsedTime}`,
        execute: () => {
          audio.focusPulse();
          store.logEvent(`Слот ${parsedTime} внесено до оперативного розкладу`);
        }
      });
    }

    // 2. ДЕТЕКЦІЯ СИМПТОМІВ СПИНИ ТА ОСЬОВОГО НАВАНТАЖЕННЯ
    if (/спин|поперек|болит|тягн|ломит|спазм|диск|криж|l3|l4|l5|затис/i.test(lower)) {
      let detectedLevel = 6;
      if (/сильн|гостр|не можу|пече|блок/i.test(lower)) detectedLevel = 8;
      if (/трохи|легк|фонов/i.test(lower)) detectedLevel = 4;

      candidates.push({
        id: 'spine_' + Date.now(),
        type: 'BIOMECHANICS',
        score: 90,
        title: `Сигнал хребта: Напруга L${detectedLevel}`,
        desc: `Зафіксовано спазм поперекового відділу. Стояння заборонено.`,
        actionLabel: `Активувати L${detectedLevel} + 90/90`,
        execute: () => {
          store.setStrain(detectedLevel);
          audio.relaxPulse();
          const decompBtn = document.getElementById('btnDecomp');
          if (decompBtn) decompBtn.click();
        }
      });
    }

    // 3. ДЕТЕКЦІЯ ФІНАНСІВ, ЧЕКІВ ТА ПЛЯШОК (PFAND / REWE)
    const moneyMatch = text.match(/(\d+[.,]?\d*)\s*(?:€|eur|євро|грн|euro)/i);
    const hasPfandKeyword = /pfand|пляшк|чек|rewe|кас/i.test(lower);

    if (moneyMatch || hasPfandKeyword) {
      const sumStr = moneyMatch ? `${moneyMatch[1]}€` : 'активний чек';
      candidates.push({
        id: 'resource_' + Date.now(),
        type: 'RESOURCE',
        score: 80,
        title: `Тригер ресурсу: Pfand (${sumStr})`,
        desc: `Не забудьте пред'явити чек повернення тари на касі.`,
        actionLabel: `Зафіксувати чек у пам'яті`,
        execute: () => {
          store.setPfand(true);
          audio.click();
        }
      });
    }

    // 4. ДЕТЕКЦІЯ КУЛІНАРНОГО ПАЛИВА ТА ГОТУВАННЯ
    if (/паст|макарон|спагет|їст|голод|вечер|обід|тефтел|гарнір/i.test(lower)) {
      candidates.push({
        id: 'metabolic_' + Date.now(),
        type: 'METABOLIC',
        score: 75,
        title: `Оптимальне паливо: Спагеті Al Dente`,
        desc: `Сумісність із тефтелями: висока. Час стояння біля плити: 0 хв.`,
        actionLabel: `Запустити 8 хв варіння`,
        execute: () => {
          const navMetabolic = document.querySelector('[data-tab="metabolic"]');
          if (navMetabolic) navMetabolic.click();
          const pastaBtn = document.getElementById('btnPastaTimer');
          if (pastaBtn) pastaBtn.click();
        }
      });
    }

    // 5. ДЕТЕКЦІЯ ПОБУТОВИХ КОНВЕЄРІВ (ПРАННЯ / КЕЛЛЕР)
    if (/пран|пралк|стірк|підвал|келлер|білизн/i.test(lower)) {
      candidates.push({
        id: 'conveyor_' + Date.now(),
        type: 'CONVEYOR',
        score: 70,
        title: `Побутовий конвеєр: Прання`,
        desc: `Запуск циклу в підвалі без конфлікту із зустрічами.`,
        actionLabel: `+ Партія 70 хв (Келлер)`,
        execute: () => {
          store.addLaundry(70);
          audio.click();
          const navDaemons = document.querySelector('[data-tab="daemons"]');
          if (navDaemons) navDaemons.click();
        }
      });
    }

    // 10% PARETO FILTER: Сортуємо за оцінкою ваги та залишаємо тільки топ-3 критичні дії
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 3);
  }
}
