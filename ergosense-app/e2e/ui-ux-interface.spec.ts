/**
 * Interface (UI/UX) — Navegação · Responsividade · Mensagens de erro · Feedback visual
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAsErgonomista, openMenu, waitForAppBoot } from './helpers/login';

async function toastVisible(page: Page, text: RegExp | string, timeout = 10000) {
  const toast = page.locator('#toast.show');
  await expect(toast).toBeVisible({ timeout });
  if (typeof text === 'string') await expect(toast).toContainText(text);
  else await expect(toast).toHaveText(text);
  return toast;
}

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
  expect(overflow.docScroll).toBeLessThanOrEqual(overflow.docClient + 1);
  expect(overflow.bodyScroll).toBeLessThanOrEqual(overflow.bodyClient + 2);
}

async function e2eGo(page: Page, screenId: string) {
  await page.waitForFunction(() => Boolean(window.__ERGOSENSE_E2E__?.go), undefined, { timeout: 30000 });
  await page.evaluate((id) => window.__ERGOSENSE_E2E__?.go(id as never), screenId);
  await expect(page.locator(`#s-${screenId}.active`)).toBeVisible({ timeout: 20000 });
}

async function closeMenuUi(page: Page) {
  await page.keyboard.press('Escape');
  if (await page.locator('#menuOverlay.open').count()) {
    await page.locator('#menuDrawer .drawer-close').click({ force: true });
  }
  await expect(page.locator('#menuOverlay.open')).toHaveCount(0, { timeout: 5000 });
}

test.describe('Interface UI/UX', () => {
  test('Navegação — splash → login → dashboard → menu → telas → voltar', async ({ page }) => {
    await loginAsErgonomista(page);
    await expect(page.locator('#s-dashboard.active')).toBeVisible();

    await openMenu(page);
    await expect(page.locator('#menuOverlay.open')).toBeVisible();
    await expect(page.locator('#menuDrawer button[data-screen-id="collabs"]')).toBeAttached();
    await expect(page.locator('#menuDrawer button[data-screen-id="history"]')).toBeAttached();
    await expect(page.locator('#menuDrawer button[data-screen-id="reports"]')).toBeAttached();
    await expect(page.locator('#menuDrawer button[data-screen-id="settings"]')).toBeAttached();

    await page.locator('#menuDrawer button[data-screen-id="collabs"]').click({ force: true });
    await expect(page.locator('#s-collabs.active')).toBeVisible({ timeout: 20000 });

    for (const id of ['history', 'reports', 'settings', 'dashboard'] as const) {
      await e2eGo(page, id);
    }

    await openMenu(page);
    await closeMenuUi(page);
  });

  test('Responsividade — 375 / 768 / 1280 sem overflow-x + viewport zoomável', async ({ page }) => {
    const sizes = [
      { w: 375, h: 812 },
      { w: 768, h: 1024 },
      { w: 1280, h: 800 },
    ];

    await waitForAppBoot(page);
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta || '').not.toMatch(/user-scalable\s*=\s*no/i);
    expect(viewportMeta || '').not.toMatch(/maximum-scale\s*=\s*1(\.0)?\b/i);

    await page.getByRole('button', { name: /Acessar o Sistema/i }).click();
    await expect(page.locator('#s-login.active')).toBeVisible({ timeout: 15000 });

    for (const { w, h } of sizes) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(150);
      await noHorizontalOverflow(page);
      await expect(page.locator('input[type="email"]')).toBeVisible();
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsErgonomista(page);
    await noHorizontalOverflow(page);
    await openMenu(page);
    await noHorizontalOverflow(page);
    await closeMenuUi(page);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(150);
    await noHorizontalOverflow(page);
    await expect(page.locator('#app-chrome')).toBeVisible();
  });

  test('Mensagens de erro — login inválido + formulário colaborador vazio', async ({ page }) => {
    await waitForAppBoot(page);
    await page.getByRole('button', { name: /Acessar o Sistema/i }).click();
    await expect(page.locator('#s-login.active')).toBeVisible({ timeout: 15000 });

    await page.locator('input[type="email"]').evaluate((el) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(el, 'invalido@ergosense.test');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('input[type="password"]').evaluate((el) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(el, 'senha-errada-xyz');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.getByRole('button', { name: /Entrar/i }).click();
    await toastVisible(page, /[Cc]redenciais|[Ii]nválid|[Ff]alha|[Ee]rro|indispon/i);
    await expect(page.locator('#toast.show')).toHaveClass(/warn|error|info/);

    await loginAsErgonomista(page);
    await e2eGo(page, 'new-collab');
    await page.locator('#s-new-collab button').filter({ hasText: /Salvar/i }).first().click({ force: true });
    await toastVisible(page, /obrigat|Nome|matrícula|matricula/i);
    await expect(page.locator('#toast.show')).toHaveClass(/warn/);
  });

  test('Feedback visual — toast info + modal confirmação + status API', async ({ page }) => {
    await loginAsErgonomista(page);

    await expect(page.locator('#statusBar')).toBeVisible();
    await expect(page.locator('#statusBar .dot-g, #statusBar .dot-r')).toBeVisible();

    await e2eGo(page, 'new-analysis');
    await page.locator('#s-new-analysis.active').getByText('TFLite local · sem internet').click({ force: true });
    await toastVisible(page, /Modo: Análise Offline|TFLite|Offline/i);
    await expect(page.locator('#toast.show')).toHaveClass(/info/);

    await e2eGo(page, 'dashboard');
    await openMenu(page);
    await page.locator('#menuDrawer button').filter({ hasText: /Sair/i }).first().click({ force: true });
    await expect(page.locator('#modal.open')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#modal .modal-title')).toContainText(/Sair/i);
    await expect(page.locator('#modal .modal-body')).toBeVisible();
    await page.locator('#modal button').filter({ hasText: /Cancelar/i }).click();
    await expect(page.locator('#modal.open')).toHaveCount(0, { timeout: 5000 });
  });
});
