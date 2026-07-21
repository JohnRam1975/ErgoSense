-- eSocial — S-2210 · S-2220 · S-2240
-- Histórico · Validação · Assinaturas · Integração gov.br (preparada)

CREATE TABLE IF NOT EXISTS esocial_config (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  tp_insc SMALLINT NOT NULL DEFAULT 1 CHECK (tp_insc IN (1, 2)),
  nr_insc VARCHAR(20) NOT NULL,
  razao_social VARCHAR(255),
  ambiente SMALLINT NOT NULL DEFAULT 2 CHECK (ambiente IN (1, 2)),
  proc_emi SMALLINT NOT NULL DEFAULT 1 CHECK (proc_emi IN (1, 2, 3, 4, 8, 9)),
  ver_proc VARCHAR(20) NOT NULL DEFAULT 'ErgoSense 1.0',
  certificado_serial VARCHAR(128),
  certificado_validade DATE,
  govbr_endpoint_prod VARCHAR(512) DEFAULT 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc',
  govbr_endpoint_restrito VARCHAR(512) DEFAULT 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc',
  govbr_habilitado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_esocial_config_tenant ON esocial_config(tenant_id);

CREATE TABLE IF NOT EXISTS esocial_eventos (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  tipo_evento VARCHAR(16) NOT NULL CHECK (tipo_evento IN ('S-2210', 'S-2220', 'S-2240')),
  evento_id VARCHAR(40) NOT NULL,
  colaborador_id BIGINT REFERENCES colaboradores(id),
  analise_id BIGINT REFERENCES analises(id) ON DELETE SET NULL,
  inventario_risco_id BIGINT REFERENCES inventario_riscos(id) ON DELETE SET NULL,
  dados_json JSONB NOT NULL DEFAULT '{}',
  xml_gerado TEXT,
  xml_assinado TEXT,
  hash_documento VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN (
    'RASCUNHO', 'VALIDADO', 'ASSINADO', 'PRONTO_ENVIO', 'ENVIADO', 'ACEITO', 'REJEITADO', 'CANCELADO'
  )),
  validacao_ok BOOLEAN DEFAULT FALSE,
  validacao_erros JSONB DEFAULT '[]',
  govbr_protocolo VARCHAR(128),
  govbr_lote_id VARCHAR(128),
  govbr_mensagem TEXT,
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_esocial_eventos_tenant ON esocial_eventos(tenant_id, tipo_evento) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_esocial_eventos_status ON esocial_eventos(tenant_id, status) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_esocial_eventos_evento_id ON esocial_eventos(tenant_id, evento_id);

CREATE TABLE IF NOT EXISTS esocial_assinaturas (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  evento_id BIGINT NOT NULL REFERENCES esocial_eventos(id) ON DELETE CASCADE,
  tipo VARCHAR(32) NOT NULL CHECK (tipo IN ('EMITENTE', 'RESPONSAVEL_TECNICO', 'MEDICO', 'REPRESENTANTE_LEGAL')),
  nome VARCHAR(255) NOT NULL,
  documento VARCHAR(64),
  registro_profissional VARCHAR(64),
  hash_documento VARCHAR(128) NOT NULL,
  certificado_serial VARCHAR(128),
  assinado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id INT,
  ip_assinatura VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_esocial_assinaturas_evento ON esocial_assinaturas(evento_id);

CREATE TABLE IF NOT EXISTS esocial_historico (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  evento_id BIGINT REFERENCES esocial_eventos(id) ON DELETE SET NULL,
  acao VARCHAR(128) NOT NULL,
  usuario_id INT,
  usuario_nome VARCHAR(255),
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esocial_historico_tenant ON esocial_historico(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS esocial_validacoes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  evento_id BIGINT NOT NULL REFERENCES esocial_eventos(id) ON DELETE CASCADE,
  valido BOOLEAN NOT NULL,
  erros_json JSONB DEFAULT '[]',
  avisos_json JSONB DEFAULT '[]',
  schema_versao VARCHAR(32) DEFAULT 'S-1.3',
  validado_por VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esocial_validacoes_evento ON esocial_validacoes(evento_id, created_at DESC);
