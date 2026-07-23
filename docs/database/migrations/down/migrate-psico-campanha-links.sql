-- ROLLBACK_MODE: backup_only
-- Migration: migrate-psico-campanha-links.js
-- Rollback em produção = restaurar dump pré-deploy (infra/scripts/db-restore).
DO $$ BEGIN
  RAISE EXCEPTION 'backup_only: use infra/scripts/db-restore (migration %)', 'migrate-psico-campanha-links.js';
END $$;
