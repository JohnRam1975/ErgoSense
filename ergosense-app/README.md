# ErgoSense Web + API

Cliente **mobile-first** (React/Vite/PWA) e API Node/Express em `server/`.

> **Arquitetura:** [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)  
> **Produção:** [`../infra/docker-compose.yml`](../infra/docker-compose.yml)

## Executar

```bash
npm install
npm run dev:api   # API :3001
npm run dev       # Web :5173
```

**Login (após seed):** `ergosense@dejohn.com.br` / senha em `SEED_GLOBAL_ADMIN_PASSWORD`

## Stack

React 19 + TypeScript + Vite 8 + PWA · Express · PostgreSQL · Redis
