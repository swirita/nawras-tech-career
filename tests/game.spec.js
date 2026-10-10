import { test, expect } from '@playwright/test';
import { careers } from '../src/data/careers.js';
import { STORAGE_KEY } from '../src/leaderboard.js';

async function start(page, name = 'Student') {
  await page.getByLabel('PLAYER NAME').fill(name);
  await page.getByRole('button', { name: 'Start →' }).click();
  await expect(page.getByRole('heading', { name: 'Who am I?' })).toBeVisible();
}
async function answer(page, correct = true) {
  const clue = await page.locator('.clue p').first().textContent();
  const card = careers.find(c => c.clue[0] === clue);
  const choices = page.locator('.answer');
  await expect(choices).toHaveCount(4);
  const target = correct ? choices.filter({ hasText: card.name }) : choices.filter({ hasNotText: card.name }).first();
  await target.click();
  await expect(page.locator('.career-name')).toHaveText(card.name);
  await page.screenshot({ path: 'test-results/screenshots/reveal.png', fullPage: true, animations: 'disabled' });
  for (const choice of await choices.all()) await expect(choice).toBeDisabled();
  await page.getByRole('button', { name: /Next →|See results →/ }).click();
}

test('complete play, safe names, separate attempts, refresh persistence and confirmed clearing', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await page.screenshot({ path: 'test-results/screenshots/landing.png', fullPage: true, animations: 'disabled' });
  await expect(page.getByRole('button', { name: 'Start →' })).toBeDisabled();
  await page.getByLabel('PLAYER NAME').fill('   ');
  await expect(page.getByRole('button', { name: 'Start →' })).toBeDisabled();
  await page.getByLabel('PLAYER NAME').fill('F');
  await page.getByLabel('PLAYER NAME').press('f');
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await page.getByRole('button', { name: 'Leaderboard ↗' }).focus();
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  const name = '<img src=x onerror=alert(1)>';
  await start(page, name);
  await page.screenshot({ path: 'test-results/screenshots/clue.png', fullPage: true, animations: 'disabled' });
  await expect(page.locator('#timer')).toContainText('29 s');
  const seen = new Set();
  for (let i = 0; i < 5; i++) {
    const clue = await page.locator('.clue').textContent(); expect(seen.has(clue)).toBe(false); seen.add(clue);
    await expect(page.locator('.career-name')).toHaveCount(0);
    await answer(page, i !== 0);
  }
  await expect(page.getByRole('heading', { name: 'Round complete' })).toBeVisible();
  await page.screenshot({ path: 'test-results/screenshots/results.png', fullPage: true, animations: 'disabled' });
  await expect(page.locator('.metric').first()).toContainText('4 / 5');
  const saved = JSON.parse(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY));
  expect(saved).toHaveLength(1); expect(saved[0].rankingTimeMs).toBeGreaterThanOrEqual(30000);
  await expect(page.locator('.current-attempt bdi')).toHaveText(name);
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Full Leaderboard ↗' }).click();
  await page.getByRole('button', { name: '← Back' }).click();
  expect(JSON.parse(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY))).toHaveLength(1);
  await page.getByRole('button', { name: 'Play Again →' }).click();
  await start(page, name);
  for (let i = 0; i < 5; i++) await answer(page, false);
  const attempts = JSON.parse(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY));
  expect(attempts).toHaveLength(2); expect(attempts[1].correct).toBe(0); expect(attempts[1].rankingTimeMs).toBe(150000);
  await page.reload();
  await page.getByRole('button', { name: 'Leaderboard ↗' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/screenshots/leaderboard.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Clear Leaderboard', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Clear Leaderboard', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Clear Leaderboard', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear Leaderboard' }).click();
  await expect(page.getByText('The board is yours.')).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  // Reopening a previously confirmed dialog must not reuse its old return value.
  await page.getByRole('button', { name: '← Back' }).click();
  await start(page, 'After clearing');
  for (let i = 0; i < 5; i++) await answer(page, false);
  await page.getByRole('button', { name: 'Full Leaderboard ↗' }).click();
  await page.getByRole('button', { name: 'Clear Leaderboard', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('deadline timeout, timer cleanup, explanation reading, double click and keyboard', async ({ page }) => {
  await page.clock.install(); await page.goto('./'); await start(page);
  await page.clock.runFor(30050);
  await expect(page.getByText('Time’s up. Meet the career below.')).toBeVisible();
  const frozen = await page.locator('#timer').textContent();
  await page.clock.runFor(120000); await expect(page.locator('#timer')).toHaveText(frozen);
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.clock.runFor(1000);
  await expect(page.locator('#timer')).toContainText('29 s');
  await page.locator('.answer').first().dblclick();
  await expect(page.locator('.answer:disabled')).toHaveCount(4);
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.clock.runFor(1000); await page.keyboard.press('2');
  await expect(page.locator('.career-name')).toBeVisible();
  await page.getByRole('button', { name: 'Next →' }).click(); await page.clock.runFor(30050);
  await page.getByRole('button', { name: 'Next →' }).click(); await page.clock.runFor(30050);
  await page.getByRole('button', { name: 'See results →' }).click();
  const rows = JSON.parse(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY));
  expect(rows).toHaveLength(1); expect(rows[0].rankingTimeMs).toBeGreaterThanOrEqual(90000);
  await page.clock.runFor(100000); await expect(page.getByRole('heading', { name: 'Round complete' })).toBeVisible();
});

test('shared ranks, rank-five tie highlight, mobile layout and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('./');
  await page.evaluate(({ key }) => {
    localStorage.setItem(key, JSON.stringify([
      { id: '1', name: 'A', correct: 5, rankingTimeMs: 10000 },
      { id: '2', name: 'B', correct: 4, rankingTimeMs: 40000 },
      { id: '3', name: 'C', correct: 4, rankingTimeMs: 40000 },
      { id: '4', name: 'D', correct: 3, rankingTimeMs: 80000 },
      { id: '5', name: 'E', correct: 2, rankingTimeMs: 110000 },
      { id: '6', name: 'F', correct: 2, rankingTimeMs: 110000 },
      { id: '7', name: 'G', correct: 1, rankingTimeMs: 140000 },
    ]));
  }, { key: STORAGE_KEY });
  await page.reload(); await page.getByRole('button', { name: 'Leaderboard ↗' }).click();
  expect(await page.locator('.rank-badge').allTextContents()).toEqual(['1', '2', '2', '4', '5', '5', '7']);
  await expect(page.locator('.top-rank')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '← Back' }).click(); await start(page, 'نور');
  await expect(page.locator('.clue')).toHaveAttribute('dir', 'rtl');
  await page.screenshot({ path: 'test-results/screenshots/mobile.png', fullPage: true, animations: 'disabled' });
  expect(await page.locator('.particle').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});
