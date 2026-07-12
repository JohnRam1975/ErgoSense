-- NR-01 §1.5.7.3.2 — Inventário de Riscos (exposição, GHE, evidências, vínculos obrigatórios)

ALTER TABLE inventario_riscos
  ADD COLUMN IF NOT EXISTS exposicao_duracao TEXT,
  ADD COLUMN IF NOT EXISTS exposicao_frequencia TEXT,
  ADD COLUMN IF NOT EXISTS exposicao_intensidade TEXT,
  ADD COLUMN IF NOT EXISTS numero_trabalhadores_expostos INTEGER NOT NULL DEFAULT 1
    CHECK (numero_trabalhadores_expostos >= 0),
  ADD COLUMN IF NOT EXISTS grupo_homogeneo_exposicao VARCHAR(512),
  ADD COLUMN IF NOT EXISTS medidas_existentes TEXT,
  ADD COLUMN IF NOT EXISTS evidencias_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS analise_id BIGINT REFERENCES analises(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aet_processo_id BIGINT REFERENCES aet_processos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pgr_versao_id BIGINT REFERENCES pgr_versoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventario_analise
  ON inventario_riscos(tenant_id, analise_id) WHERE analise_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventario_aet
  ON inventario_riscos(tenant_id, aet_processo_id) WHERE aet_processo_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventario_pgr_versao
  ON inventario_riscos(tenant_id, pgr_versao_id) WHERE pgr_versao_id IS NOT NULL AND deleted_at IS NULL;

-- Vínculos formais Inventário ↔ Análise ↔ AET ↔ GRO ↔ PGR
CREATE TABLE IF NOT EXISTS inventario_vinculos (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  inventario_risco_id BIGINT NOT NULL REFERENCES inventario_riscos(id) ON DELETE CASCADE,
  modulo VARCHAR(32) NOT NULL CHECK (modulo IN ('ANALISE', 'AET', 'GRO', 'PGR')),
  entidade_id BIGINT NOT NULL,
  rotulo VARCHAR(512),
  obrigatorio BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (inventario_risco_id, modulo, entidade_id)
);

CREATE INDEX IF NOT EXISTS idx_inventario_vinculos_tenant
  ON inventario_vinculos(tenant_id, inventario_risco_id);

CREATE INDEX IF NOT EXISTS idx_inventario_vinculos_modulo
  ON inventario_vinculos(tenant_id, modulo, entidade_id);
