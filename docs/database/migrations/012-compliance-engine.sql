-- Compliance Intelligence Engine — MTE · DOU · Fundacentro · eSocial
-- Detecção · Alertas · Impacto legal · Histórico versionado
-- REGRA: nunca aplicar regras automaticamente — exige validação humana

CREATE TABLE IF NOT EXISTS compliance_fontes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  codigo VARCHAR(32) NOT NULL CHECK (codigo IN ('MTE','DOU','FUNDACENTRO','ESOCIAL')),
  nome VARCHAR(128) NOT NULL,
  url_monitoramento VARCHAR(512),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  intervalo_horas INT NOT NULL DEFAULT 24,
  ultima_varredura TIMESTAMPTZ,
  ultimo_status VARCHAR(32) DEFAULT 'OK',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_compliance_fontes_tenant_codigo ON compliance_fontes(tenant_id, codigo);

CREATE TABLE IF NOT EXISTS compliance_normas (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  codigo VARCHAR(64) NOT NULL,
  titulo VARCHAR(512) NOT NULL,
  orgao VARCHAR(64) NOT NULL,
  fonte VARCHAR(32) NOT NULL CHECK (fonte IN ('MTE','DOU','FUNDACENTRO','ESOCIAL')),
  area VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'VIGENTE' CHECK (status IN ('VIGENTE','REVOGADA','SUSPENSA','PROPOSTA')),
  versao_atual_id BIGINT,
  modulos_impactados JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_compliance_normas_codigo ON compliance_normas(tenant_id, codigo) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_normas_fonte ON compliance_normas(tenant_id, fonte) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS compliance_norma_versoes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  norma_id BIGINT NOT NULL REFERENCES compliance_normas(id) ON DELETE CASCADE,
  numero_versao VARCHAR(32) NOT NULL,
  numero_sequencial INT NOT NULL DEFAULT 1,
  tipo_alteracao VARCHAR(32) NOT NULL CHECK (tipo_alteracao IN ('ORIGINAL','REVISAO','REVOGACAO','RETIFICACAO')),
  texto_resumo TEXT,
  texto_completo TEXT,
  data_publicacao DATE,
  data_vigencia DATE,
  referencia_dou VARCHAR(255),
  hash_conteudo VARCHAR(128),
  validada BOOLEAN NOT NULL DEFAULT FALSE,
  validada_por VARCHAR(255),
  validada_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_norma_versoes ON compliance_norma_versoes(norma_id, numero_sequencial DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_compliance_norma_ver_num ON compliance_norma_versoes(norma_id, numero_versao);

ALTER TABLE compliance_normas DROP CONSTRAINT IF EXISTS compliance_normas_versao_fk;
ALTER TABLE compliance_normas
  ADD CONSTRAINT compliance_normas_versao_fk
  FOREIGN KEY (versao_atual_id) REFERENCES compliance_norma_versoes(id);

CREATE TABLE IF NOT EXISTS compliance_deteccoes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  fonte VARCHAR(32) NOT NULL,
  tipo_evento VARCHAR(32) NOT NULL CHECK (tipo_evento IN ('NOVA_NORMA','REVISAO','REVOGACAO','RETIFICACAO')),
  norma_id BIGINT REFERENCES compliance_normas(id),
  codigo_norma VARCHAR(64),
  titulo VARCHAR(512) NOT NULL,
  resumo TEXT,
  url_origem VARCHAR(512),
  data_publicacao DATE,
  hash_deteccao VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'PENDENTE_VALIDACAO' CHECK (status IN (
    'PENDENTE_VALIDACAO','APROVADA','REJEITADA','ARQUIVADA'
  )),
  impacto_nivel VARCHAR(16) DEFAULT 'medio' CHECK (impacto_nivel IN ('baixo','medio','alto','critico')),
  modulos_afetados JSONB DEFAULT '[]',
  dados_json JSONB DEFAULT '{}',
  detectado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_deteccoes_tenant ON compliance_deteccoes(tenant_id, status, detectado_em DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_compliance_deteccoes_hash ON compliance_deteccoes(tenant_id, hash_deteccao);

CREATE TABLE IF NOT EXISTS compliance_alertas (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  deteccao_id BIGINT REFERENCES compliance_deteccoes(id) ON DELETE SET NULL,
  severidade VARCHAR(16) NOT NULL CHECK (severidade IN ('info','atencao','alto','critico')),
  titulo VARCHAR(512) NOT NULL,
  mensagem TEXT NOT NULL,
  lido BOOLEAN NOT NULL DEFAULT FALSE,
  lido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_alertas_tenant ON compliance_alertas(tenant_id, lido, created_at DESC);

CREATE TABLE IF NOT EXISTS compliance_impactos (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  deteccao_id BIGINT NOT NULL REFERENCES compliance_deteccoes(id) ON DELETE CASCADE,
  modulo VARCHAR(64) NOT NULL,
  descricao_impacto TEXT NOT NULL,
  acao_recomendada TEXT,
  prazo_dias INT,
  risco_legal VARCHAR(16) CHECK (risco_legal IN ('baixo','medio','alto','critico')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_impactos_deteccao ON compliance_impactos(deteccao_id);

CREATE TABLE IF NOT EXISTS compliance_validacoes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  deteccao_id BIGINT NOT NULL REFERENCES compliance_deteccoes(id) ON DELETE CASCADE,
  decisao VARCHAR(32) NOT NULL CHECK (decisao IN ('APROVAR','REJEITAR','SOLICITAR_REVISAO')),
  validador_nome VARCHAR(255) NOT NULL,
  validador_cargo VARCHAR(255),
  justificativa TEXT NOT NULL,
  aplicar_regras BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_validacoes_deteccao ON compliance_validacoes(deteccao_id);

CREATE TABLE IF NOT EXISTS compliance_relatorios (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  tipo VARCHAR(64) NOT NULL DEFAULT 'COMPLIANCE_INTEL',
  titulo VARCHAR(512) NOT NULL,
  conteudo_json JSONB NOT NULL DEFAULT '{}',
  gerado_por VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_relatorios_tenant ON compliance_relatorios(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS compliance_historico (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  entidade_tipo VARCHAR(64) NOT NULL,
  entidade_id BIGINT,
  acao VARCHAR(128) NOT NULL,
  usuario_nome VARCHAR(255),
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_historico_tenant ON compliance_historico(tenant_id, created_at DESC);
