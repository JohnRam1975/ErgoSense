import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

const mockGo = vi.fn();
const mockUseApp = vi.fn();

vi.mock('../components/UI', () => ({
  Toast: () => null,
  Modal: () => null,
  StatusBar: () => null,
}));

vi.mock('../context/AppContext', () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../hooks/useHaptic', () => ({ useHaptic: () => {} }));

vi.mock('../components/Navigation', () => ({
  AppChrome: () => <div data-testid="chrome" />,
  MenuDrawer: () => null,
}));

vi.mock('../components/SupportModeBar', () => ({
  SupportModeBar: () => <div data-testid="support-bar" />,
  SupportModeCameraExit: () => null,
}));

vi.mock('../screens/MainScreens', () => ({
  SplashScreen: () => <div>Splash</div>,
  LoginScreen: () => <div>Login</div>,
  RegisterCompanyScreen: () => null,
  CompanyScreen: () => null,
  DashboardScreen: () => <div>Dashboard</div>,
  CollabsScreen: () => null,
}));

vi.mock('../screens/lazyScreens', () => ({
  NewCollabScreen: () => null,
  NewAnalysisScreen: () => null,
  CameraScreen: () => null,
  ResultScreen: () => null,
  V2AuditScreen: () => null,
  V2EnvironmentalScreen: () => null,
  V2ExecutiveDashboardScreen: () => null,
  V2MethodsScreen: () => null,
  V2RoadmapScreen: () => null,
  V2VideoAnalysisScreen: () => null,
  PsicossocialDashboardScreen: () => null,
  PsicossocialFatoresScreen: () => null,
  PsicossocialQuestionariosScreen: () => null,
  PsicossocialMatrizScreen: () => null,
  PsicossocialPlanoScreen: () => null,
  PsicossocialConformidadeScreen: () => null,
  PsicossocialIaScreen: () => null,
  ComplianceDashboardScreen: () => null,
  ComplianceNormasScreen: () => null,
  ComplianceAlertasScreen: () => null,
  ComplianceValidacaoScreen: () => null,
  ComplianceRelatoriosScreen: () => null,
  ComplianceFontesScreen: () => null,
  ComplianceAdequacaoScreen: () => null,
  EsocialDashboardScreen: () => null,
  EsocialS2210Screen: () => null,
  EsocialS2220Screen: () => null,
  EsocialS2240Screen: () => null,
  EsocialHistoricoScreen: () => null,
  EsocialConfigScreen: () => null,
  AetDashboardScreen: () => null,
  AetWorkflowScreen: () => null,
  AetDetalheScreen: () => null,
  AetCadastrosScreen: () => null,
  AetRelatorioScreen: () => null,
}));

vi.mock('../screens/OrgScreens', () => ({ OrgStructureScreen: () => null, SectorsOrgScreen: () => null }));
vi.mock('../screens/UtilityScreens', () => ({
  HistoryScreen: () => null,
  ReportsScreen: () => null,
  SettingsScreen: () => null,
  SyncScreen: () => null,
}));
vi.mock('../screens/DenunciaScreens', () => ({
  DenunciaDashboardScreen: () => null,
  DenunciaDetailScreen: () => null,
  DenunciaFormScreen: () => null,
  DenunciaListScreen: () => null,
}));
vi.mock('../screens/RiskCriteriaScreens', () => ({
  CriteriaConfigScreen: () => null,
  CriteriaDashboardScreen: () => null,
  CriteriaDocumentacaoScreen: () => null,
  CriteriaHistoricoScreen: () => null,
}));
vi.mock('../screens/RiskInventoryScreens', () => ({
  RiskInventoryDashboardScreen: () => null,
  RiskInventoryFormScreen: () => null,
  RiskInventoryListScreen: () => null,
  RiskInventoryMatrixScreen: () => null,
}));
vi.mock('../screens/GroScreens', () => ({
  GroDashboardScreen: () => null,
  GroWorkflowScreen: () => null,
  GroActionPlanScreen: () => null,
  GroIndicatorsScreen: () => null,
  GroHistoryScreen: () => null,
  GroReportsScreen: () => null,
}));
vi.mock('../screens/PgrScreens', () => ({
  PgrDashboardScreen: () => null,
  PgrVersionsScreen: () => null,
  PgrVersionDetailScreen: () => null,
  PgrHistoryScreen: () => null,
}));
vi.mock('../screens/SstScreens', () => ({
  SstDashboardScreen: () => null,
  SstAprScreen: () => null,
  SstEpiEpcScreen: () => null,
  SstInspecoesScreen: () => null,
  SstAuditoriasScreen: () => null,
  SstNcCapaScreen: () => null,
  SstTreinamentosScreen: () => null,
  SstRelatoriosScreen: () => null,
}));
vi.mock('../screens/TenantOnboardingScreens', () => ({
  TenantRequestAccessScreen: () => null,
  EmployeeAccessRequestScreen: () => null,
  ActivateAccountScreen: () => null,
  AdminTenantRequestsScreen: () => null,
  AdminTenantRequestDetailScreen: () => null,
  AdminTenantsListScreen: () => null,
}));
vi.mock('../screens/AdminScreens', () => ({ GlobalAdminScreen: () => null }));
vi.mock('../screens/SupportScreens', () => ({ SupportAccessScreen: () => null }));

describe('App — roteamento e guards de UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.getElementById('root')?.classList.remove('admin-desktop', 'support-mode-active');
    mockUseApp.mockReturnValue({
      screen: 'dashboard',
      isGlobalAdmin: false,
      globalSupportMode: false,
      screenInstant: false,
      go: mockGo,
    });
  });

  it('renderiza tela ativa dashboard', () => {
    render(<App />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('modo suporte exibe SupportModeBar', () => {
    mockUseApp.mockReturnValue({
      screen: 'dashboard',
      isGlobalAdmin: false,
      globalSupportMode: true,
      screenInstant: false,
      go: mockGo,
    });
    render(<App />);
    expect(screen.getByTestId('support-bar')).toBeInTheDocument();
  });

  it('redireciona /activate-account via go', () => {
    window.history.pushState({}, '', '/activate-account');
    render(<App />);
    expect(mockGo).toHaveBeenCalledWith('activate-account', { instant: true });
  });
});
