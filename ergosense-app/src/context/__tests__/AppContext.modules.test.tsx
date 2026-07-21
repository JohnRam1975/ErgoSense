import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppProvider, useApp } from '../AppContext';
import { createMinimalTenantBundle } from '../../test/fixtures/tenantBundle';
import type { JointAngles } from '../../types';

const mocks = vi.hoisted(() => ({
  isApiAvailable: vi.fn(),
  apiLogin: vi.fn(),
  apiLogout: vi.fn(),
  apiGetTenants: vi.fn(),
  apiRestoreSession: vi.fn(),
  fetchBundle: vi.fn(),
  apiGetTenantMetadata: vi.fn(),
  apiGetSupportStatus: vi.fn(),
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
  apiGetEsocialEventos: vi.fn(),
  apiGetEsocialHistorico: vi.fn(),
  apiTransmitEsocialEvento: vi.fn(),
  apiResendEsocialEvento: vi.fn(),
  apiPrepareEsocialEnvio: vi.fn(),
  apiGetEsocialXml: vi.fn(),
  apiUpdatePgrProgram: vi.fn(),
  apiGeneratePgrVersion: vi.fn(),
  apiGetPgrVersion: vi.fn(),
  apiRefreshPgrVersion: vi.fn(),
  apiSubmitPgrApproval: vi.fn(),
  apiApprovePgrVersion: vi.fn(),
  apiRejectPgrVersion: vi.fn(),
  apiSignPgrVersion: vi.fn(),
  apiStartPgrRevision: vi.fn(),
  apiGetPgrProgram: vi.fn(),
  apiGetPgrVersions: vi.fn(),
  apiGetPgrHistory: vi.fn(),
  apiMarkComplianceAlertRead: vi.fn(),
  apiGenerateComplianceReport: vi.fn(),
  apiUpdateComplianceSchedule: vi.fn(),
  apiGetComplianceDashboard: vi.fn(),
  apiGetComplianceFontes: vi.fn(),
  apiGetComplianceNormas: vi.fn(),
  apiGetComplianceDeteccoes: vi.fn(),
  apiGetComplianceAlertas: vi.fn(),
  apiGetComplianceRelatorios: vi.fn(),
  apiGetComplianceTasks: vi.fn(),
  apiGetComplianceSchedule: vi.fn(),
  apiGetOrgTree: vi.fn(),
  apiCreateOrgUnit: vi.fn(),
  apiAdvanceGroWorkflow: vi.fn(),
  apiCompleteGroReview: vi.fn(),
  apiGetGroDashboard: vi.fn(),
  apiGetGroWorkflow: vi.fn(),
  apiSaveAnalysis: vi.fn(),
  apiDeleteAnalysis: vi.fn(),
  apiSaveCollaborator: vi.fn(),
  apiConsultEsocialStatus: vi.fn(),
  apiSavePsicoFator: vi.fn(),
  apiSubmitPsicoResposta: vi.fn(),
  apiDeletePsicoPlanoAcao: vi.fn(),
  apiMarkPsicoAlertRead: vi.fn(),
  apiGetDenuncia: vi.fn(),
  apiIntegrateDenuncia: vi.fn(),
  apiUpdateDenunciaStatus: vi.fn(),
  exportSstPdf: vi.fn(),
  downloadEsocialXml: vi.fn(),
}));

vi.mock('../../utils/exportSstPdf', () => ({
  exportSstPdf: mocks.exportSstPdf,
}));

vi.mock('../../services/esocialExport', () => ({
  downloadEsocialXmlFromString: mocks.downloadEsocialXml,
}));

