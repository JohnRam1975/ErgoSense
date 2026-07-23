import type { Company, Collaborator, Analysis, Report, AppSettings } from '../types';

export const COMPANIES: Company[] = [];

/** Placeholder sem identidade demo — usado só até a API carregar o tenant. */
export const EMPTY_COMPANY: Company = {
  id: '',
  name: '—',
  industry: '',
  icon: '🏢',
  color: 'neutral',
};

export const DEFAULT_COLLABORATORS: Collaborator[] = [];

export const DEFAULT_ANALYSES: Analysis[] = [];

export const DEFAULT_REPORTS: Report[] = [];

export const REPORT_PERIOD_OPTIONS = [
  { id: '7', label: 'Últimos 7 dias', days: 7 },
  { id: '30', label: 'Últimos 30 dias', days: 30 },
  { id: '90', label: 'Últimos 90 dias', days: 90 },
  { id: 'all', label: 'Todo o histórico', days: null },
] as const;

export const DEFAULT_SETTINGS: AppSettings = {
  captureQuality: 'HD 1080p',
  aiEngine: 'Análise completa (dispositivo + servidor)',
  skeletonOverlay: true,
  soundAlerts: true,
  autoSync: true,
  wifiOnly: false,
};

export const CAPTURE_QUALITY_OPTIONS = [
  { id: 'HD 1080p', label: 'HD 1080p', sub: 'Máxima nitidez para relatórios NR-17' },
  { id: 'HD 720p', label: 'HD 720p', sub: 'Equilíbrio entre qualidade e performance' },
  { id: 'SD 480p', label: 'SD 480p', sub: 'Economia de bateria e dados móveis' },
] as const;

export const AI_ENGINE_OPTIONS = [
  { id: 'complete', label: 'Análise completa (dispositivo + servidor)', sub: 'Modo padrão com MediaPipe local', mode: 'complete' as const },
  { id: 'local', label: 'Somente offline (dispositivo)', sub: 'Análise 100% no dispositivo', mode: 'offline' as const },
] as const;

export const SECTORS = [
  'Beneficiamento',
  'Manutenção',
  'Logística',
  'Elétrica',
  'Soldagem',
  'Construção Civil',
  'Montagem Eletromecânica',
  'Administrativo',
  'Transporte / Frota',
  'Produção Industrial',
];
export type { ActivityContext } from './activityProfiles';
export { ACTIVITY_PROFILES, activitiesForContext } from './activityProfiles';

export const TURNOS = ['Manhã 06h–14h', 'Tarde 14h–22h', 'Noite 22h–06h'];

/** Colaborador implícito para avaliação própria (autônomo / sem equipe) */
export const SELF_COLLABORATOR_MATRICULA = 'ESP-SELF';

export const FULLSCREEN_SCREENS = [
  'splash',
  'login',
  'request-access',
  'request-access-autonomo',
  'activate-account',
  'reset-password',
  'register-company',
  'global-admin',
  'admin-tenant-requests',
  'admin-tenant-request-detail',
  'admin-tenants-active',
  'admin-tenants-blocked',
  'admin-tenants-expired',
  'admin-access-control',
  'admin-tenant-detail',
  'company',
  'camera',
];

export const MAIN_TAB_SCREENS = ['dashboard', 'history', 'collabs', 'reports'] as const;

export const BNAV_MAP: Record<string, string> = {
  dashboard: 'bn-dashboard',
  history: 'bn-history',
  result: 'bn-history',
  collabs: 'bn-collabs',
  'new-collab': 'bn-collabs',
  reports: 'bn-reports',
  settings: 'bn-menu',
  sync: 'bn-menu',
  sectors: 'bn-menu',
  'new-analysis': 'bn-menu',
  'psicossocial-dashboard': 'bn-menu',
  'psicossocial-fatores': 'bn-menu',
  'psicossocial-questionarios': 'bn-menu',
  'psicossocial-matriz': 'bn-menu',
  'psicossocial-plano': 'bn-menu',
  'psicossocial-conformidade': 'bn-menu',
  'psicossocial-ia': 'bn-menu',
  'denuncia-dashboard': 'bn-menu',
  'denuncia-lista': 'bn-menu',
  'denuncia-nova': 'bn-menu',
  'denuncia-detalhe': 'bn-menu',
  'criterios-dashboard': 'bn-menu',
  'criterios-config': 'bn-menu',
  'criterios-historico': 'bn-menu',
  'criterios-documentacao': 'bn-menu',
  'inventario-dashboard': 'bn-menu',
  'inventario-lista': 'bn-menu',
  'inventario-form': 'bn-menu',
  'inventario-matriz': 'bn-menu',
  'gro-dashboard': 'bn-menu',
  'gro-workflow': 'bn-menu',
  'gro-plano': 'bn-menu',
  'gro-indicadores': 'bn-menu',
  'gro-historico': 'bn-menu',
  'gro-relatorios': 'bn-menu',
  'pgr-dashboard': 'bn-menu',
  'pgr-versoes': 'bn-menu',
  'pgr-detalhe': 'bn-menu',
  'pgr-historico': 'bn-menu',
  'aet-dashboard': 'bn-menu',
  'aet-workflow': 'bn-menu',
  'aet-detalhe': 'bn-menu',
  'aet-cadastros': 'bn-menu',
  'aet-relatorio': 'bn-menu',
  'sst-dashboard': 'bn-menu',
  'sst-apr': 'bn-menu',
  'sst-epi-epc': 'bn-menu',
  'sst-inspecoes': 'bn-menu',
  'sst-auditorias': 'bn-menu',
  'sst-nc-capa': 'bn-menu',
  'sst-treinamentos': 'bn-menu',
  'sst-relatorios': 'bn-menu',
  'esocial-dashboard': 'bn-menu',
  'esocial-s2210': 'bn-menu',
  'esocial-s2220': 'bn-menu',
  'esocial-s2240': 'bn-menu',
  'esocial-historico': 'bn-menu',
  'esocial-config': 'bn-menu',
  'compliance-dashboard': 'bn-menu',
  'compliance-normas': 'bn-menu',
  'compliance-alertas': 'bn-menu',
  'compliance-validacao': 'bn-menu',
  'compliance-relatorios': 'bn-menu',
  'compliance-fontes': 'bn-menu',
  'compliance-adequacao': 'bn-menu',
  'org-structure': 'bn-menu',
};

