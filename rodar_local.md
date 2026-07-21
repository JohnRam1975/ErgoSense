# Rodar local — ErgoSense

## Requisitos

- **Node.js** 20+
- **Docker Desktop** (PostgreSQL local)

---

## Primeira vez

### 1. Configurar a API

```powershell
cd ergosense-app\server
copy .env.example .env
```

Edite `.env`: defina `PGPASSWORD` e os segredos JWT (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`).

### 2. Subir o PostgreSQL

```powershell
npm install
npm run db:up
```

Banco: `ergosense` na porta **5433**.

### 3. Criar tabelas e dados demo

```powershell
$env:PGPASSWORD = "sua_senha_do_env"
psql -U postgres -h localhost -p 5433 -d ergosense -f ..\..\docs\database\postgresql-schema-full.sql
psql -U postgres -h localhost -p 5433 -d ergosense -f ..\..\docs\database\postgresql-seed.sql
npm run migrate:all
```

> `migrate:all` aplica **todas** as migrations (inclui enterprise e tenant-onboarding).

> Se `psql` não estiver no PATH, use o caminho do PostgreSQL instalado ou o script `.\scripts\postgres\setup-docker-5433.ps1` na raiz do projeto.

### 4. Instalar o frontend

```powershell
cd ..\..
cd ergosense-app
npm install
```

---

## Uso diário

Abra **dois terminais**:

**Terminal 1 — API**

```powershell
cd ergosense-app\server
npm run dev
```

**Terminal 2 — Frontend**

```powershell
cd ergosense-app
npm run dev
```

Abra **http://localhost:5173**

API: **http://localhost:3001** · Docs: **http://localhost:3001/api/docs**

---

## Login demo

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Ergonomista | `lucas@vale.com.br` | `ergo1234` |
| Admin global | `ergosense@dejohn.com.br` | `@Ergo!2026/Adm` |

---

## Parar

```powershell
cd ergosense-app\server
npm run db:down
```

Ctrl+C nos terminais da API e do frontend.
