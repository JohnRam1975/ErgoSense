-- AET Corporativo — Versionamento · Aprovação · Assinaturas · Rastreabilidade NR-01

ALTER TABLE aet_processos
  ADD COLUMN IF NOT EXISTS versao_ativa_id BIGINT,
  ADD COLUMN IF NOT EXISTS responsavel_tecnico_nome VARCHAR(255),
  ADD COLUMN IF NOT EXISTS responsavel_tecnico_crea VARCHAR(64),
  ADD COLUMN IF NOT EXISTS responsavel_tecnico_art VARCHAR(64),
  ADD COLUMN IF NOT EXISTS unidade_id BIGINT REFERENCES unidades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS posto_trabalho_id BIGINT REFERENCES postos_trabalho(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS funcao_id BIGINT REFERENCES funcoes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS psico_campanha_id BIGINT REFERENCES psico_campanhas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hash_documento VARCHAR(128);

CREATE TABLE IF NOT EXISTS aet_versoes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  processo_id BIGINT NOT NULL REFERENCES aet_processos(id) ON DELETE CASCADE,
  numero VARCHAR(32) NOT NULL,
  numero_sequencial INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN (
    'RASCUNHO', 'EM_REVISAO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'OBSOLETO'
  )),
  snapshot_json JSONB NOT NULL DEFAULT '{}',
  relatorio_json JSONB,
  hash_documento VARCHAR(128),
  elaborado_por VARCHAR(255),
  revisado_por VARCHAR(255),
  data_elaboracao DATE,
  data_revisao DATE,
  proxima_revisao DATE,
  motivo_revisao TEXT,
  observacoes TEXT,
  responsavel_tecnico_nome VARCHAR(255),
  responsavel_tecnico_crea VARCHAR(64),
  responsavel_tecnico_art VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aet_versoes_processo ON aet_versoes(processo_id, numero_sequencial DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_aet_versoes_numero ON aet_versoes(processo_id, numero);

ALTER TABLE aet_processos
  DROP CONSTRAINT IF EXISTS aet_processos_versao_ativa_fk;
ALTER TABLE aet_processos
  ADD CONSTRAINT aet_processos_versao_ativa_fk
  FOREIGN KEY (versao_ativa_id) REFERENCES aet_versoes(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS aet_aprovacoes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  versao_id BIGINT NOT NULL REFERENCES aet_versoes(id) ON DELETE CASCADE,
  aprovador_nome VARCHAR(255) NOT NULL,
  aprovador_cargo VARCHAR(255),
  aprovador_email VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADO', 'REJEITADO')),
  data_decisao TIMESTAMPTZ,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aet_aprovacoes_versao ON aet_aprovacoes(versao_id);

CREATE TABLE IF NOT EXISTS aet_assinaturas (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  versao_id BIGINT NOT NULL REFERENCES aet_versoes(id) ON DELETE CASCADE,
  tipo VARCHAR(32) NOT NULL CHECK (tipo IN (
    'ELABORADOR', 'RESPONSAVEL_TECNICO', 'ERGONOMISTA', 'REPRESENTANTE_LEGAL', 'SESMT', 'CIPA'
  )),
  nome VARCHAR(255) NOT NULL,
  cargo VARCHAR(255),
  documento VARCHAR(64),
  declaracao TEXT,
  hash_documento VARCHAR(128),
  assinado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id INT
);

CREATE INDEX IF NOT EXISTS idx_aet_assinaturas_versao ON aet_assinaturas(versao_id);

CREATE TABLE IF NOT EXISTS aet_integracoes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  processo_id BIGINT NOT NULL REFERENCES aet_processos(id) ON DELETE CASCADE,
  versao_id BIGINT REFERENCES aet_versoes(id) ON DELETE SET NULL,
  modulo VARCHAR(32) NOT NULL CHECK (modulo IN ('INVENTARIO', 'GRO', 'PGR', 'PSICOSSOCIAL')),
  entidade_id BIGINT NOT NULL,
  referencia VARCHAR(512),
  detalhes_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aet_integracoes_processo ON aet_integracoes(processo_id, created_at DESC);

ALTER TABLE aet_historico
  ADD COLUMN IF NOT EXISTS versao_id BIGINT REFERENCES aet_versoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_aet_historico_versao ON aet_historico(versao_id) WHERE versao_id IS NOT NULL;
