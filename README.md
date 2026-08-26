# HUMAN 2.0: LifeOS

Персональна bio-sync панель продуктивності, що працює всередині Telegram як Mini App (TMA).

## Структура проєкту

```
lifeos/
├── package.json
├── .env                  # конфігурація (замініть BOT_TOKEN / WEBAPP_URL на реальні)
├── database.js           # JSON-файлова персистентність (data/users.json створюється автоматично)
├── server.js             # Express-сервер + REST API + Telegram-бот
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

## Швидкий старт

```bash
npm install
cp .env.example .env   # або відредагуйте .env напряму
npm run dev             # режим розробки (nodemon)
# або
npm start                # продакшн-режим
```

Сервер підніметься на `http://localhost:3000` (або порту з `.env`).

## Налаштування Telegram-бота

1. Створіть бота через [@BotFather](https://t.me/BotFather), отримайте `BOT_TOKEN`.
2. Розгорніть застосунок (Vercel/Render/VPS) або підніміть тунель (ngrok / Cloudflare Tunnel) для локальної розробки.
3. Пропишіть публічний HTTPS URL у `WEBAPP_URL` в `.env`.
4. У BotFather виконайте `/setmenubutton` або `/newapp`, вказавши той самий URL — це підключить Mini App до кнопки меню бота.
5. Запустіть `npm start`. Бот почне polling і відповідатиме на `/start` кнопкою запуску LifeOS.

## REST API

| Метод | Ендпоінт                  | Опис                                             |
|-------|----------------------------|---------------------------------------------------|
| GET   | `/api/user/:id`             | Повертає (та за потреби створює) стан користувача |
| POST  | `/api/user/:id/sync`        | Оновлює `energy`, `focus`, `biorhythm`             |
| GET   | `/api/health`                | Health-check                                       |

## Безпека: верифікація Telegram initData

Кожен запит з клієнта до `/api/user/:id` та `/api/user/:id/sync` супроводжується
заголовком `X-Telegram-Init-Data` (сирий рядок `Telegram.WebApp.initData`).

На сервері (`telegramAuth.js`) цей рядок перевіряється за офіційною схемою Telegram:

1. Обчислюється `secret_key = HMAC_SHA256(BOT_TOKEN, key="WebAppData")`.
2. Обчислюється `HMAC_SHA256(data_check_string, key=secret_key)` та порівнюється
   з полем `hash` (константний час порівняння через `crypto.timingSafeEqual`).
3. Перевіряється "свіжість" `auth_date` (за замовчуванням — не старше 24 годин).
4. Middleware `authorizeUserAccess` додатково гарантує, що `:id` у URL-шляху
   збігається з реальним `id` автентифікованого користувача Telegram —
   тобто користувач A фізично не може прочитати чи змінити стан користувача B.

**Поведінка залежно від конфігурації:**

| Стан `BOT_TOKEN` в `.env`      | Поведінка API                                                        |
|---------------------------------|------------------------------------------------------------------------|
| Реальний токен (production)     | Сувора верифікація `initData`; підроблені/відсутні дані → `401`         |
| Не заданий (`ExampleToken`)     | Верифікація пропускається — зручно для локальної розробки без бота    |

Якщо `BOT_TOKEN` налаштований, а `NODE_ENV=production`, гостьовий доступ
(`guest_*` ID без Telegram-сесії) також блокується автоматично.

## Dev/Guest Mode

Якщо застосунок відкрито поза Telegram (звичайний браузер), `app.js` автоматично
генерує локальний `guest_*` ідентифікатор через `localStorage` і працює у
повністю функціональному режимі розробки без Telegram SDK.
