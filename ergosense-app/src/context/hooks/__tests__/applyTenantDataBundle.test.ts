import { describe, expect, it } from 'vitest';
import type { Dispatch, SetStateAction } from 'react';
import { applyTenantDataBundle } from '../applyTenantDataBundle';
import { createMinimalTenantBundle } from '../../../test/fixtures/tenantBundle';
import type { Collaborator, Analysis } from '../../../types';
import type { NewAnalysisDraft, StoredState } from '../../contextTypes';

describe('applyTenantDataBundle', () => {
  const repairCollaborator = (c: Collaborator) => c;
  const repairAnalysis = (a: Analysis) => a;

  it('aplica todos os setters do bundle', () => {
    const bundle = createMinimalTenantBundle({
      collaborators: [
        {
          id: 'c1',
          name: 'Maria',
          matricula: '001',
          cargo: 'Op',
          setor: 'Britagem',
          turno: 'A',
          consent: true,
          risk: 'medio',
          icon: '👷',
          iconBg: '#333',
        },
      ],
      analyses: [],
      reports: [],
    });

    const calls: Record<string, unknown> = {};
    const setter = (key: string) => (v: unknown) => {
      calls[key] = v;
    };

    applyTenantDataBundle(
      bundle,
      {
        setRiskInventory: setter('risks'),
        setRiskInventorySummary: setter('riskSummary'),
        setGroDashboard: setter('groDash'),
        setGroWorkflow: setter('groWf'),
        setGroActionPlans: setter('groPlans'),
        setGroIndicators: setter('groInds'),
        setGroHistory: setter('groHist'),
        setGroReports: setter('groReps'),
        setPgrProgram: setter('pgrProg'),
        setPgrVersions: setter('pgrVers'),
        setPgrHistory: setter('pgrHist'),
        setPsicoDashboard: setter('psicoDash'),
        setPsicoFatores: setter('psicoFat'),
        setPsicoMatriz: setter('psicoMat'),
        setPsicoConformity: setter('psicoConf'),
        setPsicoActionPlans: setter('psicoPlans'),
        setPsicoHistory: setter('psicoHist'),
        setPsicoTrends: setter('psicoTrend'),
        setDenunciaDashboard: setter('denDash'),
        setDenuncias: setter('denList'),
        setActiveCriteria: setter('critActive'),
        setRiskCriteriaMethodologies: setter('critMethods'),
        setCriteriaDocumentation: setter('critDoc'),
        setCriteriaAuditTrail: setter('critAudit'),
        setAetDashboard: setter('aetDash'),
        setAetProcesses: setter('aetProcs'),
        setAetFurniture: setter('aetMob'),
        setAetEquipment: setter('aetEq'),
        setSstDashboard: setter('sstDash'),
        setSstApr: setter('sstAprR'),
        setSstEpi: setter('sstEpiR'),
        setSstEpc: setter('sstEpcR'),
        setSstInspecoes: setter('sstIns'),
        setSstAuditorias: setter('sstAud'),
        setSstNc: setter('sstNcR'),
        setSstCapa: setter('sstCapaR'),
        setSstTreinamentos: setter('sstTrein'),
        setEsocialDashboard: setter('esoDash'),
        setEsocialConfig: setter('esoCfg'),
        setEsocialEventos: setter('esoEv'),
        setEsocialHistory: setter('esoHist'),
        setComplianceDashboard: setter('compDash'),
        setComplianceFontes: setter('compFontes'),
        setComplianceNormas: setter('compNormas'),
        setComplianceDeteccoes: setter('compDet'),
        setComplianceAlertas: setter('compAlert'),
        setComplianceReports: setter('compReps'),
        setOrgTree: setter('orgTree'),
        setStored: ((fn: SetStateAction<StoredState>) => {
          const base: StoredState = {
            session: null,
            selectedCompanyId: 'vale',
            collaborators: [],
            analyses: [],
            reports: [],
            settings: {
              captureQuality: 'high',
              aiEngine: 'default',
              skeletonOverlay: true,
              soundAlerts: true,
              autoSync: true,
              wifiOnly: false,
            },
            analysisMode: 'complete',
            reportType: 'NR17',
          };
          calls.stored = typeof fn === 'function' ? fn(base) : fn;
        }) as Dispatch<SetStateAction<StoredState>>,
        setSectors: setter('sectors'),
        setDraft: ((fn: SetStateAction<NewAnalysisDraft>) => {
          const base = { collaboratorId: 'x', setor: 'Old' } as NewAnalysisDraft;
          calls.draft = typeof fn === 'function' ? fn(base) : fn;
        }) as Dispatch<SetStateAction<NewAnalysisDraft>>,
      },
      { repairCollaborator, repairAnalysis },
    );

    expect(calls.risks).toEqual([]);
    expect(calls.sectors).toEqual(['Beneficiamento']);
    expect(calls.stored).toMatchObject({
      collaborators: [expect.objectContaining({ id: 'c1' })],
    });
    expect(calls.draft).toMatchObject({ collaboratorId: 'c1', setor: 'Britagem' });
  });
});
