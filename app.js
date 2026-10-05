/**
 * HUMA 2.0 · App Orchestrator
 * Error boundaries · single responsibility wiring
 */
import { initStore, getState, setStrain, addWater, setElectrolytes, setVoice, on, addTask, toggleTask, removeTask, calcTRI, exportJSON, importJSON, logTelemetry } from './core/store.js';
import { unlock as unlockAudio, stopAll as stopAudio, playTone, startBinaural } from './core/audio.js';
import { speak, jarvisLine, startListen, stopListen, stopSpeak } from './core/voice.js';
import { createSpineCanvas } from './modules/spineCanvas.js';
import { createTacticsBoard } from './modules/footballTactics.js';
import { parseRaw } from './modules/paretoParser.js';
import { isFeiertag, isRuhetag } from './modules/chronoMatrix.js';
import { startPasta, startLaundry, startDecomp, stopCurrentTimer, formatLeft } from './modules/conveyor.js';
import { countdownToNext, germanPhraseOfDay } from './modules/dayScheduler.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let spineApi = null;
let tacticsApi = null;
let currentTab = 'home';

function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3200);
}

function jarvisUI(text) {
  const el = $('#jarvisBox');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 6000);
}

function switchTab(tab) {
  currentTab = tab;
  $$('.screen').forEach(s => s.classList.toggle('active', s.dataset.tab === tab));
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.nav === tab));
  if (tab === 'spine' && !spineApi) {
    const c = $('#spineCanvas');
    if (c) spineApi = createSpineCanvas(c);
  }
  if (tab === 'football' && !tacticsApi) {
    const c = $('#tacticsCanvas');
    if (c) tacticsApi = createTacticsBoard(c);
  }
  renderHeader();
}

function renderHeader() {
  const st = getState();
  const triEl = $('#triBadge');
  if (triEl) {
    triEl.textContent = `TRI ${st.tri}%`;
    triEl.className = 'tri-badge' + (st.tri < 60 ? ' crit' : st.tri < 75 ? ' warn' : '');
  }
  const strainLabel = $('#strainLabel');
  if (strainLabel) strainLabel.textContent = `L${st.strain}`;
  const waterEl = $('#waterCount');
  if (waterEl) waterEl.textContent = `${st.water} / 6`;
  // Zero Standing
  const zb = $('#zeroBanner');
  if (zb) zb.classList.toggle('show', st.strain >= 5);
  // Feiertag
  const ft = isFeiertag();
  const fe = $('#feiertagBanner');
  if (fe) {
    if (ft) {
      fe.textContent = `Feiertag · ${ft.name} · Rewe City Hbf`;
      fe.classList.add('show');
    } else fe.classList.remove('show');
  }
}

function renderMini() {
  const st = getState();
  const bar = $('#miniBar');
  const title = $('#miniTitle');
  const sub = $('#miniSub');
  const cover = $('#miniCover');
  if (!st.activeTimer) {
    title.textContent = 'Системи в нормі';
    sub.textContent = `Strain L${st.strain} · Вода ${st.water}/6`;
    cover.textContent = '⚡';
    cover.querySelector('.ring')?.remove();
    return;
  }
  title.textContent = st.activeTimer.label;
  sub.textContent = formatLeft();
  cover.textContent = st.activeTimer.type === 'pasta' ? '🍝' : st.activeTimer.type === 'laundry' ? '🧺' : st.activeTimer.type === 'decomp' ? '🧘' : '⏱️';
  if (!cover.querySelector('.ring')) {
    const ring = document.createElement('div');
    ring.className = 'ring';
    cover.appendChild(ring);
  }
}

