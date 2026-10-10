import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, answerOptions, shuffle } from '../src/game.js';
import { careers } from '../src/data/careers.js';

function harness(random = Math.random) {
  let clock = 0; let seq = 0;
  const pending = new Map(); const reveals = []; const ticks = [];
  const game = new Game({ now: () => clock, random,
    schedule: fn => { pending.set(++seq, fn); return seq; }, cancel: id => pending.delete(id),
    onReveal: answer => reveals.push(answer), onTick: value => ticks.push(value) });
  return { game, pending, reveals, ticks, advance: ms => { clock += ms; },
    callback: () => { const [id, fn] = pending.entries().next().value; pending.delete(id); fn(); } };
}
test('all 15 stable cards have four unique, valid and unambiguous options', () => {
  assert.equal(careers.length, 15);
  assert.equal(new Set(careers.map(c => c.id)).size, 15);
  for (const card of careers) {
    assert.equal(card.clue.length, 2); assert.ok(card.explanation); assert.ok(card.skills.length);
    assert.equal(new Set(card.alternatives).size, card.alternatives.length);
    assert.ok(!card.alternatives.includes(card.id));
    for (let i = 0; i < 50; i++) {
      const choices = answerOptions(card);
      assert.equal(new Set(choices.map(c => c.id)).size, 4);
      assert.equal(choices.filter(c => c.id === card.id).length, 1);
    }
  }
  for (const id of ['ai', 'ml', 'scientist', 'analyst']) {
    const card = careers.find(c => c.id === id);
    assert.ok(!card.alternatives.some(id => ['ai', 'ml', 'scientist', 'analyst'].includes(id)));
  }
});
test('randomization runs again for repeated names and independently shuffles options', () => {
  let seed = 23;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const { game } = harness(random); const orders = new Set(); const positions = new Set();
  for (let i = 0; i < 40; i++) {
    game.start('Same name');
    assert.equal(new Set(game.cards.map(c => c.id)).size, 5);
    orders.add(game.cards.map(c => c.id).join(','));
    positions.add(game.options.findIndex(c => c.id === game.card.id));
  }
  assert.ok(orders.size > 30); assert.equal(positions.size, 4);
  const input = [1, 2, 3, 4]; shuffle(input); assert.deepEqual(input, [1, 2, 3, 4]);
});
test('empty names fail; timer starts only once after ready; answer locks immediately', () => {
  const h = harness(); const { game } = h;
  assert.throws(() => game.start('   ')); game.start(' Player ');
  assert.equal(game.name, 'Player'); assert.equal(h.pending.size, 0);
  assert.equal(game.answer(game.card.id), false); assert.equal(game.next(), false);
  assert.equal(game.beginCard(), true); h.advance(2345); assert.equal(game.beginCard(), false);
  assert.equal(game.answer('unknown'), false);
  assert.equal(game.answer(game.card.id), true);
  assert.equal(game.answer(game.card.id), false);
  assert.equal(h.reveals.length, 1); assert.equal(h.pending.size, 0);
  assert.equal(game.rankingTimeMs, 2345); assert.equal(game.correctCount, 1);
});
test('wrong answer costs 30 seconds and does not end round; reading time is excluded', () => {
  const h = harness(); const { game } = h;
  game.start('Player'); game.beginCard(); h.advance(1);
  game.answer(game.options.find(c => c.id !== game.card.id).id);
  assert.equal(game.rankingTimeMs, 30000); assert.equal(game.phase, 'revealed');
  h.advance(120000); assert.equal(game.rankingTimeMs, 30000);
  game.next(); assert.equal(game.phase, 'ready'); assert.equal(h.pending.size, 0);
  game.beginCard(); h.advance(2500); game.answer(game.card.id);
  assert.equal(game.rankingTimeMs, 32500);
});
test('delayed callback and late click both time out, exact deadline is too late', () => {
  for (const mode of ['callback', 'click', 'exact']) {
    const h = harness(); const { game } = h; game.start('P'); game.beginCard();
    h.advance(mode === 'exact' ? 30000 : 75000);
    if (mode === 'callback') h.callback(); else game.answer(game.card.id);
    assert.equal(game.phase, 'revealed'); assert.equal(game.correctCount, 0);
    assert.equal(game.answers[0].selectedId, null); assert.equal(game.rankingTimeMs, 30000);
    assert.equal(h.pending.size, 0); assert.equal(game.next(), true);
  }
});
test('complete zero-score round, clean restart, dispose and stale callbacks', () => {
  const h = harness(); const { game } = h; game.start('P');
  assert.throws(() => game.result());
  for (let i = 0; i < 5; i++) {
    game.beginCard(); h.advance(30000); h.callback();
    assert.equal(game.next(), true);
  }
  assert.equal(game.phase, 'complete'); assert.equal(game.next(), false);
  assert.equal(game.result().correct, 0); assert.equal(game.result().rankingTimeMs, 150000);
  assert.equal(h.pending.size, 0);
  const oldId = game.id; game.start('P'); assert.notEqual(game.id, oldId);
  assert.equal(game.answers.length, 0); game.beginCard();
  const fn = h.pending.values().next().value; game.dispose(); fn();
  assert.equal(h.pending.size, 0); assert.equal(game.phase, 'idle');
});
