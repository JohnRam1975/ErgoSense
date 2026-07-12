# ErgoSense no Kubernetes do Docker Desktop

Para o projeto aparecer na tela **Kubernetes** do Docker Desktop.

## 1. Criar o cluster no Docker Desktop

Guia rápido: [`CRIAR-CLUSTER-DOCKER-DESKTOP.md`](./CRIAR-CLUSTER-DOCKER-DESKTOP.md)

1. Abra **Docker Desktop** (motor Running).
2. Aba **Kubernetes** → **Create cluster**.
3. Escolha **kind**, 1 nó → **Create**.
4. Aguarde 5–10 minutos.

> A configuração `KubernetesEnabled: true` já foi gravada em `settings-store.json`; o cluster só sobe após esse clique na UI (Docker Desktop 4.75).

## 2. Deploy do ErgoSense

No PowerShell, na raiz do projeto:

```powershell
cd c:\Users\Djohn\Desktop\SOFTWARE\ERGOSENSE
.\scripts\k8s\deploy-docker-desktop.ps1
```

O script:

- Compila as imagens `ergosense/api:local` e `ergosense/web:local`
- Cria o namespace **`ergosense`**
- Sobe Postgres, Redis, API, Web e Ingress

## 3. Ver no Docker Desktop

1. Menu lateral → **Kubernetes**
2. Selecione o cluster (geralmente `docker-desktop`)
3. Aba **Namespaces** → **`ergosense`**
4. Você verá:
   - `ergosense-api`
   - `ergosense-web`
   - `ergosense-postgres`
   - `ergosense-redis`
   - Services e Ingress

Se não aparecer: clique em **Refresh** ou reinicie a view Kubernetes.

## 4. Acessar a aplicação

**Opção A — LoadBalancer (Docker Desktop expõe em localhost):**

```powershell
kubectl get svc ergosense-web-lb -n ergosense
```

Abra `http://localhost:8080` (porta exibida na coluna PORT).

**Opção B — Port-forward:**

```powershell
kubectl port-forward -n ergosense svc/ergosense-web 8080:80
```

API direta:

```powershell
kubectl port-forward -n ergosense svc/ergosense-api 3001:3001
```

**Opção C — Ingress** (adicione no `C:\Windows\System32\drivers\etc\hosts`):

```
127.0.0.1 ergosense.local
```

Abra `http://ergosense.local` (requer Ingress Controller ativo).

## 5. Senhas locais

Arquivo: `k8s/overlays/docker-desktop/secrets.env`  
(copiado de `secrets.env.example` na primeira execução)

Não use senhas de produção neste arquivo.

## 6. Remover do cluster

```powershell
kubectl delete namespace ergosense
```

## 7. Problemas comuns

| Problema | Solução |
|----------|---------|
| Kubernetes desabilitado | Settings → Kubernetes → Enable |
| `ImagePullBackOff` | Rode o script de deploy (build local + `imagePullPolicy: Never`) |
| Postgres não sobe | `kubectl logs -n ergosense deploy/ergosense-postgres` |
| Nada na UI | Confirme contexto: `kubectl config use-context docker-desktop` |
| Ingress não funciona | Use `ergosense-web-lb` ou port-forward |

## Arquivos

- Manifests: `k8s/overlays/docker-desktop/`
- Script: `scripts/k8s/deploy-docker-desktop.ps1`
