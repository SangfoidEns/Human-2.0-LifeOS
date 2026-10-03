import { store } from './core/store.js';
import { audio } from './core/audio.js';
import { SpineVisualizer } from './modules/spineCanvas.js';
import { ConveyorDaemon } from './modules/conveyor.js';
import { MetabolicEngine } from './modules/metabolic.js';
import { ParetoParser } from './modules/paretoParser.js';

// 1. Ініціалізація підсистем
const spine = new SpineVisualizer('spineCanvas');
const conveyor = new ConveyorDaemon('laundryQueue', 'collisionAlert');
const metabolic = new MetabolicEngine('btnPastaTimer', 'pastaTimerDisplay');

// 2. Навігація HUD
document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    audio.click();
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.view-panel').forEach((p) => p.classList.remove('active'));

    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(`view-${tabId}`).classList.add('active');
  });
});

// 3. Біомеханіка (Шкала L1-L10)
const strainInput = document.getElementById('strainRange');
const strainVal = document.getElementById('strainValueLabel');
const strainBadge = document.getElementById('strainBadge');
const jarvisLog = document.getElementById('jarvisLog');

function applyStrain(val) {
  strainVal.innerText = `L${val}`;
  strainBadge.innerText = `L${val} STRAIN`;
  spine.setStrain(val);

  if (val >= 6) {
    jarvisLog.innerText = `«Хума, рівень напруги L${val}. Стояння заблоковано. Тільки стілець або положення 90/90».`;
    strainBadge.style.color = 'var(--alert-red)';
    strainBadge.style.borderColor = 'var(--alert-red)';
  } else {
    jarvisLog.innerText = `«Статус L${val}. Показники в межах робочого коридору, сер».`;
    strainBadge.style.color = 'var(--neon-cyan)';
    strainBadge.style.borderColor = 'var(--neon-cyan)';
  }
}

strainInput.addEventListener('input', (e) => {
  store.setStrain(e.target.value);
  applyStrain(e.target.value);
});

// 4. Pfand прапорець
const pfandCheck = document.getElementById('checkPfand');
const pfandBadge = document.getElementById('pfandBadge');
pfandCheck.addEventListener('change', (e) => {
  store.setPfand(e.target.checked);
  pfandBadge.style.display = e.target.checked ? 'inline-block' : 'none';
  audio.click();
});

// 5. Партії прання
document.getElementById('btnAddBatch70').addEventListener('click', () => {
  store.addLaundry(70);
  audio.click();
  conveyor.update();
});
document.getElementById('btnAddBatch110').addEventListener('click', () => {
  store.addLaundry(110);
  audio.click();
  conveyor.update();
});

// 6. Omni-Parser Terminal
const rawInput = document.getElementById('rawInput');
const paretoContainer = document.getElementById('paretoActionSlots');

function renderPareto(insights) {
  paretoContainer.innerHTML = '';
  if (insights.length === 0) {
    paretoContainer.innerHTML = '<div class="empty-state">Критичних тригерів не виявлено. 90% шуму відфільтровано.</div>';
    return;
  }

  insights.forEach((ins) => {
    const card = document.createElement('div');
    card.className = 'pareto-card';
    card.innerHTML = `
      <span>${ins.title}</span>
      <button class="tech-btn primary">${ins.actionLabel}</button>
    `;
    card.querySelector('button').addEventListener('click', () => ins.execute());
    paretoContainer.appendChild(card);
  });
}

document.getElementById('btnParseRaw').addEventListener('click', () => {
  audio.focusPulse();
  const insights = ParetoParser.distill(rawInput.value);
  renderPareto(insights);
  document.querySelector('[data-tab="cockpit"]').click();
});

document.getElementById('btnPasteClip').addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    rawInput.value = text;
    audio.click();
  } catch (err) {
    jarvisLog.innerText = '«Буфер обміну недоступний. Вставте текст вручну».';
  }
});

// 7. Голосове введення Web Speech API
const btnVoice = document.getElementById('btnVoiceInput');
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'uk-UA';

  btnVoice.addEventListener('click', () => {
    audio.click();
    recognition.start();
    jarvisLog.innerText = '«Слухаю вхідні дані, Хума... Говоріть».';
  });

  recognition.onresult = (event) => {
    rawInput.value = event.results[0][0].transcript;
    audio.focusPulse();
    const insights = ParetoParser.distill(rawInput.value);
    renderPareto(insights);
    document.querySelector('[data-tab="cockpit"]').click();
  };
} else {
  btnVoice.style.display = 'none';
}

// 8. Таймер декомпресії 90/90
let decompTarget = 0;
let decompInterval = null;
const decompDisp = document.getElementById('decompTimerDisplay');
document.getElementById('btnDecomp').addEventListener('click', () => {
  audio.relaxPulse();
  decompTarget = Date.now() + 5 * 60 * 1000;
  clearInterval(decompInterval);
  decompInterval = setInterval(() => {
    const s = Math.max(0, Math.floor((decompTarget - Date.now()) / 1000));
    const mStr = String(Math.floor(s / 60)).padStart(2, '0');
    const sStr = String(s % 60).padStart(2, '0');
    decompDisp.innerText = `${mStr}:${sStr}`;
    if (s === 0) {
      clearInterval(decompInterval);
      audio.relaxPulse();
      jarvisLog.innerText = '«Сесію декомпресії завершено. М\'язи розслаблені».';
    }
  }, 1000);
});

// 9. Годинник і фоновий такт
setInterval(() => {
  const now = new Date();
  document.getElementById('sysClock').innerText = now.toTimeString().split(' ')[0];
  conveyor.update();
}, 1000);

// Реєстрація Service Worker для повної офлайн-роботи
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Початковий запуск
applyStrain(store.state.strain);
conveyor.update();
