-- ErgoSense AI — PostgreSQL Schema (Servidor)
-- Versão: 1.0.0
-- Multi-tenant por tenant_id

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TENANTS
-- ============================================================

CREATE TABLE tenants (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL UNIQUE,
    nome            VARCHAR(255) NOT NULL,
    industria       VARCHAR(100),
    schema_name     VARCHAR(64),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE usuarios (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
    email           VARCHAR(255) NOT NULL,
    senha_hash      VARCHAR(255) NOT NULL,
    nome            VARCHAR(255) NOT NULL,
    perfil          VARCHAR(32) NOT NULL,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_login    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE(tenant_id, email)
);

CREATE TABLE setores (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
    nome            VARCHAR(255) NOT NULL,
    descricao       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE colaboradores (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
    setor_id        BIGINT REFERENCES setores(id),
    nome            VARCHAR(255) NOT NULL,
    matricula       VARCHAR(32) NOT NULL,
    cargo           VARCHAR(255),
    turno           VARCHAR(64),
    data_nascimento DATE,
    consentimento_lgpd BOOLEAN NOT NULL DEFAULT FALSE,
    consentimento_data TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE(tenant_id, matricula)
);

CREATE TABLE analises (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
    colaborador_id  BIGINT NOT NULL REFERENCES colaboradores(id),
    setor_id        BIGINT REFERENCES setores(id),
    atividade       VARCHAR(255) NOT NULL,
    modo            VARCHAR(16) NOT NULL,
    observacoes     TEXT,
    data_analise    DATE NOT NULL,
    hora_analise    TIME NOT NULL,
    duracao_gravacao INTEGER,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    id_local_mobile UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE(tenant_id, id_local_mobile)
);

CREATE TABLE fotos_analise (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
    analise_id      BIGINT NOT NULL REFERENCES analises(id) ON DELETE CASCADE,
    storage_key     VARCHAR(512) NOT NULL,
    url_publica     VARCHAR(1024),
    mime_type       VARCHAR(64) NOT NULL DEFAULT 'image/jpeg',
    tamanho_bytes   BIGINT,
    hash_sha256     VARCHAR(64),
    id_local_mobile UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE resultados_ia (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
    analise_id      BIGINT NOT NULL UNIQUE REFERENCES analises(id) ON DELETE CASCADE,
    score           SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
    risk_level      VARCHAR(16) NOT NULL,
    rula            SMALLINT,
    reba            SMALLINT,
    angulo_lombar   REAL,
    angulo_ombro_d  REAL,
    angulo_pescoco   REAL,
    angulo_cotovelo REAL,
    repeticao_min   REAL,
    landmarks_json  JSONB,
    engine          VARCHAR(32) NOT NULL,
    recomendacoes_json JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sync_log (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL,
    usuario_id      BIGINT REFERENCES usuarios(id),
    operacao        VARCHAR(16) NOT NULL,
    entidade        VARCHAR(64) NOT NULL,
    entidade_id     BIGINT,
    id_local_mobile UUID,
    payload         JSONB,
    status          VARCHAR(16) NOT NULL,
    erro            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL,
    usuario_id      BIGINT,
    acao            VARCHAR(64) NOT NULL,
    entidade        VARCHAR(64),
    entidade_id     BIGINT,
    ip              INET,
    user_agent      TEXT,
    dados           JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_analises_tenant_data ON analises(tenant_id, data_analise DESC);
CREATE INDEX idx_resultados_risk ON resultados_ia(tenant_id, risk_level);
CREATE INDEX idx_sync_log_tenant ON sync_log(tenant_id, created_at DESC);
CREATE INDEX idx_colaboradores_tenant ON colaboradores(tenant_id);

-- Row Level Security (opcional fase 2)
-- ALTER TABLE analises ENABLE ROW LEVEL SECURITY;
