import { CARD_TIME_MS, ROUND_SIZE } from './game.js';

export const STORAGE_KEY = 'nawras-tech-career.leaderboard.v1';

function valid(entry) {
  return entry && typeof entry.id === 'string' && typeof entry.name === 'string'
    && entry.name.trim() && Number.isInteger(entry.correct) && entry.correct >= 0 && entry.correct <= ROUND_SIZE
    && Number.isInteger(entry.rankingTimeMs) && entry.rankingTimeMs >= (ROUND_SIZE - entry.correct) * CARD_TIME_MS
    && entry.rankingTimeMs <= ROUND_SIZE * CARD_TIME_MS;
}

export function ranked(entries) {
  const sorted = [...entries].sort((a, b) => b.correct - a.correct || a.rankingTimeMs - b.rankingTimeMs);
  let rank = 1;
  return sorted.map((entry, i) => {
    if (i && (entry.correct !== sorted[i - 1].correct || entry.rankingTimeMs !== sorted[i - 1].rankingTimeMs)) rank = i + 1;
    return { ...entry, rank };
  });
}

export class Leaderboard {
  constructor(storage, onError = () => {}) {
    this.storage = storage;
    this.onError = onError;
    this.entries = this.read();
  }
  read() {
    try {
      const parsed = JSON.parse(this.storage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(parsed)) throw new Error('Invalid leaderboard data.');
      const ids = new Set();
      return parsed.filter(entry => {
        if (!valid(entry) || ids.has(entry.id)) return false;
        ids.add(entry.id); return true;
      });
    } catch { this.onError('Saved leaderboard could not be read. Results will remain available during this session.'); return []; }
  }
  save(entry) {
    if (!valid(entry)) throw new Error('Invalid result.');
    if (this.entries.some(item => item.id === entry.id)) return false;
    this.entries.push({ ...entry });
    try { this.storage.setItem(STORAGE_KEY, JSON.stringify(this.entries)); }
    catch { this.onError('Browser storage is unavailable. This result is saved for this session only.'); }
    return true;
  }
  all() { return ranked(this.entries); }
  clear() {
    try { this.storage.removeItem(STORAGE_KEY); }
    catch { this.onError('The browser could not clear saved results. Please check browser storage permissions.'); return false; }
    this.entries = []; return true;
  }
}
