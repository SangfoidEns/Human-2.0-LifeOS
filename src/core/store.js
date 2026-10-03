const DB_NAME = 'HUMA2_CORE_DB';
const DB_VERSION = 5;
const STORE_CONFIG = 'system_config';
const STORE_TELEMETRY = 'telemetry_stream';

const defaultDaySchedule = [
  { id: 'sc_01', time: '08:30', domain: 'HEALTH', title: 'Гідратація з сіллю + суглоби', desc: 'Електроліти, хондропротектори, підготовка зв\'язок.', completed: true },
  { id: 'sc_02', time: '09:00', domain: 'HEALTH', title: 'Chandra Namaskar (Коло Місяця)', desc: '15 хв бічного витягнення фасцій без компресії L1-L5.', completed: true },
  { id: 'sc_03', time: '10:00', domain: 'LEARN', title: 'Німецька мова: лексичний спринт', desc: 'Відмінки, дієслова з прийменниками, живі діалоги.', completed: true },
  { id: 'sc_04', time: '11:00', domain: 'WORK', title: 'Дві короткі ділові зустрічі', desc: 'Ранкові переговори (завершено вчасно).', completed: true },
  { id: 'sc_05', time: '12:30', domain: 'REST', title: 'Ментальний спокій & музичний блок', desc: 'Перезавантаження уваги, чистий авторський фокус.', completed: true },
  { id: 'sc_06', time: '14:30', domain: 'WORK', title: 'Зустріч #1 (10 хв мікроспринт)', desc: 'Чітка фіксація домовленостей — ЗАВЕРШЕНО.', completed: true },
  { id: 'sc_07', time: '15:15', domain: 'HEALTH', title: 'Zero-Standing обід: Спагеті + тефтелі', desc: '8 хв al dente. Поповнення глікогену без харчової коми.', completed: true },
  { id: 'sc_08', time: '16:00', domain: 'REST', title: 'Глибока декомпресія 90/90 + Тета 6 Гц', desc: 'Зняття захисного тонусу клубово-поперекового м\'яза.', completed: false },
  { id: 'sc_09', time: '17:00', domain: 'LEARN', title: 'Інженерія LifeOS (Humans 2.0)', desc: 'Тестування коду репозиторію та аналітика.', completed: false },
  { id: 'sc_10', time: '17:30', domain: 'WORK', title: '⚽ Тактичний план тренування (неділя)', desc: 'Розстановка квадратів 4х2 та воротарської зони L4-S1.', completed: false },
  { id: 'sc_11', time: '18:00', domain: 'WORK', title: 'Ключова зустріч #2 (Ділова угода)', desc: 'Головні перемовини дня. Максимальна концентрація.', completed: false },
  { id: 'sc_12', time: '19:30', domain: 'CHORE', title: 'Келлер: Забір форми до тренування', desc: 'Підйом кошика суворо через коліна без нахилу спини.', completed: false },
  { id: 'sc_13', time: '21:30', domain: 'REST', title: 'Циркадний щит & Підготовка до сну', desc: 'Бурштиновий спектр, сон не пізніше 22:30 перед матчем.', completed: false }
];

const defaultState = {
  strain: 5,
  pfandInPocket: true,
  slouchGuardActive: false,
  calibrationDay: 14,
  triScore: 82,
  chrono: {
    isHoliday: true,
    holidayName: 'Tag der Deutschen Einheit',
    isStoreClosed: true,
    dayOfWeek: 6,
    energyProfile: 'PEAK',
    dayTheme: 'ПІКОВА ПРОДУКТИВНІСТЬ // СУБОТА (ПЕРЕДМАТЧ)',
    tomorrowIsTrainingDay: true
  },
  trainingPlan: {
    title: 'Недільне ранкове тренування (Футбол)',
    warmup: '15 хв: мобільність кульшових суглобів, сідничні м\'язи, нуль нахилів у попереку',
    mainBlock: 'Квадрати 4х2 з обмеженням 2 дотики, комбінації в коридорах',
    finishing: 'Удари після передачі на хід, контроль спини при зупинці м\'яча'
  },
  vital: {
    waterGlasses: 4,
    electrolytesTaken: true,
    jointVitaminsTaken: true,
    lastWaterTimestamp: Date.now(),
    circadianActive: false,
    circadianAuto: true
  },
  daySchedule: defaultDaySchedule,
  laundry: [
    { id: 1, name: 'Партія #1 (Шкарпетки/База)', endTimestamp: 0, done: true },
    { id: 2, name: 'Партія #2 (Верхній одяг)', endTimestamp: 0, done: true },
    { id: 3, name: 'Партія #3 (Постіль)', endTimestamp: Date.now() + 25 * 60 * 1000, done: false }
  ],
  paretoActions: [],
  telemetryLog: ['Ядро HUMA2.0: Архітектуру системи оновлено до стандарту 2031.11']
};

