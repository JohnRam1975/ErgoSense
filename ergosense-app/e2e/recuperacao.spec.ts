/**
 * Recuperação — Refresh mid-op · Queda de conexão · (servidor: ver script auxiliar)
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAsErgonomista } from './helpers/login';

async function e2eGo(page: Page, screenId: string) {
  await page.waitForFunction(() => Boolean(window.__ERGOSENSE_E2E__?.go), undefined, { timeout: 30000 });
  await page.evaluate((id) => window.__ERGOSENSE_E2E__?.go(id as never), screenId);
  await expect(page.locator(`#s-${screenId}.active`)).toBeVisible({ timeout: 20000 });
}

async function fillReactInput(page: Page, locator: ReturnType<Page['locator']>, value: string) {
  await locator.evaluate((el, v) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, v);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

test.describe('Recuperação', () => {
  test('Refresh durante operação — sessão retoma sem crash', async ({ page }) => {
    await loginAsErgonomista(page);
    await e2eGo(page, 'new-collab');

    const stamp = Date.now();
    const nameInput = page.locator('#s-new-collab.active input').first();
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    await fillReactInput(page, nameInput, `Recup Refresh ${stamp}`);

    // Refresh mid-form (estado em memória some; sessão em localStorage permanece)
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.screen').first()).toBeVisible({ timeout: 90000 });

    // Splash com sessão → dashboard automático
    await expect(page.locator('#s-dashboard.active')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('#app-chrome')).toBeVisible();

    // Continua navegável após refresh
    await e2eGo(page, 'collabs');
    await expect(page.locator('#s-collabs.active')).toBeVisible();
  });

  test('Queda de conexão — UI estável e recupera ao voltar', async ({ page }) => {
    await loginAsErgonomista(page);
    await e2eGo(page, 'collabs');
    await expect(page.locator('#s-collabs.active')).toBeVisible();

    await page.context().setOffline(true);

    // Tentativa de escrita / refresh de dados enquanto offline
    await e2eGo(page, 'new-collab');
    await expect(page.locator('#s-new-collab.active')).toBeVisible({ timeout: 15000 });

    const stamp = Date.now();
    const inputs = page.locator('#s-new-collab.active input');
    await fillReactInput(page, inputs.nth(0), `Offline ${stamp}`);
    // matrícula costuma ser o 2º campo texto
    if ((await inputs.count()) > 1) {
      await fillReactInput(page, inputs.nth(1), `OFF-${stamp}`);
    }

    await page.locator('#s-new-collab.active button', { hasText: /Salvar/i }).first().click();

    // Não deve navegar para dashboard autenticado quebrado / tela branca
    await expect(page.locator('.screen.active, .screen').first()).toBeVisible();
    await page.waitForTimeout(1500);
    const stillAlive = await page.locator('body').evaluate((b) => b.innerText.length > 20);
    expect(stillAlive).toBeTruthy();

    // Restaura rede — health/bootstrap deve permitir uso de novo
    await page.context().setOffline(false);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#s-dashboard.active')).toBeVisible({ timeout: 60000 });
    await e2eGo(page, 'collabs');
    await expect(page.locator('#s-collabs.active')).toBeVisible({ timeout: 20000 });
  });
});
