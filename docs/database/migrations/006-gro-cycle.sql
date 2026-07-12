-- Ciclo GRO completo — NR-01 (Identificação → Avaliação → Controle → Monitoramento → Revisão)

ALTER TABLE inventario_riscos
  ADD COLUMN IF NOT EXISTS etapa_gro VARCHAR(32) NOT NULL DEFAULT 'IDENTIFICACAO'
  CHECK (etapa_gro IN ('IDENTIFICACAO', 'AVALIACAO', 'CONTROLE', 'MONITORAMENTO', 'REVISAO'));

CREATE INDEX IF NOT EXISTS idx_inventario_riscos_etapa_gro
  ON inventario_riscos(tenant_id, etapa_gro) WHERE deleted_at IS NULL;

-- Plano de ação vinculado ao inventário
CREATE TABLE IF NOT EXISTS gro_plano_acao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  inventario_risco_id BIGINT NOT NULL REFERENCES inventario_riscos(id),
  descricao TEXT NOT NULL,
  tipo_controle VARCHAR(32) NOT NULL CHECK (tipo_controle IN (
    'ELIMINACAO', 'SUBSTITUICAO', 'ENGENHARIA', 'ADMINISTRATIVA', 'EPI'
  )),
  responsavel VARCHAR(255),
  prazo DATE,
  status VARCHAR(32) NOT NULL DEFAULT 'aberto' CHECK (status IN (
    'aberto', 'andamento', 'concluido', 'atrasado', 'cancelado'
  )),
  evidencia TEXT,
  data_conclusao DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gro_plano_tenant
  ON gro_plano_acao(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_gro_plano_risco
  ON gro_plano_acao(inventario_risco_id) WHERE deleted_at IS NULL;

-- Indicadores de monitoramento
CREATE TABLE IF NOT EXISTS gro_indicadores (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  inventario_risco_id BIGINT REFERENCES inventario_riscos(id),
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(32) NOT NULL CHECK (tipo IN ('LEADING', 'LAGGING')),
  meta NUMERIC(12, 2),
  valor_atual NUMERIC(12, 2),
  unidade VARCHAR(64),
  frequencia VARCHAR(32) NOT NULL DEFAULT 'mensal',
  ultima_medicao DATE,
  proxima_medicao DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gro_indicadores_tenant
  ON gro_indicadores(tenant_id) WHERE deleted_at IS NULL;

-- Histórico / trilha de auditoria GRO
CREATE TABLE IF NOT EXISTS gro_historico (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  inventario_risco_id BIGINT REFERENCES inventario_riscos(id),
  plano_acao_id BIGINT REFERENCES gro_plano_acao(id),
  indicador_id BIGINT REFERENCES gro_indicadores(id),
  etapa VARCHAR(32),
  acao VARCHAR(128) NOT NULL,
  usuario_id INT,
  usuario_nome VARCHAR(255),
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gro_historico_tenant
  ON gro_historico(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gro_historico_risco
  ON gro_historico(inventario_risco_id, created_at DESC);

-- Relatórios GRO persistidos
CREATE TABLE IF NOT EXISTS gro_relatorios (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  tipo VARCHAR(64) NOT NULL CHECK (tipo IN (
    'CICLO_COMPLETO', 'INVENTARIO', 'PLANO_ACAO', 'INDICADORES', 'DOSSIE_GRO'
  )),
  titulo VARCHAR(512) NOT NULL,
  conteudo_json JSONB NOT NULL,
  gerado_por VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gro_relatorios_tenant
  ON gro_relatorios(tenant_id, created_at DESC);
