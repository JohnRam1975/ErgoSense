import { test, expect } from '@playwright/test';
import { loginAsErgonomista, openMenu } from '../helpers/login';

test.describe('Jornada — logout', () => {
  test('login → menu → sair → splash/login', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsErgonomista(page);

    await openMenu(page);
    await page.locator('#menuDrawer button').filter({ hasText: 'Sair' }).click();
    await page.getByRole('button', { name: /Sim, Sair/i }).click();
    await expect(page.locator('#s-login.active, #s-splash.active')).toBeVisible({ timeout: 30000 });
  });
});
