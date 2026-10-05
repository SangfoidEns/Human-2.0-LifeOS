/**
 * HUMA 2.0 · Dark Cyber-Pitch tactics board
 * Drag chips · presets 4v2 / 3v3 / GK shield
 */
export function createTacticsBoard(canvas) {
  const ctx = canvas.getContext('2d');
  let chips = [];
  let dragIdx = -1;
  let offsetX = 0, offsetY = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawPitch(w, h) {
    // dark emerald
    ctx.fillStyle = '#0a1f14';
    ctx.fillRect(0, 0, w, h);
    // neon lines
    ctx.strokeStyle = 'rgba(0,242,254,0.35)';
    ctx.lineWidth = 1.5;
    const m = 12;
    ctx.strokeRect(m, m, w - m * 2, h - m * 2);
    // halfway
    ctx.beginPath();
    ctx.moveTo(m, h / 2);
    ctx.lineTo(w - m, h / 2);
    ctx.stroke();
    // center circle
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.12, 0, Math.PI * 2);
    ctx.stroke();
    // penalty boxes
    const boxW = w * 0.55;
    const boxH = h * 0.18;
    ctx.strokeRect((w - boxW) / 2, m, boxW, boxH);
    ctx.strokeRect((w - boxW) / 2, h - m - boxH, boxW, boxH);
  }

  function drawChip(c) {
    const r = 14;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fillStyle = c.team === 'own' ? 'rgba(0,242,254,0.85)' : c.team === 'opp' ? 'rgba(255,59,48,0.85)' : 'rgba(255,200,0,0.8)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#030303';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(c.num), c.x, c.y);
  }

  function draw() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    drawPitch(w, h);
    chips.forEach(drawChip);
  }

  function loop() {
    draw();
    requestAnimationFrame(loop);
  }

  function hitTest(x, y) {
    for (let i = chips.length - 1; i >= 0; i--) {
      const c = chips[i];
      const dx = x - c.x, dy = y - c.y;
      if (dx * dx + dy * dy < 18 * 18) return i;
    }
    return -1;
  }

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragIdx = hitTest(x, y);
    if (dragIdx >= 0) {
      offsetX = x - chips[dragIdx].x;
      offsetY = y - chips[dragIdx].y;
      canvas.setPointerCapture(e.pointerId);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (dragIdx < 0) return;
    const rect = canvas.getBoundingClientRect();
    chips[dragIdx].x = e.clientX - rect.left - offsetX;
    chips[dragIdx].y = e.clientY - rect.top - offsetY;
  });
  canvas.addEventListener('pointerup', () => { dragIdx = -1; });

  function preset(name) {
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 400;
    chips = [];
    if (name === '4v2') {
      // 4 outer, 2 center
      const pts = [
        [0.2, 0.25], [0.8, 0.25], [0.2, 0.75], [0.8, 0.75],
        [0.4, 0.5], [0.6, 0.5]
      ];
      pts.forEach((p, i) => {
        chips.push({ x: p[0] * w, y: p[1] * h, num: i + 1, team: i < 4 ? 'own' : 'opp' });
      });
    } else if (name === '3v3') {
      for (let i = 0; i < 3; i++) {
        chips.push({ x: w * 0.25, y: h * (0.25 + i * 0.25), num: i + 1, team: 'own' });
        chips.push({ x: w * 0.75, y: h * (0.25 + i * 0.25), num: i + 4, team: 'opp' });
      }
    } else if (name === 'gk') {
      // GK + back line
      chips.push({ x: w * 0.5, y: h * 0.88, num: 1, team: 'own' });
      chips.push({ x: w * 0.25, y: h * 0.7, num: 2, team: 'own' });
      chips.push({ x: w * 0.5, y: h * 0.68, num: 3, team: 'own' });
      chips.push({ x: w * 0.75, y: h * 0.7, num: 4, team: 'own' });
      chips.push({ x: w * 0.4, y: h * 0.35, num: 9, team: 'opp' });
      chips.push({ x: w * 0.6, y: h * 0.3, num: 10, team: 'opp' });
    } else {
      // empty
    }
  }

  function clear() { chips = []; }

  window.addEventListener('resize', resize);
  resize();
  preset('4v2');
  loop();

  return { preset, clear, destroy() { window.removeEventListener('resize', resize); } };
}