vi.mock('../../api/client', () => ({
  isApiAvailable: mocks.isApiAvailable,
  apiLogin: mocks.apiLogin,
  apiMfaVerify: vi.fn(),
  apiLogout: mocks.apiLogout,
  apiGetTenants: mocks.apiGetTenants,
  apiRestoreSession: mocks.apiRestoreSession,
  apiRegisterCompany: vi.fn(),
  apiSubmitAccessRequest: vi.fn(),
  apiGetTenantMetadata: mocks.apiGetTenantMetadata,
  apiGetSupportStatus: mocks.apiGetSupportStatus,
  apiGetSupportAudit: vi.fn().mockResolvedValue([]),
  apiAuthorizeSupport: vi.fn(),
  apiRevokeSupport: vi.fn(),
  apiSaveAnalysis: mocks.apiSaveAnalysis,
  apiDeleteAnalysis: mocks.apiDeleteAnalysis,
  apiGetRiskInventory: vi.fn().mockResolvedValue([]),
  apiGetRiskInventorySummary: vi.fn().mockResolvedValue(null),
  apiSaveRiskInventory: vi.fn(),
  apiDeleteRiskInventory: vi.fn(),
  apiGetDenunciaDashboard: vi.fn().mockResolvedValue(null),
  apiGetDenuncias: vi.fn().mockResolvedValue([]),
  apiGetDenuncia: mocks.apiGetDenuncia,
  apiCreateDenuncia: vi.fn(),
  apiUpdateDenunciaStatus: mocks.apiUpdateDenunciaStatus,
  apiAddDenunciaTreatment: vi.fn(),
  apiAddDenunciaEvidence: vi.fn(),
  apiIntegrateDenuncia: mocks.apiIntegrateDenuncia,
  apiConcludeDenuncia: vi.fn(),
  apiGetActiveCriteria: vi.fn().mockResolvedValue(null),
  apiGetCriteriaDocumentation: vi.fn().mockResolvedValue(null),
  apiFetchCriteriaMethodologies: vi.fn().mockResolvedValue([]),
  apiCreateCriteriaMethodology: vi.fn(),
  apiActivateCriteriaVersion: vi.fn(),
  apiFetchCriteriaAudit: vi.fn().mockResolvedValue([]),
  apiGetGroDashboard: mocks.apiGetGroDashboard,
  apiGetGroWorkflow: mocks.apiGetGroWorkflow,
  apiAdvanceGroWorkflow: mocks.apiAdvanceGroWorkflow,
  apiCompleteGroReview: mocks.apiCompleteGroReview,
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
  apiUpdatePgrProgram: mocks.apiUpdatePgrProgram,
  apiGetPgrVersions: mocks.apiGetPgrVersions,
  apiGetPgrVersion: mocks.apiGetPgrVersion,
  apiGeneratePgrVersion: mocks.apiGeneratePgrVersion,
  apiRefreshPgrVersion: mocks.apiRefreshPgrVersion,
  apiSubmitPgrApproval: mocks.apiSubmitPgrApproval,
  apiApprovePgrVersion: mocks.apiApprovePgrVersion,
  apiRejectPgrVersion: mocks.apiRejectPgrVersion,
  apiSignPgrVersion: mocks.apiSignPgrVersion,
  apiStartPgrRevision: mocks.apiStartPgrRevision,
  apiGetPgrHistory: mocks.apiGetPgrHistory,
  apiGetPsicoDashboard: vi.fn().mockResolvedValue(null),
  apiGetPsicoFatores: vi.fn().mockResolvedValue([]),
  apiGetPsicoMatriz: vi.fn().mockResolvedValue([]),
  apiGetPsicoConformidade: vi.fn().mockResolvedValue(null),
  apiGetPsicoPlanoAcao: vi.fn().mockResolvedValue([]),
  apiGetPsicoHistorico: vi.fn().mockResolvedValue([]),
  apiGetPsicoTendencias: vi.fn().mockResolvedValue([]),
  apiSavePsicoFator: mocks.apiSavePsicoFator,
  apiSavePsicoPlanoAcao: vi.fn(),
  apiDeletePsicoPlanoAcao: mocks.apiDeletePsicoPlanoAcao,
  apiSubmitPsicoResposta: mocks.apiSubmitPsicoResposta,
  apiMarkPsicoAlertRead: mocks.apiMarkPsicoAlertRead,
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
  apiGetSstDashboard: mocks.apiGetSstDashboard,
  apiGetSstApr: mocks.apiGetSstApr,
  apiCreateSstApr: mocks.apiCreateSstApr,
  apiGetSstEpi: mocks.apiGetSstEpi,
  apiCreateSstEpi: mocks.apiCreateSstEpi,
  apiGetSstEpc: mocks.apiGetSstEpc,
  apiCreateSstEpc: mocks.apiCreateSstEpc,
  apiGetSstInspecoes: mocks.apiGetSstInspecoes,
  apiCreateSstInspecao: mocks.apiCreateSstInspecao,
  apiGetSstAuditorias: mocks.apiGetSstAuditorias,
  apiCreateSstAuditoria: mocks.apiCreateSstAuditoria,
  apiGetSstNc: mocks.apiGetSstNc,
  apiCreateSstNc: mocks.apiCreateSstNc,
  apiGetSstCapa: mocks.apiGetSstCapa,
  apiCreateSstCapa: mocks.apiCreateSstCapa,
  apiGetSstTreinamentos: mocks.apiGetSstTreinamentos,
  apiCreateSstTreinamento: mocks.apiCreateSstTreinamento,
  apiGenerateSstReport: mocks.apiGenerateSstReport,
  apiGetEsocialDashboard: mocks.apiGetEsocialDashboard,
  apiGetEsocialConfig: mocks.apiGetEsocialConfig,
  apiUpdateEsocialConfig: vi.fn(),
  apiGetEsocialEventos: mocks.apiGetEsocialEventos,
  apiCreateEsocialEvento: vi.fn(),
  apiValidateEsocialEvento: vi.fn(),
  apiSignEsocialEvento: vi.fn(),
  apiPrepareEsocialEnvio: mocks.apiPrepareEsocialEnvio,
  apiGetEsocialXml: mocks.apiGetEsocialXml,
  apiGetEsocialHistorico: mocks.apiGetEsocialHistorico,
  apiTransmitEsocialEvento: mocks.apiTransmitEsocialEvento,
  apiResendEsocialEvento: mocks.apiResendEsocialEvento,
  apiConsultEsocialStatus: mocks.apiConsultEsocialStatus,
  apiGetComplianceDashboard: mocks.apiGetComplianceDashboard,
  apiGetComplianceFontes: mocks.apiGetComplianceFontes,
  apiUpdateComplianceFonte: vi.fn(),
  apiRunComplianceScan: vi.fn(),
  apiGetComplianceNormas: mocks.apiGetComplianceNormas,
  apiGetComplianceNormaVersoes: vi.fn().mockResolvedValue([]),
  apiGetComplianceDeteccoes: mocks.apiGetComplianceDeteccoes,
  apiGetComplianceImpactos: vi.fn().mockResolvedValue([]),
  apiValidateComplianceDetection: vi.fn(),
  apiGetComplianceAlertas: mocks.apiGetComplianceAlertas,
  apiMarkComplianceAlertRead: mocks.apiMarkComplianceAlertRead,
  apiGenerateComplianceReport: mocks.apiGenerateComplianceReport,
  apiGetComplianceRelatorios: mocks.apiGetComplianceRelatorios,
  apiCompareComplianceNormVersions: vi.fn(),
  apiGetComplianceSchedule: mocks.apiGetComplianceSchedule,
  apiUpdateComplianceSchedule: mocks.apiUpdateComplianceSchedule,
  apiGetComplianceTasks: mocks.apiGetComplianceTasks,
  apiUpdateComplianceTask: vi.fn(),
  apiGetOrgTree: mocks.apiGetOrgTree,
  apiCreateOrgUnit: mocks.apiCreateOrgUnit,
  apiCreateOrgSector: vi.fn(),
  apiCreateOrgFunction: vi.fn(),
  apiCreateOrgActivity: vi.fn(),
  apiCreateOrgWorkPost: vi.fn(),
  apiDeleteOrgEntity: vi.fn(),
  apiSaveCollaborator: mocks.apiSaveCollaborator,
  apiUpdateCollaborator: vi.fn(),
}));

