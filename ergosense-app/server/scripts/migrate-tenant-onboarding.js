/**
 * Migration — onboarding de empresas (tenant requests, planos, ativação)
 */
import { pool } from '../src/db.js';

const SQL = `
CREATE TABLE IF NOT EXISTS planos (
  id              SERIAL PRIMARY KEY,
  codigo          VARCHAR(32) NOT NULL UNIQUE,
  nome            VARCHAR(64) NOT NULL,
  limite_usuarios INT NOT NULL,
  limite_empresas INT NOT NULL DEFAULT 1,
  limite_aet      INT NOT NULL,
  limite_pgr      INT NOT NULL,
  limite_gro      INT NOT NULL,
  limite_ia       INT NOT NULL,
  armazenamento_gb INT NOT NULL,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO planos (codigo, nome, limite_usuarios, limite_aet, limite_pgr, limite_gro, limite_ia, armazenamento_gb)
VALUES
  ('STARTER', 'Starter', 10, 5, 2, 1, 50, 5),
  ('PROFESSIONAL', 'Professional', 50, 25, 10, 5, 500, 25),
  ('ENTERPRISE', 'Enterprise', 500, 999, 999, 999, 5000, 200)
ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS plano_codigo VARCHAR(32) DEFAULT 'STARTER',
  ADD COLUMN IF NOT EXISTS status_conta VARCHAR(32) NOT NULL DEFAULT 'ATIVO',
  ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bloqueado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bloqueado_por INT,
  ADD COLUMN IF NOT EXISTS bloqueado_motivo TEXT,
  ADD COLUMN IF NOT EXISTS expira_em TIMESTAMPTZ;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS pendente_ativacao BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ativado_em TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS tenant_requests (
  id                      BIGSERIAL PRIMARY KEY,
  protocolo               VARCHAR(32) NOT NULL UNIQUE,
  razao_social            VARCHAR(255) NOT NULL,
  nome_fantasia           VARCHAR(255),
  cnpj                    VARCHAR(18) NOT NULL,
  industria               VARCHAR(120),
  segmento                VARCHAR(120),
  quantidade_funcionarios INT,
  endereco                TEXT,
  cidade                  VARCHAR(120),
  estado                  VARCHAR(2),
  pais                    VARCHAR(64) NOT NULL DEFAULT 'Brasil',
  cep                     VARCHAR(16),
  telefone                VARCHAR(32),
  email                   VARCHAR(255) NOT NULL,
  responsavel_nome        VARCHAR(255) NOT NULL,
  responsavel_cargo       VARCHAR(120),
  responsavel_email       VARCHAR(255) NOT NULL,
  responsavel_telefone    VARCHAR(32),
  plano_codigo            VARCHAR(32) NOT NULL DEFAULT 'STARTER',
  status                  VARCHAR(32) NOT NULL DEFAULT 'PENDENTE',
  observacoes             TEXT,
  data_solicitacao        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_aprovacao          TIMESTAMPTZ,
  data_rejeicao           TIMESTAMPTZ,
  aprovado_por            INT REFERENCES usuarios(id),
  tenant_id               VARCHAR(64) REFERENCES tenants(tenant_id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_requests_status ON tenant_requests(status, data_solicitacao DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_requests_cnpj ON tenant_requests(cnpj);

CREATE TABLE IF NOT EXISTS activation_tokens (
  id              BIGSERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tenant_id       VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  token_hash      VARCHAR(64) NOT NULL UNIQUE,
  temp_password   VARCHAR(128),
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activation_tokens_user ON activation_tokens(user_id);
`;

async function main() {
  const client = await pool.connect();
  try {
    await client.query(SQL);
    console.log('Migration tenant-onboarding: OK');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
