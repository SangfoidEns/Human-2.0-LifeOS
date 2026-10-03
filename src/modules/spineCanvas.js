/**
 * HUMA2.0 3D Kinetic Spine Engine v2031.2
 * Справжній 3D-рендеринг на чистому Canvas 2D (матриця обертання, перспективна проєкція).
 * Підтримує обертання мишею та жестами Touch на мобільних пристроях.
 */
export class SpineVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.strain = 5;

    // Кути повороту в просторі (радіани)
    this.rotX = 0.15;
    this.rotY = 0.0;
    this.targetRotY = 0.0;

    // Стан перетягування (Drag)
    this.isDragging = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;

    this.initInteraction();
    this.startLoop();
  }

  setStrain(val) {
    this.strain = Math.min(10, Math.max(1, parseInt(val, 10)));
  }

  initInteraction() {
    const c = this.canvas;

    // Миша
    c.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.rotY += dx * 0.015;
      this.rotX += dy * 0.015;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    });
    window.addEventListener('mouseup', () => { this.isDragging = false; });

    // Сенсорний екран (Touch)
    c.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastPointerX = e.touches[0].clientX;
        this.lastPointerY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.lastPointerX;
      const dy = e.touches[0].clientY - this.lastPointerY;
      this.rotY += dx * 0.018;
      this.rotX += dy * 0.018;
      this.lastPointerX = e.touches[0].clientX;
      this.lastPointerY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', () => { this.isDragging = false; });
  }

  startLoop() {
    const render = () => {
      // Плавне фонове автообертання, коли користувач не торкається екрана
      if (!this.isDragging) {
        this.rotY += 0.008;
      }
      this.draw();
      requestAnimationFrame(render);
    };
    render();
  }

  // Проєкція точки 3D (x, y, z) на площину 2D
  project(x, y, z, width, height) {
    // Обертання навколо Y
    const cosY = Math.cos(this.rotY);
    const sinY = Math.sin(this.rotY);
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;

    // Обертання навколо X
    const cosX = Math.cos(this.rotX);
    const sinX = Math.sin(this.rotX);
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    // Перспективний поділ
    const fov = 260;
    const distance = 320;
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

    // Сегменти поперекового відділу та крижів
    const segments = [
      { id: 'L1', y: -65, w: 46, h: 14, d: 24 },
      { id: 'L2', y: -40, w: 50, h: 15, d: 26 },
      { id: 'L3', y: -14, w: 54, h: 16, d: 28 },
      { id: 'L4', y: 14,  w: 58, h: 17, d: 30 },
      { id: 'L5', y: 44,  w: 62, h: 18, d: 32 },
      { id: 'S1', y: 74,  w: 70, h: 22, d: 34 }
    ];

    // Колір за шкалою Strain
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

    // Сортування сегментів за глибиною Z
    const rendered = segments.map((seg, idx) => {
      // Моделювання вигину лордозу та бічного спазму
      const lateralCurvature = Math.sin(idx * 0.7) * (this.strain * 1.8);
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

      // Тіло хребця (Bento-стиль)
      ctx.fillStyle = seg.id === 'S1' ? '#121e31' : '#070f1a';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.8 * proj.scale;

      ctx.beginPath();
      ctx.roundRect(proj.x - sw / 2, proj.y - sh / 2, sw, sh, 4 * proj.scale);
      ctx.fill();
      ctx.stroke();

      // Текстове позначення хребця
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(9, Math.round(11 * proj.scale))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(seg.id, proj.x, proj.y);

      // Візуалізація міжхребцевого диска під навантаженням
      if (idx < segments.length - 1) {
        const discThickness = Math.max(2, (8 - this.strain * 0.5) * proj.scale);
        ctx.fillStyle = this.strain >= 7 ? '#ff3344' : 'rgba(0, 242, 254, 0.6)';
        ctx.fillRect(proj.x - (sw * 0.6) / 2, proj.y + sh / 2 + 1, sw * 0.6, discThickness);
      }

      ctx.restore();
    });

    // Підказка керування внизу канвасу
    ctx.fillStyle = '#627d98';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⟳ ОБЕРТАННЯ 3D: ТОРКНІТЬСЯ ТА ТЯГНІТЬ', w / 2, h - 8);
  }
}
