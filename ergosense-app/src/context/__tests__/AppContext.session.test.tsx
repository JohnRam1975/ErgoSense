import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppProvider, useApp } from '../AppContext';
import { createMinimalTenantBundle } from '../../test/fixtures/tenantBundle';

const mockApiRegisterCompany = vi.fn();
const mockApiSubmitAccessRequest = vi.fn();
const mockApiRestoreSession = vi.fn();
const mockIsApiAvailable = vi.fn();
const mockApiGetTenants = vi.fn();
const mockFetchTenantDataBundle = vi.fn();
const mockApiLogin = vi.fn();

vi.mock('../../api/client', () => ({
  isApiAvailable: (...args: unknown[]) => mockIsApiAvailable(...args),
  apiLogin: (...args: unknown[]) => mockApiLogin(...args),
  apiMfaVerify: vi.fn(),
  apiLogout: vi.fn(),
  apiGetTenants: (...args: unknown[]) => mockApiGetTenants(...args),
  apiRestoreSession: (...args: unknown[]) => mockApiRestoreSession(...args),
  apiRegisterCompany: (...args: unknown[]) => mockApiRegisterCompany(...args),
  apiSubmitAccessRequest: (...args: unknown[]) => mockApiSubmitAccessRequest(...args),
  apiGetTenantMetadata: vi.fn().mockResolvedValue([]),
  apiGetSupportStatus: vi.fn().mockResolvedValue({ active: false }),
  apiGetSupportAudit: vi.fn().mockResolvedValue([]),
  apiAuthorizeSupport: vi.fn(),
  apiRevokeSupport: vi.fn(),
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
  apiGetComplianceDashboard: vi.fn().mockResolvedValue(null),
  apiGetOrgTree: vi.fn().mockResolvedValue({ units: [] }),
  apiSaveCollaborator: vi.fn(),
}));

vi.mock('../hooks/fetchTenantDataBundle', () => ({
  fetchTenantDataBundle: (...args: unknown[]) => mockFetchTenantDataBundle(...args),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

describe('AppContext — sessão e onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockIsApiAvailable.mockResolvedValue(true);
    mockApiGetTenants.mockResolvedValue([{ id: 'acme', name: 'Acme', industry: 'Services' }]);
    mockFetchTenantDataBundle.mockResolvedValue(createMinimalTenantBundle());
    mockApiRestoreSession.mockResolvedValue(false);
  });

  it('registerCompany sucesso via API', async () => {
    mockApiRegisterCompany.mockResolvedValue({ tenant: { id: 'new-co', name: 'Nova Co' } });
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    await act(async () => {
      const ok = await result.current.registerCompany({
        nome: 'Nova Co',
        industria: 'Tech',
        adminNome: 'Admin',
        adminEmail: 'admin@nova.co',
        adminPassword: 'secret1234',
      });
      expect(ok).toBe(true);
    });
    expect(mockApiRegisterCompany).toHaveBeenCalled();
    expect(result.current.toast?.type).toBe('success');
  });

  it('registerCompany falha API retorna false', async () => {
    mockApiRegisterCompany.mockRejectedValue(new Error('CNPJ duplicado'));
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    await act(async () => {
      expect(
        await result.current.registerCompany({
          nome: 'Nova Co',
          industria: 'Tech',
          adminNome: 'Admin',
          adminEmail: 'admin@nova.co',
          adminPassword: 'secret1234',
        }),
      ).toBe(false);
    });
    expect(result.current.toast?.type).toBe('warn');
  });

  it('submitAccessRequest sucesso online', async () => {
    mockApiSubmitAccessRequest.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
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
    expect(mockApiSubmitAccessRequest).toHaveBeenCalled();
  });

  it('submitAccessRequest erro API retorna false', async () => {
    mockApiSubmitAccessRequest.mockRejectedValue(new Error('500'));
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    await act(async () => {
      expect(
        await result.current.submitAccessRequest({
          nome: 'João',
          email: 'j@test.com',
          funcao: 'Op',
          matricula: '1',
        }),
      ).toBe(false);
    });
    expect(result.current.toast?.type).toBe('warn');
  });

  it('selectCompany carrega bundle do tenant', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    await act(async () => {
      result.current.selectCompany('vale');
    });
    expect(result.current.selectedCompanyId).toBe('vale');
    await waitFor(() => expect(mockFetchTenantDataBundle).toHaveBeenCalledWith('vale'));
  });

  it('restoreSession tenta quando há sessão salva', async () => {
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
    mockApiRestoreSession.mockResolvedValue(true);
    renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(mockApiRestoreSession).toHaveBeenCalled());
  });
});
