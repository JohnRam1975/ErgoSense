# ErgoSense — Deploy na Hostinger (Docker Manager)

A Hostinger **não executa `docker build`**. Todo o build é feito no seu PC ou CI;
no VPS só entram **imagens prontas** + este `docker-compose.yml`.

## Arquitetura (lean)

| Serviço | Imagem | Função |
|---------|--------|--------|
| `web` | `ergosense-web` | Nginx: SPA + proxy `/api` → API |
| `api` | `ergosense-api` | Node Express + migrations no boot |
| `postgres` | `ergosense-postgres` | Postgres 16 + schema base |
| `redis` | `redis:7-alpine` | Cache / sessão |

Porta pública: **80** (`web`). HTTPS: SSL da Hostinger / Cloudflare apontando para o VPS.

## 1. Build e push (no seu PC)

Pré-requisitos: Docker Desktop logado no registry (Docker Hub ou GHCR).

```powershell
cd C:\Users\Djohn\Desktop\SOFTWARE\ERGOSENSEPRO

# Docker Hub (exemplo)
.\scripts\docker\build-and-push.ps1 -Registry SEU_USER -Tag 1.0.0

# GHCR
.\scripts\docker\build-and-push.ps1 -Registry ghcr.io/SEU_ORG -Tag 1.0.0
```

Isso publica:

- `{registry}/ergosense-api:1.0.0` (+ `:latest`)
- `{registry}/ergosense-web:1.0.0`
- `{registry}/ergosense-postgres:1.0.0`

## 2. Configurar variáveis

1. Copie `infra/hostinger/.env.example`
2. Preencha `IMAGE_REGISTRY`, `IMAGE_TAG`, senhas, `JWT_*`
3. Domínio já previsto: `https://ergosense.dejohn.com.br` (`APP_PUBLIC_URL` + `CORS_ORIGINS`)
4. No Hostinger Docker Manager, cole as variáveis no campo **Environment** do projeto

## 3. Deploy no Hostinger

1. VPS → **Docker Manager** → **Compose**
2. **Compose manually** (ou URL deste arquivo no Git)
3. Cole o conteúdo de `infra/hostinger/docker-compose.yml`
4. Nome do projeto: `ergosense`
5. Cole as env vars
6. **Deploy** — o painel faz `pull` + `up` (sem build)

## 4. Atualizar versão

1. No PC: `build-and-push.ps1 -Tag 1.0.1`
2. No Hostinger: altere `IMAGE_TAG=1.0.1` → **Update project** (pull + recreate, volumes preservados)

## 5. Checklist pós-deploy

- [ ] `https://ergosense.dejohn.com.br` abre o ErgoSense
- [ ] `/health` responde OK
- [ ] Login demo / admin funciona
- [ ] SSL ativo e `CORS_ORIGINS` / `APP_PUBLIC_URL` = `https://ergosense.dejohn.com.br`
- [ ] Backup do volume `ergosense_pgdata`

## Observações

- **Sem bind mounts** de arquivos do repo — tudo está dentro das imagens.
- RabbitMQ / MinIO / Grafana ficam de fora neste compose lean (podem ir depois).
- `RUN_MIGRATIONS=true` aplica migrations no start da API.
- Se a imagem `ergosense-postgres` ainda não existir no registry, faça o push primeiro; sem ela o compose falha no pull.

## Arquivos relacionados

- Dockerfiles: `infra/docker/Dockerfile.{api,web,postgres}`
- Nginx Hostinger: `infra/docker/nginx/hostinger.conf`
- Stack completa (dev/staging com build): `infra/docker/docker-compose.cloud.yml`