vi.mock('../hooks/fetchTenantDataBundle', () => ({
  fetchTenantDataBundle: mocks.fetchBundle,
}));

const baseAngles: JointAngles = {
  lombar: 35,
  dorso: 30,
  ombroD: 110,
  pescoco: 20,
  cotovelo: 70,
  maoD: 20,
  quadril: 90,
  joelhoD: 80,
  tornozeloD: 85,
  repeticao: 8,
};

const testCollaborator = {
  id: 'c1',
  name: 'João Silva',
  matricula: '1001',
  cargo: 'Operador',
  setor: 'Beneficiamento',
  turno: 'A',
  consent: true,
  risk: 'baixo' as const,
  icon: '👤',
  iconBg: '#2563eb',
  heightCm: 175,
  weightKg: 75,
  sex: 'M' as const,
  age: 32,
};

const pgrProgram = {
  id: 'pgr-1',
  tenantId: 'vale',
  title: 'PGR Vale',
  description: 'Programa',
  technicalResponsible: 'Eng. A',
  legalResponsible: 'Eng. B',
  activeVersionId: 'v1',
  activeVersionNumber: '1',
  activeVersionStatus: 'RASCUNHO' as const,
};

function wrapper({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

async function loginAsErgonomist(result: { current: ReturnType<typeof useApp> }) {
  mocks.apiLogin.mockResolvedValue({
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
  await waitFor(() => expect(result.current.dbConnected).toBe(true));
  await act(async () => {
    await result.current.login('ergo@test.com', 'password1234');
  });
  act(() => result.current.selectCompany('vale'));
}

function setupMocks() {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.isApiAvailable.mockResolvedValue(true);
  mocks.apiGetTenants.mockResolvedValue([{ id: 'vale', name: 'Vale', industry: 'Mining' }]);
  mocks.apiRestoreSession.mockResolvedValue(true);
  mocks.apiGetTenantMetadata.mockResolvedValue([]);
  mocks.apiGetSupportStatus.mockResolvedValue({ active: false });
  mocks.fetchBundle.mockResolvedValue(
    createMinimalTenantBundle({
      collaborators: [testCollaborator],
      pgrProg: pgrProgram,
      pgrVers: [
        {
          id: 'v1',
          tenantId: 'vale',
          programId: 'pgr-1',
          number: '1',
          sequential: 1,
          status: 'RASCUNHO',
          preparedBy: 'Eng',
          reviewedBy: '',
          preparedAt: null,
          reviewedAt: null,
          nextReviewAt: null,
          reviewReason: '',
          notes: '',
        },
      ],
    }),
  );
  mocks.apiGetSstDashboard.mockResolvedValue({ total: 0 });
  mocks.apiGetSstApr.mockResolvedValue([]);
  mocks.apiGetSstEpi.mockResolvedValue([]);
  mocks.apiGetSstEpc.mockResolvedValue([]);
  mocks.apiGetSstInspecoes.mockResolvedValue([]);
  mocks.apiGetSstAuditorias.mockResolvedValue([]);
  mocks.apiGetSstNc.mockResolvedValue([]);
  mocks.apiGetSstCapa.mockResolvedValue([]);
  mocks.apiGetSstTreinamentos.mockResolvedValue([]);
  mocks.apiCreateSstApr.mockResolvedValue({ id: 'apr-1' });
  mocks.apiCreateSstEpi.mockResolvedValue({ id: 'epi-1' });
  mocks.apiCreateSstEpc.mockResolvedValue({ id: 'epc-1' });
  mocks.apiCreateSstInspecao.mockResolvedValue({ id: 'ins-1' });
  mocks.apiCreateSstAuditoria.mockResolvedValue({ id: 'aud-1' });
  mocks.apiCreateSstNc.mockResolvedValue({ id: 'nc-1' });
  mocks.apiCreateSstCapa.mockResolvedValue({ id: 'capa-1' });
  mocks.apiCreateSstTreinamento.mockResolvedValue({ id: 'trein-1' });
  mocks.apiGenerateSstReport.mockResolvedValue({ title: 'SST Report' });
  mocks.apiGetEsocialDashboard.mockResolvedValue({});
  mocks.apiGetEsocialConfig.mockResolvedValue({ ambiente: 1 });
  mocks.apiGetEsocialEventos.mockResolvedValue([]);
  mocks.apiGetEsocialHistorico.mockResolvedValue([]);
  mocks.apiGetPgrProgram.mockResolvedValue(pgrProgram);
  mocks.apiGetPgrVersions.mockResolvedValue([]);
  mocks.apiGetPgrHistory.mockResolvedValue([]);
  mocks.apiGetComplianceDashboard.mockResolvedValue({ score: 80 });
  mocks.apiGetComplianceFontes.mockResolvedValue([]);
  mocks.apiGetComplianceNormas.mockResolvedValue([]);
  mocks.apiGetComplianceDeteccoes.mockResolvedValue([]);
  mocks.apiGetComplianceAlertas.mockResolvedValue([]);
  mocks.apiGetComplianceRelatorios.mockResolvedValue([]);
  mocks.apiGetComplianceTasks.mockResolvedValue([]);
  mocks.apiGetComplianceSchedule.mockResolvedValue(null);
  mocks.apiGetOrgTree.mockResolvedValue({ units: [{ id: 'u1', name: 'Unidade 1', sectors: [] }] });
  mocks.apiGetGroDashboard.mockResolvedValue(null);
  mocks.apiGetGroWorkflow.mockResolvedValue({ stage: 'identificacao' });
  mocks.apiSaveAnalysis.mockResolvedValue({ id: 'a-saved' });
}

describe('AppContext — SST', () => {
  beforeEach(setupMocks);

  it('createSstApr e demais cadastros SST', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.createSstApr({ title: 'APR Teste' });
      await result.current.createSstEpi({ description: 'Capacete', type: 'HEAD', ca: '12345' });
      await result.current.createSstEpc({ description: 'Guarda-corpo', type: 'FALL' });
      await result.current.createSstInspecao('Inspeção mensal');
      await result.current.createSstAuditoria('Auditoria interna');
      await result.current.createSstNc({ description: 'NC teste', title: 'NC' });
      await result.current.createSstCapa({ description: 'CAPA', syncGro: true });
      await result.current.createSstTreinamento('NR-12');
    });
    expect(mocks.apiCreateSstApr).toHaveBeenCalled();
    expect(mocks.apiCreateSstCapa).toHaveBeenCalled();
    expect(result.current.toast?.type).toBe('success');
  });

  it('generateSstReport e downloadSstPdf', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    act(() => result.current.downloadSstPdf());
    expect(result.current.toast?.msg).toMatch(/relatório/i);
    await act(async () => {
      await result.current.generateSstReport();
    });
    expect(mocks.apiGenerateSstReport).toHaveBeenCalled();
    act(() => result.current.downloadSstPdf());
    expect(mocks.exportSstPdf).toHaveBeenCalled();
  });
});

