/**
 * LifeOS Core 2031 · main.js
 * Application entry point · wires all subsystems
 */

import { storage } from './core/StorageEngine.js';
import { synth } from './core/AudioSynth.js';
import { temporal } from './core/TemporalEngine.js';
import { SpineCanvas3D } from './modules/biomechanics/SpineCanvas3D.js';

/* -------------------- Default State -------------------- */
const defaultState = () => ({
  strain: 3,
  zeroStanding: false,
  calibDay: 14,
  digest: 'Попередній цикл: важка клітковина / сочевиця → пріоритет: повільні вуглеводи + якісний білок',
  laundry: [
    { id: 1, label: 'Потік Α', end: null, done: true },
    { id: 2, label: 'Потік Β', end: null, done: true },
    { id: 3, label: 'Потік Γ', end: null, done: false },
    { id: 4, label: 'Потік Δ', end: null, done: false }
  ],
  checks: [
    { id: 1, text: 'Овочі / зелень', done: false },
    { id: 2, text: 'Білок (яйця / риба / м\'ясо)', done: false },
    { id: 3, text: 'Паста твердих сортів', done: false },
    { id: 4, text: 'Pfand-пляшки з собою', done: false, pfand: true }
  ],
  cook: { end: null, name: '' },
  proto: { end: null, title: '', guide: '' },
  log: []
});

const PAIRINGS = {
  tefteli: { name: 'Паста al dente', sec: 480, note: 'Повільний вуглевод · стабільна глюкоза 3–4 год' },
  chicken: { name: 'Рис basmati / кіноа', sec: 720, note: 'Низький GI · ясність мислення 2.5+ год' },
  fish:    { name: 'Картопля al dente', sec: 600, note: 'Помірний інсулін · фокус без спаду' },
  tofu:    { name: 'Соба / гречана локшина', sec: 420, note: 'Легке засвоєння · мінімальний постпрандіальний спад' }
};

const STRAIN_MSG = {
  1: 'L1 · Нейтральний тонус · оптимальний біоритм',
  2: 'L2 · Мікро-тонус · система стабільна',
  3: 'L3 · Легкий тонус · звичайний режим дозволений',
  4: 'L4 · Дискомфорт після статичних поз · рекомендовано мікро-рух',
  5: 'L5 · Спазм середньої сили · Psoas Release рекомендовано',
  6: 'L6 · Виражений спазм · еластичність активована · слоти стиснуто',
  7: 'L7 · Критичний · Zero-Standing + розширена декомпресія',
  8: 'L8 · Високе навантаження · лише горизонтальні протоколи',
  9: 'L9 · Аварійний рівень · повний Zero-Standing Nexus',
  10: 'L10 · Максимум · тільки відновлення · блокування вертикальних задач'
};

let S = defaultState();
let spine = null;

/* -------------------- Helpers -------------------- */
function remaining(end) {
  return end ? Math.max(0, Math.ceil((end - Date.now()) / 1000)) : 0;
}

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function log(msg) {
  S.log.unshift({ ts: Date.now(), msg });
  if (S.log.length > 40) S.log.length = 40;
  save();
  renderLog();
}

async function save() {
  await storage.setKernel(S);
}

/* -------------------- Strain -------------------- */
function renderStrain() {
  const arc = document.getElementById('strain-arc');
  if (!arc) return;
  arc.innerHTML = '';

  for (let i = 1; i <= 10; i++) {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 's-node'
      + (i === S.strain ? ' on' : '')
      + (i >= 7 ? ' crit' : i >= 5 ? ' warn' : '');
    node.textContent = i;
    node.addEventListener('click', () => setStrain(i));
    arc.appendChild(node);
  }

  document.getElementById('strain-text').textContent = STRAIN_MSG[S.strain] || '';

  const badge = document.getElementById('strain-badge');
  badge.textContent = 'L' + S.strain;
  badge.className = 'badge badge-strain'
    + (S.strain >= 7 ? ' crit' : S.strain >= 5 ? ' warn' : '');

  document.getElementById('ambient').classList.toggle('strain-high', S.strain >= 6);

  const readout = document.getElementById('spine-readout');
  const hint = document.getElementById('spine-hint');
  if (readout) {
    readout.textContent = `L${S.strain} · ${
      S.strain <= 3 ? 'STABLE' : S.strain <= 6 ? 'ELEVATED' : 'CRITICAL'
    }`;
  }
  if (hint) {
    hint.textContent = S.strain >= 6
      ? 'Сегменти деформовані\nеластичність активна'
      : 'Сегменти L1–L5\nреагують на strain';
  }

  if (spine) spine.setStrain(S.strain);
  temporal.setStrain(S.strain);
}

