import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppProvider, useApp } from '../AppContext';
import { createMinimalTenantBundle } from '../../test/fixtures/tenantBundle';
import { getAccessToken } from '../../api/authHeaders';

const mockIsApiAvailable = vi.fn();
const mockApiLogin = vi.fn();
const mockApiMfaVerify = vi.fn();
const mockApiLogout = vi.fn();
const mockApiGetTenants = vi.fn();
const mockApiRestoreSession = vi.fn();
const mockFetchTenantDataBundle = vi.fn();
const mockApiRegisterCompany = vi.fn();
const mockApiSubmitAccessRequest = vi.fn();

vi.mock('../../api/client', () => ({
  isApiAvailable: (...args: unknown[]) => mockIsApiAvailable(...args),
  apiLogin: (...args: unknown[]) => mockApiLogin(...args),
  apiMfaVerify: (...args: unknown[]) => mockApiMfaVerify(...args),
  apiLogout: (...args: unknown[]) => mockApiLogout(...args),
  apiGetTenants: (...args: unknown[]) => mockApiGetTenants(...args),
  apiRestoreSession: (...args: unknown[]) => mockApiRestoreSession(...args),
  apiRegisterCompany: (...args: unknown[]) => mockApiRegisterCompany(...args),
  apiSubmitAccessRequest: (...args: unknown[]) => mockApiSubmitAccessRequest(...args),
  apiAuthorizeSupport: vi.fn(),
  apiGetSupportAudit: vi.fn(),
  apiGetSupportStatus: vi.fn(),
  apiGetTenantMetadata: vi.fn().mockResolvedValue([]),
  apiRevokeSupport: vi.fn(),
  apiSaveAnalysis: vi.fn(),
  apiDeleteAnalysis: vi.fn(),
  apiDeleteRiskInventory: vi.fn(),
  apiGetRiskInventory: vi.fn(),
  apiGetRiskInventorySummary: vi.fn(),
  apiSaveRiskInventory: vi.fn(),
  apiGetDenunciaDashboard: vi.fn(),
  apiGetDenuncias: vi.fn(),
  apiGetDenuncia: vi.fn(),
  apiCreateDenuncia: vi.fn(),
  apiUpdateDenunciaStatus: vi.fn(),
  apiAddDenunciaTreatment: vi.fn(),
  apiAddDenunciaEvidence: vi.fn(),
  apiIntegrateDenuncia: vi.fn(),
  apiConcludeDenuncia: vi.fn(),
  apiGetActiveCriteria: vi.fn(),
  apiGetCriteriaDocumentation: vi.fn(),
  apiFetchCriteriaMethodologies: vi.fn(),
  apiCreateCriteriaMethodology: vi.fn(),
  apiActivateCriteriaVersion: vi.fn(),
  apiFetchCriteriaAudit: vi.fn(),
  apiGetGroDashboard: vi.fn(),
  apiGetGroWorkflow: vi.fn(),
  apiAdvanceGroWorkflow: vi.fn(),
  apiCompleteGroReview: vi.fn(),
  apiGetGroActionPlans: vi.fn(),
  apiSaveGroActionPlan: vi.fn(),
  apiDeleteGroActionPlan: vi.fn(),
  apiGetGroIndicators: vi.fn(),
  apiSaveGroIndicator: vi.fn(),
  apiDeleteGroIndicator: vi.fn(),
  apiGetGroHistory: vi.fn(),
  apiGetGroReports: vi.fn(),
  apiGenerateGroReport: vi.fn(),
  apiGetPgrProgram: vi.fn(),
  apiUpdatePgrProgram: vi.fn(),
  apiGetPgrVersions: vi.fn(),
  apiGetPgrVersion: vi.fn(),
  apiGeneratePgrVersion: vi.fn(),
  apiRefreshPgrVersion: vi.fn(),
  apiSubmitPgrApproval: vi.fn(),
  apiApprovePgrVersion: vi.fn(),
  apiRejectPgrVersion: vi.fn(),
  apiSignPgrVersion: vi.fn(),
  apiStartPgrRevision: vi.fn(),
  apiGetPgrHistory: vi.fn(),
  apiGetPsicoDashboard: vi.fn(),
  apiGetPsicoFatores: vi.fn(),
  apiGetPsicoMatriz: vi.fn(),
  apiGetPsicoConformidade: vi.fn(),
  apiGetPsicoPlanoAcao: vi.fn(),
  apiGetPsicoHistorico: vi.fn(),
  apiGetPsicoTendencias: vi.fn(),
  apiSavePsicoFator: vi.fn(),
  apiSavePsicoPlanoAcao: vi.fn(),
  apiDeletePsicoPlanoAcao: vi.fn(),
  apiSubmitPsicoResposta: vi.fn(),
  apiMarkPsicoAlertRead: vi.fn(),
  apiGetAetDashboard: vi.fn(),
  apiGetAetProcessos: vi.fn(),
  apiGetAetProcesso: vi.fn(),
  apiAdvanceAetStage: vi.fn(),
  apiSaveAetVibracaoCorpo: vi.fn(),
  apiSaveAetVibracaoMaos: vi.fn(),
  apiSaveAetTeleatendimento: vi.fn(),
  apiSaveAetOrganizacao: vi.fn(),
  apiSaveAetMetodos: vi.fn(),
  apiGenerateAetReport: vi.fn(),
  apiSignAet: vi.fn(),
  apiGetAetMobiliario: vi.fn(),
  apiSaveAetMobiliario: vi.fn(),
  apiGetAetEquipamentos: vi.fn(),
  apiSaveAetEquipamento: vi.fn(),
  apiGetAetHistorico: vi.fn(),
  apiUpdateAetTechnicalResponsible: vi.fn(),
  apiGetAetVersions: vi.fn(),
  apiCreateAetVersion: vi.fn(),
  apiGetAetVersion: vi.fn(),
  apiRefreshAetVersionSnapshot: vi.fn(),
  apiGenerateAetVersionReport: vi.fn(),
  apiSubmitAetApproval: vi.fn(),
  apiApproveAetVersion: vi.fn(),
  apiRejectAetVersion: vi.fn(),
  apiSignAetVersion: vi.fn(),
  apiStartAetRevision: vi.fn(),
  apiGetAetIntegrations: vi.fn(),
  apiGetSstDashboard: vi.fn(),
  apiGetSstApr: vi.fn(),
  apiCreateSstApr: vi.fn(),
  apiGetSstEpi: vi.fn(),
  apiCreateSstEpi: vi.fn(),
  apiGetSstEpc: vi.fn(),
  apiCreateSstEpc: vi.fn(),
  apiGetSstInspecoes: vi.fn(),
  apiCreateSstInspecao: vi.fn(),
  apiGetSstAuditorias: vi.fn(),
  apiCreateSstAuditoria: vi.fn(),
  apiGetSstNc: vi.fn(),
  apiCreateSstNc: vi.fn(),
  apiGetSstCapa: vi.fn(),
  apiCreateSstCapa: vi.fn(),
  apiGetSstTreinamentos: vi.fn(),
  apiCreateSstTreinamento: vi.fn(),
  apiGenerateSstReport: vi.fn(),
  apiGetEsocialDashboard: vi.fn(),
  apiGetEsocialConfig: vi.fn(),
  apiUpdateEsocialConfig: vi.fn(),
  apiGetEsocialEventos: vi.fn(),
  apiCreateEsocialEvento: vi.fn(),
  apiValidateEsocialEvento: vi.fn(),
  apiSignEsocialEvento: vi.fn(),
  apiPrepareEsocialEnvio: vi.fn(),
  apiGetEsocialXml: vi.fn(),
  apiGetEsocialHistorico: vi.fn(),
  apiTransmitEsocialEvento: vi.fn(),
  apiResendEsocialEvento: vi.fn(),
  apiConsultEsocialStatus: vi.fn(),
  apiGetComplianceDashboard: vi.fn(),
  apiGetComplianceFontes: vi.fn(),
  apiUpdateComplianceFonte: vi.fn(),
  apiRunComplianceScan: vi.fn(),
  apiGetComplianceNormas: vi.fn(),
  apiGetComplianceNormaVersoes: vi.fn(),
  apiGetComplianceDeteccoes: vi.fn(),
  apiGetComplianceImpactos: vi.fn(),
  apiValidateComplianceDetection: vi.fn(),
  apiGetComplianceAlertas: vi.fn(),
  apiMarkComplianceAlertRead: vi.fn(),
  apiGenerateComplianceReport: vi.fn(),
  apiGetComplianceRelatorios: vi.fn(),
  apiCompareComplianceNormVersions: vi.fn(),
  apiGetComplianceSchedule: vi.fn(),
  apiUpdateComplianceSchedule: vi.fn(),
  apiGetComplianceTasks: vi.fn(),
  apiUpdateComplianceTask: vi.fn(),
  apiGetOrgTree: vi.fn(),
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
  fetchTenantDataBundle: (...args: unknown[]) => mockFetchTenantDataBundle(...args),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

describe('AppContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockIsApiAvailable.mockResolvedValue(true);
    mockApiGetTenants.mockResolvedValue([{ id: 'vale', name: 'Vale', industry: 'Mining' }]);
    mockFetchTenantDataBundle.mockResolvedValue(createMinimalTenantBundle());
    mockApiRestoreSession.mockResolvedValue(true);
    mockApiLogout.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('inicializa com splash e persiste estado', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.screen).toBe('splash');
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    expect(localStorage.getItem('ergosense-app-v1')).toBeTruthy();
  });

  it('login rejeita credenciais inválidas localmente', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    await act(async () => {
      const ok = await result.current.login('bad', 'short');
      expect(ok).toBe(false);
    });
    expect(mockApiLogin).not.toHaveBeenCalled();
  });

  it('login sucesso via API', async () => {
    mockApiLogin.mockResolvedValue({
      user: {
        email: 'ergo@test.com',
        name: 'Ergonomista',
        role: 'ERGONOMISTA',
        company: 'Vale',
        location: 'HQ',
        tenantId: 'vale',
      },
      accessToken: 'jwt-1',
      expiresIn: 3600,
      csrfToken: 'csrf-1',
    });
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    await act(async () => {
      const ok = await result.current.login('ergo@test.com', 'password1234');
      expect(ok).toBe(true);
    });
    expect(result.current.screen).toBe('dashboard');
    expect(result.current.session?.email).toBe('ergo@test.com');
  });

  it('login retorna MFA pendente', async () => {
    mockApiLogin.mockResolvedValue({
      mfaRequired: true,
      mfaToken: 'mfa-tok',
      user: { email: 'mfa@test.com', name: 'MFA User' },
    });
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    let mfaResult: unknown;
    await act(async () => {
      mfaResult = await result.current.login('mfa@test.com', 'password1234');
    });
    expect(mfaResult).toMatchObject({ mfaRequired: true, mfaToken: 'mfa-tok' });
  });

  it('verifyMfaLogin sucesso e falha', async () => {
    mockApiMfaVerify.mockResolvedValue({
      user: {
        email: 'mfa@test.com',
        name: 'MFA User',
        role: 'OPERADOR',
        company: 'Co',
        location: 'HQ',
        tenantId: 'vale',
      },
      accessToken: 'jwt-mfa',
      expiresIn: 3600,
      csrfToken: 'csrf-mfa',
    });
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));

    await act(async () => {
      expect(await result.current.verifyMfaLogin('', '12')).toBe(false);
    });

    await act(async () => {
      expect(await result.current.verifyMfaLogin('tok', '123456')).toBe(true);
    });
    expect(result.current.screen).toBe('dashboard');

    mockApiMfaVerify.mockRejectedValue(new Error('invalid'));
    await act(async () => {
      expect(await result.current.verifyMfaLogin('tok', '999999')).toBe(false);
    });
  });

  it('login offline sem API', async () => {
    mockIsApiAvailable.mockResolvedValue(false);
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(false));
    await act(async () => {
      const ok = await result.current.login('offline@test.com', 'password1234');
      expect(ok).toBe(true);
    });
    expect(result.current.screen).toBe('dashboard');
    expect(result.current.session?.email).toBe('offline@test.com');
  });

  it('login ADMIN_GLOBAL navega para global-admin', async () => {
    mockApiLogin.mockResolvedValue({
      user: {
        email: 'admin@ergosense.com',
        name: 'Global Admin',
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
    expect(result.current.screen).toBe('global-admin');
    expect(result.current.isGlobalAdmin).toBe(true);
  });

  it('logout limpa sessão e volta ao splash', async () => {
    mockApiLogin.mockResolvedValue({
      user: {
        email: 'ergo@test.com',
        name: 'Ergonomista',
        role: 'ERGONOMISTA',
        company: 'Vale',
        location: 'HQ',
        tenantId: 'vale',
      },
      accessToken: 'jwt-1',
      expiresIn: 3600,
      csrfToken: 'csrf-1',
    });
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    await act(async () => {
      await result.current.login('ergo@test.com', 'password1234');
    });
    act(() => {
      result.current.logout();
    });
    expect(result.current.screen).toBe('splash');
    expect(result.current.session).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(mockApiLogout).toHaveBeenCalled();
  });

  it('login falha API retorna false', async () => {
    mockApiLogin.mockRejectedValue(new Error('401'));
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    await act(async () => {
      expect(await result.current.login('ergo@test.com', 'password1234')).toBe(false);
    });
  });

  it('go navega entre telas', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.go('login'));
    expect(result.current.screen).toBe('login');
    act(() => result.current.go('dashboard', { instant: true }));
    expect(result.current.screen).toBe('dashboard');
  });

  it('showToast define mensagem', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.showToast('Salvo!', 'success'));
    expect(result.current.toast).toEqual({ msg: 'Salvo!', type: 'success' });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.toast).toBeNull();
  });

  it('registerCompany falha sem API', async () => {
    mockIsApiAvailable.mockResolvedValue(false);
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(false));
    await act(async () => {
      expect(
        await result.current.registerCompany({
          nome: 'Co',
          industria: 'Min',
          adminNome: 'A',
          adminEmail: 'a@co.com',
          adminPassword: 'secret1234',
        }),
      ).toBe(false);
    });
  });

  it('submitAccessRequest offline retorna true', async () => {
    mockIsApiAvailable.mockResolvedValue(false);
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(false));
    await act(async () => {
      expect(
        await result.current.submitAccessRequest({
          nome: 'João',
          email: 'j@test.com',
          funcao: 'Op',
          matricula: '1',
        }),
      ).toBe(true);
    });
  });

  it('carrega estado salvo do localStorage', async () => {
    localStorage.setItem(
      'ergosense-app-v1',
      JSON.stringify({
        session: {
          email: 'saved@test.com',
          name: 'Saved',
          role: 'Operador',
          roleCode: 'OPERADOR',
          company: 'Co',
          location: 'HQ',
          tenantId: 'vale',
        },
        selectedCompanyId: 'vale',
        collaborators: [],
        analyses: [],
        reports: [],
        settings: {},
        analysisMode: 'complete',
        reportType: 'NR17',
      }),
    );
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.session?.email).toBe('saved@test.com');
  });

  it('useApp lança fora do provider', () => {
    expect(() => renderHook(() => useApp())).toThrow(/AppProvider/);
  });
});