describe('AppContext — eSocial transmissão', () => {
  beforeEach(setupMocks);

  it('transmitEsocialEvent aceito', async () => {
    mocks.apiTransmitEsocialEvento.mockResolvedValue({ eventStatus: 'ACEITO' });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.transmitEsocialEvent('ev-1');
    });
    expect(result.current.toast?.type).toBe('success');
  });

  it('transmitEsocialEvent rejeitado e resend', async () => {
    mocks.apiTransmitEsocialEvento.mockResolvedValue({ eventStatus: 'REJEITADO' });
    mocks.apiResendEsocialEvento.mockResolvedValue({ eventStatus: 'ACEITO' });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.transmitEsocialEvent('ev-1');
      await result.current.resendEsocialEvent('ev-1');
    });
    expect(mocks.apiResendEsocialEvento).toHaveBeenCalled();
  });

  it('prepareEsocialEnvio e downloadEsocialXml', async () => {
    mocks.apiPrepareEsocialEnvio.mockResolvedValue({ loteId: 'L1' });
    mocks.apiGetEsocialXml.mockResolvedValue({ xml: '<xml/>', eventType: 'S-2210', eventId: 'ev-1' });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.prepareEsocialEnvio('ev-1');
      await result.current.downloadEsocialXml('ev-1');
    });
    expect(mocks.downloadEsocialXml).toHaveBeenCalled();
  });

  it('transmitEsocialEvent offline', async () => {
    mocks.isApiAvailable.mockResolvedValue(false);
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(false));
    act(() => result.current.selectCompany('vale'));
    await act(async () => {
      await result.current.transmitEsocialEvent('ev-1');
    });
    expect(result.current.toast?.msg).toMatch(/offline/i);
  });
});

