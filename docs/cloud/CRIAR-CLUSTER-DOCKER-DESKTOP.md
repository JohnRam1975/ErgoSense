# Criar o cluster Kubernetes no Docker Desktop

## O que já foi feito no seu PC

O arquivo de configuração do Docker Desktop foi atualizado com:

- `KubernetesEnabled: true`
- `KubernetesMode: kind`
- `KubernetesNodesCount: 1`

Caminho: `%APPDATA%\Docker\settings-store.json`

## O que você precisa fazer (1 clique — obrigatório)

O Docker Desktop **4.75** só inicia o cluster depois do botão **Create cluster** na interface. Isso não pode ser feito 100% pelo terminal.

1. Abra o **Docker Desktop** e espere o motor ficar verde (Running).
2. Menu **Kubernetes** (ícone à esquerda).
3. Clique em **Create cluster**.
4. Tipo: **kind** (ou Kubeadm), **1 nó**.
5. Confirme **Create** e aguarde **5–10 minutos** (download de imagens).

Quando aparecer o cluster na lista (não mais a tela vazia), continue abaixo.

## Depois do cluster criado — deploy automático

No PowerShell:

```powershell
cd c:\Users\Djohn\Desktop\SOFTWARE\ERGOSENSE
.\scripts\k8s\deploy-docker-desktop.ps1
```

## Verificar

```powershell
kubectl config use-context docker-desktop
kubectl get nodes
kubectl get pods -n ergosense
```

No Docker Desktop → **Kubernetes** → namespace **ergosense**.

## Alternativa sem o botão (cluster kind separado)

Se o botão não funcionar, use um cluster **kind** (aparece em **Containers**, não na aba Kubernetes):

```powershell
.\scripts\k8s\install-kind-cluster.ps1
```

## Se o Docker estiver instável

Depois de tentativas automáticas, reinicie:

1. Feche o Docker Desktop (botão direito na bandeja → Quit).
2. Abra de novo e espere 1–2 minutos.
3. Clique **Create cluster** na aba Kubernetes.
