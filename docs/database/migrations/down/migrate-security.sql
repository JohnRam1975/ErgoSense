-- ROLLBACK_MODE: sql
-- Par: server/scripts/migrate-security.js
-- Requer ALLOW_DESTRUCTIVE_ROLLBACK=true
DROP TABLE IF EXISTS login_attempts CASCADE;
DROP TABLE IF EXISTS security_audit_log CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