describe('AppContext — PGR workflow', () => {
  beforeEach(setupMocks);

  it('updatePgrProgram e generatePgrVersion', async () => {
    mocks.apiUpdatePgrProgram.mockResolvedValue({ ...pgrProgram, title: 'PGR Atualizado' });
    mocks.apiGeneratePgrVersion.mockResolvedValue({
      id: 'v2',
      number: '2',
      sequential: 2,
      status: 'RASCUNHO',
    });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    act(() => result.current.updatePgrProgram({ title: 'PGR Atualizado' }));
    await waitFor(() => expect(mocks.apiUpdatePgrProgram).toHaveBeenCalled());
    await act(async () => {
      await result.current.generatePgrVersion();
    });
    expect(result.current.screen).toBe('pgr-detalhe');
  });

  it('openPgrVersion, approve, reject, sign e revision', async () => {
    const detail = { id: 'v1', number: '1', status: 'EM_APROVACAO' };
    mocks.apiGetPgrVersion.mockResolvedValue(detail);
    mocks.apiApprovePgrVersion.mockResolvedValue({ ...detail, status: 'APROVADO' });
    mocks.apiRejectPgrVersion.mockResolvedValue({ ...detail, status: 'EM_REVISAO' });
    mocks.apiSignPgrVersion.mockResolvedValue({ ok: true });
    mocks.apiSubmitPgrApproval.mockResolvedValue(detail);
    mocks.apiRefreshPgrVersion.mockResolvedValue(detail);
    mocks.apiStartPgrRevision.mockResolvedValue({ ...detail, number: '2' });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.openPgrVersion('v1');
      await result.current.submitPgrApproval('v1', 'Aprovador', 'Diretor');
      await result.current.approvePgrVersion('v1');
      await result.current.rejectPgrVersion('v1');
      await result.current.signPgrVersion('v1', 'RESPONSAVEL_TECNICO', 'Eng. A', 'CREA');
      await result.current.refreshPgrVersion('v1');
      await result.current.startPgrRevision('v1');
    });
    expect(mocks.apiSignPgrVersion).toHaveBeenCalled();
  });
});

