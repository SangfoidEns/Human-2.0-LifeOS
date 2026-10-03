/**
 * LifeOS Core 2031 · SpineCanvas3D
 * Procedural kinetic wireframe of lumbar spine (L1–L5 + Sacrum)
 * Pure Canvas 2D — no Three.js, no external libraries.
 * Deformation and color respond to Strain L1–L10 in real time.
 */

export class SpineCanvas3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 0;
    this.h = 0;
    this.segs = [];
    this.time = 0;
    this.strain = 3;
    this.raf = null;
    this.running = false;

    this.labels = ['L1', 'L2', 'L3', 'L4', 'L5', 'S'];
    this._buildSegments();
  }

  _buildSegments() {
    this.segs = this.labels.map((label, i) => ({
      label,
      phase: i * 0.72
    }));
  }

  resize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setStrain(level) {
    this.strain = Math.max(1, Math.min(10, level));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.resize();
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }

  _loop = () => {
    if (!this.running) return;
    this.time += 0.016;
    this._draw();
    this.raf = requestAnimationFrame(this._loop);
  };

  _color(level, idx) {
    if (level <= 3) {
      return `rgba(0, 240, 255, ${0.55 + idx * 0.06})`;
    }
    if (level <= 6) {
      const t = (level - 3) / 3;
      const r = Math.round(t * 255);
      const g = Math.round(240 - t * 155);
      const b = Math.round(255 - t * 255);
      return `rgba(${r},${g},${b},0.72)`;
    }
    const t = (level - 6) / 4;
    const r = 255;
    const g = Math.round(85 - t * 50);
    const b = Math.round(t * 90);
    return `rgba(${r},${g},${b},0.85)`;
  }

  _draw() {
    const ctx = this.ctx;
    const W = this.w;
    const H = this.h;
    const level = this.strain;

    if (!ctx || W === 0 || H === 0) return;

    ctx.clearRect(0, 0, W, H);

    // faint grid
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.028)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    const cx = W * 0.5;
    const topY = H * 0.11;
    const botY = H * 0.89;
    const segH = (botY - topY) / (this.segs.length - 1);

    // deformation amplitude driven by strain
    const deformAmp =
      level <= 3 ? 0.35 :
      level <= 6 ? 1.7 + (level - 3) * 0.95 :
                   4.6 + (level - 6) * 1.35;

    const breathe = Math.sin(this.time * 1.15) * 0.5 + 0.5;

    const points = this.segs.map((seg, i) => {
      const y = topY + i * segH;
      const naturalCurve = Math.sin((i / (this.segs.length - 1)) * Math.PI) * 9;
      const strainWave =
        Math.sin(this.time * 2.05 + seg.phase) *
        deformAmp *
        (0.55 + breathe * 0.45);

      // strongest lateral motion on mid-lumbar (L3–L5)
      const lateral =
        i >= 2 && i <= 4
          ? strainWave + naturalCurve * (level > 5 ? 1.45 : 0.55)
          : naturalCurve * 0.35;

      return {
        x: cx + lateral,
        y,
        label: seg.label,
        idx: i
      };
    });

    // inter-vertebral connections
    ctx.lineWidth = 3;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      grad.addColorStop(0, this._color(level, i));
      grad.addColorStop(1, this._color(level, i + 1));

      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // soft glow pass
      ctx.lineWidth = 9;
      ctx.strokeStyle = this._color(level, i).replace(/[\d.]+\)$/, '0.11)');
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.lineWidth = 3;
    }

    // vertebral nodes
    points.forEach((p, i) => {
      const radius = i === 5 ? 9.5 : 7.2;
      const col = this._color(level, i);

      // outer glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 5.5, 0, Math.PI * 2);
      ctx.fillStyle = col.replace(/[\d.]+\)$/, '0.13)');
      ctx.fill();

      // core
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();

      // highlight
      ctx.beginPath();
      ctx.arc(p.x - 1.6, p.y - 1.6, radius * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.fill();

      // label
      ctx.font = '9px SF Mono, ui-monospace, monospace';
      ctx.fillStyle =
        level >= 7 ? 'rgba(255,100,120,0.85)' : 'rgba(0,240,255,0.55)';
      ctx.textAlign = 'left';
      ctx.fillText(p.label, p.x + radius + 6, p.y + 3);
    });

    // reference axis
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.055)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(cx, topY - 12);
    ctx.lineTo(cx, botY + 12);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
