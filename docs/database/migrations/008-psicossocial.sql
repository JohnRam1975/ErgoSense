-- Psicossocial — NR-01 / Guia MTE 2025 / LGPD
-- Questionários · Fatores MTE · Indicadores · Alertas · Histórico

CREATE TABLE IF NOT EXISTS psico_fatores_mte (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  fator_codigo VARCHAR(8) NOT NULL,
  setor_id BIGINT REFERENCES setores(id),
  probabilidade SMALLINT CHECK (probabilidade IS NULL OR probabilidade BETWEEN 1 AND 5),
  severidade SMALLINT CHECK (severidade IS NULL OR severidade BETWEEN 1 AND 5),
  score SMALLINT CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  nivel_risco VARCHAR(16) CHECK (nivel_risco IS NULL OR nivel_risco IN ('critico','alto','medio','baixo')),
  observacoes TEXT,
  avaliado_por INT,
  avaliado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_psico_fatores_tenant_codigo
  ON psico_fatores_mte(tenant_id, fator_codigo);

CREATE INDEX IF NOT EXISTS idx_psico_fatores_tenant ON psico_fatores_mte(tenant_id);

CREATE TABLE IF NOT EXISTS psico_campanhas (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  tipo VARCHAR(32) NOT NULL CHECK (tipo IN ('COPSOQ_III','HSE','BURNOUT','CLIMA')),
  titulo VARCHAR(255) NOT NULL,
  setor_id BIGINT REFERENCES setores(id),
  anonima BOOLEAN NOT NULL DEFAULT TRUE,
  consentimento_texto TEXT,
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  data_inicio DATE,
  data_fim DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psico_campanhas_tenant ON psico_campanhas(tenant_id, tipo);

CREATE TABLE IF NOT EXISTS psico_respostas (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  campanha_id BIGINT REFERENCES psico_campanhas(id),
  tipo_questionario VARCHAR(32) NOT NULL CHECK (tipo_questionario IN ('COPSOQ_III','HSE','BURNOUT','CLIMA')),
  setor_id BIGINT REFERENCES setores(id),
  respostas_json JSONB NOT NULL DEFAULT '{}',
  score_global SMALLINT,
  nivel_risco VARCHAR(16),
  dimensoes_json JSONB,
  consentimento_lgpd BOOLEAN NOT NULL DEFAULT FALSE,
  consentimento_em TIMESTAMPTZ,
  participante_hash VARCHAR(64),
  ip_anonimizado VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psico_respostas_tenant ON psico_respostas(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_psico_respostas_tipo ON psico_respostas(tenant_id, tipo_questionario);

CREATE TABLE IF NOT EXISTS psico_indicadores (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  tipo_questionario VARCHAR(32) NOT NULL,
  indicador_key VARCHAR(128) NOT NULL,
  indicador_label VARCHAR(255),
  valor NUMERIC(10,2) NOT NULL,
  nivel_risco VARCHAR(16),
  periodo DATE NOT NULL,
  amostra_n INT NOT NULL DEFAULT 1,
  setor_id BIGINT REFERENCES setores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psico_indicadores_trend
  ON psico_indicadores(tenant_id, tipo_questionario, indicador_key, periodo DESC);

CREATE TABLE IF NOT EXISTS psico_alertas (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  severidade VARCHAR(16) NOT NULL CHECK (severidade IN ('critico','alto','medio','baixo','info')),
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT NOT NULL,
  tipo_origem VARCHAR(64),
  origem_id BIGINT,
  lido BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psico_alertas_tenant ON psico_alertas(tenant_id, lido, created_at DESC);

CREATE TABLE IF NOT EXISTS psico_plano_acao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  fator_codigo VARCHAR(8),
  descricao TEXT NOT NULL,
  responsavel VARCHAR(255),
  prazo DATE,
  status VARCHAR(32) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','andamento','concluido','atrasado','cancelado')),
  prioridade VARCHAR(16) CHECK (prioridade IN ('critico','alto','medio','baixo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_psico_plano_tenant ON psico_plano_acao(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS psico_historico (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  acao VARCHAR(128) NOT NULL,
  usuario_id INT,
  usuario_nome VARCHAR(255),
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psico_historico_tenant ON psico_historico(tenant_id, created_at DESC);
