# Rollbacks versionados

Cada arquivo `migrate-*.sql` corresponde a `server/scripts/migrate-*.js`.

## Modos

| Marcador no SQL | Comportamento |
|-----------------|---------------|
| `ROLLBACK_MODE: sql` | `node scripts/migrate-runner.js --down N` aplica o SQL (exige `ALLOW_DESTRUCTIVE_ROLLBACK=true`) |
| `ROLLBACK_MODE: backup_only` | Aborta; restaurar dump pré-deploy |

## Produção (recomendado)

1. `infra/scripts/db-backup.ps1` (ou `.sh`) **antes** do deploy
2. Se falhar: `infra/scripts/db-restore` + imagens anteriores (`infra/deploy.ps1` / `deploy.sh`)

Down SQL fino só existe para migrations isoladas e revisadas. As demais são `backup_only` de propósito (evita perda de dados por DROP/ALTER reverso incompleto).
