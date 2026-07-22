import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppProvider, useApp } from '../AppContext';
import { createMinimalTenantBundle } from '../../test/fixtures/tenantBundle';

const mocks = vi.hoisted(() => ({
  isApiAvailable: vi.fn(),
  apiGetTenants: vi.fn(),
  fetchBundle: vi.fn(),
  apiGetRiskInventory: vi.fn(),
  apiGetRiskInventorySummary: vi.fn(),
  apiSaveRiskInventory: vi.fn(),
  apiGetDenuncias: vi.fn(),
  apiGetDenunciaDashboard: vi.fn(),
  apiGetGroDashboard: vi.fn(),
  apiGetPgrProgram: vi.fn(),
  apiGetPsicoDashboard: vi.fn(),
  apiGetComplianceDashboard: vi.fn(),
  apiGetOrgTree: vi.fn(),
  apiSaveCollaborator: vi.fn(),
  apiGetTenantMetadata: vi.fn(),
  apiGetSupportStatus: vi.fn(),
}));

vi.mock('../../api/client', () => ({
  isApiAvailable: mocks.isApiAvailable,
  apiGetTenants: mocks.apiGetTenants,
  apiRestoreSession: vi.fn().mockResolvedValue(true),
  apiLogout: vi.fn(),
  apiLogin: vi.fn(),
  apiMfaVerify: vi.fn(),
  apiGetTenantMetadata: mocks.apiGetTenantMetadata,
  apiGetSupportStatus: mocks.apiGetSupportStatus,
  apiGetSupportAudit: vi.fn().mockResolvedValue([]),
  apiAuthorizeSupport: vi.fn().mockResolvedValue({ ok: true }),
  apiRevokeSupport: vi.fn().mockResolvedValue({ ok: true }),
  apiSaveCollaborator: mocks.apiSaveCollaborator,
  apiUpdateCollaborator: vi.fn(),
  apiSaveAnalysis: vi.fn(),
  apiDeleteAnalysis: vi.fn(),
  apiGetRiskInventory: mocks.apiGetRiskInventory,
  apiGetRiskInventorySummary: mocks.apiGetRiskInventorySummary,
  apiSaveRiskInventory: mocks.apiSaveRiskInventory,
  apiDeleteRiskInventory: vi.fn(),
  apiGetDenunciaDashboard: mocks.apiGetDenunciaDashboard,
  apiGetDenuncias: mocks.apiGetDenuncias,
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
  apiGetGroDashboard: mocks.apiGetGroDashboard,
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
  apiGetPgrProgram: mocks.apiGetPgrProgram,
  apiUpdatePgrProgram: vi.fn(),
  apiGetPgrVersions: vi.fn().mockResolvedValue([]),
  apiGetPgrHistory: vi.fn().mockResolvedValue([]),
  apiGetPsicoDashboard: mocks.apiGetPsicoDashboard,
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
  apiSignAet: vi.fn(),
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
  apiGetEsocialDashboard: vi.fn().mockResolvedValue(null),
  apiGetEsocialConfig: vi.fn().mockResolvedValue(null),
  apiUpdateEsocialConfig: vi.fn(),
  apiGetEsocialEventos: vi.fn().mockResolvedValue([]),
  apiCreateEsocialEvento: vi.fn(),
  apiValidateEsocialEvento: vi.fn(),
  apiSignEsocialEvento: vi.fn(),
  apiPrepareEsocialEnvio: vi.fn(),
  apiGetEsocialXml: vi.fn(),
  apiGetEsocialHistorico: vi.fn().mockResolvedValue([]),
  apiTransmitEsocialEvento: vi.fn(),
  apiResendEsocialEvento: vi.fn(),
  apiConsultEsocialStatus: vi.fn(),
  apiGetComplianceDashboard: mocks.apiGetComplianceDashboard,
  apiGetComplianceFontes: vi.fn().mockResolvedValue([]),
  apiUpdateComplianceFonte: vi.fn(),
  apiRunComplianceScan: vi.fn(),
  apiGetComplianceNormas: vi.fn().mockResolvedValue([]),
  apiGetComplianceNormaVersoes: vi.fn().mockResolvedValue([]),
  apiGetComplianceDeteccoes: vi.fn().mockResolvedValue([]),
  apiGetComplianceImpactos: vi.fn().mockResolvedValue([]),
  apiValidateComplianceDetection: vi.fn(),
  apiGetComplianceAlertas: vi.fn().mockResolvedValue([]),
  apiMarkComplianceAlertRead: vi.fn(),
  apiGenerateComplianceReport: vi.fn(),
  apiGetComplianceRelatorios: vi.fn().mockResolvedValue([]),
  apiCompareComplianceNormVersions: vi.fn(),
  apiGetComplianceSchedule: vi.fn().mockResolvedValue(null),
  apiUpdateComplianceSchedule: vi.fn(),
  apiGetComplianceTasks: vi.fn().mockResolvedValue([]),
  apiUpdateComplianceTask: vi.fn(),
  apiGetOrgTree: mocks.apiGetOrgTree,
  apiCreateOrgUnit: vi.fn(),
  apiCreateOrgSector: vi.fn(),
  apiCreateOrgFunction: vi.fn(),
  apiCreateOrgActivity: vi.fn(),
  apiCreateOrgWorkPost: vi.fn(),
  apiDeleteOrgEntity: vi.fn(),
  apiSubmitAccessRequest: vi.fn(),
  apiRegisterCompany: vi.fn(),
}));

