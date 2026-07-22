# ErgoSense — Comandos rápidos

Guia para retomar o trabalho no projeto após fechar o Cursor.

## 1. Abrir o projeto

```powershell
cd c:\Users\Djohn\Desktop\SOFTWARE\ERGOSENSE
```

No Cursor: **File → Open Folder** → pasta `ERGOSENSE`.

---

## 2. Opção A — Desenvolvimento local (mais rápido)

### Frontend

```powershell
cd c:\Users\Djohn\Desktop\SOFTWARE\ERGOSENSE\ergosense-app
npm install
npm run dev
```

Abrir: **http://localhost:5173**

### API (login e dados reais)

```powershell
cd c:\Users\Djohn\Desktop\SOFTWARE\ERGOSENSE\ergosense-app\server
npm run dev
```

API em **http://localhost:3001**

### Login

Admin global: `ergosense@dejohn.com.br` (senha `SEED_GLOBAL_ADMIN_PASSWORD`). Sem credenciais demo industriais.

### Build (validar antes de deploy)

```powershell
cd c:\Users\Djohn\Desktop\SOFTWARE\ERGOSENSE\ergosense-app
npm run build
```

---

## 3. Opção B — Cluster Kubernetes (Docker Desktop)

### Verificar cluster

```powershell
kubectl config use-context docker-desktop
kubectl get pods -n ergosense
```

### Acessar a aplicação (port-forward)

Use a porta **8888** se a **8080** estiver ocupada por outro serviço.

```powershell
# Terminal 1 — web
kubectl port-forward -n ergosense svc/ergosense-web 8888:80

# Terminal 2 — API (opcional)
kubectl port-forward -n ergosense svc/ergosense-api 3001:3001
```

Abrir: **http://localhost:8888**

### LoadBalancer (alternativa)

```powershell
kubectl get svc ergosense-web-lb -n ergosense
```

Abrir a porta exibida na coluna PORT (geralmente `http://localhost:8080`).

### Redeploy completo (após alterações no código)

```powershell
cd c:\Users\Djohn\Desktop\SOFTWARE\ERGOSENSE
.\scripts\k8s\deploy-docker-desktop.ps1
```

### Logs

```powershell
kubectl logs -n ergosense deploy/ergosense-api --tail=50
kubectl logs -n ergosense deploy/ergosense-web --tail=50
```

### Remover do cluster

```powershell
kubectl delete namespace ergosense
```

---

## 4. Testar botões "Principais fatores"

1. **Nova Análise** → ativar **movimentação de carga**
2. Informar peso/distância que gerem risco
3. Sessão na câmera ≥ 30 s → **Resultado**
4. Clicar em **Carga distante**, **Peso excedido**, **Deslocamento com carga**

> Se estiver no K8s sem redeploy recente, a correção pode não estar ativa. Use `npm run dev` local ou rode o script de deploy.

---

## 5. Resumo — copiar e colar

**Só testar local:**

```powershell
cd c:\Users\Djohn\Desktop\SOFTWARE\ERGOSENSE\ergosense-app
npm run dev
```

**Só acessar o que já está no K8s:**

```powershell
kubectl get pods -n ergosense
kubectl port-forward -n ergosense svc/ergosense-web 8888:80
```

---

## Documentação relacionada

- [Kubernetes no Docker Desktop](cloud/DOCKER-DESKTOP-KUBERNETES.md)
- [README principal](../README.md)
- [ErgoSense Web MVP](../ergosense-app/README.md)
