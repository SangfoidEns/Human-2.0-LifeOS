/**
 * HUMA 2.0 · Web Speech API gateway
 * JARVIS tone · offline · barge-in
 */
import { getState } from './store.js';

let synth = window.speechSynthesis || null;
let recog = null;
let speaking = false;

export function speak(text, opts = {}) {
  if (!synth || !getState().voiceOn) return;
  if (speaking) synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = opts.rate || 0.93;
  u.pitch = opts.pitch || 0.9;
  u.volume = opts.volume || 0.9;
  // prefer calm male-ish voice if available
  const voices = synth.getVoices();
  const preferred = voices.find(v => /uk|ukrainian|de-DE|en-GB/i.test(v.lang) && /male|daniel|thomas|yuriy/i.test(v.name))
    || voices.find(v => /uk|de|en/i.test(v.lang));
  if (preferred) u.voice = preferred;
  speaking = true;
  u.onend = () => { speaking = false; };
  u.onerror = () => { speaking = false; };
  // evening volume cut
  const h = new Date().getHours();
  if (h >= 21) u.volume *= 0.6;
  synth.speak(u);
}

export function stopSpeak() {
  if (synth) synth.cancel();
  speaking = false;
}

export function isSpeaking() {
  return speaking;
}

export function startListen(onResult, onEnd) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    onEnd?.();
    return null;
  }
  if (recog) try { recog.stop(); } catch (e) {}
  recog = new SR();
  recog.lang = 'uk-UA';
  recog.interimResults = false;
  recog.maxAlternatives = 1;
  recog.continuous = false;
  recog.onresult = (e) => {
    const text = e.results[0]?.[0]?.transcript || '';
    onResult?.(text);
  };
  recog.onerror = () => onEnd?.();
  recog.onend = () => onEnd?.();
  try { recog.start(); } catch (e) { onEnd?.(); }
  return recog;
}

export function stopListen() {
  if (recog) try { recog.stop(); } catch (e) {}
  recog = null;
}

/** JARVIS-style short system lines */
export function jarvisLine(key, extra = '') {
  const lines = {
    ready: 'Системи в нормі, Хума.',
    strainHigh: 'Напруга підвищена. Zero-Standing активний.',
    timerDone: 'Таймер завершено.',
    water: 'Вода зафіксована.',
    decomp: 'Декомпресія 90/90 запущена.',
    collision: 'Колізія розкладу. Перевір келлер.',
    lowTRI: 'TRI нижче 60. Обмеж стрибки.',
    morning: 'Доброго ранку. Диски гідратовані — без нахилів 45 хвилин.',
    feiertag: 'Сьогодні Feiertag. Rewe City на Hauptbahnhof.'
  };
  const t = (lines[key] || key) + (extra ? ' ' + extra : '');
  speak(t);
  return t;
}
