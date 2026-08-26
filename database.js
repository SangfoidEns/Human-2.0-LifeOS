/**
 * database.js
 * ------------------------------------------------------------------
 * Легкий шар персистентності на базі JSON-файлу (`fs`).
 * Призначений для швидкого прототипування "Human 2.0: LifeOS".
 *
 * Архітектурно ізольований за принципом Repository Pattern:
 * увесь доступ до даних проходить через методи цього модуля,
 * тому в майбутньому файл можна замінити на PostgreSQL/MongoDB
 * адаптер без зміни серверної логіки (server.js).
 * ------------------------------------------------------------------
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Шлях до файлу-сховища даних користувачів
const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'users.json');

// Стандартний (дефолтний) стан нового користувача
const DEFAULT_USER_STATE = Object.freeze({
  energy: 65,
  focus: 50,
  biorhythm: 'stable', // 'rising' | 'stable' | 'falling'
  streak: 0,
  lastSync: null,
  createdAt: null,
});

/**
 * Гарантує наявність директорії та файлу бази даних.
 * Викликається один раз при старті модуля (та ідемпотентна при повторних викликах).
 */
function ensureStorageReady() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2), 'utf-8');
    }
  } catch (err) {
    // Критична помилка ініціалізації — без сховища сервер не може працювати коректно
    console.error('[database.js] Не вдалося ініціалізувати сховище даних:', err);
    throw err;
  }
}

/**
 * Синхронно читає весь вміст файлу бази даних.
 * У разі пошкодження JSON — повертає порожній об'єкт замість краху процесу.
 * @returns {Object<string, object>} мапа userId -> userState
 */
function readAll() {
  ensureStorageReady();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('[database.js] Помилка читання/парсингу users.json. Відновлення до порожньої бази:', err);
    return {};
  }
}

/**
 * Атомарно записує весь стан бази у файл.
 * Використовує запис у тимчасовий файл + rename, щоб уникнути пошкодження
 * даних при паралельних запитах або аварійному завершенні процесу.
 * @param {Object<string, object>} data
 */
function writeAll(data) {
  ensureStorageReady();
  const tmpPath = `${DB_PATH}.tmp`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, DB_PATH);
  } catch (err) {
    console.error('[database.js] Помилка запису у users.json:', err);
    throw err;
  }
}

/**
 * Отримує стан користувача за ID. Якщо користувача не існує —
 * створює новий запис із дефолтними значеннями (lazy-init).
 * @param {string|number} userId
 * @returns {object} стан користувача
 */
function getUser(userId) {
  if (userId === undefined || userId === null || String(userId).trim() === '') {
    throw new Error('userId є обов’язковим параметром');
  }
  const id = String(userId);
  const db = readAll();

  if (!db[id]) {
    const now = new Date().toISOString();
    db[id] = {
      ...DEFAULT_USER_STATE,
      createdAt: now,
      lastSync: now,
    };
    writeAll(db);
  }

  return db[id];
}

/**
 * Оновлює (часткове злиття) стан користувача — рівень енергії/фокусу тощо.
 * @param {string|number} userId
 * @param {object} patch - поля для оновлення, напр. { energy: 80, focus: 40 }
 * @returns {object} оновлений стан користувача
 */
function updateUser(userId, patch = {}) {
  if (userId === undefined || userId === null || String(userId).trim() === '') {
    throw new Error('userId є обов’язковим параметром');
  }
  const id = String(userId);
  const db = readAll();
  const existing = db[id] || { ...DEFAULT_USER_STATE, createdAt: new Date().toISOString() };

  const merged = {
    ...existing,
    ...patch,
    lastSync: new Date().toISOString(),
  };

  db[id] = merged;
  writeAll(db);

  return merged;
}

module.exports = {
  DEFAULT_USER_STATE,
  ensureStorageReady,
  getUser,
  updateUser,
};
