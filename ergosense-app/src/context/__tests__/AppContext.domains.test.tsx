import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppProvider, useApp } from '../AppContext';
import { createMinimalTenantBundle } from '../../test/fixtures/tenantBundle';
import { getAccessToken } from '../../api/authHeaders';

const mocks = vi.hoisted(() => ({
  isApiAvailable: vi.fn(),
  apiLogin: vi.fn(),
  apiMfaVerify: vi.fn(),
  apiLogout: vi.fn(),
  apiGetTenants: vi.fn(),
  apiRestoreSession: vi.fn(),
  fetchBundle: vi.fn(),
  apiGetEsocialDashboard: vi.fn(),
  apiGetEsocialConfig: vi.fn(),
  apiGetEsocialEventos: vi.fn(),
  apiGetEsocialHistorico: vi.fn(),
  apiCreateEsocialEvento: vi.fn(),
  apiValidateEsocialEvento: vi.fn(),
  apiSignEsocialEvento: vi.fn(),
  apiUpdateEsocialConfig: vi.fn(),
  apiGetComplianceDashboard: vi.fn(),
  apiGetComplianceFontes: vi.fn(),
  apiGetComplianceNormas: vi.fn(),
  apiGetComplianceDeteccoes: vi.fn(),
  apiGetComplianceAlertas: vi.fn(),
  apiGetComplianceRelatorios: vi.fn(),
  apiGetComplianceTasks: vi.fn(),
  apiGetComplianceSchedule: vi.fn(),
  apiRunComplianceScan: vi.fn(),
  apiUpdateComplianceFonte: vi.fn(),
  apiAuthorizeSupport: vi.fn(),
  apiRevokeSupport: vi.fn(),
  apiGetSupportStatus: vi.fn(),
  apiGetSupportAudit: vi.fn(),
  apiGetTenantMetadata: vi.fn(),
}));

