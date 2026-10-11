const MUTE_KEY = 'nawras-tech-career.muted.v1';
const patterns = {
  click: [[0, 550, .035, .018]],
  flip: [[0, 300, .08, .016, 650]],
  correct: [[.13, 660, .08, .025], [.24, 880, .12, .022]],
  wrong: [[.13, 260, .13, .022, 180]],
  timeout: [[.13, 330, .07, .020], [.23, 220, .12, .018]],
  complete: [[0, 523, .09, .022], [.11, 659, .09, .022], [.22, 784, .16, .020]],
};

export class Sounds {
  constructor() {
    this.context = null;
    this.unlocked = false;
    this.active = [];
    this.lastEvent = '';
    this.lastAt = -Infinity;
    try { this.muted = localStorage.getItem(MUTE_KEY) === 'true'; } catch { this.muted = false; }
  }
  unlock() {
    this.unlocked = true;
    if (this.muted) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!this.context && Audio) this.context = new Audio();
      if (this.context?.state === 'suspended') this.context.resume().catch(() => {});
    } catch { /* Audio is optional; browser restrictions never interrupt play. */ }
  }
  stop() {
    for (const voice of this.active) {
      try { voice.oscillator.stop(); } catch { /* Already ended. */ }
      voice.oscillator.disconnect(); voice.gain.disconnect();
    }
    this.active = [];
  }
  dispose() {
    this.stop();
    const context = this.context;
    this.context = null;
    this.unlocked = false;
    this.lastEvent = ''; this.lastAt = -Infinity;
    if (context && context.state !== 'closed') context.close().catch(() => {});
  }
  toggle() {
    this.muted = !this.muted;
    if (this.muted) this.stop(); else this.unlock();
    try { localStorage.setItem(MUTE_KEY, String(this.muted)); } catch { /* Retain for this session. */ }
    return this.muted;
  }
  play(kind) {
    if (!this.unlocked || this.muted || this.context?.state !== 'running') return;
    const now = this.context.currentTime;
    if (kind === this.lastEvent && now - this.lastAt < .07) return;
    // A UI click must not replace an answer/reveal sound from the same interaction.
    if (kind === 'click' && this.active.length && this.lastEvent !== 'click') return;
    this.stop();
    this.lastEvent = kind; this.lastAt = now;
    const sequence = kind === 'correct' || kind === 'wrong' || kind === 'timeout'
      ? [...patterns.flip, ...patterns[kind]] : patterns[kind];
    if (!sequence) return;
    // One short sequence plays at a time; the flip precedes the answer cue.
    for (const [offset, frequency, duration, volume, endFrequency] of sequence) {
      const start = now + offset;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      oscillator.connect(gain); gain.connect(this.context.destination);
      const voice = { oscillator, gain }; this.active.push(voice);
      oscillator.onended = () => {
        oscillator.disconnect(); gain.disconnect();
        this.active = this.active.filter(item => item !== voice);
      };
      oscillator.start(start); oscillator.stop(start + duration + .015);
    }
  }
}
