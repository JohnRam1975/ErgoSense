import { expect, type Page } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL ?? process.env.AUDIT_EMAIL ?? 'auditor@ergosense.test';
const PASSWORD = process.env.E2E_PASSWORD ?? process.env.AUDIT_PASS ?? 'AuditTest!2026';
const FALLBACK_EMAIL = process.env.AUDIT_LEGACY_EMAIL ?? EMAIL;
const FALLBACK_PASSWORD = process.env.AUDIT_LEGACY_PASS ?? PASSWORD;
const GLOBAL_EMAIL = process.env.E2E_GLOBAL_EMAIL ?? 'ergosense@dejohn.com.br';
const GLOBAL_PASSWORD = process.env.E2E_GLOBAL_PASSWORD ?? '@Ergo!2026/Adm';

/** Aguarda React montar pelo menos uma tela */
export async function waitForAppBoot(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('.screen').first()).toBeVisible({ timeout: 90000 });
}

async function fillLoginFields(page: Page, email: string, password: string) {
  await page.locator('input[type="email"]').evaluate((el, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, email);
  await page.locator('input[type="password"]').evaluate((el, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, password);
}

/** Splash → login → dashboard autenticado */
export async function loginAsErgonomista(page: Page) {
  await waitForAppBoot(page);
  await page.getByRole('button', { name: /Acessar o Sistema/i }).click();
  await expect(page.locator('#s-login.active')).toBeVisible({ timeout: 15000 });

  await fillLoginFields(page, EMAIL, PASSWORD);

  let loggedIn = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const loginResponse = page.waitForResponse(
      (res) => res.url().includes('/api/auth/login') && res.status() < 500,
      { timeout: 30000 },
    );
    await page.getByRole('button', { name: /Entrar/i }).click();
    const res = await loginResponse;
    if (res.status() === 429) {
      await page.waitForTimeout(3000 * (attempt + 1));
      continue;
    }
    if (res.ok()) {
      loggedIn = true;
      break;
    }
    if (EMAIL !== FALLBACK_EMAIL && attempt === 0) {
      await fillLoginFields(page, FALLBACK_EMAIL, FALLBACK_PASSWORD);
      continue;
    }
    expect(res.ok(), `Login ergonomista falhou: ${res.status()}`).toBeTruthy();
  }
  expect(loggedIn, 'Login ergonomista falhou após retries').toBeTruthy();

  await expect(page.locator('#s-dashboard.active')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('#app-chrome')).toBeVisible({ timeout: 10000 });
  // Bridge só existe em DEV ou build com VITE_E2E=true (ex.: imagem e2e)
  await page
    .waitForFunction(() => Boolean(window.__ERGOSENSE_E2E__?.go), undefined, { timeout: 8000 })
    .catch(() => undefined);
}

/** Login admin global → painel global-admin */
export async function loginAsGlobalAdmin(page: Page) {
  await waitForAppBoot(page);
  await page.getByRole('button', { name: /Acessar o Sistema/i }).click();
  await expect(page.locator('#s-login.active')).toBeVisible({ timeout: 15000 });

  await fillLoginFields(page, GLOBAL_EMAIL, GLOBAL_PASSWORD);
  await expect(page.locator('input[type="email"]')).toHaveValue(GLOBAL_EMAIL);
  await expect(page.locator('input[type="password"]')).toHaveValue(GLOBAL_PASSWORD);

  const loginResponse = page.waitForResponse(
    (res) => res.url().includes('/api/auth/login') && res.status() < 500,
    { timeout: 30000 },
  );
  await page.getByRole('button', { name: /Entrar/i }).click();
  const res = await loginResponse;
  expect(res.ok(), `Login admin falhou: ${res.status()}`).toBeTruthy();

  await expect(page.locator('#s-global-admin.active')).toBeVisible({ timeout: 60000 });
  await page.waitForFunction(() => Boolean(window.__ERGOSENSE_E2E__?.go), undefined, { timeout: 30000 });
}

export async function openMenu(page: Page) {
  const overlay = page.locator('#menuOverlay');
  const isOpen = await overlay.evaluate((el) => el.classList.contains('open')).catch(() => false);
  if (isOpen) return;

  await page.locator('.app-chrome-nav button').filter({ hasText: 'Menu' }).click({ timeout: 15000 });
  await expect(overlay).toHaveClass(/open/, { timeout: 10000 });
}

export async function goToScreen(page: Page, screenId: string) {
  await openMenu(page);
  const btn = page.locator(`#menuDrawer button[data-screen-id="${screenId}"]`);
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await expect(page.locator(`#s-${screenId}.active`)).toBeVisible({ timeout: 25000 });
}
