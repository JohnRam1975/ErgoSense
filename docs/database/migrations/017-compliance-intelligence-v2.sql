-- Compliance Intelligence Engine v2 — agendamento · varreduras · impactos · tarefas · diff

CREATE TABLE IF NOT EXISTS compliance_agendamentos (
  tenant_id VARCHAR(64) PRIMARY KEY REFERENCES tenants(tenant_id),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  intervalo_horas INT NOT NULL DEFAULT 24,
  horario_preferido TIME DEFAULT '06:00',
  ultima_execucao TIMESTAMPTZ,
  proxima_execucao TIMESTAMPTZ,
  ultimo_resultado VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_varreduras (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  tipo VARCHAR(32) NOT NULL DEFAULT 'MANUAL' CHECK (tipo IN ('MANUAL', 'AGENDADA', 'INICIAL')),
  fontes JSONB DEFAULT '[]',
  detectadas INT NOT NULL DEFAULT 0,
  duplicadas INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'CONCLUIDA' CHECK (status IN ('EXECUTANDO', 'CONCLUIDA', 'ERRO')),
  duracao_ms INT,
  iniciada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concluida_em TIMESTAMPTZ,
  detalhes_json JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_compliance_varreduras_tenant ON compliance_varreduras(tenant_id, iniciada_em DESC);

ALTER TABLE compliance_deteccoes
  ADD COLUMN IF NOT EXISTS varredura_id BIGINT REFERENCES compliance_varreduras(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS compliance_impacto_sistema (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  deteccao_id BIGINT NOT NULL REFERENCES compliance_deteccoes(id) ON DELETE CASCADE,
  modulo VARCHAR(64) NOT NULL,
  componente VARCHAR(128),
  descricao TEXT NOT NULL,
  severidade VARCHAR(16) CHECK (severidade IN ('baixo', 'medio', 'alto', 'critico')),
  acao_sistema TEXT,
  requer_atualizacao BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_impacto_sistema_det ON compliance_impacto_sistema(deteccao_id);

CREATE TABLE IF NOT EXISTS compliance_impacto_clientes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  deteccao_id BIGINT NOT NULL REFERENCES compliance_deteccoes(id) ON DELETE CASCADE,
  perfil_cliente VARCHAR(64) NOT NULL,
  descricao TEXT NOT NULL,
  urgencia VARCHAR(16) CHECK (urgencia IN ('baixa', 'media', 'alta', 'critica')),
  comunicacao_sugerida TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_impacto_clientes_det ON compliance_impacto_clientes(deteccao_id);

CREATE TABLE IF NOT EXISTS compliance_adequacao_tarefas (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  deteccao_id BIGINT REFERENCES compliance_deteccoes(id) ON DELETE SET NULL,
  impacto_id BIGINT REFERENCES compliance_impactos(id) ON DELETE SET NULL,
  titulo VARCHAR(512) NOT NULL,
  descricao TEXT,
  modulo VARCHAR(64),
  responsavel VARCHAR(255),
  prazo DATE,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN (
    'PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'
  )),
  prioridade VARCHAR(16) DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
  origem VARCHAR(32) DEFAULT 'DETECCAO' CHECK (origem IN ('DETECCAO', 'APROVACAO', 'MANUAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_adequacao_tenant ON compliance_adequacao_tarefas(tenant_id, status, prazo);
