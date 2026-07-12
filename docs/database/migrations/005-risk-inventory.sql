-- Inventário de Riscos — NR-01 / GRO (Portaria MTE 1.419/2024)
-- Tipos: FISICO, QUIMICO, BIOLOGICO, ERGONOMICO, ACIDENTE, PSICOSSOCIAL

CREATE TABLE IF NOT EXISTS inventario_riscos (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  tipo VARCHAR(32) NOT NULL CHECK (tipo IN (
    'FISICO', 'QUIMICO', 'BIOLOGICO', 'ERGONOMICO', 'ACIDENTE', 'PSICOSSOCIAL'
  )),
  setor_id BIGINT REFERENCES setores(id),
  colaborador_id BIGINT REFERENCES colaboradores(id),
  fonte_geradora TEXT NOT NULL,
  perigo TEXT NOT NULL,
  consequencia TEXT NOT NULL,
  probabilidade SMALLINT NOT NULL CHECK (probabilidade BETWEEN 1 AND 5),
  severidade SMALLINT NOT NULL CHECK (severidade BETWEEN 1 AND 5),
  score_risco SMALLINT NOT NULL CHECK (score_risco BETWEEN 1 AND 25),
  nivel_risco VARCHAR(16) NOT NULL CHECK (nivel_risco IN ('critico', 'alto', 'medio', 'baixo')),
  medidas_controle TEXT,
  responsavel VARCHAR(255),
  data_revisao DATE,
  status VARCHAR(32) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'revisao', 'arquivado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inventario_riscos_tenant
  ON inventario_riscos(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventario_riscos_tipo
  ON inventario_riscos(tenant_id, tipo) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventario_riscos_nivel
  ON inventario_riscos(tenant_id, nivel_risco) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventario_riscos_revisao
  ON inventario_riscos(tenant_id, data_revisao) WHERE deleted_at IS NULL;
