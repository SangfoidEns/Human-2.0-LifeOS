/**
 * HUMA 2.0 · Reactive Store + IndexedDB
 * Resilient offline state, versioned schema, crash recovery
 */
const DB_NAME = 'HUMA2_CORE_DB';
const DB_VERSION = 1;
const STORE_CONFIG = 'system_config';
const STORE_SCHEDULE = 'day_schedule';
const STORE_TACTICS = 'football_tactics';
const STORE_TELEMETRY = 'telemetry_stream';

let db = null;
const listeners = new Map();
const memory = {
  strain: 3,
  water: 0,
  electrolytes: false,
  voiceOn: true,
  tri: 85,
  activeTimer: null, // { id, label, endTs, type }
  tasks: [],
  journal: [],
  config: {},
  lastBackup: null
};

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event).delete(fn);
}

function emit(event, data) {
  const set = listeners.get(event);
  if (set) set.forEach(fn => { try { fn(data); } catch (e) { console.warn('[Store]', e); } });
}

export function getState() {
  return { ...memory };
}

export function setStrain(level) {
  memory.strain = Math.max(1, Math.min(10, level));
  emit('strain', memory.strain);
  emit('change', memory);
  persistConfig();
  return memory.strain;
}

export function addWater(cups = 1) {
  memory.water = Math.min(12, memory.water + cups);
  emit('water', memory.water);
  emit('change', memory);
  persistConfig();
}

export function setElectrolytes(v) {
  memory.electrolytes = !!v;
  emit('change', memory);
  persistConfig();
}

export function setVoice(on) {
  memory.voiceOn = !!on;
  emit('voice', memory.voiceOn);
  persistConfig();
}

export function setActiveTimer(timer) {
  memory.activeTimer = timer;
  emit('timer', timer);
  emit('change', memory);
}

export function clearTimer() {
  memory.activeTimer = null;
  emit('timer', null);
  emit('change', memory);
}

export function addTask(task) {
  memory.tasks.unshift({ id: 't' + Date.now(), done: false, ts: Date.now(), ...task });
  if (memory.tasks.length > 40) memory.tasks.length = 40;
  emit('tasks', memory.tasks);
  persistSchedule();
}

export function toggleTask(id) {
  const t = memory.tasks.find(x => x.id === id);
  if (t) { t.done = !t.done; emit('tasks', memory.tasks); persistSchedule(); }
}

export function removeTask(id) {
  memory.tasks = memory.tasks.filter(x => x.id !== id);
  emit('tasks', memory.tasks);
  persistSchedule();
}

export function logTelemetry(type, payload = {}) {
  const entry = { type, payload, ts: Date.now(), strain: memory.strain };
  memory.journal.unshift(entry);
  if (memory.journal.length > 60) memory.journal.length = 60;
  if (db) {
    try {
      const tx = db.transaction(STORE_TELEMETRY, 'readwrite');
      tx.objectStore(STORE_TELEMETRY).add(entry);
    } catch (e) {}
  }
}

export function calcTRI() {
  let score = 100;
  score -= Math.max(0, (memory.strain - 3) * 8);
  score -= Math.max(0, (6 - memory.water) * 4);
  if (!memory.electrolytes) score -= 5;
  memory.tri = Math.max(0, Math.min(100, Math.round(score)));
  emit('tri', memory.tri);
  return memory.tri;
}

async function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE_CONFIG)) d.createObjectStore(STORE_CONFIG);
      if (!d.objectStoreNames.contains(STORE_SCHEDULE)) d.createObjectStore(STORE_SCHEDULE, { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains(STORE_TACTICS)) d.createObjectStore(STORE_TACTICS, { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains(STORE_TELEMETRY)) {
        const s = d.createObjectStore(STORE_TELEMETRY, { keyPath: 'id', autoIncrement: true });
        s.createIndex('timestamp', 'ts', { unique: false });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

function persistConfig() {
  const data = {
    strain: memory.strain,
    water: memory.water,
    electrolytes: memory.electrolytes,
    voiceOn: memory.voiceOn,
    tri: memory.tri
  };
  try { localStorage.setItem('huma2_cfg', JSON.stringify(data)); } catch (e) {}
  if (db) {
    try {
      const tx = db.transaction(STORE_CONFIG, 'readwrite');
      tx.objectStore(STORE_CONFIG).put(data, 'main');
    } catch (e) {}
  }
}

function persistSchedule() {
  try { localStorage.setItem('huma2_tasks', JSON.stringify(memory.tasks)); } catch (e) {}
}

export async function initStore() {
  try {
    await openDB();
  } catch (e) {
    console.warn('[Store] IndexedDB unavailable, using localStorage only');
  }
  // cold start from localStorage
  try {
    const cfg = JSON.parse(localStorage.getItem('huma2_cfg') || '{}');
    if (cfg.strain) memory.strain = cfg.strain;
    if (cfg.water != null) memory.water = cfg.water;
    if (cfg.electrolytes != null) memory.electrolytes = cfg.electrolytes;
    if (cfg.voiceOn != null) memory.voiceOn = cfg.voiceOn;
  } catch (e) {}
  try {
    const tasks = JSON.parse(localStorage.getItem('huma2_tasks') || '[]');
    if (Array.isArray(tasks)) memory.tasks = tasks;
  } catch (e) {}
  calcTRI();
  emit('ready', memory);
  return memory;
}

export function exportJSON() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    config: {
      strain: memory.strain,
      water: memory.water,
      electrolytes: memory.electrolytes,
      voiceOn: memory.voiceOn
    },
    tasks: memory.tasks,
    journal: memory.journal.slice(0, 30)
  };
  return JSON.stringify(payload, null, 2);
}

export function importJSON(text) {
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object') throw new Error('Invalid');
    if (data.config) {
      if (data.config.strain) setStrain(data.config.strain);
      if (data.config.water != null) memory.water = data.config.water;
      if (data.config.electrolytes != null) memory.electrolytes = data.config.electrolytes;
    }
    if (Array.isArray(data.tasks)) {
      memory.tasks = data.tasks;
      emit('tasks', memory.tasks);
      persistSchedule();
    }
    emit('change', memory);
    return true;
  } catch (e) {
    return false;
  }
}
