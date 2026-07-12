/**
 * Aplica bundle de tenant aos setters do AppContext
 */
import type { Dispatch, SetStateAction } from 'react';
import { repairPortugueseText } from '../../utils/textEncoding';
import type { TenantDataBundle } from './fetchTenantDataBundle';
import type { Analysis, Collaborator } from '../../types';
import type { NewAnalysisDraft, StoredState } from '../contextTypes';

type RepairFns = {
  repairCollaborator: (c: Collaborator) => Collaborator;
  repairAnalysis: (a: Analysis) => Analysis;
};

type TenantSetters = {
  setRiskInventory: (v: TenantDataBundle['risks']) => void;
  setRiskInventorySummary: (v: TenantDataBundle['riskSummary']) => void;
  setGroDashboard: (v: TenantDataBundle['groDash']) => void;
  setGroWorkflow: (v: TenantDataBundle['groWf']) => void;
  setGroActionPlans: (v: TenantDataBundle['groPlans']) => void;
  setGroIndicators: (v: TenantDataBundle['groInds']) => void;
  setGroHistory: (v: TenantDataBundle['groHist']) => void;
  setGroReports: (v: TenantDataBundle['groReps']) => void;
  setPgrProgram: (v: TenantDataBundle['pgrProg']) => void;
  setPgrVersions: (v: TenantDataBundle['pgrVers']) => void;
  setPgrHistory: (v: TenantDataBundle['pgrHist']) => void;
  setPsicoDashboard: (v: TenantDataBundle['psicoDash']) => void;
  setPsicoFatores: (v: TenantDataBundle['psicoFat']) => void;
  setPsicoMatriz: (v: TenantDataBundle['psicoMat']) => void;
  setPsicoConformity: (v: TenantDataBundle['psicoConf']) => void;
  setPsicoActionPlans: (v: TenantDataBundle['psicoPlans']) => void;
  setPsicoHistory: (v: TenantDataBundle['psicoHist']) => void;
  setPsicoTrends: (v: TenantDataBundle['psicoTrend']) => void;
  setDenunciaDashboard: (v: TenantDataBundle['denDash']) => void;
  setDenuncias: (v: TenantDataBundle['denList']) => void;
  setActiveCriteria: (v: TenantDataBundle['critActive']) => void;
  setRiskCriteriaMethodologies: (v: TenantDataBundle['critMethods']) => void;
  setCriteriaDocumentation: (v: TenantDataBundle['critDoc']) => void;
  setCriteriaAuditTrail: (v: TenantDataBundle['critAudit']) => void;
  setAetDashboard: (v: TenantDataBundle['aetDash']) => void;
  setAetProcesses: (v: TenantDataBundle['aetProcs']) => void;
  setAetFurniture: (v: TenantDataBundle['aetMob']) => void;
  setAetEquipment: (v: TenantDataBundle['aetEq']) => void;
  setSstDashboard: (v: TenantDataBundle['sstDash']) => void;
  setSstApr: (v: TenantDataBundle['sstAprR']) => void;
  setSstEpi: (v: TenantDataBundle['sstEpiR']) => void;
  setSstEpc: (v: TenantDataBundle['sstEpcR']) => void;
  setSstInspecoes: (v: TenantDataBundle['sstIns']) => void;
  setSstAuditorias: (v: TenantDataBundle['sstAud']) => void;
  setSstNc: (v: TenantDataBundle['sstNcR']) => void;
  setSstCapa: (v: TenantDataBundle['sstCapaR']) => void;
  setSstTreinamentos: (v: TenantDataBundle['sstTrein']) => void;
  setEsocialDashboard: (v: TenantDataBundle['esoDash']) => void;
  setEsocialConfig: (v: TenantDataBundle['esoCfg']) => void;
  setEsocialEventos: (v: TenantDataBundle['esoEv']) => void;
  setEsocialHistory: (v: TenantDataBundle['esoHist']) => void;
  setComplianceDashboard: (v: TenantDataBundle['compDash']) => void;
  setComplianceFontes: (v: TenantDataBundle['compFontes']) => void;
  setComplianceNormas: (v: TenantDataBundle['compNormas']) => void;
  setComplianceDeteccoes: (v: TenantDataBundle['compDet']) => void;
  setComplianceAlertas: (v: TenantDataBundle['compAlert']) => void;
  setComplianceReports: (v: TenantDataBundle['compReps']) => void;
  setOrgTree: (v: TenantDataBundle['orgTree']) => void;
  setStored: Dispatch<SetStateAction<StoredState>>;
  setSectors: (v: string[]) => void;
  setDraft: Dispatch<SetStateAction<NewAnalysisDraft>>;
};

