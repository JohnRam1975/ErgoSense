# ErgoSense — Infra Docker (Kubernetes-ready + Hostinger)

## Hostinger (produção — só imagens)

A Hostinger **não aceita `build`**. Use o fluxo dedicado:

→ **[infra/hostinger/README.md](../hostinger/README.md)**

```powershell
.\scripts\docker\build-and-push.ps1 -Registry SEU_USER -Tag 1.0.0
# Depois cole infra/hostinger/docker-compose.yml no Docker Manager
```

## Stack cloud local (com build)

```powershell
copy infra\docker\.env.example infra\docker\.env
# Edite senhas
docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.cloud.yml up -d --build
```

## Escalar API

```powershell
docker compose -f infra/docker/docker-compose.cloud.yml up -d --scale api=3
```

## URLs (compose cloud)

| Serviço | URL |
|---------|-----|
| Aplicação | http://localhost:8080 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3002 |
| MinIO console | http://localhost:9001 |

## Documentação

- Hostinger: [infra/hostinger/README.md](../hostinger/README.md)
- K8s: [docs/cloud/K8S-READINESS-AUDIT.md](../../docs/cloud/K8S-READINESS-AUDIT.md)
