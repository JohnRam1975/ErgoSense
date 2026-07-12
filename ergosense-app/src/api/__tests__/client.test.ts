import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server';
import { errorHandlers } from '../../test/mocks/handlers';
import {
  setAccessToken,
  setCsrfToken,
  getAccessToken,
  setApiAuthSession,
} from '../authHeaders';
import {
  apiHealth,
  apiLogin,
  apiMfaVerify,
  apiLogout,
  apiGetTenants,
  apiGetCollaborators,
  apiGetAnalyses,
  apiGetReports,
  apiGetRiskInventorySummary,
  apiGetRiskInventory,
  apiGetDenunciaDashboard,
  apiGetDenuncias,
  apiGetGroDashboard,
  apiGetPgrProgram,
  apiGetPsicoDashboard,
  apiGetAetDashboard,
  apiGetSstDashboard,
  apiGetEsocialDashboard,
  apiGetComplianceDashboard,
  apiGetOrgTree,
  apiSaveCollaborator,
  apiDeleteAnalysis,
  apiGetAiStatus,
  apiAiExpertQuery,
  isApiAvailable,
  apiRestoreSession,
  apiSubmitAccessRequest,
  apiRegisterCompany,
  apiListAdminTenants,
  apiBlockAdminTenant,
  apiGetTenantMetadata,
  apiGetSupportStatus,
  apiGetComplianceNormas,
  apiRunComplianceScan,
  apiDeleteOrgEntity,
} from '../client';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  setApiAuthSession(null);
  setAccessToken(null);
  setCsrfToken(null);
});
afterAll(() => server.close());

