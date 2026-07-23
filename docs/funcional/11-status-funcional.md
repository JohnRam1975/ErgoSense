# 11 — Status funcional (implementado × parcial × em breve)

Legenda: **OK** = usável na UI + API · **PARCIAL** = API ou UI incompleta · **EM BREVE** = placeholder UI · **ROADMAP** = informativo

| Área | Status | Notas |
|------|--------|-------|
| Login / MFA / reset / ativação | OK | Fluxo completo |
| Onboarding empresa/autônomo | OK | Admin Global aprova |
| Admin tenants / planos | OK | Controles comerciais |
| Dashboard / equipe / org | OK | |
| Análise câmera + carga + resultado | OK | Pose client-side |
| Histórico / relatórios / sync / PWA | OK | Limites por plano |
| Métodos V2 + vídeo + ambientais | OK | Ambientais com caráter de apoio/simulação |
| V2 roadmap | ROADMAP | Tela informativa |
| Psicossocial (exceto IA) | OK | Form público incluso |
| Psicossocial IA | EM BREVE | |
| Denúncia | OK | Público + autenticado |
| Critérios de risco | OK | |
| Inventário | OK | |
| GRO | OK | |
| PGR + PDF | OK | |
| AET + PDF | OK | |
| SST + PDF | OK | |
| eSocial UI | EM BREVE | 6 telas ComingSoon |
| eSocial API | OK / PARCIAL | Ciclo no backend; integração gov depende de ambiente |
| Compliance | OK | Sem auto-aplicação de normas |
| AI Expert UI | EM BREVE | Painel no resultado |
| AI Expert API | OK | Depende de config de provedor |
| Modo suporte LGPD | OK | |
| Express 5 / patches deps | ROADMAP | Dívida Fase 10 |
| Split AppContext | ROADMAP | Dívida manutenção |

## Cobertura desta documentação

| Dimensão | Cobertura |
|----------|-----------|
| ScreenIds tipados | 89/89 |
| Rota pública psico | Documentada |
| Domínios de API | Todos os `routes/*` + suporte em `app.js` |
| Papéis RBAC | 5/5 |
| Planos | 4 tiers |
| Fluxos de negócio | 10 jornadas principais |
| Status honestidade produto | Tabela acima |

Qualquer tela ou endpoint novo deve atualizar:  
`08-catalogo-telas.md`, `09-catalogo-apis.md` e esta tabela de status.
