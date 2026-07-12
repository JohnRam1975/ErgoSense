-- SST — APR · EPI · EPC · Inspeções · Auditorias · NC · CAPA · Treinamentos
-- Integração NR-01 Inventário · PGR · GRO

CREATE TABLE IF NOT EXISTS sst_apr (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  titulo VARCHAR(512) NOT NULL,
  setor_id BIGINT REFERENCES setores(id),
  colaborador_id BIGINT REFERENCES colaboradores(id),
  inventario_risco_id BIGINT REFERENCES inventario_riscos(id),
  atividade TEXT,
  local_trabalho VARCHAR(255),
  etapas_json JSONB DEFAULT '[]',
  riscos_json JSONB DEFAULT '[]',
  medidas_json JSONB DEFAULT '[]',
  status VARCHAR(32) NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO','APROVADO','VIGENTE','REVISAO','ARQUIVADO')),
  elaborado_por VARCHAR(255),
  aprovado_em TIMESTAMPTZ,
  validade_em DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sst_apr_tenant ON sst_apr(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sst_epi (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  ca VARCHAR(64),
  tipo VARCHAR(128) NOT NULL,
  descricao VARCHAR(512) NOT NULL,
  fabricante VARCHAR(255),
  validade_ca DATE,
  inventario_risco_id BIGINT REFERENCES inventario_riscos(id),
  gro_plano_acao_id BIGINT REFERENCES gro_plano_acao(id),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sst_epi_tenant ON sst_epi(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sst_epi_entregas (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  epi_id BIGINT NOT NULL REFERENCES sst_epi(id),
  colaborador_id BIGINT NOT NULL REFERENCES colaboradores(id),
  data_entrega DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade INT NOT NULL DEFAULT 1,
  substituicao_prevista DATE,
  assinatura_confirmada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sst_epi_entregas ON sst_epi_entregas(tenant_id, colaborador_id);

CREATE TABLE IF NOT EXISTS sst_epc (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  setor_id BIGINT REFERENCES setores(id),
  inventario_risco_id BIGINT REFERENCES inventario_riscos(id),
  tipo VARCHAR(128) NOT NULL,
  descricao VARCHAR(512) NOT NULL,
  localizacao VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','manutencao','inativo')),
  manutencao_em DATE,
  conformidade VARCHAR(32) DEFAULT 'nao_avaliado' CHECK (conformidade IN ('conforme','parcial','nao_conforme','nao_avaliado')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sst_epc_tenant ON sst_epc(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sst_inspecoes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  titulo VARCHAR(512) NOT NULL,
  tipo VARCHAR(64) NOT NULL DEFAULT 'ROTINA',
  setor_id BIGINT REFERENCES setores(id),
  inventario_risco_id BIGINT REFERENCES inventario_riscos(id),
  data_programada DATE,
  data_realizada DATE,
  checklist_json JSONB DEFAULT '[]',
  resultado VARCHAR(32) CHECK (resultado IN ('conforme','nao_conforme','parcial','pendente')),
  responsavel VARCHAR(255),
  observacoes TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'programada' CHECK (status IN ('programada','realizada','atrasada','cancelada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sst_inspecoes_tenant ON sst_inspecoes(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sst_auditorias (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  titulo VARCHAR(512) NOT NULL,
  escopo TEXT,
  norma_referencia VARCHAR(255) DEFAULT 'NR-01 / ISO 45001',
  data_inicio DATE,
  data_fim DATE,
  auditores VARCHAR(512),
  achados_json JSONB DEFAULT '[]',
  status VARCHAR(32) NOT NULL DEFAULT 'planejada' CHECK (status IN ('planejada','em_andamento','concluida','cancelada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sst_auditorias_tenant ON sst_auditorias(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sst_nao_conformidades (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  titulo VARCHAR(512) NOT NULL,
  descricao TEXT NOT NULL,
  origem_tipo VARCHAR(64) CHECK (origem_tipo IN ('INSPECAO','AUDITORIA','APR','INCIDENTE','INTERNA','OUTRA')),
  origem_id BIGINT,
  inventario_risco_id BIGINT REFERENCES inventario_riscos(id),
  severidade VARCHAR(16) NOT NULL DEFAULT 'medio' CHECK (severidade IN ('critico','alto','medio','baixo')),
  status VARCHAR(32) NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','analise','tratamento','verificacao','fechada')),
  data_identificacao DATE NOT NULL DEFAULT CURRENT_DATE,
  responsavel VARCHAR(255),
  prazo DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sst_nc_tenant ON sst_nao_conformidades(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sst_capa (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  nc_id BIGINT REFERENCES sst_nao_conformidades(id),
  inventario_risco_id BIGINT REFERENCES inventario_riscos(id),
  gro_plano_acao_id BIGINT REFERENCES gro_plano_acao(id),
  tipo VARCHAR(32) NOT NULL DEFAULT 'CORRETIVA' CHECK (tipo IN ('CORRETIVA','PREVENTIVA')),
  descricao TEXT NOT NULL,
  causa_raiz TEXT,
  acao TEXT,
  responsavel VARCHAR(255),
  prazo DATE,
  status VARCHAR(32) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','andamento','concluido','verificado','cancelado')),
  evidencia TEXT,
  data_conclusao DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sst_capa_tenant ON sst_capa(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sst_capa_nc ON sst_capa(nc_id);

CREATE TABLE IF NOT EXISTS sst_treinamentos (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  titulo VARCHAR(512) NOT NULL,
  tipo VARCHAR(64) NOT NULL DEFAULT 'NR',
  conteudo TEXT,
  carga_horaria NUMERIC(5,1),
  data_programada DATE,
  data_realizada DATE,
  instrutor VARCHAR(255),
  inventario_risco_id BIGINT REFERENCES inventario_riscos(id),
  status VARCHAR(32) NOT NULL DEFAULT 'programado' CHECK (status IN ('programado','realizado','cancelado','atrasado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sst_treinamentos_tenant ON sst_treinamentos(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sst_treinamento_participantes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  treinamento_id BIGINT NOT NULL REFERENCES sst_treinamentos(id) ON DELETE CASCADE,
  colaborador_id BIGINT NOT NULL REFERENCES colaboradores(id),
  presente BOOLEAN DEFAULT FALSE,
  certificado_em DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sst_trein_part ON sst_treinamento_participantes(treinamento_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sst_trein_part_unique ON sst_treinamento_participantes(treinamento_id, colaborador_id);

CREATE TABLE IF NOT EXISTS sst_historico (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  entidade_tipo VARCHAR(64) NOT NULL,
  entidade_id BIGINT,
  acao VARCHAR(128) NOT NULL,
  usuario_id INT,
  usuario_nome VARCHAR(255),
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sst_historico_tenant ON sst_historico(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sst_relatorios (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  tipo VARCHAR(64) NOT NULL,
  titulo VARCHAR(512) NOT NULL,
  conteudo_json JSONB NOT NULL DEFAULT '{}',
  gerado_por VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sst_relatorios_tenant ON sst_relatorios(tenant_id, created_at DESC);