function setStrain(level) {
  const prev = S.strain;
  S.strain = level;

  if (level >= 7 && !S.zeroStanding) {
    S.zeroStanding = true;
    log(`L${level} → Zero-Standing Nexus активовано автоматично`);
  }
  if (level >= 6 && prev < 6) log('Еластичність часу: побутові слоти стиснуто');
  if (level < 6 && prev >= 6) log('Еластичність часу: слоти відновлено');

  save();
  renderStrain();
  renderZero();
  renderWave();
  synth.chimeSoft();
  log(`Біоконтур → L${level}`);
  storage.addTelemetry('strain', { level });
}

function renderZero() {
  const el = document.getElementById('nexus-switch');
  if (el) {
    el.classList.toggle('on', S.zeroStanding);
    el.setAttribute('aria-checked', String(S.zeroStanding));
  }
  const st = document.getElementById('sys-status');
  if (!st) return;
  if (S.zeroStanding) {
    st.textContent = 'Zero-Standing Nexus АКТИВНИЙ · вертикальні задачі заблоковано · пріоритет декомпресії';
    st.style.color = 'var(--plasma)';
  } else {
    st.textContent = 'Neural Kernel 2031 · Фаза тіньового калібрування · Симбіоз активний';
    st.style.color = 'var(--text-dim)';
  }
}

/* -------------------- Temporal Wave -------------------- */
function renderWave() {
  const container = document.getElementById('wave-segments');
  if (!container) return;

  const segments = temporal.buildWave(new Date());

  if (container.children.length !== segments.length) {
    container.innerHTML = '';
    segments.forEach((seg) => {
      const el = document.createElement('div');
      el.className = 'w-seg';
      el.dataset.h = seg.hour;
      el.innerHTML = `<div class="t">${seg.hour}</div>`;
      container.appendChild(el);
    });
  }

  container.querySelectorAll('.w-seg').forEach((el, idx) => {
    const seg = segments[idx];
    el.className = 'w-seg ' + seg.state;
    if (seg.flex < 0.5) el.classList.add('compressed');
    if (seg.flex > 1.3) el.classList.add('expanded');
    el.style.flex = String(seg.flex);
  });

  document.getElementById('scan-beam').style.left =
    temporal.scanPosition(new Date()) + '%';
}

/* -------------------- Protocols -------------------- */
function startProtocol(type) {
  const map = {
    psoas: {
      title: 'Psoas Release 90/90',
      sec: 300,
      guide: 'Ляж на спину. Гомілки на підвищення під 90°. Коліна 90°. Вдих 4 сек · видих 8 сек. Повністю відпусти здухвинно-поперековий м\'яз. Не рухайся.'
    },
    chandra: {
      title: 'Chandra Flow',
      sec: 420,
      guide: 'Повільні бічні дуги стоячи або сидячи. Без осьових згинів і скручувань. Рух синхронно з диханням. 6–8 циклів на кожен бік.'
    }
  };
  const c = map[type];
  S.proto = {
    end: Date.now() + c.sec * 1000,
    title: c.title,
    guide: c.guide
  };
  save();
  showVeil();
  log(`Цикл запущено: ${c.title}`);
  storage.addTelemetry('protocol_start', { type });
}

function showVeil() {
  document.getElementById('veil').classList.add('show');
  document.getElementById('veil-title').textContent = S.proto.title;
  document.getElementById('veil-guide').textContent = S.proto.guide;
  updateVeil();
}

function updateVeil() {
  if (!S.proto.end) return;
  const left = remaining(S.proto.end);
  document.getElementById('veil-time').textContent = fmt(left);
  if (left <= 0) {
    S.proto.end = null;
    save();
    document.getElementById('veil').classList.remove('show');
    synth.chimeComplete();
    log('Цикл відновлення завершено');
    if (S.strain > 2) setStrain(Math.max(1, S.strain - 2));
  }
}

function stopProtocol() {
  S.proto.end = null;
  save();
  document.getElementById('veil').classList.remove('show');
}

/* -------------------- Metabolic -------------------- */
function startCook(key) {
  const p = PAIRINGS[key];
  const mins = temporal.minutesToNextMeeting();
  let note = p.note;
  if (S.strain >= 6) note += ' · адаптовано під високий strain';
  if (mins < 50) note += ` · вікно до гравітації ${Math.round(mins)} хв`;

  S.cook = { end: Date.now() + p.sec * 1000, name: p.name };
  save();
  document.getElementById('synergy-line').textContent = `→ ${p.name} · ${note}`;
  document.getElementById('cook-panel').classList.add('show');
  document.getElementById('cook-name').textContent = p.name;
  log(`Метаболічний цикл: ${p.name}`);
  updateCook();
}