describe('AppContext — Compliance estendido', () => {
  beforeEach(setupMocks);

  it('markComplianceAlertRead e generateComplianceReport', async () => {
    mocks.apiMarkComplianceAlertRead.mockResolvedValue({ ok: true });
    mocks.apiGenerateComplianceReport.mockResolvedValue({ id: 'rep-1' });
    mocks.apiUpdateComplianceSchedule.mockResolvedValue({ active: true, intervalHours: 24 });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.markComplianceAlertRead('alert-1');
      await result.current.generateComplianceReport();
      await result.current.updateComplianceSchedule({ active: true, intervalHours: 24 });
    });
    expect(mocks.apiMarkComplianceAlertRead).toHaveBeenCalledWith('vale', 'alert-1');
    expect(result.current.toast?.type).toBe('success');
  });

  it('generateComplianceReport offline', async () => {
    mocks.isApiAvailable.mockResolvedValue(false);
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(false));
    act(() => result.current.selectCompany('vale'));
    await act(async () => {
      await result.current.generateComplianceReport();
    });
    expect(result.current.toast?.msg).toMatch(/offline/i);
  });
});

describe('AppContext — captureAnalysis e GRO', () => {
  beforeEach(setupMocks);
  afterEach(() => {
    vi.useRealTimers();
  });

  it('captureAnalysis sem colaborador cria avaliação própria', async () => {
    mocks.fetchBundle.mockResolvedValue(createMinimalTenantBundle());
    mocks.apiSaveCollaborator.mockResolvedValue({
      id: 'c-self',
      name: 'Avaliação própria',
      matricula: 'ESP-SELF',
      cargo: 'Autônomo',
      setor: 'Geral',
      turno: 'Manhã 06h–14h',
      consent: true,
      risk: 'baixo',
      icon: '👤',
      iconBg: 'var(--a10)',
    });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.captureAnalysis(baseAngles);
    });
    expect(result.current.analyses.length).toBeGreaterThan(0);
  });

  it('captureAnalysis com colaborador persiste análise', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    act(() => {
      result.current.setAnalysisDraft({
        collaboratorId: 'c1',
        setor: 'Beneficiamento',
        activity: 'Operação',
      });
      result.current.captureAnalysis(baseAngles, undefined, undefined, 30);
    });
    expect(result.current.analyses.length).toBeGreaterThan(0);
    await waitFor(() => expect(result.current.screen).toBe('result'), { timeout: 3000 });
    await waitFor(() => expect(mocks.apiSaveAnalysis).toHaveBeenCalled());
  });

  it('advanceGroWorkflow e completeGroReview', async () => {
    mocks.apiAdvanceGroWorkflow.mockResolvedValue({ stage: 'avaliacao' });
    mocks.apiCompleteGroReview.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.advanceGroWorkflow('risk-1');
      await result.current.completeGroReview('risk-1');
    });
    expect(mocks.apiAdvanceGroWorkflow).toHaveBeenCalled();
  });
});

