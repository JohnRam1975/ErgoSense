# PostgreSQL — ErgoSense (máquina local)

## Conexão

| Campo    | Valor        |
|----------|--------------|
| Host     | `localhost`  |
| Porta    | `5433` (Docker — mesmo pgAdmin do **warehouse**) |
| Banco    | `ergosense`  |
| Usuário  | `postgres`   |
| Senha    | mesma do warehouse (ver `warehouse/sistema/.env`) |

> **Atenção:** Na porta `5432` (PostgreSQL nativo Windows) pode existir outro `ergosense` antigo — o pgAdmin que mostra só `postgres` + `warehouse` usa a porta **5433**.

## Criar banco e tabelas (Windows)

```powershell
cd ERGOSENSE
# pgAdmin / Docker (porta 5433 — recomendado)
.\scripts\postgres\setup-docker-5433.ps1

# OU PostgreSQL nativo Windows (porta 5432)
.\scripts\postgres\setup-windows.ps1
```

Ou manualmente:

```powershell
$env:PGPASSWORD='@joaoC1975'
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -f scripts\postgres\01-init-database.sql
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U ergosense -d ergosense -f docs\database\postgresql-schema-full.sql
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U ergosense -d ergosense -f docs\database\postgresql-seed.sql
```

## Tabelas

- `tenants` — empresas
- `usuarios` — login
- `solicitacoes_acesso` — primeiro acesso
- `setores`, `colaboradores`
- `analises`, `fotos_analise`, `resultados_ia`
- `relatorios`, `configuracoes`
- `sync_log`, `audit_log`

## API + app

Terminal 1 — API Node (porta 3001):

```powershell
cd ergosense-app\server
npm install
npm run dev
```

Terminal 2 — frontend:

```powershell
cd ergosense-app
npm run dev
```

Login: admin global via `SEED_GLOBAL_ADMIN_*` (padrão `ergosense@dejohn.com.br`). Sem tenants demo.

O Vite faz proxy de `/api` → `http://localhost:3001`.

## Spring Boot (opcional)

```powershell
cd backend
# DB_PASSWORD=@joaoC1975
mvn spring-boot:run
```

`application.yml` usa o mesmo banco `ergosense`.
