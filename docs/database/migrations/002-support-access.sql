-- Suporte temporário autorizado pelo Tenant Admin (LGPD / least privilege)

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plano VARCHAR(64) NOT NULL DEFAULT 'Standard';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suporte_autorizado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suporte_inicio_em TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suporte_expira_em TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suporte_autorizado_por VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suporte_autorizado_ip VARCHAR(64);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suporte_motivo TEXT;

CREATE TABLE IF NOT EXISTS auditoria_suporte (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
    tenant_nome         VARCHAR(255),
    usuario_autorizador VARCHAR(255),
    usuario_global      VARCHAR(255),
    acao                VARCHAR(64) NOT NULL,
    modulo              VARCHAR(128),
    data_hora           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip                  VARCHAR(64),
    observacao          TEXT
);

CREATE INDEX IF NOT EXISTS idx_auditoria_suporte_tenant ON auditoria_suporte(tenant_id, data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_tenants_suporte_expira ON tenants(suporte_expira_em) WHERE suporte_autorizado = TRUE;