vi.mock('../hooks/fetchTenantDataBundle', () => ({
  fetchTenantDataBundle: mocks.fetchBundle,
}));

function wrapper({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

describe('AppContext — ações de domínio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.isApiAvailable.mockResolvedValue(true);
    mocks.apiGetTenants.mockResolvedValue([{ id: 'acme', name: 'Acme', industry: 'Mining' }]);
    mocks.fetchBundle.mockResolvedValue(createMinimalTenantBundle());
    mocks.apiGetRiskInventory.mockResolvedValue([]);
    mocks.apiGetRiskInventorySummary.mockResolvedValue(null);
    mocks.apiSaveRiskInventory.mockResolvedValue({ id: 'risk-1' });
    mocks.apiGetDenuncias.mockResolvedValue([]);
    mocks.apiGetDenunciaDashboard.mockResolvedValue(null);
    mocks.apiGetGroDashboard.mockResolvedValue(null);
    mocks.apiGetPgrProgram.mockResolvedValue(null);
    mocks.apiGetPsicoDashboard.mockResolvedValue(null);
    mocks.apiGetComplianceDashboard.mockResolvedValue(null);
    mocks.apiGetOrgTree.mockResolvedValue({ units: [] });
    mocks.apiSaveCollaborator.mockResolvedValue({ id: 'c-new' });
    mocks.apiGetTenantMetadata.mockResolvedValue([]);
    mocks.apiGetSupportStatus.mockResolvedValue({ active: false });
  });

  it('refreshRiskInventory carrega inventário', async () => {
    mocks.apiGetRiskInventory.mockResolvedValue([{ id: 'r1', perigo: 'Postura' }]);
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    await act(async () => {
      await result.current.selectCompany('acme');
    });
    await act(async () => {
      await result.current.refreshRiskInventory();
    });
    expect(mocks.apiGetRiskInventory).toHaveBeenCalled();
  });

  it('refreshDenuncias e refreshGroData', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    await act(async () => {
      await result.current.selectCompany('acme');
    });
    await act(async () => {
      await result.current.refreshDenuncias();
      await result.current.refreshGroData();
      await result.current.refreshPgrData();
      await result.current.refreshPsicoData();
      await result.current.refreshComplianceData();
      await result.current.refreshEsocialData();
      await result.current.refreshSstData();
      await result.current.refreshAetData();
      await result.current.refreshOrgData();
      await result.current.refreshRiskCriteria();
    });
    expect(mocks.apiGetDenuncias).toHaveBeenCalled();
    expect(mocks.apiGetGroDashboard).toHaveBeenCalled();
  });

  it('modal abre e fecha', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.showModal('Título', 'Corpo', 'OK'));
    expect(result.current.modal.open).toBe(true);
    act(() => result.current.closeModal());
    expect(result.current.modal.open).toBe(false);
  });

  it('selectCompany altera empresa ativa', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(true));
    await act(async () => {
      await result.current.selectCompany('acme');
    });
    expect(result.current.selectedCompanyId).toBe('acme');
  });

  it('setAnalysisDraft patch parcial', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.setAnalysisDraft({ notes: 'Nota teste' }));
    expect(result.current.analysisDraft.notes).toBe('Nota teste');
  });

  it('updateSettings persiste preferências', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.updateSettings({ soundAlerts: false }));
    expect(result.current.settings.soundAlerts).toBe(false);
  });
});