describe('AppContext — organização', () => {
  beforeEach(setupMocks);

  it('createOrgEntity unidade sucesso', async () => {
    mocks.apiCreateOrgUnit.mockResolvedValue({ id: 'u2', name: 'Nova Unidade' });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    let ok = false;
    await act(async () => {
      ok = await result.current.createOrgEntity('unidade', '', 'Nova Unidade');
    });
    expect(ok).toBe(true);
    expect(mocks.apiCreateOrgUnit).toHaveBeenCalledWith('vale', { name: 'Nova Unidade' });
  });

  it('createOrgEntity offline retorna false', async () => {
    mocks.isApiAvailable.mockResolvedValue(false);
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.dbConnected).toBe(false));
    act(() => result.current.selectCompany('vale'));
    let ok = true;
    await act(async () => {
      ok = await result.current.createOrgEntity('unidade', '', 'X');
    });
    expect(ok).toBe(false);
  });
});

describe('AppContext — denúncias, psico e análises', () => {
  beforeEach(setupMocks);

  it('deleteAnalysis via modal confirma exclusão', async () => {
    const analysis = {
      id: '999',
      collaboratorId: 'c1',
      collaboratorName: 'João',
      setor: 'Beneficiamento',
      activity: 'Op',
      date: '01/01/2026',
      time: '10:00',
      score: 50,
      risk: 'medio' as const,
      rula: 4,
      reba: 5,
      angles: baseAngles,
      mode: 'complete' as const,
      synced: true,
      icon: '👤',
      iconBg: '#000',
    };
    mocks.fetchBundle.mockResolvedValue(
      createMinimalTenantBundle({ collaborators: [testCollaborator], analyses: [analysis] }),
    );
    mocks.apiDeleteAnalysis.mockResolvedValue(undefined);
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    act(() => result.current.deleteAnalysis('999'));
    expect(result.current.modal.open).toBe(true);
    act(() => result.current.modal.onConfirm?.());
    expect(result.current.analyses.find((a) => a.id === '999')).toBeUndefined();
    expect(mocks.apiDeleteAnalysis).toHaveBeenCalledWith('vale', '999');
  });

  it('openDenunciaDetail e integrateDenuncia', async () => {
    const denuncia = {
      id: 'd1',
      protocol: 'P-001',
      status: 'ABERTA' as const,
      category: 'ASSÉDIO',
      description: 'Teste',
      createdAt: new Date().toISOString(),
    };
    mocks.apiGetDenuncia.mockResolvedValue(denuncia);
    mocks.apiIntegrateDenuncia.mockResolvedValue({ denuncia: { ...denuncia, status: 'INTEGRADA' } });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.openDenunciaDetail('d1');
    });
    expect(result.current.screen).toBe('denuncia-detalhe');
    await act(async () => {
      await result.current.integrateDenuncia();
    });
    expect(result.current.toast?.type).toBe('success');
  });

  it('savePsicoFator e submitPsicoQuestionnaire', async () => {
    mocks.apiSavePsicoFator.mockResolvedValue({ ok: true });
    mocks.apiSubmitPsicoResposta.mockResolvedValue({ id: 'resp-1' });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.savePsicoFator('ESTRESSE', { probabilidade: 3, severidade: 4 });
      const r = await result.current.submitPsicoQuestionnaire('HSE', { q1: 2 }, true);
      expect(r).toEqual({ id: 'resp-1' });
    });
    expect(mocks.apiSavePsicoFator).toHaveBeenCalled();
  });

  it('submitPsicoQuestionnaire sem consentimento retorna null', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      const r = await result.current.submitPsicoQuestionnaire('HSE', { q1: 2 }, false);
      expect(r).toBeNull();
    });
  });

  it('consultEsocialStatus e deletePsicoActionPlan', async () => {
    mocks.apiConsultEsocialStatus.mockResolvedValue({ status: 'ACEITO', message: 'OK' });
    mocks.apiDeletePsicoPlanoAcao.mockResolvedValue(undefined);
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    await act(async () => {
      await result.current.consultEsocialStatus('ev-1');
      await result.current.deletePsicoActionPlan('plan-1');
    });
    expect(mocks.apiConsultEsocialStatus).toHaveBeenCalled();
    expect(mocks.apiDeletePsicoPlanoAcao).toHaveBeenCalled();
  });

  it('downloadComplianceReport exporta JSON', async () => {
    mocks.apiGenerateComplianceReport.mockResolvedValue({ score: 90, items: [] });
    const { result } = renderHook(() => useApp(), { wrapper });
    await loginAsErgonomist(result);
    const anchor = document.createElement('a');
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => undefined);
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    await act(async () => {
      await result.current.downloadComplianceReport();
    });
    expect(click).toHaveBeenCalled();
  });
});
