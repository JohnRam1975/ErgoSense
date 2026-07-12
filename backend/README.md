# ErgoSense API — Spring Boot

Backend REST multi-tenant, JWT, sync offline-first.

## Estrutura

```
src/main/java/io/ergosense/
├── controller/     AuthController, SyncController, AnaliseController, DashboardController
├── service/        Regras de negócio
├── repository/     JPA
├── dto/            Request/Response
├── entity/         JPA entities
├── security/       JwtFilter, SecurityConfig
├── tenant/         TenantFilter, TenantContext
├── sync/           SyncProcessor (batch offline)
├── ai/             MediaPipe worker (fase 2)
├── storage/        Upload S3/MinIO
└── audit/          AuditLog
```

## Setup

```bash
docker compose up -d          # PostgreSQL + MinIO
./mvnw spring-boot:run      # API em :8080/api/v1
```

## Endpoints principais

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/auth/login` | JWT |
| POST | `/auth/refresh` | Refresh token |
| POST | `/sync/push` | Batch offline |
| GET | `/sync/pull` | Delta incremental |
| POST | `/analises/{id}/fotos` | Upload imagem |
| GET | `/dashboard/stats` | KPIs |

## Headers

```
Authorization: Bearer {token}
X-Tenant-Id: vale_sa
X-Device-Id: {uuid}
```
