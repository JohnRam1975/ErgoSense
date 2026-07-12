import { test, expect } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:3001';
const AUDIT_EMAIL = process.env.AUDIT_EMAIL ?? 'auditor@ergosense.test';
const AUDIT_PASS = process.env.AUDIT_PASS ?? 'AuditTest!2026';

test.describe('Jornada — cross-tenant (API)', () => {
  test('ergonomista não acessa colaboradores de outro tenant', async () => {
    const loginRes = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: AUDIT_EMAIL, password: AUDIT_PASS }),
    });
    if (loginRes.status === 429) test.skip(true, 'rate limit');
    expect(loginRes.ok).toBeTruthy();
    const { accessToken } = await loginRes.json();
    const cross = await fetch(`${API}/api/collaborators?tenantId=gerdau`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect([401, 403]).toContain(cross.status);
  });
});
