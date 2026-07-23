# Inventário de Endpoints — ErgoSense

Gerado em: 2026-07-23T16:48:38.572Z

| Métrica | Valor |
|---------|------:|
| Rotas registradas | 258 |
| Operações OpenAPI | 258 |
| Públicas | 16 |
| Protegidas (Bearer) | 242 |
| Admin global | 15 |
| Sem documentação OpenAPI | 0 |
| OpenAPI órfão (sem rota) | 0 |

## Por tag

| Tag | Endpoints |
|-----|----------:|
| AET | 34 |
| SST | 25 |
| Compliance | 21 |
| Psicossocial | 21 |
| IA Expert | 19 |
| eSocial | 17 |
| GRO | 17 |
| Admin | 15 |
| Autenticação | 15 |
| Denúncias | 12 |
| PGR | 12 |
| Organização | 11 |
| risk-criteria | 10 |
| Core | 8 |
| risk-inventory | 8 |
| Público | 4 |
| sectors | 2 |
| tenants | 2 |
| access-requests | 1 |
| Sistema | 1 |
| openapi.json | 1 |
| reports | 1 |
| system | 1 |

## Rotas (258)

| Método | Rota | Auth | Tag | Arquivo |
|--------|------|------|-----|--------|
| POST | `/api/access-requests` | public | access-requests | routes/coreRoutes.js |
| GET | `/api/admin/tenant-requests` | bearer | Admin | routes/tenantOnboardingRoutes.js |
| GET | `/api/admin/tenant-requests/:id` | bearer | Admin | routes/tenantOnboardingRoutes.js |
| POST | `/api/admin/tenant-requests/:id/approve` | bearer | Admin | routes/tenantOnboardingRoutes.js |
| POST | `/api/admin/tenant-requests/:id/block` | bearer | Admin | routes/tenantOnboardingRoutes.js |
| POST | `/api/admin/tenant-requests/:id/reject` | bearer | Admin | routes/tenantOnboardingRoutes.js |
| POST | `/api/admin/tenant-requests/:id/request-adjustment` | bearer | Admin | routes/tenantOnboardingRoutes.js |
| GET | `/api/admin/tenants` | bearer | Admin | routes/tenantOnboardingRoutes.js |
| GET | `/api/admin/tenants/:id` | bearer | Admin | routes/tenantOnboardingRoutes.js |
| PUT | `/api/admin/tenants/:id` | bearer | Admin | routes/tenantOnboardingRoutes.js |
| POST | `/api/admin/tenants/:id/block` | bearer | Admin | routes/tenantOnboardingRoutes.js |
| POST | `/api/admin/tenants/:id/deactivate` | bearer | Admin | routes/tenantOnboardingRoutes.js |
| POST | `/api/admin/tenants/:id/grant-access` | bearer | Admin | routes/tenantOnboardingRoutes.js |
| POST | `/api/admin/tenants/:id/reactivate` | bearer | Admin | routes/tenantOnboardingRoutes.js |
| POST | `/api/admin/tenants/:id/suspend` | bearer | Admin | routes/tenantOnboardingRoutes.js |
| GET | `/api/admin/tenants/metadata` | bearer | Admin | routes/tenantOnboardingRoutes.js |
| GET | `/api/aet/dashboard` | bearer | AET | routes/aetRoutes.js |
| GET | `/api/aet/equipamentos` | bearer | AET | routes/aetRoutes.js |
| POST | `/api/aet/equipamentos` | bearer | AET | routes/aetRoutes.js |
| DELETE | `/api/aet/equipamentos/:id` | bearer | AET | routes/aetRoutes.js |
| PUT | `/api/aet/equipamentos/:id` | bearer | AET | routes/aetRoutes.js |
| GET | `/api/aet/historico` | bearer | AET | routes/aetRoutes.js |
| GET | `/api/aet/mobiliario` | bearer | AET | routes/aetRoutes.js |
| POST | `/api/aet/mobiliario` | bearer | AET | routes/aetRoutes.js |
| DELETE | `/api/aet/mobiliario/:id` | bearer | AET | routes/aetRoutes.js |
| PUT | `/api/aet/mobiliario/:id` | bearer | AET | routes/aetRoutes.js |
| GET | `/api/aet/processos` | bearer | AET | routes/aetRoutes.js |
| POST | `/api/aet/processos` | bearer | AET | routes/aetRoutes.js |
| GET | `/api/aet/processos/:id` | bearer | AET | routes/aetRoutes.js |
| PUT | `/api/aet/processos/:id` | bearer | AET | routes/aetRoutes.js |
| POST | `/api/aet/processos/:id/advance` | bearer | AET | routes/aetRoutes.js |
| POST | `/api/aet/processos/:id/gerar-relatorio` | bearer | AET | routes/aetRoutes.js |
| GET | `/api/aet/processos/:id/integracoes` | bearer | AET | routes/aetRoutes.js |
| PUT | `/api/aet/processos/:id/metodos` | bearer | AET | routes/aetRoutes.js |
| PUT | `/api/aet/processos/:id/organizacao` | bearer | AET | routes/aetRoutes.js |
| PUT | `/api/aet/processos/:id/responsavel-tecnico` | bearer | AET | routes/aetRoutes.js |
| POST | `/api/aet/processos/:id/retreat` | bearer | AET | routes/aetRoutes.js |
| PUT | `/api/aet/processos/:id/teleatendimento` | bearer | AET | routes/aetRoutes.js |
| GET | `/api/aet/processos/:id/versoes` | bearer | AET | routes/aetRoutes.js |
| POST | `/api/aet/processos/:id/versoes` | bearer | AET | routes/aetRoutes.js |
| PUT | `/api/aet/processos/:id/vibracao-corpo` | bearer | AET | routes/aetRoutes.js |
| PUT | `/api/aet/processos/:id/vibracao-maos` | bearer | AET | routes/aetRoutes.js |
| GET | `/api/aet/versoes/:id` | bearer | AET | routes/aetRoutes.js |
| POST | `/api/aet/versoes/:id/approve` | bearer | AET | routes/aetRoutes.js |
| POST | `/api/aet/versoes/:id/atualizar-snapshot` | bearer | AET | routes/aetRoutes.js |
| POST | `/api/aet/versoes/:id/gerar-relatorio` | bearer | AET | routes/aetRoutes.js |
| POST | `/api/aet/versoes/:id/reject` | bearer | AET | routes/aetRoutes.js |
| POST | `/api/aet/versoes/:id/revision` | bearer | AET | routes/aetRoutes.js |
| POST | `/api/aet/versoes/:id/sign` | bearer | AET | routes/aetRoutes.js |
| POST | `/api/aet/versoes/:id/submit-approval` | bearer | AET | routes/aetRoutes.js |
| POST | `/api/ai/engine/queue/:jobType` | bearer | IA Expert | routes/aiExpertRoutes.js |
| POST | `/api/ai/engine/run` | bearer | IA Expert | routes/aiExpertRoutes.js |
| GET | `/api/ai/engine/specialists` | bearer | IA Expert | routes/aiExpertRoutes.js |
| POST | `/api/ai/expert/aet` | bearer | IA Expert | routes/aiExpertRoutes.js |
| POST | `/api/ai/expert/analyze-ergonomics` | bearer | IA Expert | routes/aiExpertRoutes.js |
| POST | `/api/ai/expert/control-measures` | bearer | IA Expert | routes/aiExpertRoutes.js |
| GET | `/api/ai/expert/history` | bearer | IA Expert | routes/aiExpertRoutes.js |
| POST | `/api/ai/expert/pgr` | bearer | IA Expert | routes/aiExpertRoutes.js |
| POST | `/api/ai/expert/psicossocial` | bearer | IA Expert | routes/aiExpertRoutes.js |
| POST | `/api/ai/expert/query` | bearer | IA Expert | routes/aiExpertRoutes.js |
| POST | `/api/ai/expert/recommendations` | bearer | IA Expert | routes/aiExpertRoutes.js |
| POST | `/api/ai/expert/reports/audit` | bearer | IA Expert | routes/aiExpertRoutes.js |
| POST | `/api/ai/expert/reports/compliance` | bearer | IA Expert | routes/aiExpertRoutes.js |
| POST | `/api/ai/expert/reports/executive` | bearer | IA Expert | routes/aiExpertRoutes.js |
| POST | `/api/ai/expert/reports/technical` | bearer | IA Expert | routes/aiExpertRoutes.js |
| POST | `/api/ai/expert/risk-analysis` | bearer | IA Expert | routes/aiExpertRoutes.js |
| POST | `/api/ai/expert/risk-inventory` | bearer | IA Expert | routes/aiExpertRoutes.js |
| POST | `/api/ai/expert/virtual-audit` | bearer | IA Expert | routes/aiExpertRoutes.js |
| POST | `/api/ai/expert/work-instruction` | bearer | IA Expert | routes/aiExpertRoutes.js |
| GET | `/api/analyses` | bearer | Core | routes/coreRoutes.js |
| POST | `/api/analyses` | bearer | Core | routes/coreRoutes.js |
| DELETE | `/api/analyses/:id` | bearer | Core | routes/coreRoutes.js |
| GET | `/api/analyses/:id/video` | bearer | Core | routes/coreRoutes.js |
| POST | `/api/auth/activate-account` | public | Autenticação | routes/tenantOnboardingRoutes.js |
| GET | `/api/auth/activate-account/preview` | public | Autenticação | routes/tenantOnboardingRoutes.js |
| POST | `/api/auth/forgot-password` | bearer | Autenticação | routes/authRoutes.js |
| POST | `/api/auth/login` | public | Autenticação | routes/authRoutes.js |
| POST | `/api/auth/logout` | bearer | Autenticação | routes/authRoutes.js |
| GET | `/api/auth/me` | bearer | Autenticação | routes/authRoutes.js |
| POST | `/api/auth/mfa/disable` | bearer | Autenticação | routes/mfaRoutes.js |
| POST | `/api/auth/mfa/enable` | bearer | Autenticação | routes/mfaRoutes.js |
| POST | `/api/auth/mfa/setup` | bearer | Autenticação | routes/mfaRoutes.js |
| GET | `/api/auth/mfa/status` | bearer | Autenticação | routes/mfaRoutes.js |
| POST | `/api/auth/mfa/verify` | public | Autenticação | routes/mfaRoutes.js |
| PUT | `/api/auth/profile` | bearer | Autenticação | routes/authRoutes.js |
| POST | `/api/auth/refresh` | public | Autenticação | routes/authRoutes.js |
| POST | `/api/auth/reset-password` | bearer | Autenticação | routes/authRoutes.js |
| GET | `/api/auth/reset-password/preview` | bearer | Autenticação | routes/authRoutes.js |
| GET | `/api/collaborators` | bearer | Core | routes/coreRoutes.js |
| POST | `/api/collaborators` | bearer | Core | routes/coreRoutes.js |
| DELETE | `/api/collaborators/:id` | bearer | Core | routes/coreRoutes.js |
| PUT | `/api/collaborators/:id` | bearer | Core | routes/coreRoutes.js |
| GET | `/api/compliance/agendamento` | bearer | Compliance | routes/complianceRoutes.js |
| PUT | `/api/compliance/agendamento` | bearer | Compliance | routes/complianceRoutes.js |
| GET | `/api/compliance/alertas` | bearer | Compliance | routes/complianceRoutes.js |
| PUT | `/api/compliance/alertas/:id/lida` | bearer | Compliance | routes/complianceRoutes.js |
| GET | `/api/compliance/dashboard` | bearer | Compliance | routes/complianceRoutes.js |
| GET | `/api/compliance/deteccoes` | bearer | Compliance | routes/complianceRoutes.js |
| GET | `/api/compliance/deteccoes/:id/impactos` | bearer | Compliance | routes/complianceRoutes.js |
| POST | `/api/compliance/deteccoes/:id/validar` | bearer | Compliance | routes/complianceRoutes.js |
| GET | `/api/compliance/fontes` | bearer | Compliance | routes/complianceRoutes.js |
| PUT | `/api/compliance/fontes/:code` | bearer | Compliance | routes/complianceRoutes.js |
| GET | `/api/compliance/historico` | bearer | Compliance | routes/complianceRoutes.js |
| GET | `/api/compliance/normas` | bearer | Compliance | routes/complianceRoutes.js |
| GET | `/api/compliance/normas/:id/versoes` | bearer | Compliance | routes/complianceRoutes.js |
| GET | `/api/compliance/normas/:id/versoes/compare` | bearer | Compliance | routes/complianceRoutes.js |
| GET | `/api/compliance/relatorios` | bearer | Compliance | routes/complianceRoutes.js |
| POST | `/api/compliance/relatorios/gerar` | bearer | Compliance | routes/complianceRoutes.js |
| POST | `/api/compliance/scan` | bearer | Compliance | routes/complianceRoutes.js |
| GET | `/api/compliance/tarefas` | bearer | Compliance | routes/complianceRoutes.js |
| PUT | `/api/compliance/tarefas/:id` | bearer | Compliance | routes/complianceRoutes.js |
| GET | `/api/compliance/validacoes` | bearer | Compliance | routes/complianceRoutes.js |
| GET | `/api/compliance/varreduras` | bearer | Compliance | routes/complianceRoutes.js |
| GET | `/api/denuncias` | bearer | Denúncias | routes/denunciaRoutes.js |
| POST | `/api/denuncias` | bearer | Denúncias | routes/denunciaRoutes.js |
| GET | `/api/denuncias/:id` | bearer | Denúncias | routes/denunciaRoutes.js |
| PATCH | `/api/denuncias/:id/conclusao` | bearer | Denúncias | routes/denunciaRoutes.js |
| POST | `/api/denuncias/:id/evidencias` | bearer | Denúncias | routes/denunciaRoutes.js |
| POST | `/api/denuncias/:id/integrar` | bearer | Denúncias | routes/denunciaRoutes.js |
| PATCH | `/api/denuncias/:id/status` | bearer | Denúncias | routes/denunciaRoutes.js |
| POST | `/api/denuncias/:id/tratativas` | bearer | Denúncias | routes/denunciaRoutes.js |
| PATCH | `/api/denuncias/:id/tratativas/:tid` | bearer | Denúncias | routes/denunciaRoutes.js |
| GET | `/api/denuncias/dashboard` | bearer | Denúncias | routes/denunciaRoutes.js |
| POST | `/api/denuncias/public` | public | Denúncias | routes/denunciaRoutes.js |
| GET | `/api/denuncias/public/status` | public | Denúncias | routes/denunciaRoutes.js |
| GET | `/api/docs` | public | Sistema | routes/openapiRoutes.js |
| GET | `/api/esocial/config` | bearer | eSocial | routes/esocialRoutes.js |
| PUT | `/api/esocial/config` | bearer | eSocial | routes/esocialRoutes.js |
| GET | `/api/esocial/dashboard` | bearer | eSocial | routes/esocialRoutes.js |
| GET | `/api/esocial/eventos` | bearer | eSocial | routes/esocialRoutes.js |
| POST | `/api/esocial/eventos` | bearer | eSocial | routes/esocialRoutes.js |
| GET | `/api/esocial/eventos/:id` | bearer | eSocial | routes/esocialRoutes.js |
| PUT | `/api/esocial/eventos/:id` | bearer | eSocial | routes/esocialRoutes.js |
| POST | `/api/esocial/eventos/:id/assinar` | bearer | eSocial | routes/esocialRoutes.js |
| POST | `/api/esocial/eventos/:id/consultar-status` | bearer | eSocial | routes/esocialRoutes.js |
| POST | `/api/esocial/eventos/:id/enviar` | bearer | eSocial | routes/esocialRoutes.js |
| POST | `/api/esocial/eventos/:id/preparar-envio` | bearer | eSocial | routes/esocialRoutes.js |
| POST | `/api/esocial/eventos/:id/reenviar` | bearer | eSocial | routes/esocialRoutes.js |
| GET | `/api/esocial/eventos/:id/transmissoes` | bearer | eSocial | routes/esocialRoutes.js |
| GET | `/api/esocial/eventos/:id/validacoes` | bearer | eSocial | routes/esocialRoutes.js |
| POST | `/api/esocial/eventos/:id/validar` | bearer | eSocial | routes/esocialRoutes.js |
| GET | `/api/esocial/eventos/:id/xml` | bearer | eSocial | routes/esocialRoutes.js |
| GET | `/api/esocial/historico` | bearer | eSocial | routes/esocialRoutes.js |
| GET | `/api/gro/action-plans` | bearer | GRO | routes/groRoutes.js |
| POST | `/api/gro/action-plans` | bearer | GRO | routes/groRoutes.js |
| DELETE | `/api/gro/action-plans/:id` | bearer | GRO | routes/groRoutes.js |
| PUT | `/api/gro/action-plans/:id` | bearer | GRO | routes/groRoutes.js |
| GET | `/api/gro/dashboard` | bearer | GRO | routes/groRoutes.js |
| GET | `/api/gro/history` | bearer | GRO | routes/groRoutes.js |
| GET | `/api/gro/indicators` | bearer | GRO | routes/groRoutes.js |
| POST | `/api/gro/indicators` | bearer | GRO | routes/groRoutes.js |
| DELETE | `/api/gro/indicators/:id` | bearer | GRO | routes/groRoutes.js |
| PUT | `/api/gro/indicators/:id` | bearer | GRO | routes/groRoutes.js |
| GET | `/api/gro/reports` | bearer | GRO | routes/groRoutes.js |
| GET | `/api/gro/reports/:id` | bearer | GRO | routes/groRoutes.js |
| POST | `/api/gro/reports/generate` | bearer | GRO | routes/groRoutes.js |
| GET | `/api/gro/workflow` | bearer | GRO | routes/groRoutes.js |
| POST | `/api/gro/workflow/:riskId/advance` | bearer | GRO | routes/groRoutes.js |
| POST | `/api/gro/workflow/:riskId/complete-review` | bearer | GRO | routes/groRoutes.js |
| POST | `/api/gro/workflow/:riskId/revert` | bearer | GRO | routes/groRoutes.js |
| GET | `/api/openapi.json` | public | openapi.json | routes/openapiRoutes.js |
| GET | `/api/org/empresa` | bearer | Organização | routes/orgRoutes.js |
| PUT | `/api/org/empresa` | bearer | Organização | routes/orgRoutes.js |
| GET | `/api/org/setores` | bearer | Organização | routes/orgRoutes.js |
| POST | `/api/org/setores` | bearer | Organização | routes/orgRoutes.js |
| DELETE | `/api/org/setores/:id` | bearer | Organização | routes/orgRoutes.js |
| PUT | `/api/org/setores/:id` | bearer | Organização | routes/orgRoutes.js |
| GET | `/api/org/tree` | bearer | Organização | routes/orgRoutes.js |
| GET | `/api/org/unidades` | bearer | Organização | routes/orgRoutes.js |
| POST | `/api/org/unidades` | bearer | Organização | routes/orgRoutes.js |
| DELETE | `/api/org/unidades/:id` | bearer | Organização | routes/orgRoutes.js |
| PUT | `/api/org/unidades/:id` | bearer | Organização | routes/orgRoutes.js |
| GET | `/api/pgr/history` | bearer | PGR | routes/pgrRoutes.js |
| GET | `/api/pgr/program` | bearer | PGR | routes/pgrRoutes.js |
| PUT | `/api/pgr/program` | bearer | PGR | routes/pgrRoutes.js |
| GET | `/api/pgr/versions` | bearer | PGR | routes/pgrRoutes.js |
| GET | `/api/pgr/versions/:id` | bearer | PGR | routes/pgrRoutes.js |
| PUT | `/api/pgr/versions/:id` | bearer | PGR | routes/pgrRoutes.js |
| POST | `/api/pgr/versions/:id/approve` | bearer | PGR | routes/pgrRoutes.js |
| POST | `/api/pgr/versions/:id/reject` | bearer | PGR | routes/pgrRoutes.js |
| POST | `/api/pgr/versions/:id/revision` | bearer | PGR | routes/pgrRoutes.js |
| POST | `/api/pgr/versions/:id/sign` | bearer | PGR | routes/pgrRoutes.js |
| POST | `/api/pgr/versions/:id/submit-approval` | bearer | PGR | routes/pgrRoutes.js |
| POST | `/api/pgr/versions/generate` | bearer | PGR | routes/pgrRoutes.js |
| GET | `/api/psico/alertas` | bearer | Psicossocial | routes/psicoRoutes.js |
| PATCH | `/api/psico/alertas/:id/read` | bearer | Psicossocial | routes/psicoRoutes.js |
| GET | `/api/psico/campanhas` | bearer | Psicossocial | routes/psicoRoutes.js |
| POST | `/api/psico/campanhas` | bearer | Psicossocial | routes/psicoRoutes.js |
| POST | `/api/psico/campanhas/:id/link` | bearer | Psicossocial | routes/psicoRoutes.js |
| GET | `/api/psico/conformidade` | bearer | Psicossocial | routes/psicoRoutes.js |
| GET | `/api/psico/dashboard` | bearer | Psicossocial | routes/psicoRoutes.js |
| GET | `/api/psico/fatores` | bearer | Psicossocial | routes/psicoRoutes.js |
| PUT | `/api/psico/fatores/:codigo` | bearer | Psicossocial | routes/psicoRoutes.js |
| GET | `/api/psico/historico` | bearer | Psicossocial | routes/psicoRoutes.js |
| GET | `/api/psico/indicadores` | bearer | Psicossocial | routes/psicoRoutes.js |
| GET | `/api/psico/lgpd` | bearer | Psicossocial | routes/psicoRoutes.js |
| GET | `/api/psico/matriz` | bearer | Psicossocial | routes/psicoRoutes.js |
| GET | `/api/psico/plano-acao` | bearer | Psicossocial | routes/psicoRoutes.js |
| POST | `/api/psico/plano-acao` | bearer | Psicossocial | routes/psicoRoutes.js |
| DELETE | `/api/psico/plano-acao/:id` | bearer | Psicossocial | routes/psicoRoutes.js |
| PUT | `/api/psico/plano-acao/:id` | bearer | Psicossocial | routes/psicoRoutes.js |
| GET | `/api/psico/public/form/:token` | public | Psicossocial | routes/psicoRoutes.js |
| POST | `/api/psico/public/form/:token/respostas` | public | Psicossocial | routes/psicoRoutes.js |
| POST | `/api/psico/respostas` | bearer | Psicossocial | routes/psicoRoutes.js |
| GET | `/api/psico/tendencias` | bearer | Psicossocial | routes/psicoRoutes.js |
| GET | `/api/public/plans` | public | Público | routes/tenantOnboardingRoutes.js |
| GET | `/api/public/support-contact` | public | Público | routes/coreRoutes.js |
| POST | `/api/public/support-contact` | public | Público | routes/coreRoutes.js |
| POST | `/api/public/tenant-request` | public | Público | routes/tenantOnboardingRoutes.js |
| GET | `/api/reports` | bearer | reports | routes/coreRoutes.js |
| GET | `/api/risk-criteria/active` | bearer | risk-criteria | routes/riskCriteriaRoutes.js |
| GET | `/api/risk-criteria/audit` | bearer | risk-criteria | routes/riskCriteriaRoutes.js |
| GET | `/api/risk-criteria/documentation` | bearer | risk-criteria | routes/riskCriteriaRoutes.js |
| POST | `/api/risk-criteria/evaluate` | bearer | risk-criteria | routes/riskCriteriaRoutes.js |
| GET | `/api/risk-criteria/methodologies` | bearer | risk-criteria | routes/riskCriteriaRoutes.js |
| POST | `/api/risk-criteria/methodologies` | bearer | risk-criteria | routes/riskCriteriaRoutes.js |
| POST | `/api/risk-criteria/methodologies/:id/activate/:versionId` | bearer | risk-criteria | routes/riskCriteriaRoutes.js |
| GET | `/api/risk-criteria/methodologies/:id/versions` | bearer | risk-criteria | routes/riskCriteriaRoutes.js |
| POST | `/api/risk-criteria/methodologies/:id/versions` | bearer | risk-criteria | routes/riskCriteriaRoutes.js |
| GET | `/api/risk-criteria/presets` | bearer | risk-criteria | routes/riskCriteriaRoutes.js |
| GET | `/api/risk-inventory` | bearer | risk-inventory | routes/riskInventoryRoutes.js |
| POST | `/api/risk-inventory` | bearer | risk-inventory | routes/riskInventoryRoutes.js |
| DELETE | `/api/risk-inventory/:id` | bearer | risk-inventory | routes/riskInventoryRoutes.js |
| GET | `/api/risk-inventory/:id` | bearer | risk-inventory | routes/riskInventoryRoutes.js |
| PUT | `/api/risk-inventory/:id` | bearer | risk-inventory | routes/riskInventoryRoutes.js |
| GET | `/api/risk-inventory/:id/compliance` | bearer | risk-inventory | routes/riskInventoryRoutes.js |
| GET | `/api/risk-inventory/:id/links` | bearer | risk-inventory | routes/riskInventoryRoutes.js |
| GET | `/api/risk-inventory/summary` | bearer | risk-inventory | routes/riskInventoryRoutes.js |
| GET | `/api/sectors` | bearer | sectors | routes/coreRoutes.js |
| POST | `/api/sectors` | bearer | sectors | routes/coreRoutes.js |
| GET | `/api/sst/apr` | bearer | SST | routes/sstRoutes.js |
| POST | `/api/sst/apr` | bearer | SST | routes/sstRoutes.js |
| PUT | `/api/sst/apr/:id` | bearer | SST | routes/sstRoutes.js |
| GET | `/api/sst/auditorias` | bearer | SST | routes/sstRoutes.js |
| POST | `/api/sst/auditorias` | bearer | SST | routes/sstRoutes.js |
| GET | `/api/sst/capa` | bearer | SST | routes/sstRoutes.js |
| POST | `/api/sst/capa` | bearer | SST | routes/sstRoutes.js |
| PUT | `/api/sst/capa/:id` | bearer | SST | routes/sstRoutes.js |
| GET | `/api/sst/dashboard` | bearer | SST | routes/sstRoutes.js |
| GET | `/api/sst/epc` | bearer | SST | routes/sstRoutes.js |
| POST | `/api/sst/epc` | bearer | SST | routes/sstRoutes.js |
| GET | `/api/sst/epi` | bearer | SST | routes/sstRoutes.js |
| POST | `/api/sst/epi` | bearer | SST | routes/sstRoutes.js |
| POST | `/api/sst/epi/:id/entrega` | bearer | SST | routes/sstRoutes.js |
| GET | `/api/sst/historico` | bearer | SST | routes/sstRoutes.js |
| GET | `/api/sst/inspecoes` | bearer | SST | routes/sstRoutes.js |
| POST | `/api/sst/inspecoes` | bearer | SST | routes/sstRoutes.js |
| PUT | `/api/sst/inspecoes/:id/realizar` | bearer | SST | routes/sstRoutes.js |
| GET | `/api/sst/nc` | bearer | SST | routes/sstRoutes.js |
| POST | `/api/sst/nc` | bearer | SST | routes/sstRoutes.js |
| GET | `/api/sst/relatorios` | bearer | SST | routes/sstRoutes.js |
| POST | `/api/sst/relatorios/gerar` | bearer | SST | routes/sstRoutes.js |
| GET | `/api/sst/treinamentos` | bearer | SST | routes/sstRoutes.js |
| POST | `/api/sst/treinamentos` | bearer | SST | routes/sstRoutes.js |
| PUT | `/api/sst/treinamentos/:id/realizar` | bearer | SST | routes/sstRoutes.js |
| GET | `/api/system/ai-status` | bearer | system | routes/systemRoutes.js |
| GET | `/api/tenants` | bearer | tenants | routes/tenantRoutes.js |
| POST | `/api/tenants` | bearer | tenants | routes/tenantRoutes.js |
