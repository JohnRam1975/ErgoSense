/**
 * Carrega todos os dados de tenant em paralelo (extraído do AppContext)
 */
import {
  apiGetAnalyses,
  apiGetCollaborators,
  apiGetReports,
  apiGetSectors,
  apiGetRiskInventory,
  apiGetRiskInventorySummary,
  apiGetGroDashboard,
  apiGetGroWorkflow,
  apiGetGroActionPlans,
  apiGetGroIndicators,
  apiGetGroHistory,
  apiGetGroReports,
  apiGetPgrProgram,
  apiGetPgrVersions,
  apiGetPgrHistory,
  apiGetPsicoDashboard,
  apiGetPsicoFatores,
  apiGetPsicoMatriz,
  apiGetPsicoConformidade,
  apiGetPsicoPlanoAcao,
  apiGetPsicoHistorico,
  apiGetPsicoTendencias,
  apiGetDenunciaDashboard,
  apiGetDenuncias,
  apiGetActiveCriteria,
  apiFetchCriteriaMethodologies,
  apiGetCriteriaDocumentation,
  apiFetchCriteriaAudit,
  apiGetAetDashboard,
  apiGetAetProcessos,
  apiGetAetMobiliario,
  apiGetAetEquipamentos,
  apiGetSstDashboard,
  apiGetSstApr,
  apiGetSstEpi,
  apiGetSstEpc,
  apiGetSstInspecoes,
  apiGetSstAuditorias,
  apiGetSstNc,
  apiGetSstCapa,
  apiGetSstTreinamentos,
  apiGetEsocialDashboard,
  apiGetEsocialConfig,
  apiGetEsocialEventos,
  apiGetEsocialHistorico,
  apiGetComplianceDashboard,
  apiGetComplianceFontes,
  apiGetComplianceNormas,
  apiGetComplianceDeteccoes,
  apiGetComplianceAlertas,
  apiGetComplianceRelatorios,
  apiGetOrgTree,
} from '../../api/client';
import type { Analysis, Collaborator, Report } from '../../types';
import type { RiskInventoryItem, RiskInventorySummary } from '../../types/riskInventory';
import type { DenunciaDashboard, DenunciaItem } from '../../types/denuncia';
import type { ActiveCriteria, CriteriaAuditEntry, CriteriaDocumentation, RiskMethodology } from '../../types/riskCriteria';
import type {
  GroActionPlan,
  GroDashboard,
  GroHistoryEntry,
  GroIndicator,
  GroReportSummary,
  GroWorkflow,
} from '../../types/gro';
import type { PgrHistoryEntry, PgrProgram, PgrVersionSummary } from '../../types/pgr';
import type {
  PsicoActionPlan,
  PsicoConformity,
  PsicoDashboard,
  PsicoHistoryEntry,
  PsicoMatrizItem,
  PsicoMteFactor,
  PsicoTrendPoint,
} from '../../types/psicossocial';
import type { AetDashboard, AetEquipment, AetFurniture, AetProcess } from '../../types/aet';
import type {
  SstApr,
  SstAuditoria,
  SstCapa,
  SstDashboard,
  SstEpi,
  SstEpc,
  SstInspecao,
  SstNc,
  SstTreinamento,
} from '../../types/sst';
import type { EsocialConfig, EsocialDashboard, EsocialEvent, EsocialHistoryEntry } from '../../types/esocial';
import type {
  ComplianceAlerta,
  ComplianceDashboard,
  ComplianceDeteccao,
  ComplianceFonte,
  ComplianceNorma,
  ComplianceReportSummary,
} from '../../types/compliance';
import type { OrgTree } from '../../types/org';

