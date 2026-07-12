-- Estrutura Organizacional NR-01 — Empresa → Unidade → Setor → Função → Atividade → Posto → Colaborador
-- Hierarquia obrigatória para Inventário de Riscos, GRO e PGR

CREATE TABLE IF NOT EXISTS empresas (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       VARCHAR(64) NOT NULL UNIQUE REFERENCES tenants(tenant_id),
  razao_social    VARCHAR(255) NOT NULL,
  nome_fantasia   VARCHAR(255),
  cnpj            VARCHAR(18),
  inscricao_estadual VARCHAR(32),
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_empresas_tenant ON empresas(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS unidades (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  empresa_id      BIGINT NOT NULL REFERENCES empresas(id),
  nome            VARCHAR(255) NOT NULL,
  tipo            VARCHAR(32) NOT NULL DEFAULT 'MATRIZ' CHECK (tipo IN ('MATRIZ', 'FILIAL', 'OBRA', 'UNIDADE_OPERACIONAL')),
  cnpj            VARCHAR(18),
  endereco        TEXT,
  cidade          VARCHAR(128),
  uf              CHAR(2),
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE(tenant_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_unidades_tenant ON unidades(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_unidades_empresa ON unidades(empresa_id) WHERE deleted_at IS NULL;

ALTER TABLE setores ADD COLUMN IF NOT EXISTS unidade_id BIGINT REFERENCES unidades(id);
ALTER TABLE setores ADD COLUMN IF NOT EXISTS responsavel VARCHAR(255);
ALTER TABLE setores ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS funcoes (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  setor_id        BIGINT NOT NULL REFERENCES setores(id),
  nome            VARCHAR(255) NOT NULL,
  descricao       TEXT,
  cbo             VARCHAR(16),
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE(tenant_id, setor_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_funcoes_tenant ON funcoes(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_funcoes_setor ON funcoes(setor_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS atividades (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  funcao_id       BIGINT NOT NULL REFERENCES funcoes(id),
  nome            VARCHAR(255) NOT NULL,
  descricao       TEXT,
  frequencia      VARCHAR(64),
  duracao_minutos INTEGER CHECK (duracao_minutos IS NULL OR duracao_minutos >= 0),
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE(tenant_id, funcao_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_atividades_tenant ON atividades(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_atividades_funcao ON atividades(funcao_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS postos_trabalho (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  atividade_id    BIGINT NOT NULL REFERENCES atividades(id),
  nome            VARCHAR(255) NOT NULL,
  descricao       TEXT,
  localizacao     VARCHAR(255),
  tipo_posto      VARCHAR(64),
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE(tenant_id, atividade_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_postos_tenant ON postos_trabalho(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_postos_atividade ON postos_trabalho(atividade_id) WHERE deleted_at IS NULL;

ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS funcao_id BIGINT REFERENCES funcoes(id);
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS posto_trabalho_id BIGINT REFERENCES postos_trabalho(id);

ALTER TABLE inventario_riscos ADD COLUMN IF NOT EXISTS unidade_id BIGINT REFERENCES unidades(id);
ALTER TABLE inventario_riscos ADD COLUMN IF NOT EXISTS funcao_id BIGINT REFERENCES funcoes(id);
ALTER TABLE inventario_riscos ADD COLUMN IF NOT EXISTS atividade_id BIGINT REFERENCES atividades(id);
ALTER TABLE inventario_riscos ADD COLUMN IF NOT EXISTS posto_trabalho_id BIGINT REFERENCES postos_trabalho(id);

CREATE INDEX IF NOT EXISTS idx_inventario_org_unidade ON inventario_riscos(tenant_id, unidade_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventario_org_posto ON inventario_riscos(tenant_id, posto_trabalho_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE empresas IS 'Empresa (tenant operacional) — base da estrutura NR-01';
COMMENT ON TABLE unidades IS 'Unidades / estabelecimentos (matriz, filial, obra)';
COMMENT ON TABLE funcoes IS 'Funções / cargos vinculados ao setor';
COMMENT ON TABLE atividades IS 'Atividades ergonômicas vinculadas à função';
COMMENT ON TABLE postos_trabalho IS 'Postos de trabalho vinculados à atividade';