function updateCook() {
  if (!S.cook.end) {
    document.getElementById('cook-panel').classList.remove('show');
    return;
  }
  const left = remaining(S.cook.end);
  const el = document.getElementById('cook-digits');
  el.textContent = left > 0 ? fmt(left) : 'ГОТОВО';
  el.style.color = left > 0 ? 'var(--cyan)' : 'var(--jade)';
  if (left <= 0) {
    S.cook.end = null;
    save();
    synth.chimeComplete();
    log('Метаболічний цикл завершено');
  }
}

function stopCook() {
  S.cook.end = null;
  save();
  document.getElementById('cook-panel').classList.remove('show');
}

/* -------------------- Daemons -------------------- */
function renderDaemons() {
  const stream = document.getElementById('daemon-stream');
  if (!stream) return;
  let conflict = false;

  stream.innerHTML = S.laundry.map((item) => {
    let cls = 'done';
    let timer = '●';

    if (!item.done && item.end) {
      const left = remaining(item.end);
      if (left > 0) {
        cls = 'running';
        timer = fmt(left);
        if (temporal.hasCollision(item.end)) {
          cls += ' conflict';
          conflict = true;
        }
      } else {
        item.done = true;
        item.end = null;
        synth.chimeComplete();
        log(`${item.label} завершено`);
      }
    } else if (!item.done) {
      cls = '';
      timer = '○';
    }

    return `<div class="daemon-card ${cls}">
      <div>
        <div class="daemon-label">${item.label}</div>
        ${cls.includes('conflict') ? '<div class="daemon-sub">⚠ Конфлікт з гравітацією</div>' : ''}
      </div>
      <div class="daemon-clock">${timer}</div>
    </div>`;
  }).join('');

  document.getElementById('collision-banner').classList.toggle('show', conflict);
  save();
}

function addDaemon(min) {
  const check = temporal.validateDuration(min);
  if (check.collision) {
    const ok = confirm(`Потік ${min} хв перетинає гравітаційний центр.\nВсе одно запустити?`);
    if (!ok) return;
  }

  let slot = S.laundry.find((x) => x.done || !x.end);
  if (slot) {
    slot.done = false;
    slot.end = check.end;
  } else {
    S.laundry.push({
      id: Date.now(),
      label: `Потік ${S.laundry.length + 1}`,
      end: check.end,
      done: false
    });
  }
  save();
  log(`Демон +${min} хв`);
  renderDaemons();
  synth.chimeSoft();
}

/* -------------------- Checklist -------------------- */
function renderChecks() {
  const box = document.getElementById('check-stream');
  if (!box) return;

  box.innerHTML = S.checks.map((c) => `
    <label class="check-line">
      <input type="checkbox" data-id="${c.id}" ${c.done ? 'checked' : ''}>
      <span>${c.text}</span>
    </label>
  `).join('');

  const pf = S.checks.find((c) => c.pfand);
  document.getElementById('pfand-beacon').classList.toggle('show', pf && !pf.done);

  box.querySelectorAll('input').forEach((inp) => {
    inp.addEventListener('change', () => {
      const item = S.checks.find((c) => c.id === +inp.dataset.id);
      if (item) {
        item.done = inp.checked;
        save();
        renderChecks();
        log(`Чек: ${item.text} → ${item.done ? '✓' : '○'}`);
        synth.chimeSoft();
      }
    });
  });
}

/* -------------------- Calibration & Log -------------------- */
function renderCalib() {
  const pct = Math.round((S.calibDay / 60) * 100);
  document.getElementById('calib-day').textContent = S.calibDay;
  document.getElementById('calib-pct').textContent = pct + '%';
  document.getElementById('calib-fill').style.width = pct + '%';
}