export type TenantDataBundle = {
  collaborators: Collaborator[];
  analyses: Analysis[];
  reports: Report[];
  sectorRows: Array<{ id: string; name: string }>;
  orgTree: OrgTree | null;
  risks: RiskInventoryItem[];
  riskSummary: RiskInventorySummary | null;
  groDash: GroDashboard | null;
  groWf: GroWorkflow | null;
  groPlans: GroActionPlan[];
  groInds: GroIndicator[];
  groHist: GroHistoryEntry[];
  groReps: GroReportSummary[];
  pgrProg: PgrProgram | null;
  pgrVers: PgrVersionSummary[];
  pgrHist: PgrHistoryEntry[];
  psicoDash: PsicoDashboard | null;
  psicoFat: PsicoMteFactor[];
  psicoMat: PsicoMatrizItem[];
  psicoConf: PsicoConformity | null;
  psicoPlans: PsicoActionPlan[];
  psicoHist: PsicoHistoryEntry[];
  psicoTrend: PsicoTrendPoint[];
  denDash: DenunciaDashboard | null;
  denList: DenunciaItem[];
  critActive: ActiveCriteria | null;
  critMethods: RiskMethodology[];
  critDoc: CriteriaDocumentation | null;
  critAudit: CriteriaAuditEntry[];
  aetDash: AetDashboard | null;
  aetProcs: AetProcess[];
  aetMob: AetFurniture[];
  aetEq: AetEquipment[];
  sstDash: SstDashboard | null;
  sstAprR: SstApr[];
  sstEpiR: SstEpi[];
  sstEpcR: SstEpc[];
  sstIns: SstInspecao[];
  sstAud: SstAuditoria[];
  sstNcR: SstNc[];
  sstCapaR: SstCapa[];
  sstTrein: SstTreinamento[];
  esoDash: EsocialDashboard | null;
  esoCfg: EsocialConfig | null;
  esoEv: EsocialEvent[];
  esoHist: EsocialHistoryEntry[];
  compDash: ComplianceDashboard | null;
  compFontes: ComplianceFonte[];
  compNormas: ComplianceNorma[];
  compDet: ComplianceDeteccao[];
  compAlert: ComplianceAlerta[];
  compReps: ComplianceReportSummary[];
};

