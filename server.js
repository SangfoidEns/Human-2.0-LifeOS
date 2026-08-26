/**
 * server.js
 * ------------------------------------------------------------------
 * Головний вхідний файл бекенду "Human 2.0: LifeOS".
 *
 * Відповідальності:
 *  1. Підняти Express-сервер, що роздає статичний Mini App (/public).
 *  2. Надати REST API для читання/синхронізації стану користувача.
 *  3. (Опційно) Підняти Telegram-бота, який відправляє кнопку
 *     запуску Mini App через /start.
 * ------------------------------------------------------------------
 */

'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const db = require('./database');
const { validateTelegramInitData } = require('./telegramAuth');

const PORT = Number(process.env.PORT) || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();

// ------------------------------------------------------------------
// Middleware
// ------------------------------------------------------------------
app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '100kb' }));

// Простий лог запитів (без зовнішніх залежностей)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// Роздача статичних файлів Mini App
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------------------
// Допоміжні функції валідації
// ------------------------------------------------------------------

/**
 * Перевіряє, що значення є числом у діапазоні [0, 100].
 */
function isValidMetric(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

const ALLOWED_BIORHYTHMS = new Set(['rising', 'stable', 'falling']);
const BOT_TOKEN_CONFIGURED = Boolean(BOT_TOKEN && !BOT_TOKEN.includes('ExampleToken'));

// ------------------------------------------------------------------
// Middleware автентифікації Telegram WebApp
// ------------------------------------------------------------------
/**
 * Перевіряє заголовок `X-Telegram-Init-Data`, надісланий клієнтом.
 *
 * Поведінка:
 *  - Якщо BOT_TOKEN не налаштований на сервері (режим розробки без бота) —
 *    автентифікація пропускається повністю, req.isVerified = false.
 *  - Якщо initData присутній і валідний — req.telegramUser заповнюється
 *    справжніми даними користувача, req.isVerified = true.
 *  - Якщо initData присутній, але хеш не співпадає — запит одразу
 *    відхиляється з 401 (дані підроблені).
 *  - Якщо initData відсутній — запит пропускається як неавтентифікований
 *    (для Dev/Guest Mode); остаточне рішення приймає обробник маршруту.
 */
function telegramAuthMiddleware(req, res, next) {
  req.isVerified = false;
  req.telegramUser = null;

  if (!BOT_TOKEN_CONFIGURED) {
    // BOT_TOKEN не заданий — сервер працює в чистому dev/API-режимі без Telegram.
    return next();
  }

  const initData = req.get('X-Telegram-Init-Data');
  if (!initData) {
    return next(); // немає даних для перевірки — вважаємо неавтентифікованим (Guest Mode)
  }

  const result = validateTelegramInitData(initData, BOT_TOKEN);
  if (!result.valid) {
    console.warn('[auth] Відхилено запит з недійсним initData:', result.reason);
    return res.status(401).json({ ok: false, error: 'Автентифікацію Telegram не пройдено: дані недійсні або застарілі.' });
  }

  req.isVerified = true;
  req.telegramUser = result.user;
  return next();
}

/**
 * Гарантує, що :id у маршруті відповідає реальному автентифікованому
 * користувачу Telegram, або (у режимі розробки) є валідним Guest-ID.
 */
function authorizeUserAccess(req, res, next) {
  const { id } = req.params;

  if (req.isVerified) {
    const authenticatedId = req.telegramUser ? String(req.telegramUser.id) : null;
    if (!authenticatedId || authenticatedId !== id) {
      return res.status(403).json({
        ok: false,
        error: 'Доступ заборонено: ID у запиті не відповідає автентифікованому користувачу Telegram.',
      });
    }
    return next();
  }

  // Неавтентифіковано (немає initData або BOT_TOKEN не налаштований).
  // Дозволяємо доступ лише до гостьових ідентифікаторів, і лише поза продакшн.
  if (!id.startsWith('guest_')) {
    return res.status(401).json({
      ok: false,
      error: 'Необхідна автентифікація Telegram для доступу до цього профілю.',
    });
  }

  if (NODE_ENV === 'production' && BOT_TOKEN_CONFIGURED) {
    return res.status(401).json({
      ok: false,
      error: 'Гостьовий режим недоступний у продакшн середовищі.',
    });
  }

  return next();
}

// ------------------------------------------------------------------
// REST API
// ------------------------------------------------------------------

/**
 * GET /api/user/:id
 * Повертає збережений стан користувача (створює дефолтний, якщо відсутній).
 */
app.get('/api/user/:id', telegramAuthMiddleware, authorizeUserAccess, (req, res) => {
  const { id } = req.params;

  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(400).json({ ok: false, error: 'Некоректний ідентифікатор користувача.' });
  }

  try {
    const state = db.getUser(id);
    return res.status(200).json({ ok: true, user: state });
  } catch (err) {
    console.error('[GET /api/user/:id] Помилка:', err);
    return res.status(500).json({ ok: false, error: 'Внутрішня помилка сервера при читанні даних.' });
  }
});