vi.mock('../../api/client', () => ({
  isApiAvailable: mocks.isApiAvailable,
  apiLogin: mocks.apiLogin,
  apiMfaVerify: mocks.apiMfaVerify,
  apiLogout: mocks.apiLogout,
  apiGetTenants: mocks.apiGetTenants,
  apiRestoreSession: mocks.apiRestoreSession,
  apiRegisterCompany: vi.fn(),
  apiSubmitAccessRequest: vi.fn(),
  apiGetTenantMetadata: mocks.apiGetTenantMetadata,
  apiGetSupportStatus: mocks.apiGetSupportStatus,
  apiGetSupportAudit: mocks.apiGetSupportAudit,
  apiAuthorizeSupport: mocks.apiAuthorizeSupport,
  apiRevokeSupport: mocks.apiRevokeSupport,
  apiGetEsocialDashboard: mocks.apiGetEsocialDashboard,
  apiGetEsocialConfig: mocks.apiGetEsocialConfig,
  apiGetEsocialEventos: mocks.apiGetEsocialEventos,
  apiGetEsocialHistorico: mocks.apiGetEsocialHistorico,
  apiCreateEsocialEvento: mocks.apiCreateEsocialEvento,
  apiValidateEsocialEvento: mocks.apiValidateEsocialEvento,
  apiSignEsocialEvento: mocks.apiSignEsocialEvento,
  apiUpdateEsocialConfig: mocks.apiUpdateEsocialConfig,
  apiGetComplianceDashboard: mocks.apiGetComplianceDashboard,
  apiGetComplianceFontes: mocks.apiGetComplianceFontes,
  apiGetComplianceNormas: mocks.apiGetComplianceNormas,
  apiGetComplianceDeteccoes: mocks.apiGetComplianceDeteccoes,
  apiGetComplianceAlertas: mocks.apiGetComplianceAlertas,
  apiGetComplianceRelatorios: mocks.apiGetComplianceRelatorios,
  apiGetComplianceTasks: mocks.apiGetComplianceTasks,
  apiGetComplianceSchedule: mocks.apiGetComplianceSchedule,
  apiRunComplianceScan: mocks.apiRunComplianceScan,
  apiUpdateComplianceFonte: mocks.apiUpdateComplianceFonte,
  apiSaveAnalysis: vi.fn(),
  apiDeleteAnalysis: vi.fn(),
  apiGetRiskInventory: vi.fn().mockResolvedValue([]),
  apiGetRiskInventorySummary: vi.fn().mockResolvedValue(null),
  apiSaveRiskInventory: vi.fn(),
  apiDeleteRiskInventory: vi.fn(),
  apiGetDenunciaDashboard: vi.fn().mockResolvedValue(null),
  apiGetDenuncias: vi.fn().mockResolvedValue([]),
  apiGetDenuncia: vi.fn(),
  apiCreateDenuncia: vi.fn(),
  apiUpdateDenunciaStatus: vi.fn(),
  apiAddDenunciaTreatment: vi.fn(),
  apiAddDenunciaEvidence: vi.fn(),
  apiIntegrateDenuncia: vi.fn(),
  apiConcludeDenuncia: vi.fn(),
  apiGetActiveCriteria: vi.fn().mockResolvedValue(null),
  apiGetCriteriaDocumentation: vi.fn().mockResolvedValue(null),
  apiFetchCriteriaMethodologies: vi.fn().mockResolvedValue([]),
  apiCreateCriteriaMethodology: vi.fn(),
  apiActivateCriteriaVersion: vi.fn(),
  apiFetchCriteriaAudit: vi.fn().mockResolvedValue([]),
  apiGetGroDashboard: vi.fn().mockResolvedValue(null),
  apiGetGroWorkflow: vi.fn().mockResolvedValue(null),
  apiAdvanceGroWorkflow: vi.fn(),
  apiCompleteGroReview: vi.fn(),
  apiGetGroActionPlans: vi.fn().mockResolvedValue([]),
  apiSaveGroActionPlan: vi.fn(),
  apiDeleteGroActionPlan: vi.fn(),
  apiGetGroIndicators: vi.fn().mockResolvedValue([]),
  apiSaveGroIndicator: vi.fn(),
  apiDeleteGroIndicator: vi.fn(),
  apiGetGroHistory: vi.fn().mockResolvedValue([]),
  apiGetGroReports: vi.fn().mockResolvedValue([]),
  apiGenerateGroReport: vi.fn(),
  apiGetPgrProgram: vi.fn().mockResolvedValue(null),
  apiUpdatePgrProgram: vi.fn(),
  apiGetPgrVersions: vi.fn().mockResolvedValue([]),
  apiGetPgrVersion: vi.fn(),
  apiGeneratePgrVersion: vi.fn(),
  apiRefreshPgrVersion: vi.fn(),
  apiSubmitPgrApproval: vi.fn(),
  apiApprovePgrVersion: vi.fn(),
  apiRejectPgrVersion: vi.fn(),
  apiSignPgrVersion: vi.fn(),
  apiStartPgrRevision: vi.fn(),
  apiGetPgrHistory: vi.fn().mockResolvedValue([]),
  apiGetPsicoDashboard: vi.fn().mockResolvedValue(null),
  apiGetPsicoFatores: vi.fn().mockResolvedValue([]),
  apiGetPsicoMatriz: vi.fn().mockResolvedValue([]),
  apiGetPsicoConformidade: vi.fn().mockResolvedValue(null),
  apiGetPsicoPlanoAcao: vi.fn().mockResolvedValue([]),
  apiGetPsicoHistorico: vi.fn().mockResolvedValue([]),
  apiGetPsicoTendencias: vi.fn().mockResolvedValue([]),
  apiSavePsicoFator: vi.fn(),
  apiSavePsicoPlanoAcao: vi.fn(),
  apiDeletePsicoPlanoAcao: vi.fn(),
  apiSubmitPsicoResposta: vi.fn(),
  apiMarkPsicoAlertRead: vi.fn(),
  apiGetAetDashboard: vi.fn().mockResolvedValue(null),
  apiGetAetProcessos: vi.fn().mockResolvedValue([]),
  apiGetAetProcesso: vi.fn(),
  apiAdvanceAetStage: vi.fn(),
  apiSaveAetVibracaoCorpo: vi.fn(),
  apiSaveAetVibracaoMaos: vi.fn(),
  apiSaveAetTeleatendimento: vi.fn(),
  apiSaveAetOrganizacao: vi.fn(),
  apiSaveAetMetodos: vi.fn(),
  apiGenerateAetReport: vi.fn(),
  apiGetAetMobiliario: vi.fn().mockResolvedValue([]),
  apiSaveAetMobiliario: vi.fn(),
  apiGetAetEquipamentos: vi.fn().mockResolvedValue([]),
  apiSaveAetEquipamento: vi.fn(),
  apiGetAetHistorico: vi.fn().mockResolvedValue([]),
  apiUpdateAetTechnicalResponsible: vi.fn(),
  apiGetAetVersions: vi.fn().mockResolvedValue([]),
  apiCreateAetVersion: vi.fn(),
  apiGetAetVersion: vi.fn(),
  apiRefreshAetVersionSnapshot: vi.fn(),
  apiGenerateAetVersionReport: vi.fn(),
  apiSubmitAetApproval: vi.fn(),
  apiApproveAetVersion: vi.fn(),
  apiRejectAetVersion: vi.fn(),
  apiSignAetVersion: vi.fn(),
  apiStartAetRevision: vi.fn(),
  apiGetAetIntegrations: vi.fn().mockResolvedValue([]),
  apiGetSstDashboard: vi.fn().mockResolvedValue(null),
  apiGetSstApr: vi.fn().mockResolvedValue([]),
  apiCreateSstApr: vi.fn(),
  apiGetSstEpi: vi.fn().mockResolvedValue([]),
  apiCreateSstEpi: vi.fn(),
  apiGetSstEpc: vi.fn().mockResolvedValue([]),
  apiCreateSstEpc: vi.fn(),
  apiGetSstInspecoes: vi.fn().mockResolvedValue([]),
  apiCreateSstInspecao: vi.fn(),
  apiGetSstAuditorias: vi.fn().mockResolvedValue([]),
  apiCreateSstAuditoria: vi.fn(),
  apiGetSstNc: vi.fn().mockResolvedValue([]),
  apiCreateSstNc: vi.fn(),
  apiGetSstCapa: vi.fn().mockResolvedValue([]),
  apiCreateSstCapa: vi.fn(),
  apiGetSstTreinamentos: vi.fn().mockResolvedValue([]),
  apiCreateSstTreinamento: vi.fn(),
  apiGenerateSstReport: vi.fn(),
  apiPrepareEsocialEnvio: vi.fn(),
  apiGetEsocialXml: vi.fn(),
  apiTransmitEsocialEvento: vi.fn(),
  apiResendEsocialEvento: vi.fn(),
  apiConsultEsocialStatus: vi.fn(),
  apiGetComplianceNormaVersoes: vi.fn().mockResolvedValue([]),
  apiGetComplianceImpactos: vi.fn().mockResolvedValue([]),
  apiValidateComplianceDetection: vi.fn(),
  apiMarkComplianceAlertRead: vi.fn(),
  apiGenerateComplianceReport: vi.fn(),
  apiCompareComplianceNormVersions: vi.fn(),
  apiUpdateComplianceSchedule: vi.fn(),
  apiUpdateComplianceTask: vi.fn(),
  apiGetOrgTree: vi.fn().mockResolvedValue({ units: [] }),
  apiCreateOrgUnit: vi.fn(),
  apiCreateOrgSector: vi.fn(),
  apiCreateOrgFunction: vi.fn(),
  apiCreateOrgActivity: vi.fn(),
  apiCreateOrgWorkPost: vi.fn(),
  apiDeleteOrgEntity: vi.fn(),
  apiSaveCollaborator: vi.fn(),
  apiUpdateCollaborator: vi.fn(),
}));

