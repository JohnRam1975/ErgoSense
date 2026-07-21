import { test, expect } from '@playwright/test';
import {
  submitTenantRequestApi,
  loginApi,
  approveTenantRequestApi,
  activateAccountApi,
  getActivationPreviewApi,
  getTenantRequestApi,
  totpFromOtpAuthUrl,
  generateValidCnpj,
} from '../helpers/onboardingApi';

const API = process.env.E2E_API_URL ?? 'http://localhost:3001';
const ADMIN_EMAIL = process.env.E2E_GLOBAL_EMAIL ?? 'ergosense@dejohn.com.br';
const ADMIN_PASS = process.env.E2E_GLOBAL_PASSWORD ?? '@Ergo!2026/Adm';

async function adminToken() {
  const r = await loginApi(ADMIN_EMAIL, ADMIN_PASS);
  return r.accessToken!;
}

test.describe('Jornada — tenant bloqueado', () => {
  test('login retorna 403 após bloqueio admin', async () => {
    test.setTimeout(180_000);
    const suffix = Date.now();
    const email = `blocked_e2e_${suffix}@test.local`;
    const cnpj = generateValidCnpj();
    const req = await submitTenantRequestApi({
      razaoSocial: `Blocked Co ${suffix}`,
      cnpj,
      email,
      responsavelNome: 'Admin Blocked',
      telefone: '11988887777',
    });
    const token = await adminToken();
    const approved = await approveTenantRequestApi(token, req.id);
    const detail = await getTenantRequestApi(token, req.id);
    const tenantId = detail.tenantId ?? approved.tenantId;
    expect(tenantId).toBeTruthy();

    const preview = await getActivationPreviewApi(approved.activationToken);
    const mfaCode = totpFromOtpAuthUrl(preview.otpauthUrl);
    const pass = 'BlockTest1!';
    await activateAccountApi({ token: approved.activationToken, password: pass, mfaCode });

    const blockRes = await fetch(`${API}/api/admin/tenants/${tenantId}/block`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'E2E bloqueio teste P4' }),
    });
    expect(blockRes.ok).toBeTruthy();

    const loginRes = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    expect(loginRes.status).toBe(403);
    const body = await loginRes.json();
    expect(JSON.stringify(body).toLowerCase()).toMatch(/bloqueado|suspenso|suporte/);
  });
});
