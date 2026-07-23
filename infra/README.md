# Deploy Docker ErgoSense (Hostinger) — padrão FinCare

Use **apenas** `infra/docker-compose.yml` + `.env` (a partir de `.env.example`).

## Imagens (GHCR — grátis)

Tag pinada atual (obrigatório no Hostinger — `:latest` sozinho não atualiza sem pull):

- `ghcr.io/johnram1975/ergosense-postgres:20260722-nolegacy`
- `ghcr.io/johnram1975/ergosense-api:20260722-nolegacy`
- `ghcr.io/johnram1975/ergosense-web:20260722-nolegacy`

(+ `redis:7-alpine` e `minio/minio:latest` públicos)

**Não usa Docker Hub pago.** Packages do GitHub devem estar **Public**.

## Publicar imagens novas (PC)

```powershell
powershell -File infra/docker-publish.ps1 -Tag 20260722-nolegacy
```

Depois: https://github.com/users/JohnRam1975/packages → cada package ErgoSense → Package settings → Change visibility → **Public**.

## Hostinger Docker Manager

**Recomendado:** Compose from URL (evita erro de paste / `.hstgr-*.list.py`):

```
https://raw.githubusercontent.com/JohnRam1975/ErgoSense/main/infra/docker-compose.yml
```

1. Projeto: **`ergosense`**
2. No `.env`, as 3 linhas `ERGOSENSE_*_IMAGE` devem usar a tag pinada (veja `.env.example`) — **não deixe `:latest` antigo**
3. Deploy com **Pull images** / recreate (Restart sozinho **não** troca o frontend)
4. Confirme no browser (aba Network): JS deve ser `AppContext-CAofgwBP.js` (ou outro hash novo), **nunca** `AppContext-6Q0hDcEx.js`
5. `sw.js` deve vir com `Cache-Control: no-cache` (não `immutable`)

## DNS (Hostinger)

Para `ergosense.dejohn.com.br` use **apenas um** registro A:

`ergosense` → `195.35.18.205` (IP deste VPS)

**Não** deixe um segundo A para `2.57.91.91` — esse IP não é o servidor ErgoSense e causa timeout/404 no cadastro (ex.: autônomo).

### Se aparecer `python3: can't open file '/.hstgr-....list.py'`

É falha interna do painel Hostinger (não do app). Causas mais comuns:

1. **Porta 80 ocupada** pelo FinCare (`fincare-proxy`) — no `.env` use `PUBLIC_HTTP_PORT=8088`
2. Compose colado com erro — use **Compose from URL** acima
3. Ver o log real no terminal do VPS:

```bash
cat /docker/ergosense/.build.log
sudo netstat -tlnp | grep -E ':80|:8088'
docker ps -a
```

Domínio SSL aponta para a porta publicada (`80` ou `8088`).

## Local (desktop)

```powershell
# build sem push
powershell -File infra/docker-publish.ps1 -SkipPush

# .env local com imagens locais, ex.:
# ERGOSENSE_API_IMAGE=ghcr.io/johnram1975/ergosense-api:latest
# ou tag local após build

docker compose --env-file infra/.env -f infra/docker-compose.yml up -d
```

## Produção — secrets, backup e deploy

```powershell
# 1) Gerar secrets fortes (cria infra/.env.production — gitignored)
powershell -File infra/scripts/generate-production-env.ps1

# 2) No servidor: copiar para infra/.env e revisar domínio/tags
# 3) Deploy orquestrado (backup → pull → migrate → health → rollback auto)
powershell -File infra/deploy.ps1

# Backup / restore manuais
powershell -File infra/scripts/db-backup.ps1
powershell -File infra/scripts/db-restore.ps1 -ConfirmRestore
```

Linux: `infra/scripts/generate-production-env.sh`, `infra/deploy.sh`, `infra/scripts/db-backup.sh`.

Migrations: `npm --prefix ergosense-app/server run migrate:status` · rollback fino só com `ALLOW_DESTRUCTIVE_ROLLBACK=true` + down SQL; em produção prefira restore do dump.

## Containers esperados

| Nome | Função |
|------|--------|
| `ergosense-frontend` | App + nginx (porta 80) |
| `ergosense-backend` | API |
| `ergosense-db` | Postgres |
| `ergosense-cache` | Redis |
| `ergosense-storage` | MinIO |

## Login seed

- E-mail/senha do `.env`: `SEED_GLOBAL_ADMIN_EMAIL` / `SEED_GLOBAL_ADMIN_PASSWORD`
- Ao rodar `generate-production-env`, a senha é impressa no terminal e salva em `infra/.env.admin-credentials.local` (gitignored) — guarde fora do repositório
- E2E local: exporte `E2E_GLOBAL_PASSWORD` com o mesmo valor (ou carregue o `.env.admin-credentials.local`)
- Suporte: `SUPPORT_CONTACT_EMAIL` (formulário no app)
