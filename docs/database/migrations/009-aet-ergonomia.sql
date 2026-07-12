-- AET — Análise Ergonômica do Trabalho (NR-17)
-- Mobiliário · Equipamentos · Vibração · Teleatendimento · Organização · Métodos

CREATE TABLE IF NOT EXISTS aet_mobiliario (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  setor_id BIGINT REFERENCES setores(id),
  tipo VARCHAR(64) NOT NULL,
  descricao VARCHAR(512) NOT NULL,
  marca VARCHAR(128),
  modelo VARCHAR(128),
  regulagens_json JSONB DEFAULT '{}',
  conformidade_nr17 VARCHAR(32) DEFAULT 'nao_avaliado' CHECK (conformidade_nr17 IN ('conforme','parcial','nao_conforme','nao_avaliado')),
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_aet_mobiliario_tenant ON aet_mobiliario(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS aet_equipamentos (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  setor_id BIGINT REFERENCES setores(id),
  tipo VARCHAR(64) NOT NULL,
  identificacao VARCHAR(128) NOT NULL,
  descricao TEXT,
  fabricante VARCHAR(128),
  emite_vibracao BOOLEAN DEFAULT FALSE,
  manutencao_em DATE,
  conformidade_nr17 VARCHAR(32) DEFAULT 'nao_avaliado' CHECK (conformidade_nr17 IN ('conforme','parcial','nao_conforme','nao_avaliado')),
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_aet_equipamentos_tenant ON aet_equipamentos(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS aet_processos (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  titulo VARCHAR(512) NOT NULL,
  colaborador_id BIGINT REFERENCES colaboradores(id),
  setor_id BIGINT REFERENCES setores(id),
  analise_id BIGINT REFERENCES analises(id),
  status VARCHAR(32) NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN (
    'RASCUNHO','EM_ANDAMENTO','EM_REVISAO','ASSINADO','ARQUIVADO'
  )),
  etapa_atual VARCHAR(64) NOT NULL DEFAULT 'CARACTERIZACAO' CHECK (etapa_atual IN (
    'CARACTERIZACAO','POSTO_MOBILIARIO','METODOS_POSTURAIS','METODOS_CARGA',
    'VIBRACAO','TELEATENDIMENTO','ORGANIZACAO','CONSOLIDACAO','REVISAO','ASSINADO'
  )),
  caracterizacao_json JSONB DEFAULT '{}',
  vibracao_corpo_json JSONB DEFAULT '{}',
  vibracao_maos_json JSONB DEFAULT '{}',
  teleatendimento_json JSONB DEFAULT '{}',
  organizacao_json JSONB DEFAULT '{}',
  metodos_json JSONB DEFAULT '{}',
  mobiliario_ids BIGINT[] DEFAULT '{}',
  equipamento_ids BIGINT[] DEFAULT '{}',
  relatorio_json JSONB,
  plano_acao_json JSONB DEFAULT '[]',
  elaborado_por VARCHAR(255),
  revisado_por VARCHAR(255),
  ergonomista_nome VARCHAR(255),
  ergonomista_registro VARCHAR(128),
  assinado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_aet_processos_tenant ON aet_processos(tenant_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS aet_historico (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  processo_id BIGINT REFERENCES aet_processos(id),
  acao VARCHAR(128) NOT NULL,
  etapa VARCHAR(64),
  usuario_id INT,
  usuario_nome VARCHAR(255),
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aet_historico_tenant ON aet_historico(tenant_id, created_at DESC);
