/**
 * HUMA2.0 Core State & PubSub Bus v2031.2
 * Центральне сховище стану з локальним збереженням та шиною підписок.
 */
const STORAGE_KEY = 'huma2_state_v2031';

const defaultState = {
  strain: 5,
  pfandInPocket: true,
  laundry: [
    { id: 1, name: 'Партія #1 (Шкарпетки/База)', endTimestamp: 0, done: true },
    { id: 2, name: 'Партія #2 (Верхній одяг)', endTimestamp: 0, done: true },
    { id: 3, name: 'Партія #3 (Постіль)', endTimestamp: Date.now() + 50 * 60 * 1000, done: false }
  ],
  paretoActions: [],
  telemetryLog: ['Ініціалізація ядра HUMA2.0']
};

class Store {
  constructor() {
    this.state = this.load();
    this.listeners = [];
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...defaultState, ...JSON.parse(raw) } : { ...defaultState };
    } catch (e) {
      return { ...defaultState };
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {}
    this.notify();
  }

  subscribe(fn) {
    this.listeners.push(fn);
  }

  notify() {
    this.listeners.forEach((fn) => fn(this.state));
  }

  setStrain(val) {
    this.state.strain = Math.min(10, Math.max(1, parseInt(val, 10)));
    this.save();
  }

  setPfand(val) {
    this.state.pfandInPocket = Boolean(val);
    this.save();
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
    this.save();
  }

  setParetoActions(actions) {
    this.state.paretoActions = actions;
    this.save();
  }

  removeParetoAction(id) {
    this.state.paretoActions = this.state.paretoActions.filter((a) => a.id !== id);
    this.save();
  }

  logEvent(msg) {
    const time = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    this.state.telemetryLog.unshift(`[${time}] ${msg}`);
    if (this.state.telemetryLog.length > 20) this.state.telemetryLog.pop();
    this.save();
  }
}

export const store = new Store();
