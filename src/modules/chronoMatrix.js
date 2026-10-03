import { store } from '../core/store.js';
import { audio } from '../core/audio.js';
import { voice } from '../core/voice.js';

export class ChronoMatrix {
  constructor() {
    this.now = new Date();
    this.holidaysBW = this.calculateHolidays(this.now.getFullYear());
    this.auditCurrentEnvironment();
  }

  getEasterSunday(year) {
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

  calculateHolidays(year) {
    const easter = this.getEasterSunday(year);
    const addDays = (baseDate, days) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + days);
      return d;
    };
    const formatKey = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    return [
      { key: '01-01', name: 'Neujahr (Новий Рік)' },
      { key: '01-06', name: 'Heilige Drei Könige (BW)' },
      { key: '05-01', name: 'Tag der Arbeit' },
      { key: '10-03', name: 'Tag der Deutschen Einheit' },
      { key: '11-01', name: 'Allerheiligen (BW)' },
      { key: '12-25', name: '1. Weihnachtstag' },
      { key: '12-26', name: '2. Weihnachtstag' },
      { key: formatKey(addDays(easter, -2)), name: 'Karfreitag' },
      { key: formatKey(addDays(easter, 1)), name: 'Ostermontag' },
      { key: formatKey(addDays(easter, 39)), name: 'Christi Himmelfahrt' },
      { key: formatKey(addDays(easter, 50)), name: 'Pfingstmontag' },
      { key: formatKey(addDays(easter, 60)), name: 'Fronleichnam (BW)' }
    ];
  }

  auditCurrentEnvironment() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monthKey = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const holiday = this.holidaysBW.find((h) => h.key === monthKey);
    const isSunday = dayOfWeek === 0;
    const isStoreClosed = isSunday || Boolean(holiday);

    let energyProfile = 'PEAK';
    let dayTheme = '';

    if (holiday) {
      dayTheme = `СВЯТО: ${holiday.name.toUpperCase()} // ШТУТГАРТ FEIERTAG`;
    } else if (dayOfWeek === 6) {
      dayTheme = 'ПІКОВА ПРОДУКТИВНІСТЬ // СУБОТА (ПЕРЕДМАТЧ)';
    } else if (dayOfWeek === 0) {
      dayTheme = 'MATCHDAY // РАНКОВИЙ ФУТБОЛ';
    } else if (dayOfWeek === 1 || dayOfWeek === 2) {
      dayTheme = 'РОЗВАНТАЖУВАЛЬНИЙ ЦИКЛ // ДЕЛОАД';
      energyProfile = 'DELOAD';
    }

    store.state.chrono = {
      isHoliday: Boolean(holiday),
      holidayName: holiday ? holiday.name : null,
      isStoreClosed,
      dayOfWeek,
      energyProfile,
      dayTheme,
      tomorrowIsTrainingDay: dayOfWeek === 6,
      hbfNotice: isStoreClosed ? 'Штутгарт: відкритий тільки Rewe City на Hauptbahnhof (Arnulf-Klett-Platz).' : null
    };

    store.persist();
    return store.state.chrono;
  }

  triggerStuttgartHbfGuide() {
    audio.focusPulse();
    const msg = 'Хума, сьогодні 3 жовтня, Tag der Deutschen Einheit. Якщо потрібні свіжі продукти чи хліб — на вокзалі Stuttgart Hauptbahnhof працює Rewe City.';
    const jarvisLog = document.getElementById('jarvisLog');
    if (jarvisLog) jarvisLog.innerText = `«${msg}»`;
    voice.speak(msg);
  }
}
