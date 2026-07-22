import { expect, type Page } from '@playwright/test';
import { openMenu, waitForAppBoot } from './login';
import { type AllScreenId } from '../screen-ids';

export async function expectScreenActive(page: Page, screenId: string) {
  await expect(page.locator(`#s-${screenId}.active`)).toBeVisible({ timeout: 25000 });
}

export async function waitForE2EBridge(page: Page) {
  await page.waitForFunction(() => Boolean(window.__ERGOSENSE_E2E__?.go), undefined, { timeout: 30000 });
}

export async function e2eGo(page: Page, screenId: string) {
  await waitForE2EBridge(page);
  await page.evaluate((id) => window.__ERGOSENSE_E2E__?.go(id as never), screenId);
  await expectScreenActive(page, screenId);
}

/** Navega para qualquer tela — drawer, auth, detalhe ou bridge E2E */
export async function navigateToScreen(page: Page, screenId: AllScreenId) {
  switch (screenId) {
    case 'splash':
      await waitForAppBoot(page);
      break;

    case 'login':
      await waitForAppBoot(page);
      await page.getByRole('button', { name: /Acessar o Sistema/i }).click();
      break;

    case 'request-access':
      await navigateToScreen(page, 'login');
      await page.getByText(/Cadastrar empresa/i).click();
      break;

    case 'request-access-autonomo':
      await navigateToScreen(page, 'login');
      await page.getByText(/Sou autônomo/i).click();
      break;

    case 'activate-account':
      await waitForAppBoot(page);
      await page.goto('/activate-account?token=e2e-test-token');
      await expectScreenActive(page, 'activate-account');
      return;

    case 'company':
      // Ergonomista usa bridge E2E — menu só oferece "Trocar empresa" para admin global.
      await e2eGo(page, 'company');
      await page.locator('button.cch').first().click({ timeout: 15000 }).catch(() => undefined);
      await page.evaluate(() => window.__ERGOSENSE_E2E__?.go('dashboard'));
      await expectScreenActive(page, 'dashboard');
      return;

    case 'new-collab':
      await e2eGo(page, 'collabs');
      await page.getByRole('button', { name: /Novo Colaborador/i }).click();
      await expectScreenActive(page, 'new-collab');
      await page.evaluate(() => window.__ERGOSENSE_E2E__?.go('dashboard'));
      await expectScreenActive(page, 'dashboard');
      return;

    case 'support-access':
      await waitForE2EBridge(page);
      await page.evaluate(() => window.__ERGOSENSE_E2E__?.go('support-access'));
      await expect(
        page.locator('#s-support-access.active').or(page.locator('#s-dashboard.active')),
      ).toBeVisible({ timeout: 25000 });
      return;

    case 'register-company':
    case 'global-admin':
    case 'admin-tenant-requests':
    case 'admin-tenants-active':
    case 'admin-tenants-blocked':
    case 'admin-tenants-expired':
    case 'admin-access-control':
      await e2eGo(page, screenId);
      break;

    case 'admin-tenant-request-detail':
      await waitForE2EBridge(page);
      await page.evaluate(() => sessionStorage.setItem('ergosense_admin_request_id', '1'));
      await page.evaluate(() => window.__ERGOSENSE_E2E__?.go('admin-tenant-request-detail'));
      break;

    case 'camera':
      await waitForE2EBridge(page);
      await page.evaluate(() => {
        window.__ERGOSENSE_E2E__?.prepareCamera();
        window.__ERGOSENSE_E2E__?.go('camera');
      });
      await expectScreenActive(page, 'camera');
      await page.evaluate(() => window.__ERGOSENSE_E2E__?.go('dashboard'));
      await expectScreenActive(page, 'dashboard');
      return;

    case 'result':
      await e2eGo(page, 'result');
      return;

    case 'inventario-form':
      await waitForE2EBridge(page);
      await page.evaluate(() => window.__ERGOSENSE_E2E__?.openRiskForm());
      break;

    case 'denuncia-detalhe':
    case 'pgr-detalhe':
    case 'aet-detalhe':
      await e2eGo(page, screenId);
      return;

    default:
      await e2eGo(page, screenId);
      return;
  }

  await expectScreenActive(page, screenId);
}
