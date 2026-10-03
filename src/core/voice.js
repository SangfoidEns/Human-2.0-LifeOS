class VoiceEngine {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.isEnabled = false;
    this.voice = null;
    this.initVoice();
  }

  initVoice() {
    if (!this.synth) return;
    const setVoice = () => {
      const voices = this.synth.getVoices();
      this.voice = voices.find((v) => v.lang.includes('uk')) ||
                   voices.find((v) => v.lang.includes('de')) ||
                   voices[0] || null;
    };
    setVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = setVoice;
    }
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    if (this.isEnabled) {
      this.speak('Голосовий модуль HUMA2.0 активовано. Доповідатиму голосом, Хума.');
    } else {
      if (this.synth) this.synth.cancel();
    }
    return this.isEnabled;
  }

  speak(text, rate = 0.92) {
    if (!this.isEnabled || !this.synth || !text) return;
    this.synth.cancel();
    const cleanText = text.replace(/[«»]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.voice) utterance.voice = this.voice;
    utterance.rate = rate;
    utterance.pitch = 0.95;
    utterance.volume = 0.9;
    this.synth.speak(utterance);
  }
}

export const voice = new VoiceEngine();
