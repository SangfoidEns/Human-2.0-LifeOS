export class SpineVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.strain = 5;
    this.angle = 0;
    this.startLoop();
  }

  setStrain(val) {
    this.strain = val;
  }

  startLoop() {
    const render = () => {
      this.draw();
      this.angle += 0.02;
      requestAnimationFrame(render);
    };
    render();
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const startY = 30;
    const vertebrae = ['L1', 'L2', 'L3', 'L4', 'L5', 'S1'];

    let color = '#00f2fe';
    if (this.strain >= 5) color = '#ff9100';
    if (this.strain >= 8) color = '#ff3344';

    vertebrae.forEach((v, i) => {
      const y = startY + i * 28;
      // Деформація від спазму та синусоїдне коливання
      const lateralShift = Math.sin(this.angle + i * 0.4) * (this.strain * 1.5);
      const x = centerX + lateralShift;

      // Тіло хребця
      ctx.fillStyle = i === 5 ? '#19273c' : '#0d1726';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;

      const vWidth = 50 + (i * 4);
      const vHeight = 16;

      ctx.beginPath();
      ctx.roundRect(x - vWidth / 2, y, vWidth, vHeight, 3);
      ctx.fill();
      ctx.stroke();

      // Маркування
      ctx.fillStyle = '#e6f1ff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(v, x, y + 11);

      // Міжхребцевий диск із компресійним вектором
      if (i < 5) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(x - 15, y + vHeight + 3);
        ctx.lineTo(x + 15, y + vHeight + 3);
        ctx.stroke();
      }
    });
  }
}
