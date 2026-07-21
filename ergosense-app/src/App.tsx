import { Suspense, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { StatusBar, Toast, Modal } from './components/UI';
import { AppChrome, MenuDrawer } from './components/Navigation';
import { SupportModeBar, SupportModeCameraExit } from './components/SupportModeBar';
import { PwaInstallBanner, PwaInstallGuide } from './components/PwaInstallBanner';
import { useHaptic } from './hooks/useHaptic';
import { SplashScreen, LoginScreen, RegisterCompanyScreen, CompanyScreen, DashboardScreen, CollabsScreen } from './screens/MainScreens';
import {
  TenantRequestAccessScreen,
  AutonomoRequestAccessScreen,
  ActivateAccountScreen,
  AdminTenantRequestsScreen,
  AdminTenantRequestDetailScreen,
  AdminTenantsListScreen,
  AdminAccessControlScreen,
  AdminTenantDetailScreen,
} from './screens/TenantOnboardingScreens';
import { GlobalAdminScreen } from './screens/AdminScreens';
import { SupportAccessScreen } from './screens/SupportScreens';
import {
  NewCollabScreen,
  NewAnalysisScreen,
  CameraScreen,
  ResultScreen,
  V2AuditScreen,
  V2EnvironmentalScreen,
  V2ExecutiveDashboardScreen,
  V2MethodsScreen,
  V2RoadmapScreen,
  V2VideoAnalysisScreen,
  PsicossocialDashboardScreen,
  PsicossocialFatoresScreen,
  PsicossocialQuestionariosScreen,
  PsicossocialMatrizScreen,
  PsicossocialPlanoScreen,
  PsicossocialConformidadeScreen,
  PsicossocialIaScreen,
  ComplianceDashboardScreen,
  ComplianceNormasScreen,
  ComplianceAlertasScreen,
  ComplianceValidacaoScreen,
  ComplianceRelatoriosScreen,
  ComplianceFontesScreen,
  ComplianceAdequacaoScreen,
  EsocialDashboardScreen,
  EsocialS2210Screen,
  EsocialS2220Screen,
  EsocialS2240Screen,
  EsocialHistoricoScreen,
  EsocialConfigScreen,
  AetDashboardScreen,
  AetWorkflowScreen,
  AetDetalheScreen,
  AetCadastrosScreen,
  AetRelatorioScreen,
} from './screens/lazyScreens';
import { OrgStructureScreen, SectorsOrgScreen } from './screens/OrgScreens';
import { HistoryScreen, ReportsScreen, SettingsScreen, SyncScreen } from './screens/UtilityScreens';
import {
  DenunciaDashboardScreen,
  DenunciaDetailScreen,
  DenunciaFormScreen,
  DenunciaListScreen,
} from './screens/DenunciaScreens';
import {
  CriteriaConfigScreen,
  CriteriaDashboardScreen,
  CriteriaDocumentacaoScreen,
  CriteriaHistoricoScreen,
} from './screens/RiskCriteriaScreens';
import {
  RiskInventoryDashboardScreen,
  RiskInventoryFormScreen,
  RiskInventoryListScreen,
  RiskInventoryMatrixScreen,
} from './screens/RiskInventoryScreens';
import {
  GroDashboardScreen,
  GroWorkflowScreen,
  GroActionPlanScreen,
  GroIndicatorsScreen,
  GroHistoryScreen,
  GroReportsScreen,
} from './screens/GroScreens';
import {
  PgrDashboardScreen,
  PgrVersionsScreen,
  PgrVersionDetailScreen,
  PgrHistoryScreen,
} from './screens/PgrScreens';
import {
  SstDashboardScreen,
  SstAprScreen,
  SstEpiEpcScreen,
  SstInspecoesScreen,
  SstAuditoriasScreen,
  SstNcCapaScreen,
  SstTreinamentosScreen,
  SstRelatoriosScreen,
} from './screens/SstScreens';
import type { ScreenId } from './types';

const SCREENS: Record<ScreenId, React.ComponentType> = {
  splash: SplashScreen,
  login: LoginScreen,
  'request-access': TenantRequestAccessScreen,
  'request-access-autonomo': AutonomoRequestAccessScreen,
  'activate-account': ActivateAccountScreen,
  'admin-tenant-requests': AdminTenantRequestsScreen,
  'admin-tenant-request-detail': AdminTenantRequestDetailScreen,
  'admin-tenants-active': () => <AdminTenantsListScreen filter="active" />,
  'admin-tenants-blocked': () => <AdminTenantsListScreen filter="blocked" />,
  'admin-tenants-expired': () => <AdminTenantsListScreen filter="expired" />,
  'admin-access-control': AdminAccessControlScreen,
  'admin-tenant-detail': AdminTenantDetailScreen,
  'register-company': RegisterCompanyScreen,
  'global-admin': GlobalAdminScreen,
  'support-access': SupportAccessScreen,
  company: CompanyScreen,
  dashboard: DashboardScreen,
  collabs: CollabsScreen,
  'new-collab': NewCollabScreen,
  sectors: SectorsOrgScreen,
  'org-structure': OrgStructureScreen,
  'new-analysis': NewAnalysisScreen,
  camera: CameraScreen,
  result: ResultScreen,
  history: HistoryScreen,
  reports: ReportsScreen,
  settings: SettingsScreen,
  sync: SyncScreen,
  'v2-dashboard': V2ExecutiveDashboardScreen,
  'v2-methods': V2MethodsScreen,
  'v2-video': V2VideoAnalysisScreen,
  'v2-environmental': V2EnvironmentalScreen,
  'v2-roadmap': V2RoadmapScreen,
  'v2-audit': V2AuditScreen,
  'psicossocial-dashboard': PsicossocialDashboardScreen,
  'psicossocial-fatores': PsicossocialFatoresScreen,
  'psicossocial-questionarios': PsicossocialQuestionariosScreen,
  'psicossocial-matriz': PsicossocialMatrizScreen,
  'psicossocial-plano': PsicossocialPlanoScreen,
  'psicossocial-conformidade': PsicossocialConformidadeScreen,
  'psicossocial-ia': PsicossocialIaScreen,
  'denuncia-dashboard': DenunciaDashboardScreen,
  'denuncia-lista': DenunciaListScreen,
  'denuncia-nova': DenunciaFormScreen,
  'denuncia-detalhe': DenunciaDetailScreen,
  'criterios-dashboard': CriteriaDashboardScreen,
  'criterios-config': CriteriaConfigScreen,
  'criterios-historico': CriteriaHistoricoScreen,
  'criterios-documentacao': CriteriaDocumentacaoScreen,
  'inventario-dashboard': RiskInventoryDashboardScreen,
  'inventario-lista': RiskInventoryListScreen,
  'inventario-form': RiskInventoryFormScreen,
  'inventario-matriz': RiskInventoryMatrixScreen,
  'gro-dashboard': GroDashboardScreen,
  'gro-workflow': GroWorkflowScreen,
  'gro-plano': GroActionPlanScreen,
  'gro-indicadores': GroIndicatorsScreen,
  'gro-historico': GroHistoryScreen,
  'gro-relatorios': GroReportsScreen,
  'pgr-dashboard': PgrDashboardScreen,
  'pgr-versoes': PgrVersionsScreen,
  'pgr-detalhe': PgrVersionDetailScreen,
  'pgr-historico': PgrHistoryScreen,
  'aet-dashboard': AetDashboardScreen,
  'aet-workflow': AetWorkflowScreen,
  'aet-detalhe': AetDetalheScreen,
  'aet-cadastros': AetCadastrosScreen,
  'aet-relatorio': AetRelatorioScreen,
  'sst-dashboard': SstDashboardScreen,
  'sst-apr': SstAprScreen,
  'sst-epi-epc': SstEpiEpcScreen,
  'sst-inspecoes': SstInspecoesScreen,
  'sst-auditorias': SstAuditoriasScreen,
  'sst-nc-capa': SstNcCapaScreen,
  'sst-treinamentos': SstTreinamentosScreen,
  'sst-relatorios': SstRelatoriosScreen,
  'esocial-dashboard': EsocialDashboardScreen,
  'esocial-s2210': EsocialS2210Screen,
  'esocial-s2220': EsocialS2220Screen,
  'esocial-s2240': EsocialS2240Screen,
  'esocial-historico': EsocialHistoricoScreen,
  'esocial-config': EsocialConfigScreen,
  'compliance-dashboard': ComplianceDashboardScreen,
  'compliance-normas': ComplianceNormasScreen,
  'compliance-alertas': ComplianceAlertasScreen,
  'compliance-validacao': ComplianceValidacaoScreen,
  'compliance-relatorios': ComplianceRelatoriosScreen,
  'compliance-fontes': ComplianceFontesScreen,
  'compliance-adequacao': ComplianceAdequacaoScreen,
};

const SCREEN_CLASSES: Partial<Record<ScreenId, string>> = {
  splash: 'screen-splash',
  login: 'screen-login',
  'request-access': 'screen-login',
  'request-access-autonomo': 'screen-login',
  'activate-account': 'screen-login',
  'admin-tenant-requests': 'screen-global-admin',
  'admin-tenant-request-detail': 'screen-global-admin',
  'admin-tenants-active': 'screen-global-admin',
  'admin-tenants-blocked': 'screen-global-admin',
  'admin-tenants-expired': 'screen-global-admin',
  'admin-access-control': 'screen-global-admin',
  'register-company': 'screen-login screen-admin-form',
  'global-admin': 'screen-global-admin',
  camera: 'screen-camera',
};

function ScreenRouter() {
  const { screen } = useApp();

  return (
    <>
      {(Object.entries(SCREENS) as [ScreenId, React.ComponentType][]).map(([id, Comp]) => (
        <div
          key={id}
          className={`screen ${screen === id ? 'active' : ''} ${SCREEN_CLASSES[id] ?? ''}`.trim()}
          id={`s-${id}`}
        >
          {screen === id && (
            <Suspense fallback={<div className="screen-loading" style={{ padding: 24, textAlign: 'center', color: 'var(--t2)' }}>Carregando…</div>}>
              <Comp />
            </Suspense>
          )}
        </div>
      ))}
    </>
  );
}

export default function App() {
  const { screen, isGlobalAdmin, globalSupportMode, screenInstant, go } = useApp();
  const hideStatusBar =
    screen === 'camera' ||
    screen === 'login' ||
    screen === 'request-access' ||
    screen === 'request-access-autonomo' ||
    screen === 'activate-account' ||
    screen === 'register-company' ||
    screen === 'global-admin' ||
    screen === 'admin-access-control' ||
    screen.startsWith('admin-tenant') ||
    screen === 'splash' ||
    globalSupportMode;
  useHaptic();

  useEffect(() => {
    if (window.location.pathname.match(/^\/activate-account\/?$/i)) {
      go('activate-account', { instant: true });
    }
    if (window.location.pathname.match(/^\/request-access\/?$/i)) {
      go('request-access', { instant: true });
    }
    if (window.location.pathname.match(/^\/request-access-autonomo\/?$/i)) {
      go('request-access-autonomo', { instant: true });
    }
  }, [go]);

  useEffect(() => {
    const root = document.getElementById('root');
    const adminDesktop =
      screen === 'global-admin' ||
      screen.startsWith('admin-tenant') ||
      screen.startsWith('admin-tenants') ||
      screen === 'admin-access-control' ||
      (screen === 'register-company' && isGlobalAdmin);
    root?.classList.toggle('admin-desktop', adminDesktop);
    root?.classList.toggle('support-mode-active', globalSupportMode);
    root?.classList.toggle('screen-instant', screenInstant);
    return () => {
      root?.classList.remove('admin-desktop');
      root?.classList.remove('support-mode-active');
      root?.classList.remove('screen-instant');
    };
  }, [screen, isGlobalAdmin, globalSupportMode, screenInstant]);

  return (
    <>
      <Toast />
      <Modal />
      <MenuDrawer />
      {!hideStatusBar && <StatusBar />}
      {globalSupportMode && <SupportModeBar />}
      <AppChrome screen={screen} />
      <SupportModeCameraExit />
      <main className="app-main">
        <ScreenRouter />
      </main>
      {!hideStatusBar && <PwaInstallBanner />}
      <PwaInstallGuide />
    </>
  );
}
