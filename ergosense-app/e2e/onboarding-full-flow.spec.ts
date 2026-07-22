import { test, expect } from '@playwright/test';

import { waitForAppBoot } from './helpers/login';
import {
  activateAccountApi,
  approveTenantRequestApi,
  generateValidCnpj,
  getActivationPreviewApi,
  getTenantRequestApi,
  grantTenantAccessApi,
  listTenantRequests,
  loginApi,
  totpFromOtpAuthUrl,
} from './helpers/onboardingApi';

const GLOBAL_EMAIL = process.env.E2E_GLOBAL_EMAIL ?? 'ergosense@dejohn.com.br';
const GLOBAL_PASSWORD = process.env.E2E_GLOBAL_PASSWORD ?? '@Ergo!2026/Adm';

async function fillInput(page: import('@playwright/test').Page, selector: string, value: string) {
  await page.locator(selector).evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

test.describe('Fluxo E2E — onboarding tenant completo', () => {
  test('solicita → aprova → ativa → login MFA → dashboard', async ({ page }) => {
    test.setTimeout(300_000);

    const stamp = Date.now();
    const email = `e2e-tenant-${stamp}@test.ergosense.local`;
    const company = `Empresa E2E ${stamp}`;
    const cnpj = generateValidCnpj();
    const password = `Erg0Test${stamp}!`;

    // 1. UI — empresa solicita cadastro
    await page.goto('/request-access');
    await expect(page.locator('#s-request-access.active')).toBeVisible({ timeout: 30000 });

    await fillInput(page, 'input.inp >> nth=0', company);
    await fillInput(page, 'input.inp >> nth=2', cnpj);
    await fillInput(page, 'input.inp >> nth=3', 'Tecnologia');
    await fillInput(page, 'input.inp >> nth=5', 'Admin E2E');
    await fillInput(page, 'input[type="email"]', email);
    await fillInput(page, 'input.inp >> nth=7', '11999990000');
    await fillInput(page, 'input[type="password"] >> nth=0', password);
    await fillInput(page, 'input[type="password"] >> nth=1', password);

    const submitResponse = page.waitForResponse(
      (res) => res.url().includes('/api/public/tenant-request') && res.status() < 500,
      { timeout: 30000 },
    );
    await page.getByRole('button', { name: /Enviar solicitação/i }).click();
    const submitRes = await submitResponse;
    expect(submitRes.ok(), `tenant-request falhou: ${submitRes.status()}`).toBeTruthy();
    await expect(page.getByText(/ESP-/)).toBeVisible({ timeout: 15000 });

    // 2. API — admin aprova
    const adminLogin = await loginApi(GLOBAL_EMAIL, GLOBAL_PASSWORD);
    expect(adminLogin.mfaRequired, 'admin global não deve exigir MFA no ambiente E2E').toBeFalsy();
    const pending = await listTenantRequests(adminLogin.accessToken, company);
    const request = pending.find((r) => r.email === email || (r as { razaoSocial?: string }).razaoSocial === company);
    expect(request, 'solicitação pendente não encontrada').toBeTruthy();

    const approved = await approveTenantRequestApi(adminLogin.accessToken, request!.id);
    const activationToken = approved.activationToken;
    expect(activationToken).toBeTruthy();

    // 3. API — preview MFA + ativação (senha já definida no cadastro)
    const preview = await getActivationPreviewApi(activationToken);
    const activateMfaCode = totpFromOtpAuthUrl(preview.otpauthUrl);
    await activateAccountApi({ token: activationToken, mfaCode: activateMfaCode });

    const detail = await getTenantRequestApi(adminLogin.accessToken, request!.id);
    const tenantId = detail.tenantId ?? approved.tenantId;
    expect(tenantId).toBeTruthy();
    await grantTenantAccessApi(adminLogin.accessToken, tenantId!);

    // 4. UI — login com MFA
    await waitForAppBoot(page);
    await page.getByRole('button', { name: /Acessar o Sistema/i }).click();
    await expect(page.locator('#s-login.active')).toBeVisible({ timeout: 15000 });

    await fillInput(page, 'input[type="email"]', email);
    await fillInput(page, 'input[type="password"]', password);

    const loginResponse = page.waitForResponse(
      (res) => res.url().includes('/api/auth/login') && res.status() < 500,
      { timeout: 30000 },
    );
    await page.getByRole('button', { name: /Entrar/i }).click();
    const loginRes = await loginResponse;
    expect(loginRes.ok()).toBeTruthy();

    await expect(page.getByText(/Verificação MFA/i)).toBeVisible({ timeout: 15000 });

    const loginMfaCode = totpFromOtpAuthUrl(preview.otpauthUrl);
    await fillInput(page, 'input[inputmode="numeric"]', loginMfaCode);

    const mfaResponse = page.waitForResponse(
      (res) => res.url().includes('/api/auth/mfa/verify') && res.status() < 500,
      { timeout: 30000 },
    );
    await page.getByRole('button', { name: /Confirmar/i }).click();
    const mfaRes = await mfaResponse;
    expect(mfaRes.ok(), `MFA verify falhou: ${mfaRes.status()}`).toBeTruthy();

    // 5. Entra no sistema (dashboard admin empresa)
    await expect(page.locator('#s-dashboard.active')).toBeVisible({ timeout: 90000 });
    await expect(page.locator('#app-chrome')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Admin E2E')).toBeVisible({ timeout: 15000 });
  });
});
