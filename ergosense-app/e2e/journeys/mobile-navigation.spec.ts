import { test, expect } from '@playwright/test';
import { waitForAppBoot } from '../helpers/login';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

test.describe('Jornada — mobile', () => {
  test('splash e login renderizam em viewport mobile', async ({ page }) => {
    await waitForAppBoot(page);
    await page.getByRole('button', { name: /Acessar o Sistema/i }).click();
    await expect(page.locator('#s-login.active')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
