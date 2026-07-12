import { test, expect } from '@playwright/test';
test.describe('Jornada — API indisponível', () => {
  test('login falha graciosamente quando API retorna erro', async ({ page }) => {
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Service Unavailable' }) }),
    );
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await expect(page.locator('.screen').first()).toBeVisible({ timeout: 90000 });
    await page.getByRole('button', { name: /Acessar o Sistema/i }).click();
    await expect(page.locator('#s-login.active')).toBeVisible({ timeout: 15000 });
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('Test1234');
    await page.getByRole('button', { name: /Entrar/i }).click();
    await expect(page.locator('#s-login.active')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#s-dashboard.active')).not.toBeVisible();
  });
});
