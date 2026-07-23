import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { server } from '../../test/mocks/server';
import { setAccessToken, setCsrfToken, setApiAuthSession } from '../authHeaders';
import * as client from '../client';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  setApiAuthSession(null);
  setAccessToken(null);
  setCsrfToken(null);
});
afterAll(() => server.close());

const tenantId = 'tenant-1';
const id = 'item-1';

/** Invoca cada export `api*` cobrindo o corpo das funções wrapper em client.ts */
async function invokeApiExport(name: string, fn: (...args: unknown[]) => Promise<unknown>) {
  switch (name) {
    case 'apiLogin':
      return fn('user@test.com', 'password1234');
    case 'apiMfaVerify':
      return fn('mfa-token', '123456');
    case 'apiLogout':
      return fn();
    case 'apiSubmitAccessRequest':
      return fn({ nome: 'João', email: 'j@test.com', funcao: 'Op', matricula: '1' });
    case 'apiRegisterCompany':
      return fn({
        nome: 'Co',
        industria: 'Min',
        adminNome: 'Admin',
        adminEmail: 'a@co.com',
        adminPassword: 'secret1234',
      });
    case 'apiActivateAccountPreview':
      return fn('activate-token');
    case 'apiActivateAccount':
      return fn({
        token: 'activate-token',
        password: 'newpass1234',
        confirmPassword: 'newpass1234',
        mfaCode: '123456',
      });
    case 'apiApproveTenantRequest':
    case 'apiRejectTenantRequest':
    case 'apiRequestTenantAdjustment':
      return fn(id, 'motivo válido');
    case 'apiBlockAdminTenant':
      return fn(id, 'inadimplência');
    case 'apiReactivateAdminTenant':
      return fn(id);
    case 'apiAuthorizeSupport':
      return fn(tenantId, '1h', 'suporte');
    case 'apiRevokeSupport':
    case 'apiGetSupportStatus':
    case 'apiGetSupportAudit':
      return fn(tenantId);
    case 'apiUpdateCollaborator':
      return fn(tenantId, id, { cargo: 'Op' });
    case 'apiSaveCollaborator':
      return fn(tenantId, {
        nome: 'Ana',
        matricula: '1',
        cargo: 'Op',
        setor: 'Britagem',
        turno: 'A',
      });
    case 'apiSaveAnalysis':
      return fn(tenantId, { id, collaboratorId: 'c1' });
    case 'apiFetchAnalysisVideoUrl':
      return fn(tenantId, id);
    case 'apiDeleteAnalysis':
    case 'apiDeleteRiskInventory':
    case 'apiGetRiskInventoryItem':
    case 'apiGetDenuncia':
    case 'apiIntegrateDenuncia':
    case 'apiConcludeDenuncia':
      return fn(tenantId, id);
    case 'apiSaveRiskInventory':
      return fn(tenantId, { perigo: 'Postura', tipo: 'ERGONOMICO' });
    case 'apiCreateDenuncia':
      return fn(tenantId, { type: 'ASSEDIO_MORAL', modality: 'ANONIMA', description: 'Relato' });
    case 'apiUpdateDenunciaStatus':
      return fn(tenantId, id, 'EM_ANALISE');
    case 'apiAddDenunciaTreatment':
      return fn(tenantId, id, { description: 'Tratativa' });
    case 'apiAddDenunciaEvidence':
      return fn(tenantId, id, { description: 'Evidência' });
    case 'apiCreateCriteriaMethodology':
      return fn(tenantId, { name: 'Matriz', matrixType: 'PROB_SEV' });
    case 'apiActivateCriteriaVersion':
      return fn(tenantId, 'method-1', 'ver-1');
    case 'apiEvaluateRiskCriteria':
      return fn(tenantId, 3, 4);
    case 'apiAdvanceGroWorkflow':
    case 'apiCompleteGroReview':
    case 'apiDeleteGroActionPlan':
    case 'apiDeleteGroIndicator':
      return fn(tenantId, id);
    case 'apiSaveGroActionPlan':
      return fn(tenantId, { descricao: 'Ação', inventarioRiscoId: id });
    case 'apiSaveGroIndicator':
      return fn(tenantId, { nome: 'Ind', tipo: 'LAG' });
    case 'apiGenerateGroReport':
      return fn(tenantId, 'EXECUTIVO');
    case 'apiUpdatePgrProgram':
      return fn(tenantId, { responsavel: 'Ergonomista' });
    case 'apiGeneratePgrVersion':
      return fn(tenantId, { reviewReason: 'Revisão' });
    case 'apiSubmitPgrApproval':
      return fn(tenantId, id, 'Aprovador');
    case 'apiApprovePgrVersion':
    case 'apiRejectPgrVersion':
    case 'apiSignPgrVersion':
    case 'apiStartPgrRevision':
    case 'apiRefreshPgrVersion':
      return fn(tenantId, id, 'notas');
    case 'apiSavePsicoFator':
      return fn(tenantId, { code: 'F01', name: 'Fator' });
    case 'apiSubmitPsicoResposta':
      return fn(tenantId, { factorId: id, score: 2 });
    case 'apiCreatePsicoCampanha':
      return fn(tenantId, { title: 'Campanha', factorId: id });
    case 'apiRegeneratePsicoCampanhaLink':
      return fn(tenantId, id);
    case 'apiSubmitPublicPsicoForm':
      return fn('public-token', { answers: {} });
    case 'apiSavePsicoPlanoAcao':
      return fn(tenantId, { descricao: 'Plano', factorId: id });
    case 'apiDeletePsicoPlanoAcao':
    case 'apiMarkPsicoAlertRead':
      return fn(tenantId, id);
    case 'apiCreateAetProcesso':
      return fn(tenantId, { title: 'Processo' });
    case 'apiUpdateAetProcesso':
      return fn(tenantId, id, { title: 'Novo' });
    case 'apiAdvanceAetStage':
    case 'apiGenerateAetReport':
      return fn(tenantId, id);
    case 'apiSaveAetVibracaoCorpo':
    case 'apiSaveAetVibracaoMaos':
      return fn(tenantId, id, { aceleracaoMs2: 1, horasExposicao: 2 });
    case 'apiSaveAetTeleatendimento':
    case 'apiSaveAetOrganizacao':
      return fn(tenantId, id, { q1: 1 });
    case 'apiSaveAetMetodos':
      return fn(tenantId, id, { rula: {} });
    case 'apiSaveAetMobiliario':
    case 'apiSaveAetEquipamento':
      return fn(tenantId, { nome: 'Item' });
    case 'apiUpdateAetTechnicalResponsible':
      return fn(tenantId, id, { name: 'RT' });
    case 'apiCreateAetVersion':
      return fn(tenantId, id, {});
    case 'apiGetAetVersion':
    case 'apiRefreshAetVersionSnapshot':
    case 'apiGenerateAetVersionReport':
    case 'apiSubmitAetApproval':
    case 'apiApproveAetVersion':
    case 'apiRejectAetVersion':
    case 'apiStartAetRevision':
    case 'apiSignAetVersion':
      return fn(tenantId, id);
    case 'apiGetAetIntegrations':
      return fn(tenantId, id);
    case 'apiCreateSstApr':
    case 'apiCreateSstEpi':
    case 'apiCreateSstEpc':
      return fn(tenantId, { title: 'Item' });
    case 'apiCreateSstInspecao':
    case 'apiCreateSstAuditoria':
    case 'apiCreateSstTreinamento':
      return fn(tenantId, 'Título');
    case 'apiCreateSstNc':
      return fn(tenantId, { description: 'NC' });
    case 'apiCreateSstCapa':
      return fn(tenantId, { description: 'CAPA' });
    case 'apiUpdateEsocialConfig':
      return fn(tenantId, { ambiente: 'PRODUCAO' });
    case 'apiCreateEsocialEvento':
      return fn(tenantId, { tipo: 'S-2210', dados: {} });
    case 'apiValidateEsocialEvento':
    case 'apiPrepareEsocialEnvio':
    case 'apiGetEsocialXml':
    case 'apiTransmitEsocialEvento':
    case 'apiResendEsocialEvento':
    case 'apiConsultEsocialStatus':
      return fn(tenantId, id);
    case 'apiSignEsocialEvento':
      return fn(tenantId, id, { name: 'Signatário' });
    case 'apiUpdateComplianceFonte':
      return fn(tenantId, 'DOU', { active: true });
    case 'apiRunComplianceScan':
      return fn(tenantId, ['DOU']);
    case 'apiValidateComplianceDetection':
      return fn(tenantId, id, { decision: 'APROVAR', justification: 'Ok' });
    case 'apiMarkComplianceAlertRead':
    case 'apiUpdateComplianceTask':
      return fn(tenantId, id);
    case 'apiCompareComplianceNormVersions':
      return fn(tenantId, 'norm-1', 'v1', 'v2');
    case 'apiUpdateComplianceSchedule':
      return fn(tenantId, { active: true });
    case 'apiCreateOrgUnit':
      return fn(tenantId, 'empresa-1', 'Unidade');
    case 'apiCreateOrgSector':
      return fn(tenantId, 'unidade-1', 'Setor');
    case 'apiCreateOrgFunction':
      return fn(tenantId, 'setor-1', 'Função');
    case 'apiCreateOrgActivity':
      return fn(tenantId, 'funcao-1', 'Atividade');
    case 'apiCreateOrgWorkPost':
      return fn(tenantId, 'atividade-1', 'Posto');
    case 'apiDeleteOrgEntity':
      return fn(tenantId, 'setor', id);
    case 'apiAiExpertAnalyzeErgonomics':
    case 'apiAiExpertGenerateAet':
    case 'apiAiExpertGenerateIt':
    case 'apiAiExpertQuery':
      return fn(tenantId, { prompt: 'Análise' });
    case 'apiAiExpertPsicossocial':
      return fn(tenantId, 'Resumo');
    case 'apiRestoreSession':
    case 'apiHealth':
    case 'isApiAvailable':
      return fn();
    default:
      if (name.includes('Admin') || name === 'apiGetTenants' || name === 'apiGetTenantMetadata') {
        return fn();
      }
      if (name.includes('Public')) {
        return fn('public-token');
      }
      return fn(tenantId);
  }
}

describe('client.ts — batch endpoints', () => {
  it(
    'invoca todos os exports api* via MSW',
    async () => {
    setAccessToken('batch-token');
    setCsrfToken('batch-csrf');

    const entries = Object.entries(client).filter(
      ([name, value]) => name.startsWith('api') && typeof value === 'function',
    );

    expect(entries.length).toBeGreaterThan(100);

    for (const [name, fn] of entries) {
      await invokeApiExport(name, fn as (...args: unknown[]) => Promise<unknown>);
    }
    },
    60_000,
  );
});
