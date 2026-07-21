/** Telas navegáveis via menu drawer (ergonomista autenticado) */

export const DRAWER_SCREEN_IDS = [

  'dashboard',

  'new-analysis',

  'collabs',

  'org-structure',

  'sectors',

  'history',

  'reports',

  'v2-dashboard',

  'v2-methods',

  'sync',

  'v2-environmental',

  'v2-video',

  'v2-audit',

  'v2-roadmap',

  'psicossocial-dashboard',

  'psicossocial-fatores',

  'psicossocial-questionarios',

  'psicossocial-matriz',

  'psicossocial-plano',

  'psicossocial-conformidade',

  'psicossocial-ia',

  'denuncia-dashboard',

  'denuncia-nova',

  'denuncia-lista',

  'criterios-dashboard',

  'criterios-config',

  'criterios-historico',

  'criterios-documentacao',

  'inventario-dashboard',

  'inventario-lista',

  'inventario-matriz',

  'gro-dashboard',

  'gro-workflow',

  'gro-plano',

  'gro-indicadores',

  'gro-historico',

  'gro-relatorios',

  'pgr-dashboard',

  'pgr-versoes',

  'pgr-historico',

  'aet-dashboard',

  'aet-workflow',

  'aet-cadastros',

  'aet-relatorio',

  'sst-dashboard',

  'sst-apr',

  'sst-epi-epc',

  'sst-inspecoes',

  'sst-auditorias',

  'sst-nc-capa',

  'sst-treinamentos',

  'sst-relatorios',

  'esocial-dashboard',

  'esocial-s2210',

  'esocial-s2220',

  'esocial-s2240',

  'esocial-historico',

  'esocial-config',

  'compliance-dashboard',

  'compliance-normas',

  'compliance-alertas',

  'compliance-validacao',

  'compliance-relatorios',

  'compliance-fontes',

  'compliance-adequacao',

  'settings',

] as const;



/** Telas testadas com login ergonomista (drawer primeiro, fluxos especiais no fim) */

export const ERGONOMISTA_SCREEN_IDS = [

  ...DRAWER_SCREEN_IDS,

  'support-access',

  'company',

  'new-collab',

  'inventario-form',

  'denuncia-detalhe',

  'pgr-detalhe',

  'aet-detalhe',

  'result',

  'camera',

] as const;



/** Onboarding / admin empresas (login admin global) */

export const ONBOARDING_ADMIN_SCREEN_IDS = [

  'admin-tenant-requests',

  'admin-tenant-request-detail',

  'admin-tenants-active',

  'admin-tenants-blocked',

  'admin-tenants-expired',

  'admin-access-control',

] as const;



/** Fluxos públicos de onboarding */

export const ONBOARDING_PUBLIC_SCREEN_IDS = [

  'request-access',

  'request-access-autonomo',

  'activate-account',

] as const;



/** Todas as telas registradas em ScreenId / App.tsx */

export const ALL_SCREEN_IDS = [

  'splash',

  'login',

  'request-access',

  'request-access-autonomo',

  'register-company',

  'global-admin',

  'support-access',

  'company',

  ...DRAWER_SCREEN_IDS,

  'new-collab',

  'camera',

  'result',

  'inventario-form',

  'denuncia-detalhe',

  'pgr-detalhe',

  'aet-detalhe',

  ...ONBOARDING_PUBLIC_SCREEN_IDS,

  ...ONBOARDING_ADMIN_SCREEN_IDS,

] as const;



export type AllScreenId = (typeof ALL_SCREEN_IDS)[number];


