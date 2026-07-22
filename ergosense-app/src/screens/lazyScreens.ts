import { lazy, type ComponentType } from 'react';

function lazyNamed(
  factory: () => Promise<Record<string, unknown>>,
  name: string,
) {
  return lazy(() =>
    factory().then((mod) => {
      const Comp = mod[name];
      if (typeof Comp !== 'function') {
        throw new Error(`lazyNamed: export "${name}" is not a component`);
      }
      return { default: Comp as ComponentType<object> };
    }),
  );
}

/** Telas com dependências pesadas (pose IA, PDF, vídeo) — carregadas sob demanda */
export const NewCollabScreen = lazyNamed(() => import('./AnalysisScreens'), 'NewCollabScreen');
export const NewAnalysisScreen = lazyNamed(() => import('./AnalysisScreens'), 'NewAnalysisScreen');
export const CameraScreen = lazyNamed(() => import('./AnalysisScreens'), 'CameraScreen');
export const ResultScreen = lazyNamed(() => import('./AnalysisScreens'), 'ResultScreen');

export const V2AuditScreen = lazyNamed(() => import('./V2Screens'), 'V2AuditScreen');
export const V2EnvironmentalScreen = lazyNamed(() => import('./V2Screens'), 'V2EnvironmentalScreen');
export const V2ExecutiveDashboardScreen = lazyNamed(() => import('./V2Screens'), 'V2ExecutiveDashboardScreen');
export const V2MethodsScreen = lazyNamed(() => import('./V2Screens'), 'V2MethodsScreen');
export const V2RoadmapScreen = lazyNamed(() => import('./V2Screens'), 'V2RoadmapScreen');
export const V2VideoAnalysisScreen = lazyNamed(() => import('./V2Screens'), 'V2VideoAnalysisScreen');

export const PsicossocialDashboardScreen = lazyNamed(() => import('./PsicossocialScreens'), 'PsicossocialDashboardScreen');
export const PsicossocialFatoresScreen = lazyNamed(() => import('./PsicossocialScreens'), 'PsicossocialFatoresScreen');
export const PsicossocialQuestionariosScreen = lazyNamed(() => import('./PsicossocialScreens'), 'PsicossocialQuestionariosScreen');
export const PsicossocialMatrizScreen = lazyNamed(() => import('./PsicossocialScreens'), 'PsicossocialMatrizScreen');
export const PsicossocialPlanoScreen = lazyNamed(() => import('./PsicossocialScreens'), 'PsicossocialPlanoScreen');
export const PsicossocialConformidadeScreen = lazyNamed(() => import('./PsicossocialScreens'), 'PsicossocialConformidadeScreen');
export const PsicossocialIaScreen = lazyNamed(() => import('./PsicossocialScreens'), 'PsicossocialIaScreen');

export const ComplianceDashboardScreen = lazyNamed(() => import('./ComplianceScreens'), 'ComplianceDashboardScreen');
export const ComplianceNormasScreen = lazyNamed(() => import('./ComplianceScreens'), 'ComplianceNormasScreen');
export const ComplianceAlertasScreen = lazyNamed(() => import('./ComplianceScreens'), 'ComplianceAlertasScreen');
export const ComplianceValidacaoScreen = lazyNamed(() => import('./ComplianceScreens'), 'ComplianceValidacaoScreen');
export const ComplianceRelatoriosScreen = lazyNamed(() => import('./ComplianceScreens'), 'ComplianceRelatoriosScreen');
export const ComplianceFontesScreen = lazyNamed(() => import('./ComplianceScreens'), 'ComplianceFontesScreen');
export const ComplianceAdequacaoScreen = lazyNamed(() => import('./ComplianceScreens'), 'ComplianceAdequacaoScreen');

export const EsocialDashboardScreen = lazyNamed(() => import('./EsocialScreens'), 'EsocialDashboardScreen');
export const EsocialS2210Screen = lazyNamed(() => import('./EsocialScreens'), 'EsocialS2210Screen');
export const EsocialS2220Screen = lazyNamed(() => import('./EsocialScreens'), 'EsocialS2220Screen');
export const EsocialS2240Screen = lazyNamed(() => import('./EsocialScreens'), 'EsocialS2240Screen');
export const EsocialHistoricoScreen = lazyNamed(() => import('./EsocialScreens'), 'EsocialHistoricoScreen');
export const EsocialConfigScreen = lazyNamed(() => import('./EsocialScreens'), 'EsocialConfigScreen');

export const AetDashboardScreen = lazyNamed(() => import('./AetScreens'), 'AetDashboardScreen');
export const AetWorkflowScreen = lazyNamed(() => import('./AetScreens'), 'AetWorkflowScreen');
export const AetDetalheScreen = lazyNamed(() => import('./AetScreens'), 'AetDetalheScreen');
export const AetCadastrosScreen = lazyNamed(() => import('./AetScreens'), 'AetCadastrosScreen');
export const AetRelatorioScreen = lazyNamed(() => import('./AetScreens'), 'AetRelatorioScreen');