vi.mock('../hooks/fetchTenantDataBundle', () => ({
  fetchTenantDataBundle: mocks.fetchBundle,
}));

function wrapper({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

async function loginAsErgonomist(result: { current: ReturnType<typeof useApp> }) {
  mocks.apiLogin.mockResolvedValue({
    user: {
      email: 'ergo@test.com',
      name: 'Ergonomista',
      role: 'ERGONOMISTA',
      company: 'Acme',
      location: 'HQ',
      tenantId: 'acme',
    },
    accessToken: 'jwt-1',
    expiresIn: 3600,
    csrfToken: 'csrf-1',
  });
  await waitFor(() => expect(result.current.dbConnected).toBe(true));
  await act(async () => {
    await result.current.login('ergo@test.com', 'password1234');
  });
  await act(async () => { await await result.current.selectCompany('acme'); });
}

describe('AppContext — auth estendido', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.isApiAvailable.mockResolvedValue(true);
    mocks.apiGetTenants.mockResolvedValue([{ id: 'acme', name: 'Acme', industry: 'Services' }]);
    mocks.fetchBundle.mockResolvedValue(createMinimalTenantBundle());
    mocks.apiRestoreSession.mockResolvedValue(true);
    mocks.apiLogout.mockResolvedValue(undefined);
    mocks.apiGetTenantMetadata.mockResolvedValue([]);
    mocks.apiGetSupportStatus.mockResolvedValue({ active: false });
    mocks.apiGetSupportAudit.mockResolvedValue([]);
  });

  it('login erro API (401) retorna false e toast warn', async () => {
    mocks.apiLogin.mockRejectedValue(new Error('401 Unauthorized'));
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    await act(async () => {
      expect(await result.current.login('ergo@test.com', 'password1234')).toBe(false);
    });
    expect(result.current.toast?.type).toBe('warn');
  });

  it('login erro API (403 tenant bloqueado) retorna false', async () => {
    mocks.apiLogin.mockRejectedValue(new Error('403 Conta bloqueada'));
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    await act(async () => {
      expect(await result.current.login('blocked@test.com', 'password1234')).toBe(false);
    });
  });

  it('restoreSession limpa sessão quando refresh falha', async () => {
    localStorage.setItem(
      'ergosense-app-v2',
      JSON.stringify({
        session: {
          email: 'saved@test.com',
          name: 'Saved',
          role: 'Operador',
          roleCode: 'OPERADOR',
          company: 'Co',
          location: 'HQ',
          tenantId: 'acme',
        },
        selectedCompanyId: 'acme',
        collaborators: [],
        analyses: [],
        reports: [],
        settings: {},
        analysisMode: 'complete',
        reportType: 'NR17',
      }),
    );
    mocks.apiRestoreSession.mockResolvedValue(false);
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(mocks.apiRestoreSession).toHaveBeenCalled());
    await waitFor(() => expect(result.current.session).toBeNull());
  });

  it('logout limpa localStorage e token', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    act(() => result.current.logout());
    expect(result.current.session).toBeNull();
    expect(getAccessToken()).toBeNull();
    const stored = JSON.parse(localStorage.getItem('ergosense-app-v2') ?? '{}');
    expect(stored.session).toBeNull();
  });

  it('API offline — login não cria sessão demo', async () => {
    mocks.isApiAvailable.mockResolvedValue(false);
    mocks.apiLogin.mockRejectedValue(new Error('Failed to fetch'));
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(false));
    await act(async () => {
      expect(await result.current.login('offline@test.com', 'password1234')).toBe(false);
    });
    expect(result.current.session).toBeNull();
  });

  it('bootstrap tenants com erro não quebra app', async () => {
    mocks.apiGetTenants.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    expect(result.current.companies.length).toBeGreaterThanOrEqual(0);
  });

  it('loadTenantData erro exibe toast', async () => {
    mocks.fetchBundle.mockRejectedValue(new Error('DB down'));
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await waitFor(() => expect(result.current.toast?.msg).toMatch(/PostgreSQL|carregar/i));
  });
});

