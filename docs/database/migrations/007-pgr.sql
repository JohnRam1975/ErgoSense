-- PGR — Programa de Gerenciamento de Riscos (NR-01)
-- Versionamento · Aprovação · Revisão · Assinaturas · Histórico

CREATE TABLE IF NOT EXISTS pgr_programas (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  titulo VARCHAR(512) NOT NULL DEFAULT 'Programa de Gerenciamento de Riscos',
  descricao TEXT,
  responsavel_tecnico VARCHAR(255),
  responsavel_legal VARCHAR(255),
  versao_ativa_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pgr_programas_tenant
  ON pgr_programas(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS pgr_versoes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  programa_id BIGINT NOT NULL REFERENCES pgr_programas(id),
  numero VARCHAR(32) NOT NULL,
  numero_sequencial INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN (
    'RASCUNHO', 'EM_REVISAO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'OBSOLETO'
  )),
  snapshot_json JSONB NOT NULL DEFAULT '{}',
  elaborado_por VARCHAR(255),
  revisado_por VARCHAR(255),
  data_elaboracao DATE,
  data_revisao DATE,
  proxima_revisao DATE,
  motivo_revisao TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pgr_versoes_tenant ON pgr_versoes(tenant_id, numero_sequencial DESC);
CREATE INDEX IF NOT EXISTS idx_pgr_versoes_programa ON pgr_versoes(programa_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pgr_versoes_numero ON pgr_versoes(programa_id, numero);

ALTER TABLE pgr_programas
  DROP CONSTRAINT IF EXISTS pgr_programas_versao_ativa_fk;
ALTER TABLE pgr_programas
  ADD CONSTRAINT pgr_programas_versao_ativa_fk
  FOREIGN KEY (versao_ativa_id) REFERENCES pgr_versoes(id);

CREATE TABLE IF NOT EXISTS pgr_aprovacoes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  versao_id BIGINT NOT NULL REFERENCES pgr_versoes(id) ON DELETE CASCADE,
  aprovador_nome VARCHAR(255) NOT NULL,
  aprovador_cargo VARCHAR(255),
  aprovador_email VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADO', 'REJEITADO')),
  data_decisao TIMESTAMPTZ,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pgr_aprovacoes_versao ON pgr_aprovacoes(versao_id);

CREATE TABLE IF NOT EXISTS pgr_assinaturas (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  versao_id BIGINT NOT NULL REFERENCES pgr_versoes(id) ON DELETE CASCADE,
  tipo VARCHAR(32) NOT NULL CHECK (tipo IN (
    'ELABORADOR', 'RESPONSAVEL_TECNICO', 'REPRESENTANTE_LEGAL', 'CIPA', 'SESMT'
  )),
  nome VARCHAR(255) NOT NULL,
  cargo VARCHAR(255),
  documento VARCHAR(64),
  declaracao TEXT,
  assinado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id INT
);

CREATE INDEX IF NOT EXISTS idx_pgr_assinaturas_versao ON pgr_assinaturas(versao_id);

CREATE TABLE IF NOT EXISTS pgr_historico (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  versao_id BIGINT REFERENCES pgr_versoes(id),
  acao VARCHAR(128) NOT NULL,
  usuario_id INT,
  usuario_nome VARCHAR(255),
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pgr_historico_tenant ON pgr_historico(tenant_id, created_at DESC);
