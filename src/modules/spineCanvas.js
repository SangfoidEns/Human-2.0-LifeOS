export class SpineVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.strain = 5;

    this.rotX = 0.12;
    this.rotY = 0.0;
    this.velY = 0.006;

    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;

    this.initInteraction();
    this.startLoop();
  }

  setStrain(val) {
    this.strain = Math.min(10, Math.max(1, parseInt(val, 10)));
  }

  initInteraction() {
    const c = this.canvas;

    c.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.velY = 0;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.rotY += (e.clientX - this.lastX) * 0.015;
      this.rotX += (e.clientY - this.lastY) * 0.015;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.velY = 0.004;
    });

    c.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.velY = 0;
        this.lastX = e.touches[0].clientX;
        this.lastY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      this.rotY += (e.touches[0].clientX - this.lastX) * 0.018;
      this.rotX += (e.touches[0].clientY - this.lastY) * 0.018;
      this.lastX = e.touches[0].clientX;
      this.lastY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
      this.velY = 0.004;
    });
  }

  startLoop() {
    const render = () => {
      if (!this.isDragging) {
        this.rotY += this.velY;
      }
      this.draw();
      requestAnimationFrame(render);
    };
    render();
  }

  project(x, y, z, width, height) {
    const cosY = Math.cos(this.rotY);
    const sinY = Math.sin(this.rotY);
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;

    const cosX = Math.cos(this.rotX);
    const sinX = Math.sin(this.rotX);
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    const fov = 270;
    const distance = 330;
    const scale = fov / (distance + z2);

    return {
      x: width / 2 + x1 * scale,
      y: height / 2 + y2 * scale,
      scale: scale,
      depth: z2
    };
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    const segments = [
      { id: 'L1', y: -68, w: 46, h: 14 },
      { id: 'L2', y: -42, w: 50, h: 15 },
      { id: 'L3', y: -16, w: 54, h: 16 },
      { id: 'L4', y: 12,  w: 58, h: 17 },
      { id: 'L5', y: 42,  w: 62, h: 18 },
      { id: 'S1', y: 72,  w: 70, h: 22 }
    ];

    let strokeColor = '#00f2fe';
    let glowColor = 'rgba(0, 242, 254, 0.4)';
    if (this.strain >= 5) {
      strokeColor = '#ff9100';
      glowColor = 'rgba(255, 145, 0, 0.4)';
    }
    if (this.strain >= 8) {
      strokeColor = '#ff3344';
      glowColor = 'rgba(255, 51, 68, 0.5)';
    }

    const rendered = segments.map((seg, idx) => {
      const lateralCurvature = Math.sin(idx * 0.75) * (this.strain * 1.9);
      const proj = this.project(lateralCurvature, seg.y, 0, w, h);
      return { seg, proj, idx };
    });

    rendered.sort((a, b) => b.proj.depth - a.proj.depth);

    rendered.forEach(({ seg, proj, idx }) => {
      const sw = seg.w * proj.scale;
      const sh = seg.h * proj.scale;

      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = glowColor;

      ctx.fillStyle = seg.id === 'S1' ? '#121e31' : '#070f1a';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.8 * proj.scale;

      ctx.beginPath();
      ctx.roundRect(proj.x - sw / 2, proj.y - sh / 2, sw, sh, 4 * proj.scale);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(9, Math.round(11 * proj.scale))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(seg.id, proj.x, proj.y);

      if (idx < segments.length - 1) {
        const discThickness = Math.max(2, (8 - this.strain * 0.45) * proj.scale);
        const isCriticalLumbar = seg.id === 'L4' || seg.id === 'L5';
        ctx.fillStyle = isCriticalLumbar && this.strain >= 6 ? '#ff3344' : 'rgba(0, 242, 254, 0.65)';
        ctx.fillRect(proj.x - (sw * 0.6) / 2, proj.y + sh / 2 + 1, sw * 0.6, discThickness);
      }

      ctx.restore();
    });

    ctx.fillStyle = '#627d98';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⟳ 3D КІНЕТИКА: ТОРКНІТЬСЯ ТА ТЯГНІТЬ', w / 2, h - 8);
  }
}
