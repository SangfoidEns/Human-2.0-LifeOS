/**
 * HUMA 2.0 · Interactive L1–S1 Spine Canvas
 * roundRect polyfill via arcTo · thermal colour by Strain
 */
export function createSpineCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  let strain = 3;
  let rotY = 0.3;
  let rotX = 0.15;
  let dragging = false;
  let lastX = 0, lastY = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function colorFor(s) {
    if (s <= 4) return { fill: 'rgba(0,255,135,0.7)', disc: 'rgba(0,255,135,0.35)' };
    if (s <= 6) return { fill: 'rgba(255,153,0,0.75)', disc: 'rgba(255,153,0,0.4)' };
    return { fill: 'rgba(255,59,48,0.85)', disc: 'rgba(255,51,68,0.7)' };
  }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // ambient
    const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, 'rgba(0,242,254,0.04)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const cols = colorFor(strain);
    const cx = w / 2;
    const cy = h / 2 + 10;
    const scale = Math.min(w, h) * 0.38;

    // simple projected vertebrae L1→S1 (top to bottom)
    const verts = [
      { y: -0.9, w: 0.55 }, // L1
      { y: -0.55, w: 0.58 },
      { y: -0.2, w: 0.62 },
      { y: 0.15, w: 0.66 }, // L4
      { y: 0.5, w: 0.7 },  // L5
      { y: 0.85, w: 0.85 }  // S1 wider
    ];

    // lordosis curve
    const lordosis = 0.12;

    verts.forEach((v, i) => {
      const py = cy + v.y * scale;
      const px = cx + Math.sin(v.y * 1.2 + rotY) * scale * 0.08 + Math.sin(rotY) * 8;
      const vw = v.w * scale * 0.55;
      const vh = scale * 0.14;

      // disc above (except first)
      if (i > 0) {
        const discH = strain >= 7 ? 3 : strain >= 5 ? 6 : 9;
        const bulge = strain >= 7 ? 4 : 0;
        ctx.fillStyle = cols.disc;
        roundRect(px - vw * 0.4 - bulge, py - vh * 0.55 - discH, vw * 0.8 + bulge * 2, discH, 2);
        ctx.fill();
        if (strain >= 7) {
          ctx.shadowColor = 'rgba(255,51,68,0.6)';
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // vertebra body
      ctx.fillStyle = cols.fill;
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      roundRect(px - vw / 2, py - vh / 2, vw, vh, 4);
      ctx.fill();
      ctx.stroke();

      // label
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(i < 5 ? 'L' + (i + 1) : 'S1', px - vw / 2 - 6, py + 3);
    });

    // strain label
    ctx.fillStyle = cols.fill;
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Strain L' + strain, cx, 22);
  }

  function loop() {
    draw();
    requestAnimationFrame(loop);
  }

  // interaction
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.008;
    rotX += (e.clientY - lastY) * 0.005;
    lastX = e.clientX; lastY = e.clientY;
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });

  window.addEventListener('resize', resize);
  resize();
  loop();

  return {
    setStrain(s) { strain = Math.max(1, Math.min(10, s)); },
    destroy() { window.removeEventListener('resize', resize); }
  };
}
