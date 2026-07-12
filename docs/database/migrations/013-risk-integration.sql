-- Integração NR-01 — Inventário ↔ GRO ↔ PGR ↔ AET ↔ Psicossocial ↔ SST
-- Relacionamentos reais entre módulos existentes (sem novos conceitos)

ALTER TABLE inventario_riscos
  ADD COLUMN IF NOT EXISTS origem_modulo VARCHAR(32),
  ADD COLUMN IF NOT EXISTS origem_entidade_id BIGINT;

ALTER TABLE inventario_riscos
  DROP CONSTRAINT IF EXISTS inventario_riscos_origem_modulo_check;
ALTER TABLE inventario_riscos
  ADD CONSTRAINT inventario_riscos_origem_modulo_check
  CHECK (origem_modulo IS NULL OR origem_modulo IN (
    'ANALISE', 'AET', 'PSICOSSOCIAL', 'INSPECAO', 'AUDITORIA', 'NC', 'MANUAL'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventario_origem_unique
  ON inventario_riscos(tenant_id, origem_modulo, origem_entidade_id)
  WHERE deleted_at IS NULL
    AND origem_modulo IS NOT NULL
    AND origem_entidade_id IS NOT NULL;

ALTER TABLE analises
  ADD COLUMN IF NOT EXISTS inventario_risco_id BIGINT REFERENCES inventario_riscos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_analises_inventario_risco
  ON analises(inventario_risco_id) WHERE inventario_risco_id IS NOT NULL;

ALTER TABLE aet_processos
  ADD COLUMN IF NOT EXISTS inventario_risco_id BIGINT REFERENCES inventario_riscos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_aet_processos_inventario_risco
  ON aet_processos(inventario_risco_id) WHERE inventario_risco_id IS NOT NULL;

ALTER TABLE psico_fatores_mte
  ADD COLUMN IF NOT EXISTS inventario_risco_id BIGINT REFERENCES inventario_riscos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_psico_fatores_inventario_risco
  ON psico_fatores_mte(inventario_risco_id) WHERE inventario_risco_id IS NOT NULL;

ALTER TABLE psico_plano_acao
  ADD COLUMN IF NOT EXISTS inventario_risco_id BIGINT REFERENCES inventario_riscos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gro_plano_acao_id BIGINT REFERENCES gro_plano_acao(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_psico_plano_inventario_risco
  ON psico_plano_acao(inventario_risco_id) WHERE deleted_at IS NULL AND inventario_risco_id IS NOT NULL;

ALTER TABLE psico_respostas
  ADD COLUMN IF NOT EXISTS inventario_risco_id BIGINT REFERENCES inventario_riscos(id) ON DELETE SET NULL;

ALTER TABLE sst_inspecoes
  DROP CONSTRAINT IF EXISTS sst_inspecoes_inventario_risco_id_fkey;
ALTER TABLE sst_inspecoes
  ADD CONSTRAINT sst_inspecoes_inventario_risco_id_fkey
  FOREIGN KEY (inventario_risco_id) REFERENCES inventario_riscos(id) ON DELETE SET NULL;

ALTER TABLE sst_nao_conformidades
  DROP CONSTRAINT IF EXISTS sst_nao_conformidades_inventario_risco_id_fkey;
ALTER TABLE sst_nao_conformidades
  ADD CONSTRAINT sst_nao_conformidades_inventario_risco_id_fkey
  FOREIGN KEY (inventario_risco_id) REFERENCES inventario_riscos(id) ON DELETE SET NULL;

ALTER TABLE sst_capa
  DROP CONSTRAINT IF EXISTS sst_capa_inventario_risco_id_fkey;
ALTER TABLE sst_capa
  ADD CONSTRAINT sst_capa_inventario_risco_id_fkey
  FOREIGN KEY (inventario_risco_id) REFERENCES inventario_riscos(id) ON DELETE SET NULL;

ALTER TABLE pgr_versoes
  ADD COLUMN IF NOT EXISTS requer_atualizacao BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_pgr_versoes_requer_atualizacao
  ON pgr_versoes(tenant_id, requer_atualizacao)
  WHERE status IN ('RASCUNHO', 'EM_REVISAO', 'APROVADO');

-- Trilha de eventos internos de integração (reutiliza gro_historico — ação INTEGRACAO_*)
