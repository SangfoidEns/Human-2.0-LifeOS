/**
 * telegramAuth.js
 * ------------------------------------------------------------------
 * Верифікація `initData`, яку Telegram WebApp передає клієнту.
 *
 * Алгоритм відповідає офіційній документації Telegram:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * 1. З initData видаляється поле `hash`.
 * 2. Решта пар "ключ=значення" сортується за ключем та з'єднується через "\n"
 *    у так званий data-check-string.
 * 3. secret_key = HMAC_SHA256(bot_token, key="WebAppData")
 * 4. Обчислюється HMAC_SHA256(data_check_string, key=secret_key).
 * 5. Отриманий hex-хеш порівнюється з полем `hash` (константний час порівняння).
 * ------------------------------------------------------------------
 */

'use strict';

const crypto = require('crypto');

const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60; // 24 години — типовий термін дії сесії

/**
 * Перевіряє автентичність initData, надісланого клієнтом Telegram Mini App.
 *
 * @param {string} initData - сирий рядок initData (querystring-формат) з клієнта.
 * @param {string} botToken - токен бота (той самий, що видав initData).
 * @returns {{ valid: boolean, reason?: string, user?: object, authDate?: number }}
 */
function validateTelegramInitData(initData, botToken) {
  if (!initData || typeof initData !== 'string') {
    return { valid: false, reason: 'initData відсутній або має некоректний тип.' };
  }
  if (!botToken) {
    return { valid: false, reason: 'BOT_TOKEN не налаштований на сервері.' };
  }

  let params;
  try {
    params = new URLSearchParams(initData);
  } catch (err) {
    return { valid: false, reason: 'Не вдалося розпарсити initData.' };
  }

  const receivedHash = params.get('hash');
  if (!receivedHash) {
    return { valid: false, reason: 'Поле "hash" відсутнє в initData.' };
  }
  params.delete('hash');

  // Формуємо data-check-string: сортовані пари key=value через "\n"
  const pairs = [];
  for (const [key, value] of params.entries()) {
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  // secret_key = HMAC_SHA256(botToken, key="WebAppData")
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

  // computedHash = HMAC_SHA256(dataCheckString, key=secretKey)
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const receivedBuf = Buffer.from(receivedHash, 'hex');
  const computedBuf = Buffer.from(computedHash, 'hex');

  const hashesMatch =
    receivedBuf.length === computedBuf.length && crypto.timingSafeEqual(receivedBuf, computedBuf);

  if (!hashesMatch) {
    return { valid: false, reason: 'Хеш initData не співпадає — дані підроблені або токен невірний.' };
  }

  // Перевірка "свіжості" сесії (захист від replay-атак застарілими initData)
  const authDateRaw = params.get('auth_date');
  const authDate = authDateRaw ? Number(authDateRaw) : null;
  if (authDate) {
    const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
    if (ageSeconds > MAX_INIT_DATA_AGE_SECONDS) {
      return { valid: false, reason: 'Термін дії initData вичерпано (застаріла сесія).' };
    }
  }

  // Парсимо об'єкт користувача
  let user = null;
  const userRaw = params.get('user');
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch (err) {
      return { valid: false, reason: 'Не вдалося розпарсити поле "user" з initData.' };
    }
  }

  return { valid: true, user, authDate };
}

module.exports = { validateTelegramInitData, MAX_INIT_DATA_AGE_SECONDS };
