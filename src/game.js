import { careers } from './data/careers.js';

export const CARD_TIME_MS = 30_000;
export const ROUND_SIZE = 5;

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function answerOptions(card, random = Math.random) {
  const wrong = shuffle(card.alternatives, random).slice(0, 3);
  return shuffle([card.id, ...wrong], random).map(id => careers.find(c => c.id === id));
}

// The clock and scheduler are injected so deadline behavior can be tested without waiting.
export class Game {
  constructor({ now = () => performance.now(), schedule = (fn, ms) => setTimeout(fn, ms), cancel = id => clearTimeout(id),
    random = Math.random, onTick = () => {}, onReveal = () => {} } = {}) {
    Object.assign(this, { now, schedule, cancel, random, onTick, onReveal });
    this.phase = 'idle';
    this.timer = null;
  }

  start(name) {
    if (!name.trim()) throw new Error('A player name is required.');
    this.dispose();
    this.name = name.trim();
    this.id = globalThis.crypto.randomUUID();
    this.cards = shuffle(careers, this.random).slice(0, ROUND_SIZE);
    this.index = 0;
    this.answers = [];
    this.phase = 'ready';
    this.prepare();
  }

  prepare() {
    this.card = this.cards[this.index];
    this.options = answerOptions(this.card, this.random);
    this.phase = 'ready';
  }

  // Called by the view only after all clue and answer elements have been inserted.
  beginCard() {
    if (this.phase !== 'ready') return false;
    this.startedAt = this.now();
    this.deadline = this.startedAt + CARD_TIME_MS;
    this.phase = 'answering';
    this.tick();
    return true;
  }

  tick() {
    if (this.phase !== 'answering') return;
    const remaining = Math.max(0, this.deadline - this.now());
    if (!remaining) { this.settle(null); return; }
    this.onTick(remaining);
    this.timer = this.schedule(() => { this.timer = null; this.tick(); }, Math.min(100, remaining));
  }

  answer(id) {
    if (this.phase !== 'answering' || !this.options.some(option => option.id === id)) return false;
    // A late click must time out even if the timer callback hasn't run yet.
    return this.settle(this.now() >= this.deadline ? null : id);
  }

  settle(selectedId) {
    if (this.phase !== 'answering') return false;
    this.phase = 'revealed'; // Lock synchronously, before any UI callback.
    this.clearTimer();
    const elapsedMs = Math.min(CARD_TIME_MS, Math.max(0, Math.round(this.now() - this.startedAt)));
    const correct = selectedId === this.card.id;
    this.answers.push({ cardId: this.card.id, selectedId, correct, elapsedMs,
      rankingTimeMs: correct ? elapsedMs : CARD_TIME_MS });
    this.onReveal(this.answers.at(-1));
    return true;
  }

  next() {
    if (this.phase !== 'revealed') return false;
    if (this.index === ROUND_SIZE - 1) this.phase = 'complete';
    else { this.index++; this.prepare(); }
    return true;
  }

  get correctCount() { return this.answers.filter(answer => answer.correct).length; }
  get rankingTimeMs() { return this.answers.reduce((total, answer) => total + answer.rankingTimeMs, 0); }
  result() {
    if (this.phase !== 'complete') throw new Error('Round is incomplete.');
    return { id: this.id, name: this.name, correct: this.correctCount,
      rankingTimeMs: this.rankingTimeMs, completedAt: new Date().toISOString() };
  }
  clearTimer() { if (this.timer !== null) this.cancel(this.timer); this.timer = null; }
  dispose() { this.clearTimer(); this.phase = 'idle'; }
}
