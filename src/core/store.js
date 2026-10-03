const STORAGE_KEY = 'huma2_state_v2031';

const defaultState = {
  strain: 5,
  pfandInPocket: true,
  pastaSecTarget: 0,
  decompSecTarget: 0,
  laundry: [
    { id: 1, name: 'Партія #1 (Шкарпетки)', endTimestamp: 0, done: true },
    { id: 2, name: 'Партія #2 (Верхнє)', endTimestamp: 0, done: true },
    { id: 3, name: 'Партія #3 (Постіль)', endTimestamp: Date.now() + 45 * 60 * 1000, done: false }
  ],
  paretoActions: []
};

class Store {
  constructor() {
    this.state = this.load();
  }

  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultState, ...JSON.parse(raw) } : { ...defaultState };
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    window.dispatchEvent(new CustomEvent('huma-state-update', { detail: this.state }));
  }

  setStrain(val) {
    this.state.strain = parseInt(val, 10);
    this.save();
  }

  setPfand(val) {
    this.state.pfandInPocket = val;
    this.save();
  }

  addLaundry(mins) {
    const nextId = this.state.laundry.length + 1;
    this.state.laundry.push({
      id: nextId,
      name: `Партія #${nextId}`,
      endTimestamp: Date.now() + mins * 60 * 1000,
      done: false
    });
    this.save();
  }

  addParetoAction(action) {
    this.state.paretoActions.unshift(action);
    if (this.state.paretoActions.length > 5) this.state.paretoActions.pop();
    this.save();
  }
}

export const store = new Store();