export async function fetchTenantDataBundle(tenantId: string): Promise<TenantDataBundle> {
  const [
    collaborators,
    analyses,
    reports,
    sectorRows,
    orgTree,
    risks,
    riskSummary,
    groDash,
    groWf,
    groPlans,
    groInds,
    groHist,
    groReps,
    pgrProg,
    pgrVers,
    pgrHist,
    psicoDash,
    psicoFat,
    psicoMat,
    psicoConf,
    psicoPlans,
    psicoHist,
    psicoTrend,
    denDash,
    denList,
    critActive,
    critMethods,
    critDoc,
    critAudit,
    aetDash,
    aetProcs,
    aetMob,
    aetEq,
    sstDash,
    sstAprR,
    sstEpiR,
    sstEpcR,
    sstIns,
    sstAud,
    sstNcR,
    sstCapaR,
    sstTrein,
    esoDash,
    esoCfg,
    esoEv,
    esoHist,
    compDash,
    compFontes,
    compNormas,
    compDet,
    compAlert,
    compReps,
  ] = await Promise.all([
    apiGetCollaborators(tenantId),
    apiGetAnalyses(tenantId),
    apiGetReports(tenantId),
    apiGetSectors(tenantId),
    apiGetOrgTree(tenantId).catch(() => null),
    apiGetRiskInventory(tenantId).catch(() => [] as RiskInventoryItem[]),
    apiGetRiskInventorySummary(tenantId).catch(() => null),
    apiGetGroDashboard(tenantId).catch(() => null),
    apiGetGroWorkflow(tenantId).catch(() => null),
    apiGetGroActionPlans(tenantId).catch(() => [] as GroActionPlan[]),
    apiGetGroIndicators(tenantId).catch(() => [] as GroIndicator[]),
    apiGetGroHistory(tenantId).catch(() => [] as GroHistoryEntry[]),
    apiGetGroReports(tenantId).catch(() => [] as GroReportSummary[]),
    apiGetPgrProgram(tenantId).catch(() => null),
    apiGetPgrVersions(tenantId).catch(() => [] as PgrVersionSummary[]),
    apiGetPgrHistory(tenantId).catch(() => [] as PgrHistoryEntry[]),
    apiGetPsicoDashboard(tenantId).catch(() => null),
    apiGetPsicoFatores(tenantId).catch(() => [] as PsicoMteFactor[]),
    apiGetPsicoMatriz(tenantId).catch(() => [] as PsicoMatrizItem[]),
    apiGetPsicoConformidade(tenantId).catch(() => null),
    apiGetPsicoPlanoAcao(tenantId).catch(() => [] as PsicoActionPlan[]),
    apiGetPsicoHistorico(tenantId).catch(() => [] as PsicoHistoryEntry[]),
    apiGetPsicoTendencias(tenantId).catch(() => [] as PsicoTrendPoint[]),
    apiGetDenunciaDashboard(tenantId).catch(() => null),
    apiGetDenuncias(tenantId).catch(() => [] as DenunciaItem[]),
    apiGetActiveCriteria(tenantId).catch(() => null),
    apiFetchCriteriaMethodologies(tenantId).catch(() => [] as RiskMethodology[]),
    apiGetCriteriaDocumentation(tenantId).catch(() => null),
    apiFetchCriteriaAudit(tenantId).catch(() => [] as CriteriaAuditEntry[]),
    apiGetAetDashboard(tenantId).catch(() => null),
    apiGetAetProcessos(tenantId).catch(() => [] as AetProcess[]),
    apiGetAetMobiliario(tenantId).catch(() => [] as AetFurniture[]),
    apiGetAetEquipamentos(tenantId).catch(() => [] as AetEquipment[]),
    apiGetSstDashboard(tenantId).catch(() => null),
    apiGetSstApr(tenantId).catch(() => [] as SstApr[]),
    apiGetSstEpi(tenantId).catch(() => [] as SstEpi[]),
    apiGetSstEpc(tenantId).catch(() => [] as SstEpc[]),
    apiGetSstInspecoes(tenantId).catch(() => [] as SstInspecao[]),
    apiGetSstAuditorias(tenantId).catch(() => [] as SstAuditoria[]),
    apiGetSstNc(tenantId).catch(() => [] as SstNc[]),
    apiGetSstCapa(tenantId).catch(() => [] as SstCapa[]),
    apiGetSstTreinamentos(tenantId).catch(() => [] as SstTreinamento[]),
    apiGetEsocialDashboard(tenantId).catch(() => null),
    apiGetEsocialConfig(tenantId).catch(() => null),
    apiGetEsocialEventos(tenantId).catch(() => [] as EsocialEvent[]),
    apiGetEsocialHistorico(tenantId).catch(() => [] as EsocialHistoryEntry[]),
    apiGetComplianceDashboard(tenantId).catch(() => null),
    apiGetComplianceFontes(tenantId).catch(() => [] as ComplianceFonte[]),
    apiGetComplianceNormas(tenantId).catch(() => [] as ComplianceNorma[]),
    apiGetComplianceDeteccoes(tenantId).catch(() => [] as ComplianceDeteccao[]),
    apiGetComplianceAlertas(tenantId).catch(() => [] as ComplianceAlerta[]),
    apiGetComplianceRelatorios(tenantId).catch(() => [] as ComplianceReportSummary[]),
  ]);

  return {
    collaborators,
    analyses,
    reports,
    sectorRows,
    orgTree,
    risks,
    riskSummary,
    groDash,
    groWf,
    groPlans,
    groInds,
    groHist,
    groReps,
    pgrProg,
    pgrVers,
    pgrHist,
    psicoDash,
    psicoFat,
    psicoMat,
    psicoConf,
    psicoPlans,
    psicoHist,
    psicoTrend,
    denDash,
    denList,
    critActive,
    critMethods,
    critDoc,
    critAudit,
    aetDash,
    aetProcs,
    aetMob,
    aetEq,
    sstDash,
    sstAprR,
    sstEpiR,
    sstEpcR,
    sstIns,
    sstAud,
    sstNcR,
    sstCapaR,
    sstTrein,
    esoDash,
    esoCfg,
    esoEv,
    esoHist,
    compDash,
    compFontes,
    compNormas,
    compDet,
    compAlert,
    compReps,
  };
}