function renderTasks() {
  const list = $('#taskList');
  if (!list) return;
  const tasks = getState().tasks;
  if (!tasks.length) {
    list.innerHTML = '<div class="empty">Немає активних дій · введи думку або надиктуй</div>';
    return;
  }
  list.innerHTML = tasks.map(t => `
    <div class="card card-accent" style="margin-bottom:8px;opacity:${t.done ? 0.4 : 1}">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="btn btn-icon task-toggle" data-id="${t.id}" style="width:36px;height:36px;font-size:16px">${t.done ? '✓' : '○'}</button>
        <div style="flex:1">
          <div style="font-weight:600;${t.done ? 'text-decoration:line-through' : ''}">${esc(t.title)}</div>
          <div style="font-size:11px;color:var(--text-dim)">${esc(t.meta || '')}</div>
        </div>
        <button class="btn btn-icon task-del" data-id="${t.id}" style="width:36px;height:36px;color:var(--ruby)">✕</button>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('.task-toggle').forEach(b => b.addEventListener('click', () => { toggleTask(b.dataset.id); renderTasks(); }));
  list.querySelectorAll('.task-del').forEach(b => b.addEventListener('click', () => { removeTask(b.dataset.id); renderTasks(); toast('Видалено'); }));
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function renderStrainScale() {
  const row = $('#strainRow');
  if (!row) return;
  const cur = getState().strain;
  row.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const cell = document.createElement('div');
    cell.className = 'strain-cell' + (i <= 4 ? ' l1-4' : i <= 6 ? ' l5-6' : ' l7-10') + (i === cur ? ' active' : '');
    cell.textContent = i;
    cell.addEventListener('click', () => {
      setStrain(i);
      spineApi?.setStrain(i);
      calcTRI();
      renderHeader();
      if (i >= 7) {
        jarvisLine('strainHigh');
        jarvisUI('Гострий рівень. Горизонталь. 90/90.');
      }
      logTelemetry('strain_set', { level: i });
    });
    row.appendChild(cell);
  }
}

function handleParse() {
  const ta = $('#parseInput');
  const text = ta?.value?.trim();
  if (!text) return;
  const result = parseRaw(text);
  ta.value = '';
  const box = $('#parseResults');
  if (result.noise) {
    jarvisUI('Шум відфільтровано. Критичних дій немає.');
    box.innerHTML = '';
    return;
  }
  box.innerHTML = result.actions.map((a, idx) => `
    <div class="action-card" data-idx="${idx}">
      <div class="ac-icon">${a.icon}</div>
      <div class="ac-body">
        <div class="ac-title">${esc(a.title)}</div>
        <div class="ac-meta">${esc(a.meta)}</div>
      </div>
      <button class="btn btn-accent ac-run" data-idx="${idx}">▶</button>
    </div>
  `).join('');
  box.querySelectorAll('.ac-run').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = result.actions[+btn.dataset.idx];
      executeAction(a);
      btn.closest('.action-card')?.remove();
    });
  });
  jarvisUI(`Дистильовано ${result.actions.length} дію.`);
}

function executeAction(a) {
  if (!a) return;
  unlockAudio();
  switch (a.type) {
    case 'pain':
      setStrain(Math.max(getState().strain, 6));
      spineApi?.setStrain(getState().strain);
      startDecomp(7, () => toast('Декомпресія завершена'));
      jarvisLine('decomp');
      break;
    case 'pasta':
      {
        const r = startPasta(() => toast('Паста готова'));
        if (!r.ok) toast('Колізія · зсунь старт');
        else { jarvisUI('Паста · 8 хв · сидячи.'); toast('Таймер пасти'); }
      }
      break;
    case 'laundry':
      {
        const r = startLaundry(45, () => toast('Прання готове · забери кошик'));
        if (!r.ok) {
          toast('Колізія з зустріччю');
          jarvisLine('collision');
        } else toast('Келлер · 45 хв');
      }
      break;
    case 'water':
      addWater(1);
      jarvisLine('water');
      toast(`Вода ${getState().water}/6`);
      break;
    case 'football':
      switchTab('football');
      break;
    case 'weight':
      toast(a.meta);
      jarvisUI(a.meta);
      break;
    case 'pfand':
      addTask({ title: 'Pfand-Bon на касі', meta: 'Не забути пред’явити' });
      renderTasks();
      toast('Pfand додано');
      break;
    case 'slot':
      addTask({ title: a.title, meta: a.meta });
      renderTasks();
      break;
    default:
      addTask({ title: a.title, meta: a.meta });
      renderTasks();
  }
  calcTRI();
  renderHeader();
  renderMini();
}

function bindUI() {
  // Nav
  $$('.nav-item').forEach(n => n.addEventListener('click', () => switchTab(n.dataset.nav)));

  // Voice toggle
  $('#voiceBtn')?.addEventListener('click', () => {
    const next = !getState().voiceOn;
    setVoice(next);
    $('#voiceBtn').textContent = next ? 'VOICE: ON' : 'VOICE: OFF';
    if (next) jarvisLine('ready');
    else stopSpeak();
  });

  // Parse
  $('#parseBtn')?.addEventListener('click', handleParse);
  $('#micBtn')?.addEventListener('click', () => {
    unlockAudio();
    toast('Слухаю…');
    startListen((text) => {
      const ta = $('#parseInput');
      if (ta) ta.value = text;
      handleParse();
    }, () => toast('Кінець запису'));
  });

  // Quick actions
  $('#btnDecomp')?.addEventListener('click', () => {
    unlockAudio();
    startDecomp(7, () => { toast('90/90 завершено'); playTone(528, 1.5); });
    startBinaural(420);
    jarvisLine('decomp');
    jarvisUI('Гомілки на опору. Поперек пласко. Дихай 4–8.');
  });
  $('#btnPasta')?.addEventListener('click', () => executeAction({ type: 'pasta' }));
  $('#btnLaundry')?.addEventListener('click', () => executeAction({ type: 'laundry' }));
  $('#btnWater')?.addEventListener('click', () => executeAction({ type: 'water' }));
  $('#btnElectro')?.addEventListener('click', () => {
    setElectrolytes(true);
    calcTRI();
    renderHeader();
    toast('Електроліти ✓');
  });

  // Emergency
  $('#btnEmergency')?.addEventListener('click', () => {
    setStrain(9);
    spineApi?.setStrain(9);
    startDecomp(5);
    jarvisUI('ПРОСТРІЛ. На підлогу. Квадрат 4-4-4-4.');
    jarvisLine('strainHigh');
    renderHeader();
  });

  // Football presets
  $('#preset4v2')?.addEventListener('click', () => tacticsApi?.preset('4v2'));
  $('#preset3v3')?.addEventListener('click', () => tacticsApi?.preset('3v3'));
  $('#presetGk')?.addEventListener('click', () => tacticsApi?.preset('gk'));
  $('#presetClear')?.addEventListener('click', () => tacticsApi?.clear());

  // Mini bar
  $('#miniBar')?.addEventListener('click', (e) => {
    if (e.target.closest('.mini-btn')) return;
    // open sheet with timer details if active
  });
  $('#miniStop')?.addEventListener('click', (e) => {
    e.stopPropagation();
    stopCurrentTimer();
    stopAudio();
    renderMini();
    toast('Стоп');
  });

  // Export / Import
  $('#btnExport')?.addEventListener('click', () => {
    const data = exportJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `huma2_core_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    toast('Експорт JSON');
  });
  $('#importFile')?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    if (importJSON(text)) { toast('Імпорт успішний'); renderAll(); }
    else toast('Файл пошкоджений');
  });

  // German phrase
  const ph = germanPhraseOfDay();
  const gEl = $('#germanPhrase');
  if (gEl) {
    gEl.innerHTML = `<strong>${ph.de}</strong><br><span style="color:var(--text-dim)">${ph.uk}</span>`;
    gEl.addEventListener('click', () => speak(ph.de, { rate: 0.88 }));
  }

  // First unlock
  document.body.addEventListener('pointerdown', () => unlockAudio(), { once: true });
}

