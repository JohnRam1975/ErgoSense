# ErgoSense — Infra Docker (Kubernetes-ready)

Stack completa para desenvolvimento e staging sem Kubernetes.

## Subir

```powershell
# Opção A — da raiz do repositório (recomendado)
copy infra\docker\.env.example infra\docker\.env
# Edite senhas em infra\docker\.env
docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.cloud.yml up -d --build

# Opção B — dentro de infra/docker
cd infra/docker
copy .env.example .env
docker compose -f docker-compose.cloud.yml up -d --build
```

## Escalar API (load balancing via Nginx)

```powershell
docker compose -f docker-compose.cloud.yml up -d --scale api=3
```

## URLs

| Serviço | URL |
|---------|-----|
| Aplicação | http://localhost:8080 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 (admin / senha do .env) |
| MinIO console | http://localhost:9001 |

## Documentação

[docs/cloud/K8S-READINESS-AUDIT.md](../../docs/cloud/K8S-READINESS-AUDIT.md)