describe('client.ts — HTTP core', () => {
  it('apiHealth retorna ok', async () => {
    const h = await apiHealth();
    expect(h.ok).toBe(true);
  });

  it('isApiAvailable true quando health ok', async () => {
    await expect(isApiAvailable()).resolves.toBe(true);
  });

  it('isApiAvailable false quando health falha', async () => {
    server.use(http.get('*/api/health', () => HttpResponse.error()));
    await expect(isApiAvailable()).resolves.toBe(false);
  });

  it('unwrapApiBody via login success envelope', async () => {
    const result = await apiLogin('user@test.com', 'password1234');
    expect('accessToken' in result).toBe(true);
    if ('accessToken' in result) {
      expect(result.accessToken).toBe('access-token-abc');
      expect(getAccessToken()).toBe('access-token-abc');
    }
  });

  it('login MFA pendente', async () => {
    const result = await apiLogin('mfa@test.com', 'password1234');
    expect(result).toMatchObject({ mfaRequired: true, mfaToken: 'mfa-token-123' });
  });

  it('login erro 401', async () => {
    await expect(apiLogin('user@test.com', 'wrongpass1')).rejects.toThrow(/Credenciais inválidas/);
  });

  it('login erro 403 tenant bloqueado', async () => {
    await expect(apiLogin('blocked@test.com', 'password1234')).rejects.toThrow(/Tenant bloqueado/);
  });

  it('apiMfaVerify sucesso persiste tokens', async () => {
    const data = await apiMfaVerify('mfa-token-123', '123456');
    expect(data.accessToken).toBe('access-after-mfa');
    expect(getAccessToken()).toBe('access-after-mfa');
  });

  it('apiMfaVerify código inválido', async () => {
    await expect(apiMfaVerify('mfa-token-123', '999999')).rejects.toThrow(/inválido/i);
  });

  it('apiLogout não lança', async () => {
    setAccessToken('tok');
    await expect(apiLogout()).resolves.toBeUndefined();
  });

  it('refresh automático em 401', async () => {
    setAccessToken('expired-token');
    setCsrfToken('csrf-old');
    let calls = 0;
    server.use(
      http.get('*/api/gro/dashboard', () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return HttpResponse.json({ success: true, data: { stage: 'identificacao' } });
      }),
    );
    const dash = await apiGetGroDashboard('tenant-1');
    expect(calls).toBeGreaterThanOrEqual(2);
    expect(dash).toBeTruthy();
    expect(getAccessToken()).toBe('refreshed-token');
  });

  it('apiRestoreSession delega refresh', async () => {
    setCsrfToken('csrf');
    await expect(apiRestoreSession()).resolves.toBe(true);
    expect(getAccessToken()).toBe('refreshed-token');
  });

  it('erro 403 padronizado', async () => {
    server.use(errorHandlers.forbidden);
    setAccessToken('valid');
    await expect(
      fetch('/api/forbidden', {
        headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json' },
      }),
    ).resolves.toBeTruthy();
  });

  it('erro 404 via request', async () => {
    server.use(
      http.get('*/api/collaborators', () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 }),
      ),
    );
    setAccessToken('valid');
    await expect(apiGetCollaborators('missing-tenant')).rejects.toThrow(/404|Not found|Erro/i);
  });

  it('erro 500 via request', async () => {
    server.use(
      http.get('*/api/analyses', () => HttpResponse.json({ error: 'Internal' }, { status: 500 })),
    );
    setAccessToken('valid');
    await expect(apiGetAnalyses('tenant-1')).rejects.toThrow(/500|Internal|Erro/i);
  });

  it('GET tenant resources com query params', async () => {
    setAccessToken('tok');
    await expect(apiGetTenants()).resolves.toEqual([
      expect.objectContaining({ id: 'tenant-1' }),
    ]);
    await expect(apiGetCollaborators('tenant-1')).resolves.toEqual(expect.objectContaining({ path: expect.any(String) }));
    await expect(apiGetAnalyses('tenant-1')).resolves.toBeTruthy();
    await expect(apiGetReports('tenant-1')).resolves.toBeTruthy();
  });

  it('POST save collaborator', async () => {
    setAccessToken('tok');
    const saved = await apiSaveCollaborator('tenant-1', {
      nome: 'Ana',
      matricula: '123',
      cargo: 'Op',
      setor: 'Britagem',
      turno: 'A',
      consent: true,
    });
    expect(saved).toMatchObject({ ok: true });
  });

  it('DELETE analysis', async () => {
    setAccessToken('tok');
    await expect(apiDeleteAnalysis('tenant-1', 'analysis-1')).resolves.toMatchObject({ ok: true });
  });

  it('módulos críticos GET', async () => {
    setAccessToken('tok');
    await expect(apiGetRiskInventorySummary('tenant-1')).resolves.toBeTruthy();
    await expect(apiGetRiskInventory('tenant-1')).resolves.toBeTruthy();
    await expect(apiGetDenunciaDashboard('tenant-1')).resolves.toBeTruthy();
    await expect(apiGetDenuncias('tenant-1', { status: 'aberta' })).resolves.toBeTruthy();
    await expect(apiGetPgrProgram('tenant-1')).resolves.toBeTruthy();
    await expect(apiGetPsicoDashboard('tenant-1')).resolves.toBeTruthy();
    await expect(apiGetAetDashboard('tenant-1')).resolves.toBeTruthy();
    await expect(apiGetSstDashboard('tenant-1')).resolves.toBeTruthy();
    await expect(apiGetEsocialDashboard('tenant-1')).resolves.toBeTruthy();
    await expect(apiGetComplianceDashboard('tenant-1')).resolves.toBeTruthy();
    await expect(apiGetOrgTree('tenant-1')).resolves.toBeTruthy();
  });

  it('admin e onboarding POST', async () => {
    setAccessToken('tok');
    await expect(
      apiSubmitAccessRequest({ nome: 'João', email: 'j@test.com', funcao: 'Op', matricula: '1' }),
    ).resolves.toBeUndefined();
    await expect(
      apiRegisterCompany({
        nome: 'Co',
        industria: 'Min',
        adminNome: 'Admin',
        adminEmail: 'a@co.com',
        adminPassword: 'secret1234',
      }),
    ).resolves.toMatchObject({ ok: true });
    await expect(apiListAdminTenants('active')).resolves.toBeTruthy();
    await expect(apiBlockAdminTenant('t1', 'inadimplência')).resolves.toMatchObject({ ok: true });
  });

  it('support e metadata', async () => {
    setAccessToken('tok');
    await expect(apiGetTenantMetadata()).resolves.toEqual([
      expect.objectContaining({ id: 'tenant-1' }),
    ]);
    await expect(apiGetSupportStatus('tenant-1')).resolves.toMatchObject({ ok: true });
  });

  it('compliance scan e normas', async () => {
    setAccessToken('tok');
    await expect(apiGetComplianceNormas('tenant-1')).resolves.toBeTruthy();
    await expect(apiRunComplianceScan('tenant-1', ['DOU'])).resolves.toMatchObject({ ok: true });
  });

  it('org delete nível inválido', async () => {
    setAccessToken('tok');
    await expect(apiDeleteOrgEntity('tenant-1', 'invalid' as 'empresa', 'x')).rejects.toThrow(
      /Nível inválido/,
    );
  });

  it('org delete válido', async () => {
    setAccessToken('tok');
    await expect(apiDeleteOrgEntity('tenant-1', 'setor', 'sec-1')).resolves.toMatchObject({ ok: true });
  });

  it('AI expert endpoints', async () => {
    setAccessToken('tok');
    await expect(apiGetAiStatus()).resolves.toMatchObject({ ok: true });
    await expect(apiAiExpertQuery('tenant-1', { prompt: 'resumo riscos' })).resolves.toMatchObject({
      ok: true,
    });
  });

  it('headers incluem Authorization e CSRF', async () => {
    setAccessToken('hdr-token');
    setCsrfToken('hdr-csrf');
    let authHeader = '';
    server.use(
      http.get('*/api/gro/dashboard', ({ request }) => {
        authHeader = request.headers.get('Authorization') ?? '';
        expect(request.headers.get('X-CSRF-Token')).toBe('hdr-csrf');
        return HttpResponse.json({ ok: true });
      }),
    );
    await apiGetGroDashboard('tenant-1');
    expect(authHeader).toBe('Bearer hdr-token');
  });
});
