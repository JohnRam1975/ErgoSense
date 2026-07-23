/**
 * Compatibilidade — Chrome / Edge / Firefox / Mobile
 * Smoke: boot → login → dashboard → collabs → sem overflow crítico
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAsErgonomista, waitForAppBoot } from './helpers/login';

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      docScroll: doc.scrollWidth,
      docClient: doc.clientWidth,
      bodyScroll: body.scrollWidth,
      bodyClient: body.clientWidth,
    };
  });
  expect(overflow.docScroll, 'html overflow-x').toBeLessThanOrEqual(overflow.docClient + 2);
  expect(overflow.bodyScroll, 'body overflow-x').toBeLessThanOrEqual(overflow.bodyClient + 2);
}

async function e2eGo(page: Page, screenId: string) {
  await page.waitForFunction(() => Boolean(window.__ERGOSENSE_E2E__?.go), undefined, { timeout: 30000 });
  await page.evaluate((id) => window.__ERGOSENSE_E2E__?.go(id as never), screenId);
  await expect(page.locator(`#s-${screenId}.active`)).toBeVisible({ timeout: 20000 });
}

test.describe('Compatibilidade browsers', () => {
  test('login + dashboard + collabs + sem overflow-x', async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err.message || err)));

    await loginAsErgonomista(page);
    await expect(page.locator('#s-dashboard.active')).toBeVisible();
    await expect(page.locator('#app-chrome')).toBeVisible();
    await noHorizontalOverflow(page);

    await e2eGo(page, 'collabs');
    await expect(page.locator('#s-collabs.active')).toBeVisible();
    await noHorizontalOverflow(page);

    await e2eGo(page, 'dashboard');
    await expect(page.locator('#s-dashboard.active')).toBeVisible();

    const critical = pageErrors.filter(
      (m) => !/ResizeObserver|Script error\.|Loading CSS chunk/i.test(m),
    );
    expect(critical, `[${project}] pageerrors: ${critical.join(' | ')}`).toEqual([]);
  });

  test('splash e login públicos renderizam', async ({ page }) => {
    await waitForAppBoot(page);
    await expect(page.locator('.screen').first()).toBeVisible();
    await page.getByRole('button', { name: /Acessar o Sistema/i }).click();
    await expect(page.locator('#s-login.active')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await noHorizontalOverflow(page);
  });
});
