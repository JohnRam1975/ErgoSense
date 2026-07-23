-- ROLLBACK_MODE: backup_only
-- Migration: migrate-esocial.js
-- Rollback em produção = restaurar dump pré-deploy (infra/scripts/db-restore).
DO $$ BEGIN
  RAISE EXCEPTION 'backup_only: use infra/scripts/db-restore (migration %)', 'migrate-esocial.js';
END $$;
