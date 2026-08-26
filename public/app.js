/**
 * app.js
 * ------------------------------------------------------------------
 * Клієнтська логіка "Human 2.0: LifeOS".
 * Обгорнуто в IIFE, щоб уникнути забруднення глобального простору імен.
 *
 * Відповідальності:
 *  - Ініціалізація Telegram WebApp SDK (з безпечним Dev/Guest fallback).
 *  - Відображення профілю користувача.
 *  - Керування слайдерами енергії/фокусу з живим оновленням UI.
 *  - Синхронізація стану з бекендом через REST API.
 *  - Haptic-feedback при взаємодіях (у Telegram-середовищі).
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // 1. Telegram WebApp: ініціалізація та Dev/Guest fallback
  // ------------------------------------------------------------------
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  const isTelegramEnv = Boolean(tg && tg.initData);

  if (tg) {
    try {
      tg.ready();
      tg.expand();
      if (typeof tg.setHeaderColor === 'function') {
        tg.setHeaderColor('#0b0e14');
      }
      if (typeof tg.setBackgroundColor === 'function') {
        tg.setBackgroundColor('#0b0e14');
      }
    } catch (err) {
      console.warn('[LifeOS] Помилка ініціалізації Telegram WebApp SDK:', err);
    }
  }

  /**
   * Безпечний виклик Haptic Feedback. Ніколи не кидає помилку,
   * навіть якщо запущено поза Telegram або SDK версія застаріла.
   */
  const haptic = {
    selection() {
      try {
        tg?.HapticFeedback?.selectionChanged();
      } catch (_) {
        /* безшумно ігноруємо поза Telegram-середовищем */
      }
    },
    impact(style = 'light') {
      try {
        tg?.HapticFeedback?.impactOccurred(style);
      } catch (_) {
        /* noop */
      }
    },
    notify(type = 'success') {
      try {
        tg?.HapticFeedback?.notificationOccurred(type);
      } catch (_) {
        /* noop */
      }
    },
  };

  // ------------------------------------------------------------------
  // 2. Ідентифікація користувача (Telegram user АБО Guest Mode)
  // ------------------------------------------------------------------
  function resolveUser() {
    const tgUser = tg?.initDataUnsafe?.user;

    if (isTelegramEnv && tgUser) {
      return {
        id: String(tgUser.id),
        firstName: tgUser.first_name || 'Дослідник',
        lastName: tgUser.last_name || '',
        username: tgUser.username || '',
        photoUrl: tgUser.photo_url || null,
        isGuest: false,
      };
    }

    // Dev/Guest Mode: стабільний локальний ідентифікатор для тестування поза Telegram
    const GUEST_STORAGE_KEY = 'lifeos_guest_id';
    let guestId = null;
    try {
      guestId = window.localStorage.getItem(GUEST_STORAGE_KEY);
      if (!guestId) {
        guestId = `guest_${Math.random().toString(36).slice(2, 10)}`;
        window.localStorage.setItem(GUEST_STORAGE_KEY, guestId);
      }
    } catch (_) {
      // localStorage недоступний (наприклад, приватний режим) — генеруємо тимчасовий id
      guestId = `guest_${Math.random().toString(36).slice(2, 10)}`;
    }

    return {
      id: guestId,
      firstName: 'Гість',
      lastName: '',
      username: '',
      photoUrl: null,
      isGuest: true,
    };
  }

  const currentUser = resolveUser();

  // ------------------------------------------------------------------
  // 3. DOM-посилання
  // ------------------------------------------------------------------
  const el = {
    userName: document.getElementById('userName'),
    avatar: document.getElementById('userAvatar'),
    avatarInitial: document.getElementById('avatarInitial'),
    connStatusDot: document.getElementById('connStatusDot'),
    connStatusText: document.getElementById('connStatusText'),

    energySlider: document.getElementById('energySlider'),
    energyBadge: document.getElementById('energyBadge'),
    energyHint: document.getElementById('energyHint'),

    focusSlider: document.getElementById('focusSlider'),
    focusBadge: document.getElementById('focusBadge'),
    focusHint: document.getElementById('focusHint'),

    biorhythmBadge: document.getElementById('biorhythmBadge'),
    streakValue: document.getElementById('streakValue'),
    lastSyncValue: document.getElementById('lastSyncValue'),

    syncButton: document.getElementById('syncButton'),
    syncSpinner: document.getElementById('syncSpinner'),
    statusMessage: document.getElementById('statusMessage'),
  };

  // ------------------------------------------------------------------
  // 4. Рендеринг профілю
  // ------------------------------------------------------------------
  function renderProfile(user) {
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Гість';
    el.userName.textContent = displayName;
    el.userName.title = user.username ? `@${user.username}` : displayName;

    if (user.photoUrl) {
      const img = document.createElement('img');
      img.src = user.photoUrl;
      img.alt = displayName;
      img.onerror = () => {
        el.avatarInitial.textContent = displayName.charAt(0).toUpperCase();
      };
      el.avatar.innerHTML = '';
      el.avatar.appendChild(img);
    } else {
      el.avatarInitial.textContent = displayName.charAt(0).toUpperCase();
    }

    if (user.isGuest) {
      el.connStatusDot.classList.remove('status-dot--online');
      el.connStatusDot.classList.add('status-dot--offline');
      el.connStatusText.textContent = 'DEV MODE';
    } else {
      el.connStatusDot.classList.add('status-dot--online');
      el.connStatusText.textContent = 'СИНХРОНІЗОВАНО';
    }
  }

  // ------------------------------------------------------------------
  // 5. Логіка міток метрик (badge level, hint text)
  // ------------------------------------------------------------------
  function classifyLevel(value) {
    if (value < 34) return 'low';
    if (value < 67) return 'mid';
    return 'high';
  }

  const ENERGY_HINTS = {
    low: 'Критично низький рівень — час на відновлення.',
    mid: 'Стабільний рівень — тримай темп.',
    high: 'Відмінна форма! Використай цей заряд з користю.',
  };

  const FOCUS_HINTS = {
    low: 'Увага розсіяна — усунь відволікаючі фактори.',
    mid: 'Концентрація в нормі.',
    high: 'Режим глибокого фокусу активовано.',
  };

  function updateSliderFill(sliderEl) {
    const min = Number(sliderEl.min) || 0;
    const max = Number(sliderEl.max) || 100;
    const value = Number(sliderEl.value);
    const pct = ((value - min) / (max - min)) * 100;
    sliderEl.style.setProperty('--fill', `${pct}%`);
  }

  function updateEnergyUI(value, { silent = false } = {}) {
    const level = classifyLevel(value);
    el.energyBadge.textContent = `${value}%`;
    el.energyBadge.dataset.level = level;
    el.energyHint.textContent = ENERGY_HINTS[level];
    updateSliderFill(el.energySlider);
    if (!silent) haptic.selection();
  }

  function updateFocusUI(value, { silent = false } = {}) {
    const level = classifyLevel(value);
    el.focusBadge.textContent = `${value}%`;
    el.focusBadge.dataset.level = level;
    el.focusHint.textContent = FOCUS_HINTS[level];
    updateSliderFill(el.focusSlider);
    if (!silent) haptic.selection();
  }

  const BIORHYTHM_LABELS = {
    rising: '↑ ЗРОСТАЄ',
    stable: '→ СТАБІЛЬНИЙ',
    falling: '↓ ЗНИЖУЄТЬСЯ',
  };

  function updateBiorhythmUI(rhythm) {
    const safeRhythm = BIORHYTHM_LABELS[rhythm] ? rhythm : 'stable';
    el.biorhythmBadge.textContent = BIORHYTHM_LABELS[safeRhythm];
    el.biorhythmBadge.dataset.rhythm = safeRhythm;
  }

  function deriveBiorhythm(energy, focus) {
    const avg = (energy + focus) / 2;
    if (avg >= 70) return 'rising';
    if (avg <= 35) return 'falling';
    return 'stable';
  }

  function formatRelativeTime(isoString) {
    if (!isoString) return '—';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '—';

    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'щойно';
    if (diffMin < 60) return `${diffMin} хв тому`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} год тому`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD} дн тому`;
  }

  // ------------------------------------------------------------------
  // 6. API-клієнт
  // ------------------------------------------------------------------
  /**
   * Формує спільні заголовки автентифікації для кожного запиту.
   * Сирий рядок `tg.initData` передається на бекенд, де він верифікується
   * через HMAC-SHA256 (див. telegramAuth.js). У Dev/Guest Mode (поза
   * Telegram) заголовок буде порожнім — сервер обробить це як гостьовий доступ.
   */
  function buildAuthHeaders(extra = {}) {
    const headers = { ...extra };
    if (isTelegramEnv && tg?.initData) {
      headers['X-Telegram-Init-Data'] = tg.initData;
    }
    return headers;
  }

  const api = {
    async getUser(userId) {
      const res = await fetch(`/api/user/${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: buildAuthHeaders({ Accept: 'application/json' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Помилка отримання даних (HTTP ${res.status})`);
      }
      return data.user;
    },

    async syncUser(userId, payload) {
      const res = await fetch(`/api/user/${encodeURIComponent(userId)}/sync`, {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Помилка синхронізації (HTTP ${res.status})`);
      }
      return data.user;
    },
  };

  // ------------------------------------------------------------------
  // 7. Стан застосунку та завантаження початкових даних
  // ------------------------------------------------------------------
  function setStatusMessage(text, variant) {
    el.statusMessage.textContent = text;
    el.statusMessage.classList.remove('action-bar__note--success', 'action-bar__note--error');
    if (variant === 'success') el.statusMessage.classList.add('action-bar__note--success');
    if (variant === 'error') el.statusMessage.classList.add('action-bar__note--error');
  }

  function applyUserState(state) {
    const energy = Number.isFinite(state.energy) ? state.energy : 65;
    const focus = Number.isFinite(state.focus) ? state.focus : 50;

    el.energySlider.value = energy;
    el.focusSlider.value = focus;
    updateEnergyUI(energy, { silent: true });
    updateFocusUI(focus, { silent: true });
    updateBiorhythmUI(state.biorhythm || deriveBiorhythm(energy, focus));

    el.streakValue.innerHTML = `${state.streak || 0}<span class="stats-grid__unit">днів</span>`;
    el.lastSyncValue.textContent = formatRelativeTime(state.lastSync);
  }

  async function loadInitialState() {
    setStatusMessage('Завантаження стану...', null);
    try {
      const user = await api.getUser(currentUser.id);
      applyUserState(user);
      setStatusMessage('Дані завантажено.', 'success');
    } catch (err) {
      console.error('[LifeOS] Не вдалося завантажити стан користувача:', err);
      setStatusMessage('Немає з’єднання з сервером. Використовуються локальні значення.', 'error');
      // Застосовуємо дефолтні значення зі слайдерів, щоб UI не завис
      updateSliderFill(el.energySlider);
      updateSliderFill(el.focusSlider);
    }
  }

  // ------------------------------------------------------------------
  // 8. Обробники подій слайдерів
  // ------------------------------------------------------------------
  el.energySlider.addEventListener('input', (e) => {
    updateEnergyUI(Number(e.target.value));
  });

  el.focusSlider.addEventListener('input', (e) => {
    updateFocusUI(Number(e.target.value));
  });

  // ------------------------------------------------------------------
  // 9. Синхронізація (кнопка "Синхронізувати дані")
  // ------------------------------------------------------------------
  let isSyncing = false;

  async function handleSync() {
    if (isSyncing) return;
    isSyncing = true;

    el.syncButton.disabled = true;
    el.syncSpinner.hidden = false;
    setStatusMessage('Синхронізація...', null);
    haptic.impact('light');

    const energy = Number(el.energySlider.value);
    const focus = Number(el.focusSlider.value);
    const biorhythm = deriveBiorhythm(energy, focus);

    try {
      const updated = await api.syncUser(currentUser.id, { energy, focus, biorhythm });
      applyUserState(updated);
      setStatusMessage('Синхронізацію завершено успішно ✅', 'success');
      haptic.notify('success');

      if (tg?.MainButton) {
        // Опційний зворотний зв'язок через MainButton, якщо він активний
      }
    } catch (err) {
      console.error('[LifeOS] Помилка синхронізації:', err);
      setStatusMessage(err.message || 'Синхронізація не вдалася. Спробуйте ще раз.', 'error');
      haptic.notify('error');
    } finally {
      isSyncing = false;
      el.syncButton.disabled = false;
      el.syncSpinner.hidden = true;
    }
  }

  el.syncButton.addEventListener('click', handleSync);

  // ------------------------------------------------------------------
  // 10. Обробка зміни теми Telegram (light/dark) — необов'язково,
  //     інтерфейс навмисно завжди темний ("Tech Wall"), тому просто
  //     логуємо подію для потенційного майбутнього розширення.
  // ------------------------------------------------------------------
  if (tg?.onEvent) {
    try {
      tg.onEvent('themeChanged', () => {
        console.log('[LifeOS] Telegram theme змінено. LifeOS зберігає фіксовану cyberpunk-тему.');
      });
    } catch (_) {
      /* noop */
    }
  }

  // ------------------------------------------------------------------
  // 11. Bootstrap
  // ------------------------------------------------------------------
  function init() {
    renderProfile(currentUser);
    updateSliderFill(el.energySlider);
    updateSliderFill(el.focusSlider);
    loadInitialState();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