class Store {
  constructor() {
    this.state = { ...defaultState };
    this.listeners = [];
    this.db = null;
    this.initDB();
  }

  async initDB() {
    try {
      this.db = await new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_CONFIG)) {
            db.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(STORE_TELEMETRY)) {
            db.createObjectStore(STORE_TELEMETRY, { keyPath: 'timestamp' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      await this.restoreFromDB();
    } catch (e) {
      const raw = localStorage.getItem('huma2_state_fallback');
      if (raw) {
        try { this.state = { ...this.state, ...JSON.parse(raw) }; } catch (err) {}
      }
    }
    this.recalculateTRI();
    this.notify();
  }

  async restoreFromDB() {
    if (!this.db) return;
    return new Promise((resolve) => {
      const tx = this.db.transaction(STORE_CONFIG, 'readonly');
      const store = tx.objectStore(STORE_CONFIG);
      const req = store.get('root_state');
      req.onsuccess = () => {
        if (req.result && req.result.data) {
          this.state = { ...this.state, ...req.result.data };
          if (!this.state.daySchedule || this.state.daySchedule.length === 0) {
            this.state.daySchedule = defaultDaySchedule;
          }
          this.notify();
        }
        resolve();
      };
      req.onerror = () => resolve();
    });
  }

  async persist() {
    try {
      localStorage.setItem('huma2_state_fallback', JSON.stringify(this.state));
    } catch (e) {}

    if (this.db) {
      try {
        const tx = this.db.transaction(STORE_CONFIG, 'readwrite');
        const store = tx.objectStore(STORE_CONFIG);
        store.put({ key: 'root_state', data: this.state, updated: Date.now() });
      } catch (e) {}
    }
    this.notify();
  }

  recalculateTRI() {
    let score = 100;
    score -= (this.state.strain - 1) * 7;
    const waterDeficit = Math.max(0, 6 - (this.state.vital?.waterGlasses || 0));
    score -= waterDeficit * 4;
    if (this.state.vital?.electrolytesTaken) score += 3;
    if (this.state.vital?.jointVitaminsTaken) score += 3;
    this.state.triScore = Math.max(15, Math.min(100, Math.round(score)));
  }

  subscribe(fn) { this.listeners.push(fn); }
  notify() { this.listeners.forEach((fn) => fn(this.state)); }

  setStrain(val) {
    this.state.strain = Math.min(10, Math.max(1, parseInt(val, 10)));
    this.recalculateTRI();
    this.persist();
  }

  setPfand(val) {
    this.state.pfandInPocket = Boolean(val);
    this.persist();
  }

  setSlouchGuard(val) {
    this.state.slouchGuardActive = Boolean(val);
    this.persist();
  }

  toggleScheduleItem(id) {
    const item = (this.state.daySchedule || []).find((s) => s.id === id);
    if (item) {
      item.completed = !item.completed;
      this.logEvent(`Розклад: «${item.title}» -> ${item.completed ? 'ВИКОНАНО' : 'В РОБОТІ'}`);
      this.persist();
    }
  }

  addLaundry(mins) {
    const nextId = this.state.laundry.length + 1;
    this.state.laundry.push({
      id: nextId,
      name: `Партія #${nextId} (${mins} хв)`,
      endTimestamp: Date.now() + mins * 60 * 1000,
      done: false
    });
    this.logEvent(`Запущено партію прання #${nextId} на ${mins} хв`);
    this.persist();
  }

  setParetoActions(actions) {
    this.state.paretoActions = actions;
    this.persist();
  }

  removeParetoAction(id) {
    this.state.paretoActions = this.state.paretoActions.filter((a) => a.id !== id);
    this.persist();
  }

  logEvent(msg) {
    const now = Date.now();
    const time = new Date(now).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entry = `[${time}] ${msg}`;
    this.state.telemetryLog.unshift(entry);
    if (this.state.telemetryLog.length > 25) this.state.telemetryLog.pop();

    if (this.db) {
      try {
        const tx = this.db.transaction(STORE_TELEMETRY, 'readwrite');
        tx.objectStore(STORE_TELEMETRY).put({ timestamp: now, log: msg, strain: this.state.strain, tri: this.state.triScore });
      } catch (e) {}
    }
    this.persist();
  }

  exportData() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.state, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `huma2_backup_day${this.state.calibrationDay}.json`);
    dl.click();
  }
}

export const store = new Store();
