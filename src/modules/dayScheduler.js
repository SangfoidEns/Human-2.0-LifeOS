import { store } from '../core/store.js';
import { audio } from '../core/audio.js';
import { voice } from '../core/voice.js';

export class DayScheduler {
  constructor(containerId, progressId) {
    this.container = document.getElementById(containerId);
    this.progressEl = document.getElementById(progressId);
    this.currentFilter = 'ALL';

    this.initFilterButtons();
  }

  initFilterButtons() {
    document.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        audio.click();
        document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentFilter = chip.getAttribute('data-domain');
        this.render();
      });
    });
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    const items = store.state.daySchedule || [];
    const filtered = this.currentFilter === 'ALL'
      ? items
      : items.filter((item) => item.domain === this.currentFilter);

    if (filtered.length === 0) {
      this.container.innerHTML = '<div class="empty-state">У вибраній категорії завдань немає.</div>';
      return;
    }

    filtered.forEach((item) => {
      const row = document.createElement('div');
      row.className = `schedule-row ${item.completed ? 'completed' : ''} domain-${item.domain.toLowerCase()}`;

      let domainBadge = '';
      switch (item.domain) {
        case 'HEALTH': domainBadge = '<span class="domain-tag tag-health">ЗДОРОВ\'Я</span>'; break;
        case 'WORK': domainBadge = '<span class="domain-tag tag-work">РОБОТА</span>'; break;
        case 'LEARN': domainBadge = '<span class="domain-tag tag-learn">НАВЧАННЯ</span>'; break;
        case 'CHORE': domainBadge = '<span class="domain-tag tag-chore">ПОБУТ</span>'; break;
        case 'REST': domainBadge = '<span class="domain-tag tag-rest">РЕЛАКС</span>'; break;
      }

      row.innerHTML = `
        <div class="schedule-time">${item.time}</div>
        <div class="schedule-body">
          <div class="schedule-title-line">
            <span class="schedule-title">${item.title}</span>
            ${domainBadge}
          </div>
          <div class="schedule-desc">${item.desc}</div>
        </div>
        <input type="checkbox" class="schedule-check" ${item.completed ? 'checked' : ''}>
      `;

      row.querySelector('.schedule-check').addEventListener('change', (e) => {
        audio.click();
        store.toggleScheduleItem(item.id);
        if (e.target.checked) voice.speak(`Виконано: ${item.title}`);
        this.updateProgress();
      });

      this.container.appendChild(row);
    });

    this.updateProgress();
  }

  updateProgress() {
    const items = store.state.daySchedule || [];
    if (items.length === 0) return;
    const completed = items.filter((i) => i.completed).length;
    const pct = Math.round((completed / items.length) * 100);

    if (this.progressEl) this.progressEl.style.width = `${pct}%`;
    const label = document.getElementById('dayProgressLabel');
    if (label) label.innerText = `${completed}/${items.length} БЛОКІВ (${pct}%)`;
  }
}