describe('AppContext — eSocial e Compliance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.isApiAvailable.mockResolvedValue(true);
    mocks.apiGetTenants.mockResolvedValue([{ id: 'acme', name: 'Acme', industry: 'Services' }]);
    mocks.fetchBundle.mockResolvedValue(createMinimalTenantBundle());
    mocks.apiRestoreSession.mockResolvedValue(true);
    mocks.apiGetEsocialDashboard.mockResolvedValue({ total: 1 });
    mocks.apiGetEsocialConfig.mockResolvedValue({ ambiente: '1' });
    mocks.apiGetEsocialEventos.mockResolvedValue([]);
    mocks.apiGetEsocialHistorico.mockResolvedValue([]);
    mocks.apiGetComplianceDashboard.mockResolvedValue({ score: 80 });
    mocks.apiGetComplianceFontes.mockResolvedValue([]);
    mocks.apiGetComplianceNormas.mockResolvedValue([]);
    mocks.apiGetComplianceDeteccoes.mockResolvedValue([]);
    mocks.apiGetComplianceAlertas.mockResolvedValue([]);
    mocks.apiGetComplianceRelatorios.mockResolvedValue([]);
    mocks.apiGetComplianceTasks.mockResolvedValue([]);
    mocks.apiGetComplianceSchedule.mockResolvedValue(null);
    mocks.apiGetTenantMetadata.mockResolvedValue([]);
    mocks.apiGetSupportStatus.mockResolvedValue({ active: false });
    mocks.apiGetSupportAudit.mockResolvedValue([]);
  });

  it('refreshEsocialData carrega estado', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.refreshEsocialData();
    });
    expect(mocks.apiGetEsocialDashboard).toHaveBeenCalledWith('acme');
    expect(mocks.apiGetEsocialConfig).toHaveBeenCalled();
  });

  it('createEsocialEvent dispara refresh', async () => {
    mocks.apiCreateEsocialEvento.mockResolvedValue({ id: '1' });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.createEsocialEvent({ eventType: 'S-2210', payload: {} });
    });
    expect(mocks.apiCreateEsocialEvento).toHaveBeenCalled();
    expect(result.current.toast?.type).toBe('success');
  });

  it('validateEsocialEvent sucesso', async () => {
    mocks.apiValidateEsocialEvento.mockResolvedValue({ valid: true });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.validateEsocialEvent('1');
    });
    expect(result.current.toast?.type).toBe('success');
  });

  it('validateEsocialEvent falha', async () => {
    mocks.apiValidateEsocialEvento.mockRejectedValue(new Error('invalid'));
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.validateEsocialEvent('1');
    });
    expect(result.current.toast?.type).toBe('warn');
  });

  it('signEsocialEvent sucesso', async () => {
    mocks.apiSignEsocialEvento.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.signEsocialEvent('1');
    });
    expect(result.current.toast?.type).toBe('success');
  });

  it('updateEsocialConfig', async () => {
    mocks.apiUpdateEsocialConfig.mockResolvedValue({ ambiente: 2 });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.updateEsocialConfig({ ambiente: 2 });
    });
    expect(mocks.apiUpdateEsocialConfig).toHaveBeenCalled();
  });

  it('refreshComplianceData carrega estado', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.refreshComplianceData();
    });
    expect(mocks.apiGetComplianceDashboard).toHaveBeenCalledWith('acme');
  });

  it('runComplianceScan sucesso', async () => {
    mocks.apiRunComplianceScan.mockResolvedValue({ newDetections: 2 });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.runComplianceScan(['MTE']);
    });
    expect(result.current.toast?.type).toBe('warn');
  });

  it('runComplianceScan offline', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    await act(async () => { await await result.current.selectCompany('acme'); });
    mocks.isApiAvailable.mockResolvedValue(false);
    await act(async () => {
      await result.current.runComplianceScan();
    });
  });

  it('updateComplianceFonte sucesso', async () => {
    mocks.apiUpdateComplianceFonte.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.updateComplianceFonte('MTE', { active: true });
    });
    expect(result.current.toast?.type).toBe('success');
  });

  it('getStats retorna distribuição', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    const stats = result.current.getStats();
    expect(stats).toHaveProperty('totalMonth');
    expect(stats).toHaveProperty('riskDistribution');
  });
});

