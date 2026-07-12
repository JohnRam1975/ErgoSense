-- Canal de Denúncia Corporativo — LGPD · NR-01 · Psicossocial · GRO · PGR

ALTER TABLE inventario_riscos
  DROP CONSTRAINT IF EXISTS inventario_riscos_origem_modulo_check;
ALTER TABLE inventario_riscos
  ADD CONSTRAINT inventario_riscos_origem_modulo_check
  CHECK (origem_modulo IS NULL OR origem_modulo IN (
    'ANALISE', 'AET', 'PSICOSSOCIAL', 'INSPECAO', 'AUDITORIA', 'NC', 'MANUAL', 'DENUNCIA'
  ));

CREATE TABLE IF NOT EXISTS denuncias (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  protocolo VARCHAR(32) NOT NULL,
  tipo VARCHAR(32) NOT NULL CHECK (tipo IN (
    'ASSEDIO_MORAL', 'ASSEDIO_SEXUAL', 'VIOLENCIA', 'DISCRIMINACAO', 'SOBRECARGA_PSICOLOGICA'
  )),
  modalidade VARCHAR(16) NOT NULL CHECK (modalidade IN ('ANONIMA', 'IDENTIFICADA')),
  status VARCHAR(32) NOT NULL DEFAULT 'RECEBIDA' CHECK (status IN (
    'RECEBIDA', 'EM_TRIAGEM', 'EM_INVESTIGACAO', 'EM_TRATATIVA', 'CONCLUIDA', 'ARQUIVADA'
  )),
  gravidade VARCHAR(16) NOT NULL DEFAULT 'medio' CHECK (gravidade IN ('critico','alto','medio','baixo')),
  setor_id BIGINT REFERENCES setores(id),
  unidade_id BIGINT REFERENCES unidades(id),
  descricao TEXT NOT NULL,
  relato_local TEXT,
  data_ocorrencia DATE,
  denunciante_nome VARCHAR(255),
  denunciante_email VARCHAR(255),
  denunciante_telefone VARCHAR(64),
  colaborador_id BIGINT REFERENCES colaboradores(id),
  lgpd_consentimento BOOLEAN NOT NULL DEFAULT FALSE,
  lgpd_base_legal VARCHAR(128) NOT NULL DEFAULT 'obrigacao_legal',
  lgpd_finalidade TEXT NOT NULL DEFAULT 'Investigação de conduta no ambiente de trabalho conforme NR-01 e legislação trabalhista.',
  lgpd_retencao_ate DATE,
  ip_anonimizado VARCHAR(45),
  acesso_token_hash VARCHAR(64),
  inventario_risco_id BIGINT REFERENCES inventario_riscos(id) ON DELETE SET NULL,
  gro_plano_acao_id BIGINT REFERENCES gro_plano_acao(id) ON DELETE SET NULL,
  psico_fator_id BIGINT REFERENCES psico_fatores_mte(id) ON DELETE SET NULL,
  investigador_id INT,
  investigador_nome VARCHAR(255),
  conclusao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (tenant_id, protocolo)
);

CREATE INDEX IF NOT EXISTS idx_denuncias_tenant_status ON denuncias(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_denuncias_tenant_tipo ON denuncias(tenant_id, tipo) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_denuncias_protocolo ON denuncias(tenant_id, protocolo);
CREATE INDEX IF NOT EXISTS idx_denuncias_token ON denuncias(acesso_token_hash) WHERE acesso_token_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS denuncia_evidencias (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  denuncia_id BIGINT NOT NULL REFERENCES denuncias(id) ON DELETE CASCADE,
  tipo VARCHAR(64) NOT NULL DEFAULT 'DOCUMENTO',
  descricao TEXT NOT NULL,
  referencia TEXT,
  hash_sha256 VARCHAR(128),
  meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  registrado_por INT,
  registrado_nome VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_denuncia_evidencias_denuncia ON denuncia_evidencias(denuncia_id);

CREATE TABLE IF NOT EXISTS denuncia_tratativas (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  denuncia_id BIGINT NOT NULL REFERENCES denuncias(id) ON DELETE CASCADE,
  tipo VARCHAR(32) NOT NULL CHECK (tipo IN (
    'TRIAGEM', 'INVESTIGACAO', 'MEDIDA_CAUTELAR', 'CORRETIVA', 'ACOMPANHAMENTO', 'ENCERRAMENTO'
  )),
  descricao TEXT NOT NULL,
  responsavel VARCHAR(255),
  prazo DATE,
  status VARCHAR(32) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','andamento','concluido','cancelado')),
  resultado TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_denuncia_tratativas_denuncia ON denuncia_tratativas(denuncia_id);

CREATE TABLE IF NOT EXISTS denuncia_historico (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  denuncia_id BIGINT NOT NULL REFERENCES denuncias(id) ON DELETE CASCADE,
  acao VARCHAR(128) NOT NULL,
  usuario_id INT,
  usuario_nome VARCHAR(255),
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_denuncia_historico_denuncia ON denuncia_historico(denuncia_id, created_at DESC);
