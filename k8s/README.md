# Kubernetes — ErgoSense

## Docker Desktop (ver na UI Kubernetes)

Guia passo a passo: [`docs/cloud/DOCKER-DESKTOP-KUBERNETES.md`](../docs/cloud/DOCKER-DESKTOP-KUBERNETES.md)

```powershell
.\scripts\k8s\deploy-docker-desktop.ps1
```

Overlay: `k8s/overlays/docker-desktop/`

---

## Produção (futuro)

Manifests base para migração em cluster real. Validar com dry-run antes de aplicar.

## Estrutura

```
k8s/base/
  namespace.yaml
  configmap-api.yaml
  secret-api.yaml          # substituir por External Secrets
  deployment-api.yaml
  service-api.yaml
  deployment-web.yaml
  service-web.yaml
  ingress.yaml
  hpa-api.yaml             # 2 → 50 réplicas
  pvc-postgres.yaml
  pvc-redis.yaml
  kustomization.yaml
```

## Pré-requisitos antes do apply

1. Imagens no registry: `ergosense/api:1.0.0`, `ergosense/web:1.0.0`
2. PostgreSQL gerenciado (RDS/Azure) ou StatefulSet + operador
3. Redis gerenciado ou cluster
4. Object storage S3/MinIO — `STORAGE_DRIVER=s3`
5. Ingress controller + cert-manager
6. Migrar fotos de `imagem_base64` para object storage

## Validação local (dry-run)

```bash
kubectl apply -k k8s/base --dry-run=client
```

## Documentação

Ver [`docs/cloud/K8S-READINESS-AUDIT.md`](../docs/cloud/K8S-READINESS-AUDIT.md).
