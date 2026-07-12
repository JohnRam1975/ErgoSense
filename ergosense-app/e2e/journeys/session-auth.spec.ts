import { test, expect } from '@playwright/test';
import { loginAsErgonomista, waitForAppBoot } from '../helpers/login';

test.describe('Jornada — sessão expirada', () => {
  test('limpar sessão redireciona para login ao recarregar', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsErgonomista(page);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await expect(page.locator('#s-splash.active, #s-login.active')).toBeVisible({ timeout: 30000 });
  });
});

test.describe('Jornada — credenciais inválidas', () => {
  test('login errado exibe feedback sem entrar no dashboard', async ({ page }) => {
    await waitForAppBoot(page);
    await page.getByRole('button', { name: /Acessar o Sistema/i }).click();
    await page.locator('input[type="email"]').fill('invalid@example.test');
    await page.locator('input[type="password"]').fill('wrongpassword1');
    const loginRes = page.waitForResponse((r) => r.url().includes('/api/auth/login'));
    await page.getByRole('button', { name: /Entrar/i }).click();
    const res = await loginRes;
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await expect(page.locator('#s-dashboard.active')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('#s-login.active')).toBeVisible();
  });
});
