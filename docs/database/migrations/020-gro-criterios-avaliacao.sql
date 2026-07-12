-- NR-01 §1.5.4.4.2.2 — Critérios de Avaliação de Riscos (GRO / Inventário / PGR)

CREATE TABLE IF NOT EXISTS gro_criterios_metodologia (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  nome VARCHAR(256) NOT NULL,
  descricao TEXT,
  tipo_matriz VARCHAR(64) NOT NULL DEFAULT 'PROB_SEV_5X5',
  versao_ativa_id BIGINT,
  padrao BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS gro_criterios_versoes (
  id BIGSERIAL PRIMARY KEY,
  metodologia_id BIGINT NOT NULL REFERENCES gro_criterios_metodologia(id),
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  versao_num INTEGER NOT NULL,
  config_json JSONB NOT NULL,
  documentacao_json JSONB,
  status VARCHAR(32) NOT NULL DEFAULT 'rascunho',
  notas_alteracao TEXT,
  created_by BIGINT,
  created_by_nome VARCHAR(256),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  UNIQUE (metodologia_id, versao_num)
);

ALTER TABLE gro_criterios_metodologia
  DROP CONSTRAINT IF EXISTS fk_gro_criterios_versao_ativa;

ALTER TABLE gro_criterios_metodologia
  ADD CONSTRAINT fk_gro_criterios_versao_ativa
  FOREIGN KEY (versao_ativa_id) REFERENCES gro_criterios_versoes(id);

CREATE TABLE IF NOT EXISTS gro_criterios_auditoria (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  metodologia_id BIGINT REFERENCES gro_criterios_metodologia(id),
  versao_id BIGINT REFERENCES gro_criterios_versoes(id),
  acao VARCHAR(64) NOT NULL,
  detalhes_json JSONB NOT NULL DEFAULT '{}',
  usuario_id BIGINT,
  usuario_nome VARCHAR(256),
  ip VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gro_criterios_metodologia_tenant
  ON gro_criterios_metodologia(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_gro_criterios_versoes_met
  ON gro_criterios_versoes(metodologia_id, versao_num DESC);

CREATE INDEX IF NOT EXISTS idx_gro_criterios_auditoria_tenant
  ON gro_criterios_auditoria(tenant_id, created_at DESC);

ALTER TABLE inventario_riscos
  ADD COLUMN IF NOT EXISTS criterio_metodologia_id BIGINT REFERENCES gro_criterios_metodologia(id),
  ADD COLUMN IF NOT EXISTS criterio_versao_id BIGINT REFERENCES gro_criterios_versoes(id),
  ADD COLUMN IF NOT EXISTS aceitavel BOOLEAN;
