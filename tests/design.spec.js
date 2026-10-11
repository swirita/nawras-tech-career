import { test, expect } from '@playwright/test';
import { careers } from '../src/data/careers.js';

async function start(page) {
  await page.getByLabel('PLAYER NAME').fill('Nawras Student');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('#timer')).toContainText('30 s');
}
async function choose(page, correct) {
  const clue = await page.locator('.clue p').first().textContent();
  const career = careers.find(card => card.clue[0] === clue);
  const options = page.locator('.answer');
  await (correct ? options.filter({ hasText: career.name }) : options.filter({ hasNotText: career.name }).first()).click();
}
async function capture(page, size, screen) {
  await page.screenshot({ path: `test-results/design/${size}-${screen}.png`, fullPage: true, animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

for (const [size, width, height] of [['laptop', 1366, 768], ['mobile', 390, 844]]) {
  test(`${size}: all screens follow the reference; reduced-motion flip keeps layout stable`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./'); await capture(page, size, 'landing');
    await expect(page.locator('.brand img')).toHaveAttribute('src', /nawras-name\.png$/);
    await start(page); await capture(page, size, 'clue');
    await expect(page.locator('.card-back')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByRole('heading', { name: /Developer|Engineer|Designer|Scientist|Analyst|Specialist|Administrator|Manager/ })).toHaveCount(0);
    const before = await page.locator('#career-card').boundingBox();
    await choose(page, true);
    const after = await page.locator('#career-card').boundingBox();
    expect(after).toEqual(before);
    expect(await page.locator('.card-inner').evaluate(el => getComputedStyle(el).transform)).toBe('none');
    await expect(page.locator('.card-front')).toHaveCSS('visibility', 'hidden');
    await expect(page.locator('.card-back')).toHaveCSS('visibility', 'visible');
    await capture(page, size, 'reveal');
    await page.getByRole('button', { name: 'Next' }).click();
    for (let i = 1; i < 5; i++) {
      await choose(page, true);
      await page.getByRole('button', { name: i === 4 ? 'See results' : 'Next' }).click();
    }
    await capture(page, size, 'results');
    await page.getByRole('button', { name: 'Full Leaderboard' }).click();
    await capture(page, size, 'leaderboard');
    await page.getByRole('button', { name: 'Clear Leaderboard', exact: true }).click();
    await capture(page, size, 'dialog');
    // F still works when a confirmation dialog is open; it does not dismiss it.
    await page.keyboard.press('f');
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('f');
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
    await page.getByRole('button', { name: 'Cancel' }).click();
  });
}

test('vertical 3D flip has hidden back faces, upright text and no layout movement', async ({ page }) => {
  await page.goto('./'); await start(page);
  const before = await page.locator('#career-card').boundingBox();
  const answersBefore = await page.locator('.answers').boundingBox();
  await choose(page, true);
  const state = await page.locator('.card-inner').evaluate(el => {
    const animation = el.getAnimations()[0];
    animation.pause(); animation.currentTime = 180;
    const matrix = new DOMMatrix(getComputedStyle(el).transform);
    return { xRotation: Math.abs(matrix.m23), yRotation: Math.abs(matrix.m13),
      perspective: getComputedStyle(el.parentElement).perspective,
      frontHidden: getComputedStyle(el.querySelector('.card-front')).backfaceVisibility,
      backHidden: getComputedStyle(el.querySelector('.card-back')).backfaceVisibility };
  });
  expect(state.xRotation).toBeGreaterThan(.5); expect(state.yRotation).toBe(0);
  expect(state.perspective).toBe('1400px'); expect(state.frontHidden).toBe('hidden'); expect(state.backHidden).toBe('hidden');
  await page.screenshot({ path: 'test-results/design/flip-in-progress.png', fullPage: true });
  await page.locator('.card-inner').evaluate(el => el.getAnimations()[0].finish());
  const rotation = await page.locator('.card-inner').evaluate(el => {
    const combined = new DOMMatrix(getComputedStyle(el).transform).multiply(new DOMMatrix(getComputedStyle(el.querySelector('.card-back')).transform));
    return [combined.m11, combined.m22, combined.m33];
  });
  expect(rotation).toEqual([1, 1, 1]);
  expect(await page.locator('#career-card').boundingBox()).toEqual(before);
  expect(await page.locator('.answers').boundingBox()).toEqual(answersBefore);
});

test('fullscreen in an active round preserves the card, choices and elapsed deadline', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install(); await page.goto('./'); await start(page);
  const clue = await page.locator('.clue').textContent();
  const choices = await page.locator('.answer').allTextContents();
  await page.clock.runFor(5000);
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.clock.runFor(2000);
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await expect(page.locator('#timer')).toContainText('23 s');
  expect(await page.locator('.clue').textContent()).toBe(clue);
  expect(await page.locator('.answer').allTextContents()).toEqual(choices);
  await page.clock.runFor(23050);
  await expect(page.getByText('Time’s up. Meet the career below.')).toBeVisible();
});

test('real Web Audio unlock, brief sequential cues, mute persistence and no duplicate playback', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const Audio = window.AudioContext;
    window.audioAudit = { contexts: [], tones: [], volumes: [] };
    window.AudioContext = class extends Audio {
      constructor(...args) { super(...args); window.audioAudit.contexts.push(this); }
      createOscillator() {
        const oscillator = super.createOscillator();
        const tone = { start: null, stop: null, frequency: null, ended: false };
        window.audioAudit.tones.push(tone);
        const setFrequency = oscillator.frequency.setValueAtTime.bind(oscillator.frequency);
        oscillator.frequency.setValueAtTime = (value, at) => { tone.frequency = value; return setFrequency(value, at); };
        const start = oscillator.start.bind(oscillator); const stop = oscillator.stop.bind(oscillator);
        oscillator.start = at => { tone.start = at; start(at); };
        oscillator.stop = at => { tone.stop = at ?? this.currentTime; stop(at); };
        oscillator.addEventListener('ended', () => { tone.ended = true; });
        return oscillator;
      }
      createGain() {
        const gain = super.createGain(); const ramp = gain.gain.linearRampToValueAtTime.bind(gain.gain);
        gain.gain.linearRampToValueAtTime = (value, at) => { window.audioAudit.volumes.push(value); return ramp(value, at); };
        return gain;
      }
    };
  });
  await page.goto('./');
  expect(await page.evaluate(() => audioAudit.contexts.length)).toBe(0);
  await page.getByLabel('PLAYER NAME').click();
  await expect.poll(() => page.evaluate(() => audioAudit.contexts[0]?.state)).toBe('running');
  await page.getByRole('button', { name: 'Mute sounds' }).click();
  await expect(page.getByRole('button', { name: 'Unmute sounds' })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Unmute sounds' })).toBeVisible();
  await start(page);
  expect(await page.evaluate(() => audioAudit.tones.length)).toBe(0);
  await page.getByRole('button', { name: 'Unmute sounds' }).click();
  await expect.poll(() => page.evaluate(() => audioAudit.contexts[0]?.state)).toBe('running');
  await choose(page, true);
  await expect.poll(() => page.evaluate(() => audioAudit.tones.length)).toBe(3); // Flip, then two correct notes.
  await page.keyboard.press('1'); // Locked answer must not play another sound.
  expect(await page.evaluate(() => audioAudit.tones.length)).toBe(3);
  await expect.poll(() => page.evaluate(() => audioAudit.tones.every(tone => tone.ended))).toBe(true);
  const correct = await page.evaluate(() => audioAudit.tones);
  expect(correct[0].stop).toBeLessThanOrEqual(correct[1].start);
  expect(correct[1].stop).toBeLessThanOrEqual(correct[2].start);
  await page.getByRole('button', { name: 'Next' }).click();
  await choose(page, false);
  await expect.poll(() => page.evaluate(() => audioAudit.tones.every(tone => tone.ended))).toBe(true);
  expect(await page.evaluate(() => audioAudit.tones.at(-1).frequency)).toBe(260);
  await page.getByRole('button', { name: 'Next' }).click();
  // Accelerate game deadlines without changing AudioContext's real clock.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install(); await page.clock.runFor(40050);
  await expect(page.getByText('Time’s up. Meet the career below.')).toBeVisible();
  expect(await page.evaluate(() => audioAudit.tones.slice(-2).map(tone => tone.frequency))).toEqual([330, 220]);
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Next' }).click();
    // The new deadline starts on the next paint, not during the Next click.
    await expect(page.locator('#time-fill')).toHaveAttribute('style', /scaleX/);
    await page.clock.runFor(30050);
    await expect(page.getByText('Time’s up. Meet the career below.')).toBeVisible();
  }
  await page.getByRole('button', { name: 'See results' }).click();
  expect(await page.evaluate(() => audioAudit.tones.slice(-3).map(tone => tone.frequency))).toEqual([523, 659, 784]);
  expect(await page.evaluate(() => Math.max(...audioAudit.volumes))).toBeLessThanOrEqual(.025);
  await page.getByRole('button', { name: 'Mute sounds' }).click();
  const count = await page.evaluate(() => audioAudit.tones.length);
  await page.getByRole('button', { name: 'Play Again' }).click();
  expect(await page.evaluate(() => audioAudit.tones.length)).toBe(count);
});