export function applyTenantDataBundle(
  bundle: TenantDataBundle,
  setters: TenantSetters,
  repair: RepairFns,
) {
  const { repairCollaborator, repairAnalysis } = repair;
  setters.setRiskInventory(bundle.risks);
  setters.setRiskInventorySummary(bundle.riskSummary);
  setters.setGroDashboard(bundle.groDash);
  setters.setGroWorkflow(bundle.groWf);
  setters.setGroActionPlans(bundle.groPlans);
  setters.setGroIndicators(bundle.groInds);
  setters.setGroHistory(bundle.groHist);
  setters.setGroReports(bundle.groReps);
  setters.setPgrProgram(bundle.pgrProg);
  setters.setPgrVersions(bundle.pgrVers);
  setters.setPgrHistory(bundle.pgrHist);
  setters.setPsicoDashboard(bundle.psicoDash);
  setters.setPsicoFatores(bundle.psicoFat);
  setters.setPsicoMatriz(bundle.psicoMat);
  setters.setPsicoConformity(bundle.psicoConf);
  setters.setPsicoActionPlans(bundle.psicoPlans);
  setters.setPsicoHistory(bundle.psicoHist);
  setters.setPsicoTrends(bundle.psicoTrend);
  setters.setDenunciaDashboard(bundle.denDash);
  setters.setDenuncias(bundle.denList);
  setters.setActiveCriteria(bundle.critActive);
  setters.setRiskCriteriaMethodologies(bundle.critMethods);
  setters.setCriteriaDocumentation(bundle.critDoc);
  setters.setCriteriaAuditTrail(bundle.critAudit);
  setters.setAetDashboard(bundle.aetDash);
  setters.setAetProcesses(bundle.aetProcs);
  setters.setAetFurniture(bundle.aetMob);
  setters.setAetEquipment(bundle.aetEq);
  setters.setSstDashboard(bundle.sstDash);
  setters.setSstApr(bundle.sstAprR);
  setters.setSstEpi(bundle.sstEpiR);
  setters.setSstEpc(bundle.sstEpcR);
  setters.setSstInspecoes(bundle.sstIns);
  setters.setSstAuditorias(bundle.sstAud);
  setters.setSstNc(bundle.sstNcR);
  setters.setSstCapa(bundle.sstCapaR);
  setters.setSstTreinamentos(bundle.sstTrein);
  setters.setEsocialDashboard(bundle.esoDash);
  setters.setEsocialConfig(bundle.esoCfg);
  setters.setEsocialEventos(bundle.esoEv);
  setters.setEsocialHistory(bundle.esoHist);
  setters.setComplianceDashboard(bundle.compDash);
  setters.setComplianceFontes(bundle.compFontes);
  setters.setComplianceNormas(bundle.compNormas);
  setters.setComplianceDeteccoes(bundle.compDet);
  setters.setComplianceAlertas(bundle.compAlert);
  setters.setComplianceReports(bundle.compReps);
  setters.setOrgTree(bundle.orgTree);
  setters.setStored((s) => ({
    ...s,
    collaborators: bundle.collaborators.map(repairCollaborator),
    analyses: bundle.analyses.map(repairAnalysis),
    reports: bundle.reports,
  }));
  setters.setSectors(bundle.sectorRows.map((r) => repairPortugueseText(r.name)));
  if (bundle.collaborators.length) {
    setters.setDraft((d) => ({
      ...d,
      collaboratorId: bundle.collaborators.some((c) => c.id === d.collaboratorId)
        ? d.collaboratorId
        : bundle.collaborators[0].id,
      setor:
        bundle.collaborators.find((c) => c.id === d.collaboratorId)?.setor ??
        bundle.collaborators[0].setor ??
        d.setor,
    }));
  }
}