function renderLog() {
  const feed = document.getElementById('log-feed');
  if (!feed) return;
  if (!S.log.length) {
    feed.innerHTML = '<div style="font-size:12px;color:var(--text-mute);padding:8px 0">Потік порожній</div>';
    return;
  }
  feed.innerHTML = S.log.slice(0, 25).map((e) => {
    const t = new Date(e.ts).toLocaleTimeString('uk-UA', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    return `<div class="log-entry"><span class="ts">${t}</span><span>${e.msg}</span></div>`;
  }).join('');
}

async function exportVault() {
  const data = await storage.exportJSON();
  data.kernel = S;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `lifeos-neural-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  log('Експорт Vault виконано');
}

function importVault(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const json = JSON.parse(reader.result);
      await storage.importJSON(json);
      if (json.kernel) S = { ...defaultState(), ...json.kernel };
      await save();
      location.reload();
    } catch {
      alert('Невірний формат JSON');
    }
  };
  reader.readAsText(file);
}

/* -------------------- Master Tick -------------------- */
function tick() {
  const now = new Date();
  document.getElementById('clock').textContent = now.toLocaleTimeString('uk-UA', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  renderWave();
  updateVeil();
  updateCook();
  renderDaemons();
}

/* -------------------- Navigation & Binding -------------------- */
function bindNav() {
  document.querySelectorAll('.nav-node').forEach((node) => {
    node.addEventListener('click', () => {
      document.querySelectorAll('.nav-node').forEach((n) => n.classList.remove('active'));
      document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
      node.classList.add('active');
      const view = document.getElementById('view-' + node.dataset.view);
      if (view) view.classList.add('active');

      if (node.dataset.view === 'bio') {
        setTimeout(() => {
          if (!spine) {
            const canvas = document.getElementById('spine-canvas');
            spine = new SpineCanvas3D(canvas);
          }
          spine.setStrain(S.strain);
          spine.start();
        }, 40);
      } else if (spine) {
        spine.stop();
      }
    });
  });
}

function bindUI() {
  document.getElementById('nexus-switch').addEventListener('click', () => {
    S.zeroStanding = !S.zeroStanding;
    save();
    renderZero();
    log(`Zero-Standing Nexus → ${S.zeroStanding ? 'ON' : 'OFF'}`);
    synth.chimeSoft();
  });

  document.getElementById('btn-psoas').addEventListener('click', () => startProtocol('psoas'));
  document.getElementById('btn-chandra').addEventListener('click', () => startProtocol('chandra'));
  document.getElementById('veil-exit').addEventListener('click', stopProtocol);

  document.querySelectorAll('.pair-cell').forEach((cell) => {
    cell.addEventListener('click', () => {
      document.querySelectorAll('.pair-cell').forEach((c) => c.classList.remove('active'));
      cell.classList.add('active');
      startCook(cell.dataset.protein);
    });
  });
  document.getElementById('cook-stop').addEventListener('click', stopCook);

  document.querySelectorAll('.preset-chip').forEach((chip) => {
    chip.addEventListener('click', () => addDaemon(+chip.dataset.min));
  });

  document.getElementById('btn-export').addEventListener('click', exportVault);
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', (e) => {
    if (e.target.files[0]) importVault(e.target.files[0]);
  });
  document.getElementById('btn-wipe').addEventListener('click', async () => {
    if (confirm('Повне скидання Neural Vault?')) {
      await storage.wipe();
      S = defaultState();
      await save();
      location.reload();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tick();
  });

  window.addEventListener('resize', () => {
    if (spine && document.getElementById('view-bio').classList.contains('active')) {
      spine.resize();
    }
  });
}

/* -------------------- Service Worker -------------------- */
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/public/sw.js').catch(() => {});
  }
}

/* -------------------- Boot -------------------- */
async function boot() {
  await storage.init();
  const saved = await storage.getKernel();
  if (saved) S = { ...defaultState(), ...saved };

  document.getElementById('events-list').innerHTML = temporal.meetings
    .map((m) => `<div class="event-line"><span class="event-time">${m.time}</span><span class="event-name">${m.title}</span></div>`)
    .join('');

  document.getElementById('digest-ctx').textContent = S.digest;

  renderStrain();
  renderZero();
  renderChecks();
  renderCalib();
  renderLog();
  renderDaemons();
  renderWave();

  bindNav();
  bindUI();
  registerSW();

  if (S.proto.end && remaining(S.proto.end) > 0) showVeil();
  if (S.cook.end && remaining(S.cook.end) > 0) {
    document.getElementById('cook-panel').classList.add('show');
    document.getElementById('cook-name').textContent = S.cook.name;
  }

  // warm-up spine (will fully start when Bio tab is opened)
  const canvas = document.getElementById('spine-canvas');
  spine = new SpineCanvas3D(canvas);
  spine.setStrain(S.strain);

  tick();
  setInterval(tick, 1000);

  log('Neural Kernel 2031 · симбіоз встановлено · IndexedDB Vault online');
}

boot();
