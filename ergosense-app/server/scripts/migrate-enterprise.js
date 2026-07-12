/**
 * Migração enterprise — MFA, filas, auditoria estendida
 */
import { pool } from '../src/db.js';

const SQL = `
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS mfa_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mfa_backup_codes JSONB;

CREATE INDEX IF NOT EXISTS idx_usuarios_mfa_enabled ON usuarios(mfa_enabled) WHERE mfa_enabled = TRUE;

CREATE TABLE IF NOT EXISTS enterprise_audit_trail (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64),
  user_id INT,
  action VARCHAR(128) NOT NULL,
  module VARCHAR(64),
  resource VARCHAR(256),
  details JSONB,
  ip VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_audit_tenant ON enterprise_audit_trail(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_audit_action ON enterprise_audit_trail(action);

CREATE TABLE IF NOT EXISTS queue_jobs (
  id BIGSERIAL PRIMARY KEY,
  queue_name VARCHAR(128) NOT NULL,
  tenant_id VARCHAR(64),
  payload JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_queue_jobs_status ON queue_jobs(status, created_at);
`;

async function main() {
  const client = await pool.connect();
  try {
    await client.query(SQL);
    console.log('Migration enterprise: OK');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