describe('AppContext — suporte e global admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.isApiAvailable.mockResolvedValue(true);
    mocks.apiGetTenants.mockResolvedValue([{ id: 'acme', name: 'Acme', industry: 'Services' }]);
    mocks.fetchBundle.mockResolvedValue(createMinimalTenantBundle());
    mocks.apiRestoreSession.mockResolvedValue(true);
    mocks.apiGetTenantMetadata.mockResolvedValue([
      { id: 'acme', name: 'Acme', supportActive: true },
    ]);
    mocks.apiGetSupportStatus.mockResolvedValue({ active: true });
    mocks.apiGetSupportAudit.mockResolvedValue([]);
    mocks.apiAuthorizeSupport.mockResolvedValue({ ok: true });
    mocks.apiRevokeSupport.mockResolvedValue({ ok: true });
  });

  it('authorizeSupport sucesso (tenant admin)', async () => {
    mocks.apiAuthorizeSupport.mockResolvedValue({ active: true, expiresAt: new Date().toISOString() });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      const ok = await result.current.authorizeSupport('24h', 'Auditoria P10');
      expect(ok).toBe(true);
    });
    expect(mocks.apiAuthorizeSupport).toHaveBeenCalledWith('acme', '24h', 'Auditoria P10');
  });

  it('revokeSupport sucesso', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      const ok = await result.current.revokeSupport();
      expect(ok).toBe(true);
    });
  });

  it('accessTenantWithSupport sem autorização retorna false', async () => {
    mocks.apiGetTenantMetadata.mockResolvedValue([
      { id: 'acme', name: 'Acme', supportActive: false },
    ]);
    mocks.apiLogin.mockResolvedValue({
      user: {
        email: 'admin@ergosense.com',
        name: 'Admin',
        role: 'ADMIN_GLOBAL',
        company: 'ErgoSense',
        location: 'HQ',
        tenantId: 'global',
      },
      accessToken: 'jwt-admin',
      expiresIn: 3600,
      csrfToken: 'csrf-admin',
    });
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    await act(async () => {
      await result.current.login('admin@ergosense.com', 'password1234');
    });
    await act(async () => {
      const ok = await result.current.accessTenantWithSupport('acme');
      expect(ok).toBe(false);
    });
  });

  it('exitGlobalSupport volta para global-admin', async () => {
    mocks.apiLogin.mockResolvedValue({
      user: {
        email: 'admin@ergosense.com',
        name: 'Admin',
        role: 'ADMIN_GLOBAL',
        company: 'ErgoSense',
        location: 'HQ',
        tenantId: 'global',
      },
      accessToken: 'jwt-admin',
      expiresIn: 3600,
      csrfToken: 'csrf-admin',
    });
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    await act(async () => {
      await result.current.login('admin@ergosense.com', 'password1234');
    });
    act(() => result.current.exitGlobalSupport());
    expect(result.current.screen).toBe('global-admin');
    expect(result.current.globalSupportMode).toBe(false);
  });
});
