import { store } from './core/store.js';
import { audio } from './core/audio.js';
import { SpineVisualizer } from './modules/spineCanvas.js';
import { ConveyorDaemon } from './modules/conveyor.js';
import { MetabolicEngine } from './modules/metabolic.js';
import { ParetoParser } from './modules/paretoParser.js';

// 1. Ініціалізація графічного 3D-рушія хребта та фонових демонів
const spine = new SpineVisualizer('spineCanvas');
const conveyor = new ConveyorDaemon('laundryQueue', 'collisionAlert');
const metabolic = new MetabolicEngine('btnPastaTimer', 'pastaTimerDisplay');

// 2. Навігація в стилі Thumb-Zone Bento-HUD
document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    audio.click();
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.view-panel').forEach((p) => p.classList.remove('active'));

    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    const panel = document.getElementById(`view-${tabId}`);
    if (panel) panel.classList.add('active');
  });
});

// 3. Біомеханіка (Шкала напруги попереку L1–L10)
const strainInput = document.getElementById('strainRange');
const strainVal = document.getElementById('strainValueLabel');
const strainBadge = document.getElementById('strainBadge');
const jarvisLog = document.getElementById('jarvisLog');

function applyStrainToUI(val) {
  strainVal.innerText = `L${val}`;
  strainBadge.innerText = `L${val} STRAIN`;
  spine.setStrain(val);

  if (val >= 6) {
    jarvisLog.innerText = `«Хума, рівень напруги L${val}. Будь-яке стояння заблоковано. Тільки робота сидячи або протокол 90/90».`;
    strainBadge.style.color = 'var(--alert-red)';
    strainBadge.style.borderColor = 'var(--alert-red)';
  } else {
    jarvisLog.innerText = `«Статус L${val}. Параметри крижів у робочому діапазоні, сер».`;
    strainBadge.style.color = 'var(--neon-cyan)';
    strainBadge.style.borderColor = 'var(--neon-cyan)';
  }
}

strainInput.addEventListener('input', (e) => {
  const v = e.target.value;
  store.setStrain(v);
  applyStrainToUI(v);
});

// 4. Тригер чека Pfand
const pfandCheck = document.getElementById('checkPfand');
const pfandBadge = document.getElementById('pfandBadge');
pfandCheck.addEventListener('change', (e) => {
  store.setPfand(e.target.checked);
  pfandBadge.style.display = e.target.checked ? 'inline-block' : 'none';
  audio.click();
});

// 5. Демони прання (Келлер)
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

// 6. Omni-Parser Terminal & Дистилятор 10%
const rawInput = document.getElementById('rawInput');
const paretoContainer = document.getElementById('paretoActionSlots');

function renderParetoActions(actions) {
  paretoContainer.innerHTML = '';
  if (!actions || actions.length === 0) {
    paretoContainer.innerHTML = '<div class="empty-state">90% шуму відсіяно. Критичних дій наразі немає. Скиньте текст або диктуйте в термінал.</div>';
    return;
  }

  actions.forEach((act) => {
    const card = document.createElement('div');
    card.className = 'pareto-card';
    card.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 2px;">
        <span style="font-weight: 700; color: var(--text-primary);">${act.title}</span>
        <span style="font-size: 10px; color: var(--text-muted);">${act.desc}</span>
      </div>
      <button class="tech-btn primary" style="white-space: nowrap; margin-left: 8px;">${act.actionLabel}</button>
    `;
    card.querySelector('button').addEventListener('click', () => {
      act.execute();
      store.removeParetoAction(act.id);
      audio.click();
    });
    paretoContainer.appendChild(card);
  });
}

// Запуск аналізу
function executeParser() {
  const text = rawInput.value;
  if (!text.trim()) return;
  audio.focusPulse();
  const distilled = ParetoParser.distill(text);
  store.setParetoActions(distilled);
  renderParetoActions(distilled);
  jarvisLog.innerText = `«Оброблено. 90% шуму відфільтровано, виділено ${distilled.length} ключові дії».`;
  
  // Автоматичний перехід на головний кокпіт для виконання дій
  const navCockpit = document.querySelector('[data-tab="cockpit"]');
  if (navCockpit) navCockpit.click();
}

document.getElementById('btnParseRaw').addEventListener('click', executeParser);

document.getElementById('btnPasteClip').addEventListener('click', async () => {
  try {
    const clipText = await navigator.clipboard.readText();
    rawInput.value = clipText;
    audio.click();
    executeParser();
  } catch (err) {
    jarvisLog.innerText = '«Буфер обміну недоступний. Вставте текст у поле вручну».';
  }
});

// 7. Голосовий шлюз Web Speech API
const btnVoice = document.getElementById('btnVoiceInput');
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'uk-UA';

  btnVoice.addEventListener('click', () => {
    audio.click();
    try {
      recognition.start();
      jarvisLog.innerText = '«Слухаю оператора, Хума... Говоріть».';
    } catch (e) {}
  });

  recognition.onresult = (event) => {
    const spoken = event.results[0][0].transcript;
    rawInput.value = spoken;
    audio.focusPulse();
    executeParser();
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
      jarvisLog.innerText = '«Сесію декомпресії 90/90 завершено. Фасції попереку розвантажені».';
    }
  }, 1000);
});

// 9. Реактивна підписка на оновлення стану
store.subscribe((state) => {
  renderParetoActions(state.paretoActions);
});

// 10. Системний годинник та фоновий такт
setInterval(() => {
  const now = new Date();
  const clockEl = document.getElementById('sysClock');
  if (clockEl) clockEl.innerText = now.toTimeString().split(' ')[0];
  conveyor.update();
}, 1000);

// Реєстрація Service Worker (100% Offline)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Первинний запуск інтерфейсу
applyStrainToUI(store.state.strain);
pfandCheck.checked = store.state.pfandInPocket;
pfandBadge.style.display = store.state.pfandInPocket ? 'inline-block' : 'none';
renderParetoActions(store.state.paretoActions);
conveyor.update();