/**
 * POST /api/user/:id/sync
 * Оновлює рівні енергії/фокусу (та за потреби біоритм) користувача.
 * Body: { energy?: number(0-100), focus?: number(0-100), biorhythm?: 'rising'|'stable'|'falling' }
 */
app.post('/api/user/:id/sync', telegramAuthMiddleware, authorizeUserAccess, (req, res) => {
  const { id } = req.params;
  const { energy, focus, biorhythm } = req.body || {};

  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(400).json({ ok: false, error: 'Некоректний ідентифікатор користувача.' });
  }

  const patch = {};

  if (energy !== undefined) {
    if (!isValidMetric(energy)) {
      return res.status(400).json({ ok: false, error: 'Поле "energy" має бути числом від 0 до 100.' });
    }
    patch.energy = Math.round(energy);
  }

  if (focus !== undefined) {
    if (!isValidMetric(focus)) {
      return res.status(400).json({ ok: false, error: 'Поле "focus" має бути числом від 0 до 100.' });
    }
    patch.focus = Math.round(focus);
  }

  if (biorhythm !== undefined) {
    if (!ALLOWED_BIORHYTHMS.has(biorhythm)) {
      return res.status(400).json({ ok: false, error: 'Поле "biorhythm" має бути одним з: rising, stable, falling.' });
    }
    patch.biorhythm = biorhythm;
  }

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ ok: false, error: 'Необхідно передати хоча б одне поле для оновлення (energy, focus, biorhythm).' });
  }

  try {
    const existing = db.getUser(id);
    // Автоматичний streak-лічильник: якщо енергія + фокус в сумі покращились
    const prevScore = (existing.energy || 0) + (existing.focus || 0);
    const nextEnergy = patch.energy !== undefined ? patch.energy : existing.energy;
    const nextFocus = patch.focus !== undefined ? patch.focus : existing.focus;
    const nextScore = nextEnergy + nextFocus;

    if (nextScore > prevScore) {
      patch.streak = (existing.streak || 0) + 1;
    }

    const updated = db.updateUser(id, patch);
    return res.status(200).json({ ok: true, user: updated });
  } catch (err) {
    console.error('[POST /api/user/:id/sync] Помилка:', err);
    return res.status(500).json({ ok: false, error: 'Внутрішня помилка сервера при збереженні даних.' });
  }
});

/**
 * GET /api/health
 * Простий health-check ендпоінт для моніторингу.
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({ ok: true, status: 'operational', env: NODE_ENV, timestamp: new Date().toISOString() });
});

// SPA-фолбек: будь-який інший GET-запит без розширення файлу -> index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 для невідомих API-роутів
app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, error: 'Ендпоінт не знайдено.' });
});

// Глобальний обробник помилок
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ ok: false, error: 'Сталася непередбачена помилка сервера.' });
});

// ------------------------------------------------------------------
// Запуск сервера
// ------------------------------------------------------------------
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(' HUMAN 2.0: LifeOS — Бекенд запущено');
  console.log(` Порт:        ${PORT}`);
  console.log(` Середовище:  ${NODE_ENV}`);
  console.log(` Локально:    http://localhost:${PORT}`);
  console.log('====================================================');
});

// ------------------------------------------------------------------
// (Опційно) Telegram-бот: /start -> кнопка запуску Mini App
// ------------------------------------------------------------------
function initTelegramBot() {
  if (!BOT_TOKEN || BOT_TOKEN.includes('ExampleToken')) {
    console.warn('[bot] BOT_TOKEN не налаштований (.env). Бот-модуль пропущено — сервер працює лише як API/веб-хост.');
    return;
  }
  if (!WEBAPP_URL || WEBAPP_URL.includes('example.com')) {
    console.warn('[bot] WEBAPP_URL не налаштований (.env). Кнопка запуску Mini App не буде працювати коректно.');
  }

  let TelegramBot;
  try {
    TelegramBot = require('node-telegram-bot-api');
  } catch (err) {
    console.warn('[bot] Пакет "node-telegram-bot-api" не встановлено. Виконайте `npm install`. Бот-модуль пропущено.');
    return;
  }

  const bot = new TelegramBot(BOT_TOKEN, { polling: true });

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from?.first_name || 'дослідник(-ця)';

    bot
      .sendMessage(
        chatId,
        `Вітаю, ${firstName}! 👋\n\n*HUMAN 2.0: LifeOS* — твоя персональна панель синхронізації тіла та розуму.\n\nНатисни кнопку нижче, щоб відкрити панель керування.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🚀 Відкрити LifeOS',
                  web_app: { url: WEBAPP_URL },
                },
              ],
            ],
          },
        }
      )
      .catch((err) => console.error('[bot] Помилка відправки повідомлення /start:', err.message));
  });

  bot.on('polling_error', (err) => {
    console.error('[bot] Помилка polling:', err.message);
  });

  console.log('[bot] Telegram-бот успішно запущено (polling режим).');
}

initTelegramBot();