function renderAll() {
  renderHeader();
  renderMini();
  renderTasks();
  renderStrainScale();
  calcTRI();
}

function tickUI() {
  renderMini();
  const cd = countdownToNext();
  const el = $('#nextMeeting');
  if (el && cd) {
    el.textContent = `До зустрічі: ${cd.text}`;
  }
  // circadian after 19:30
  const h = new Date().getHours();
  document.documentElement.classList.toggle('circadian', h >= 19 || h < 6);
}

async function boot() {
  await initStore();
  bindUI();
  renderAll();
  switchTab('home');
  on('change', () => { renderHeader(); renderMini(); });
  on('tasks', renderTasks);
  on('timer', renderMini);
  on('strain', (s) => spineApi?.setStrain(s));

  // morning line
  const h = new Date().getHours();
  if (h >= 7 && h < 11) {
    setTimeout(() => { jarvisLine('morning'); jarvisUI('Диски гідратовані. Без нахилів і ваги 45 хв.'); }, 1200);
  }
  if (isRuhetag()) {
    setTimeout(() => { jarvisLine('feiertag'); }, 1800);
  }

  setInterval(tickUI, 1000);
  logTelemetry('boot', { ua: navigator.userAgent.slice(0, 40) });
}

boot().catch(err => {
  console.error('[HUMA]', err);
  toast('Ядро запущено з обмеженнями');
});
