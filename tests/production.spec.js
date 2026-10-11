import { test, expect } from '@playwright/test';

test('Pages assets use the repository path and local fonts load without failed requests', async ({ page, baseURL }) => {
  const failures = []; const resources = [];
  page.on('response', response => {
    if (response.status() >= 400) failures.push(response.url());
    if (response.url().startsWith(new URL(baseURL).origin)) resources.push(response.url());
  });
  await page.goto('./');
  await expect(page.locator('.brand img')).toBeVisible();
  expect(await page.locator('.brand img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  const icon = await page.locator('link[rel="icon"]').getAttribute('href');
  const response = await page.request.get(new URL(icon, page.url()).href);
  expect(response.ok()).toBe(true); expect(response.headers()['content-type']).toContain('image/png');
  await page.getByLabel('PLAYER NAME').fill('Asset check');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('400 20px "Noto Sans Arabic"'))).toBe(true);
  expect(resources.some(url => url.endsWith('.woff2'))).toBe(true);
  for (const url of resources) expect(new URL(url).pathname).toMatch(new RegExp(`^${new URL(baseURL).pathname}`));
  expect(failures).toEqual([]);
});

test('one particle loop survives screen changes and resize, then cleans up for page restoration', async ({ page }) => {
  await page.addInitScript(() => {
    const request = requestAnimationFrame.bind(window); const cancel = cancelAnimationFrame.bind(window);
    window.pendingFrames = new Set();
    window.requestAnimationFrame = callback => {
      const id = request(time => { pendingFrames.delete(id); callback(time); });
      pendingFrames.add(id); return id;
    };
    window.cancelAnimationFrame = id => { pendingFrames.delete(id); cancel(id); };
    localStorage.setItem('nawras-tech-career.muted.v1', 'true');
  });
  await page.goto('./');
  await expect.poll(() => page.evaluate(() => pendingFrames.size)).toBe(1);
  await page.getByRole('button', { name: 'Leaderboard', exact: true }).click();
  await expect.poll(() => page.evaluate(() => pendingFrames.size)).toBe(1);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => pendingFrames.size)).toBe(1);
  await expect(page.locator('#particles canvas')).toHaveCount(1);
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await expect(page.locator('#particles canvas')).toHaveCount(0);
  expect(await page.evaluate(() => pendingFrames.size)).toBe(0);
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(page.locator('#particles canvas')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => pendingFrames.size)).toBe(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.evaluate(() => pendingFrames.size)).toBe(0);
  await expect(page.locator('#particles canvas')).toHaveAttribute('data-motion', 'still');
});
