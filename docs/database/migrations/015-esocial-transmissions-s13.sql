-- eSocial S-1.3 — Transmissões · Erros · Reenvio · Status de processamento

ALTER TABLE esocial_config ADD COLUMN IF NOT EXISTS certificado_pfx_path VARCHAR(512);
ALTER TABLE esocial_config ADD COLUMN IF NOT EXISTS certificado_senha_env VARCHAR(64) DEFAULT 'ESOCIAL_PFX_PASSWORD';
ALTER TABLE esocial_config ADD COLUMN IF NOT EXISTS govbr_modo VARCHAR(16) NOT NULL DEFAULT 'MOCK' CHECK (govbr_modo IN ('MOCK', 'HTTP'));

ALTER TABLE esocial_eventos ADD COLUMN IF NOT EXISTS status_processamento VARCHAR(32) NOT NULL DEFAULT 'NAO_ENVIADO';
ALTER TABLE esocial_eventos ADD COLUMN IF NOT EXISTS ultima_transmissao_id BIGINT;
ALTER TABLE esocial_eventos ADD COLUMN IF NOT EXISTS tentativas_envio SMALLINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS esocial_transmissoes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
  evento_id BIGINT NOT NULL REFERENCES esocial_eventos(id) ON DELETE CASCADE,
  tentativa SMALLINT NOT NULL DEFAULT 1,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN (
    'PENDENTE', 'ENVIANDO', 'ENVIADO', 'PROCESSANDO', 'ACEITO', 'REJEITADO', 'ERRO', 'TIMEOUT'
  )),
  protocolo VARCHAR(128),
  lote_id VARCHAR(128),
  codigo_resposta VARCHAR(32),
  mensagem TEXT,
  erros_json JSONB NOT NULL DEFAULT '[]',
  xml_lote TEXT,
  resposta_raw TEXT,
  endpoint VARCHAR(512),
  enviado_em TIMESTAMPTZ,
  processado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esocial_transmissoes_evento ON esocial_transmissoes(evento_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_esocial_transmissoes_tenant ON esocial_transmissoes(tenant_id, status);

COMMENT ON TABLE esocial_transmissoes IS 'Histórico de transmissões gov.br — tentativas, erros e reenvio';
COMMENT ON COLUMN esocial_config.govbr_modo IS 'MOCK = homologação interna; HTTP = SOAP gov.br (integração real)';
