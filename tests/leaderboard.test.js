import test from 'node:test';
import assert from 'node:assert/strict';
import { Leaderboard, ranked, STORAGE_KEY } from '../src/leaderboard.js';

function memory() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}
function result(id, correct = 3, rankingTimeMs = 80000) { return { id, name: 'Repeated name', correct, rankingTimeMs }; }
test('sort by score then milliseconds; competition ranks and rank-five ties', () => {
  const rows = ranked([result('d', 3, 80000), result('c', 4, 50000), result('a', 5, 150000),
    result('b', 4, 50000), result('e', 2, 100000), result('f', 2, 100000), result('g', 1, 130000)]);
  assert.deepEqual(rows.map(row => row.rank), [1, 2, 2, 4, 5, 5, 7]);
  assert.equal(rows.filter(row => row.rank <= 5).length, 6);
  assert.deepEqual(ranked([result('a', 4, 30001), result('b', 4, 30000)]).map(r => r.id), ['b', 'a']);
});
test('persist zero scores, keep repeated names and save an attempt exactly once', () => {
  const storage = memory(); const board = new Leaderboard(storage);
  assert.equal(board.save(result('a', 0, 150000)), true);
  assert.equal(board.save(result('a', 0, 150000)), false);
  assert.equal(board.save(result('b', 0, 150000)), true);
  const refreshed = new Leaderboard(storage);
  assert.equal(refreshed.all().length, 2); assert.deepEqual(refreshed.all().map(r => r.rank), [1, 1]);
  refreshed.clear(); assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.deepEqual(new Leaderboard(storage).all(), []);
});
test('corrupt entries are ignored and HTML player names remain raw text data', () => {
  const storage = memory();
  const unsafe = { ...result('a'), name: '<img src=x onerror=alert(1)>' };
  storage.setItem(STORAGE_KEY, JSON.stringify([unsafe, unsafe, {}, result('b', 0, 0)]));
  const board = new Leaderboard(storage);
  assert.equal(board.all().length, 1); assert.equal(board.all()[0].name, unsafe.name);
  storage.setItem(STORAGE_KEY, '{broken');
  const errors = []; assert.deepEqual(new Leaderboard(storage, e => errors.push(e)).all(), []);
  assert.equal(errors.length, 1);
});
test('blocked storage keeps results in memory without duplicate saves; failed clear keeps results', () => {
  const storage = { getItem() { throw Error(); }, setItem() { throw Error(); }, removeItem() { throw Error(); } };
  const errors = []; const board = new Leaderboard(storage, e => errors.push(e));
  board.save(result('a')); board.save(result('a')); assert.equal(board.all().length, 1);
  assert.equal(board.clear(), false); assert.equal(board.all().length, 1); assert.equal(errors.length, 3);
});
