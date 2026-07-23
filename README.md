# ErgoSense

Plataforma de análise ergonômica industrial com IA — React + Node/Express, multi-tenant.

## Estrutura

```
ergosense-app/     # frontend + API
infra/             # Compose + Dockerfiles (produção)
docs/              # domínio, banco, segurança, IA
```

## Local (Docker Desktop — stack completa)

```powershell
.\infra\build-and-push.ps1 -Registry ergosense -Tag local -SkipPush
docker compose --env-file infra/.env -f infra/docker-compose.yml -p ergosense up -d
```

App: http://localhost:8090  
Login: `ergosense@dejohn.com.br` — senha em `SEED_GLOBAL_ADMIN_PASSWORD` no `infra/.env` (após `generate-production-env`, também em `infra/.env.admin-credentials.local`). Dev/CI sem secrets gerados: `@Ergo!2026/Adm`.

Containers: `ergosense-frontend` · `ergosense-backend` · `ergosense-db` · `ergosense-cache` · `ergosense-storage`

## Produção (Hostinger — só imagens)

```powershell
.\infra\build-and-push.ps1 -Registry SEU_USER -Tag 1.0.0
```

No Docker Manager: projeto `ergosense`, cole `infra/docker-compose.yml` + env de `infra/.env.example` (`IMAGE_REGISTRY`, senhas, JWT, domínio).

## Dev sem Docker da app

```bash
cd ergosense-app && npm install && npm run dev
```

## Docs

- [Documentação funcional](docs/funcional/README.md) — fonte de verdade do produto
- [Auditorias e testes](docs/audit/README.md) — índice canônico (sem duplicatas)
- [Arquitetura](docs/ARCHITECTURE.md)
- [PostgreSQL](docs/database/SETUP-POSTGRES.md)
- [Offline-first](docs/sync/OFFLINE-FIRST.md)
- [Segurança](docs/security/SECURITY.md)
- [IA](docs/ai/AI-STRATEGY.md)
- [Rodar local sem Docker da app](rodar_local.md)
- [Matriz conformidade MTE](matriz-conformidade-mte.md) · [gap](gap-analysis-psicossocial.md) · [plano NR-01](plano-de-adequacao-nr01.md) · [roadmap MTE](roadmap-implementacao.md)
- [Comandos rápidos](docs/comandos.md)
