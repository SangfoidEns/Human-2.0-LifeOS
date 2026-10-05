/**
 * HUMA 2.0 · Procedural Web Audio Engine
 * Solfeggio 432/528 Hz, binaural, pink noise — zero external files
 */
let ctx = null;
let masterGain = null;
let activeNodes = [];

function ensure() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.12;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function cleanup() {
  activeNodes.forEach(n => {
    try { n.stop?.(); n.disconnect?.(); } catch (e) {}
  });
  activeNodes = [];
}

export function unlock() {
  ensure();
}

export function stopAll() {
  cleanup();
}

/** Pure tone with fade */
export function playTone(freq = 528, durationSec = 2, volume = 0.1) {
  ensure();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  g.gain.setValueAtTime(0, ctx.currentTime);
  g.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.4);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);
  osc.connect(g);
  g.connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + durationSec + 0.05);
  activeNodes.push(osc, g);
}

/** Binaural: left 432, right 438 → 6 Hz theta */
export function startBinaural(durationSec = 300) {
  ensure();
  cleanup();
  const merger = ctx.createChannelMerger(2);
  const g = ctx.createGain();
  g.gain.value = 0.08;
  g.connect(masterGain);

  const oscL = ctx.createOscillator();
  oscL.type = 'sine';
  oscL.frequency.value = 432;
  const gL = ctx.createGain(); gL.gain.value = 1;
  oscL.connect(gL); gL.connect(merger, 0, 0);

  const oscR = ctx.createOscillator();
  oscR.type = 'sine';
  oscR.frequency.value = 438;
  const gR = ctx.createGain(); gR.gain.value = 1;
  oscR.connect(gR); gR.connect(merger, 0, 1);

  merger.connect(g);
  oscL.start(); oscR.start();
  activeNodes.push(oscL, oscR, gL, gR, merger, g);

  if (durationSec > 0) {
    setTimeout(() => cleanup(), durationSec * 1000);
  }
  return () => cleanup();
}

/** Soft chime for timer end */
export function chime() {
  playTone(528, 1.2, 0.12);
  setTimeout(() => playTone(432, 0.8, 0.08), 400);
}

/** Alert for collision / critical */
export function alertTone() {
  playTone(280, 0.3, 0.15);
  setTimeout(() => playTone(240, 0.4, 0.12), 350);
}

/** Soft whistle-like timer tick */
export function whistle() {
  ensure();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(2400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(2800, ctx.currentTime + 0.15);
  g.gain.setValueAtTime(0.08, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(g); g.connect(masterGain);
  osc.start(); osc.stop(ctx.currentTime + 0.35);
}
