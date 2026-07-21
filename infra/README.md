# Deploy Docker ErgoSense (Hostinger) — padrão FinCare

Use **apenas** `infra/docker-compose.yml` + `.env` (a partir de `.env.example`).

## Imagens (GHCR — grátis)

- `ghcr.io/johnram1975/ergosense-postgres:latest`
- `ghcr.io/johnram1975/ergosense-api:latest`
- `ghcr.io/johnram1975/ergosense-web:latest`

(+ `redis:7-alpine` e `minio/minio:latest` públicos)

**Não usa Docker Hub pago.** Packages do GitHub devem estar **Public**.

## Publicar imagens novas (PC)

```powershell
powershell -File infra/docker-publish.ps1 -Tag latest
```

Depois: https://github.com/users/JohnRam1975/packages → cada package ErgoSense → Package settings → Change visibility → **Public**.

## Hostinger Docker Manager

1. Projeto: **`ergosense`**
2. Colar o conteúdo de `infra/docker-compose.yml`
3. Colar `.env` preenchido (senhas fortes + domínio)
4. Deploy / Pull + Up

Domínio SSL aponta para a **porta 80** (`PUBLIC_HTTP_PORT=80`).

## Local (desktop)

```powershell
# build sem push
powershell -File infra/docker-publish.ps1 -SkipPush

# .env local com imagens locais, ex.:
# ERGOSENSE_API_IMAGE=ghcr.io/johnram1975/ergosense-api:latest
# ou tag local após build

docker compose --env-file infra/.env -f infra/docker-compose.yml up -d
```

## Containers esperados

| Nome | Função |
|------|--------|
| `ergosense-frontend` | App + nginx (porta 80) |
| `ergosense-backend` | API |
| `ergosense-db` | Postgres |
| `ergosense-cache` | Redis |
| `ergosense-storage` | MinIO |

## Login seed

- `ergosense@dejohn.com.br` / (senha do `.env` `SEED_GLOBAL_ADMIN_PASSWORD`)
- Suporte: `ergosense.suporte@dejohn.com.br` (formulário no app)
