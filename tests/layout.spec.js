import { test, expect } from '@playwright/test';

async function arrowFree(page) {
  const buttons = await page.locator('button').evaluateAll(nodes => nodes.map(node => ({
    text: node.textContent,
    before: getComputedStyle(node, '::before').content,
    after: getComputedStyle(node, '::after').content,
    icons: node.querySelectorAll('svg, img, [class*="arrow"]').length,
  })));
  for (const button of buttons) {
    expect(`${button.text}${button.before}${button.after}`).not.toMatch(/[\u2190-\u21ff\u27f0-\u27ff]/u);
    expect(button.icons).toBe(0);
  }
}

for (const [width, height] of [[1366, 768], [390, 844], [320, 640]]) {
  test(`${width}x${height}: centered question/reveal stack, stable flip and visible controls`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.setItem('nawras-tech-career.muted.v1', 'true'));
    await page.goto('./'); await arrowFree(page);
    await expect(page).toHaveTitle('Guess the Tech Career');
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /branding\/nawras-small\.png$/);
    await page.getByLabel('PLAYER NAME').fill('Layout check');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    for (let i = 0; i < 5; i++) {
      await expect(page.locator('.card-front')).toBeVisible();
      const stage = await page.locator('.game-stage').boundingBox();
      const stack = await page.locator('.play-stack').boundingBox();
      const card = await page.locator('#career-card').boundingBox();
      const answers = await page.locator('.answers').boundingBox();
      const logo = await page.locator('.brand').boundingBox();
      expect(Math.abs(card.x + card.width / 2 - width / 2)).toBeLessThan(1);
      expect(Math.abs(stack.y + stack.height / 2 - (stage.y + stage.height / 2))).toBeLessThan(1);
      expect(Math.abs(answers.x + answers.width / 2 - width / 2)).toBeLessThan(1);
      expect(card.y).toBeGreaterThan(logo.y + logo.height);
      expect(answers.y + answers.height).toBeLessThanOrEqual(height);
      await arrowFree(page);
      await page.locator('.answer').first().click();
      await expect(page.locator('.card-back')).toBeVisible();
      expect(await page.locator('#career-card').boundingBox()).toEqual(card);
      expect(await page.locator('.answers').boundingBox()).toEqual(answers);
      const next = page.getByRole('button', { name: i === 4 ? 'See results' : 'Next', exact: true });
      const nextBox = await next.boundingBox();
      expect(Math.abs(nextBox.x + nextBox.width / 2 - width / 2)).toBeLessThan(1);
      expect(nextBox.y + nextBox.height).toBeLessThanOrEqual(height);
      if (i === 0) await page.screenshot({ path: `test-results/layout/${width}-reveal.png`, fullPage: true });
      await next.click();
      if (i === 0) await page.screenshot({ path: `test-results/layout/${width}-question.png`, fullPage: true });
    }
    await arrowFree(page);
    await page.getByRole('button', { name: 'Full Leaderboard', exact: true }).click();
    await arrowFree(page);
    await page.getByRole('button', { name: 'Clear Leaderboard', exact: true }).click();
    await arrowFree(page);
  });
}

test('one visible canvas, mobile density, moving pixels, reduced motion and click-through', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#particles canvas')).toHaveCount(1);
  const canvas = page.locator('#particles canvas');
  await expect(canvas).toHaveAttribute('data-motion', 'moving');
  const desktopCount = Number(await canvas.getAttribute('data-count'));
  expect(desktopCount).toBeGreaterThanOrEqual(60);
  expect(desktopCount).toBeLessThanOrEqual(100);
  await expect(canvas).toHaveCSS('pointer-events', 'none');
  const first = await canvas.evaluate(el => el.toDataURL());
  await expect.poll(() => canvas.evaluate(el => el.toDataURL())).not.toBe(first);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(canvas).toHaveAttribute('data-count', '32');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(canvas).toHaveAttribute('data-motion', 'still');
  const frozen = await canvas.evaluate(el => el.toDataURL());
  // The landing content has a completely clear particle exclusion area.
  const centerAlpha = await canvas.evaluate(el => {
    const form = document.querySelector('.name-form').getBoundingClientRect();
    const dpr = el.width / innerWidth;
    const bytes = el.getContext('2d').getImageData(Math.round(form.left * dpr), Math.round(form.top * dpr), Math.round(form.width * dpr), Math.round(form.height * dpr)).data;
    return bytes.some((value, i) => i % 4 === 3 && value > 0);
  });
  expect(centerAlpha).toBe(false);
  await page.getByLabel('PLAYER NAME').fill('Static particles');
  expect(await canvas.evaluate(el => el.toDataURL())).toBe(frozen);
  await page.getByRole('button', { name: 'Leaderboard', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-motion', 'still');
  const coloredPixels = await canvas.evaluate(el => {
    const bytes = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
    return bytes.filter((value, i) => i % 4 === 3 && value > 0).length;
  });
  expect(coloredPixels).toBeGreaterThan(100);
});