export const DRAWER_MAP: Record<string, string> = {
  dashboard: 'dashboard',
  collabs: 'collabs',
  sectors: 'sectors',
  'new-analysis': 'new-analysis',
  history: 'history',
  reports: 'reports',
  sync: 'sync',
  settings: 'settings',
  'v2-dashboard': 'v2-dashboard',
  'v2-methods': 'v2-methods',
  'v2-video': 'v2-video',
  'v2-environmental': 'v2-environmental',
  'v2-roadmap': 'v2-roadmap',
  'v2-audit': 'v2-audit',
  'psicossocial-dashboard': 'psicossocial-dashboard',
  'psicossocial-fatores': 'psicossocial-fatores',
  'psicossocial-questionarios': 'psicossocial-questionarios',
  'psicossocial-matriz': 'psicossocial-matriz',
  'psicossocial-plano': 'psicossocial-plano',
  'psicossocial-conformidade': 'psicossocial-conformidade',
  'psicossocial-ia': 'psicossocial-ia',
  'denuncia-dashboard': 'denuncia-dashboard',
  'denuncia-lista': 'denuncia-lista',
  'denuncia-nova': 'denuncia-nova',
  'denuncia-detalhe': 'denuncia-detalhe',
  'criterios-dashboard': 'criterios-dashboard',
  'criterios-config': 'criterios-config',
  'criterios-historico': 'criterios-historico',
  'criterios-documentacao': 'criterios-documentacao',
  'inventario-dashboard': 'inventario-dashboard',
  'inventario-lista': 'inventario-lista',
  'inventario-form': 'inventario-form',
  'inventario-matriz': 'inventario-matriz',
  'gro-dashboard': 'gro-dashboard',
  'gro-workflow': 'gro-workflow',
  'gro-plano': 'gro-plano',
  'gro-indicadores': 'gro-indicadores',
  'gro-historico': 'gro-historico',
  'gro-relatorios': 'gro-relatorios',
  'pgr-dashboard': 'pgr-dashboard',
  'pgr-versoes': 'pgr-versoes',
  'pgr-detalhe': 'pgr-versoes',
  'pgr-historico': 'pgr-historico',
  'aet-dashboard': 'aet-dashboard',
  'aet-workflow': 'aet-workflow',
  'aet-detalhe': 'aet-workflow',
  'aet-cadastros': 'aet-cadastros',
  'aet-relatorio': 'aet-relatorio',
  'sst-dashboard': 'sst-dashboard',
  'sst-apr': 'sst-apr',
  'sst-epi-epc': 'sst-epi-epc',
  'sst-inspecoes': 'sst-inspecoes',
  'sst-auditorias': 'sst-auditorias',
  'sst-nc-capa': 'sst-nc-capa',
  'sst-treinamentos': 'sst-treinamentos',
  'sst-relatorios': 'sst-relatorios',
  'esocial-dashboard': 'esocial-dashboard',
  'esocial-s2210': 'esocial-s2210',
  'esocial-s2220': 'esocial-s2220',
  'esocial-s2240': 'esocial-s2240',
  'esocial-historico': 'esocial-historico',
  'esocial-config': 'esocial-config',
  'compliance-dashboard': 'compliance-dashboard',
  'compliance-normas': 'compliance-normas',
  'compliance-alertas': 'compliance-alertas',
  'compliance-validacao': 'compliance-validacao',
  'compliance-relatorios': 'compliance-relatorios',
  'compliance-fontes': 'compliance-fontes',
  'compliance-adequacao': 'compliance-adequacao',
  'org-structure': 'org-structure',
};
