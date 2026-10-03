import { audio } from '../core/audio.js';
import { voice } from '../core/voice.js';
import { store } from '../core/store.js';

export class FootballTacticsBoard {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.players = [];
    this.selectedPlayer = null;
    this.isDragging = false;
    this.currentPreset = 'SQUARES_4V2';

    this.initPreset(this.currentPreset);
    this.initInteraction();
    this.render();
  }

  initPreset(type) {
    this.currentPreset = type;
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (type === 'SQUARES_4V2') {
      this.players = [
        { id: 1, x: w * 0.3, y: h * 0.25, num: '1', color: '#00f2fe' },
        { id: 2, x: w * 0.7, y: h * 0.25, num: '2', color: '#00f2fe' },
        { id: 3, x: w * 0.7, y: h * 0.75, num: '3', color: '#00f2fe' },
        { id: 4, x: w * 0.3, y: h * 0.75, num: '4', color: '#00f2fe' },
        { id: 5, x: w * 0.45, y: h * 0.5, num: 'D1', color: '#ff9100' },
        { id: 6, x: w * 0.55, y: h * 0.5, num: 'D2', color: '#ff9100' }
      ];
    } else if (type === 'MATCH_3V3') {
      this.players = [
        { id: 1, x: w * 0.25, y: h * 0.35, num: 'A1', color: '#00f2fe' },
        { id: 2, x: w * 0.25, y: h * 0.65, num: 'A2', color: '#00f2fe' },
        { id: 3, x: w * 0.4,  y: h * 0.5,  num: 'A3', color: '#00f2fe' },
        { id: 4, x: w * 0.75, y: h * 0.35, num: 'B1', color: '#ff3344' },
        { id: 5, x: w * 0.75, y: h * 0.65, num: 'B2', color: '#ff3344' },
        { id: 6, x: w * 0.6,  y: h * 0.5,  num: 'B3', color: '#ff3344' }
      ];
    } else if (type === 'GK_SPINE_SHIELD') {
      this.players = [
        { id: 1, x: w * 0.15, y: h * 0.5, num: 'GK', color: '#00ff87' },
        { id: 2, x: w * 0.55, y: h * 0.35, num: 'K1', color: '#e6f1ff' },
        { id: 3, x: w * 0.55, y: h * 0.65, num: 'K2', color: '#e6f1ff' }
      ];
    }
    this.render();
  }

  initInteraction() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (this.canvas.width / rect.width),
        y: (clientY - rect.top) * (this.canvas.height / rect.height)
      };
    };

    const onStart = (e) => {
      const { x, y } = getPos(e);
      this.selectedPlayer = this.players.find((p) => {
        const dx = p.x - x;
        const dy = p.y - y;
        return Math.sqrt(dx * dx + dy * dy) < 18;
      });
      if (this.selectedPlayer) {
        this.isDragging = true;
        audio.click();
      }
    };

    const onMove = (e) => {
      if (!this.isDragging || !this.selectedPlayer) return;
      const { x, y } = getPos(e);
      this.selectedPlayer.x = Math.max(15, Math.min(this.canvas.width - 15, x));
      this.selectedPlayer.y = Math.max(15, Math.min(this.canvas.height - 15, y));
      this.render();
    };

    const onEnd = () => {
      this.isDragging = false;
      this.selectedPlayer = null;
    };

    this.canvas.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    this.canvas.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#06130e';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0, 255, 135, 0.25)';
    ctx.lineWidth = 1.5;

    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.beginPath();
    ctx.moveTo(w / 2, 10);
    ctx.lineTo(w / 2, h - 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 35, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeRect(10, h / 2 - 40, 30, 80);
    ctx.strokeRect(w - 40, h / 2 - 40, 30, 80);

    this.players.forEach((p) => {
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#020408';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.num, p.x, p.y);
      ctx.restore();
    });
  }

  loadDrill(presetName) {
    audio.focusPulse();
    this.initPreset(presetName);

    let desc = '';
    if (presetName === 'SQUARES_4V2') {
      desc = 'Квадрат 4х2: Пас в 1-2 дотики. Заборона скручування в попереку — розворот виконується переступанням стоп.';
    } else if (presetName === 'MATCH_3V3') {
      desc = 'Міні-турнір 3х3: Короткі інтенсивні зміни по 4 хв. Контроль ударного навантаження на крижі.';
    } else if (presetName === 'GK_SPINE_SHIELD') {
      desc = 'Воротарський захист L4-S1: Падіння на бічну поверхню стегна та найширший м\'яз. Ніколи не приземлятися на плаский поперек!';
    }

    const descEl = document.getElementById('tacticalDrillDescription');
    if (descEl) descEl.innerText = desc;
    voice.speak(desc);
    store.logEvent(`Тактика: завантажено вправу «${presetName}»`);
  }
}
