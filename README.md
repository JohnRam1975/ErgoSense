# ErgoSense AI

Sistema mobile-first de **análise ergonômica industrial com IA**, offline-first, multi-tenant e sincronização automática.

## Repositório

| Camada | Pasta | Stack | Status |
|--------|-------|-------|--------|
| **Protótipo UI** | [`index.html`](index.html) | HTML/CSS/JS | Referência visual |
| **App + API** | [`ergosense-app/`](ergosense-app/) | React + Vite + Node/Express | Runtime principal |
| **Deploy Hostinger** | [`infra/hostinger/`](infra/hostinger/) | Docker Compose (imagens) | Produção lean |
| **Documentação** | [`docs/`](docs/) | Arquitetura completa | ✅ |

## Documentação principal

- [Kubernetes no Docker Desktop](docs/cloud/DOCKER-DESKTOP-KUBERNETES.md)
- [Cloud-Native / Kubernetes Readiness](docs/cloud/K8S-READINESS-AUDIT.md)
- [Docker Compose (stack completa)](infra/docker/README.md)
- [Arquitetura completa](docs/ARCHITECTURE.md)
- [Banco SQLite (offline)](docs/database/sqlite-schema.sql)
- [Banco PostgreSQL (servidor)](docs/database/postgresql-schema.sql)
- [Sincronização offline-first](docs/sync/OFFLINE-FIRST.md)
- [Segurança e LGPD](docs/security/SECURITY.md)
- [Estratégia de IA](docs/ai/AI-STRATEGY.md)

## Princípios

1. **Nunca depende de internet** para realizar análises
2. **SQLite é a fonte de verdade** no dispositivo
3. **Sync automático** quando a rede estiver disponível
4. **Multi-tenant** por `tenant_id` em todas as camadas
5. **IA híbrida**: TensorFlow Lite offline + MediaPipe online

## Quick start (Web MVP)

```bash
cd ergosense-app && npm install && npm run dev
```

## Quick start (Backend)

```bash
cd backend && docker compose up -d && ./mvnw spring-boot:run
```

## Quick start (Mobile)

```bash
cd mobile && flutter pub get && flutter run
```
