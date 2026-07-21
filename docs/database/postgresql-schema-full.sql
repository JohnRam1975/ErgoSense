-- ErgoSense — PostgreSQL schema completo (web + mobile + sync)
-- Executar conectado ao banco ergosense

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TENANTS / EMPRESAS
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL UNIQUE,
    nome            VARCHAR(255) NOT NULL,
    industria       VARCHAR(100),
    schema_name     VARCHAR(64),
    icone           VARCHAR(16),
    cor             VARCHAR(32),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS usuarios (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
    email           VARCHAR(255) NOT NULL,
    senha_hash      VARCHAR(255) NOT NULL,
    nome            VARCHAR(255) NOT NULL,
    perfil          VARCHAR(32) NOT NULL,
    cargo           VARCHAR(255),
    localizacao     VARCHAR(255),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_login    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE(tenant_id, email)
);

CREATE TABLE IF NOT EXISTS solicitacoes_acesso (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) REFERENCES tenants(tenant_id),
    nome            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    funcao          VARCHAR(255) NOT NULL,
    matricula       VARCHAR(32) NOT NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'PENDENTE',
    observacao      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS setores (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
    nome            VARCHAR(255) NOT NULL,
    descricao       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE(tenant_id, nome)
);

CREATE TABLE IF NOT EXISTS colaboradores (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
    setor_id        BIGINT REFERENCES setores(id),
    nome            VARCHAR(255) NOT NULL,
    matricula       VARCHAR(32) NOT NULL,
    cargo           VARCHAR(255),
    turno           VARCHAR(64),
    data_nascimento DATE,
    observacoes     TEXT,
    consentimento_lgpd BOOLEAN NOT NULL DEFAULT FALSE,
    consentimento_data TIMESTAMPTZ,
    risk_level      VARCHAR(16),
    icone           VARCHAR(16),
    icone_bg        VARCHAR(32),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE(tenant_id, matricula)
);

CREATE TABLE IF NOT EXISTS analises (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
    colaborador_id  BIGINT NOT NULL REFERENCES colaboradores(id),
    setor_id        BIGINT REFERENCES setores(id),
    atividade       VARCHAR(255) NOT NULL,
    activity_context VARCHAR(64),
    modo            VARCHAR(16) NOT NULL DEFAULT 'complete',
    observacoes     TEXT,
    data_analise    DATE NOT NULL,
    hora_analise    TIME NOT NULL,
    duracao_gravacao INTEGER,
    max_risk_streak_secs INTEGER,
    total_risk_secs INTEGER,
    session_sample_count INTEGER,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    id_local_mobile UUID,
    synced          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE(tenant_id, id_local_mobile)
);

CREATE TABLE IF NOT EXISTS fotos_analise (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
    analise_id      BIGINT NOT NULL REFERENCES analises(id) ON DELETE CASCADE,
    storage_key     VARCHAR(512),
    imagem_base64   TEXT,
    url_publica     VARCHAR(1024),
    mime_type       VARCHAR(64) NOT NULL DEFAULT 'image/jpeg',
    tamanho_bytes   BIGINT,
    hash_sha256     VARCHAR(64),
    id_local_mobile UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS resultados_ia (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
    analise_id      BIGINT NOT NULL UNIQUE REFERENCES analises(id) ON DELETE CASCADE,
    score           SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
    risk_level      VARCHAR(16) NOT NULL,
    rula            SMALLINT,
    reba            SMALLINT,
    angulos_json    JSONB NOT NULL DEFAULT '{}',
    workstation_json JSONB,
    nr17_report_json JSONB,
    landmarks_json  JSONB,
    engine          VARCHAR(32) NOT NULL DEFAULT 'mediapipe',
    recomendacoes_json JSONB,
    load_params_json  JSONB,
    load_result_json  JSONB,
    load_estimate_json JSONB,
    load_manual_json  JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS relatorios (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id),
    analise_id      BIGINT REFERENCES analises(id) ON DELETE SET NULL,
    titulo          VARCHAR(255) NOT NULL,
    subtitulo       VARCHAR(512),
    tipo            VARCHAR(32) NOT NULL DEFAULT 'NR17',
    status          VARCHAR(32) NOT NULL DEFAULT 'ready',
    tamanho         VARCHAR(32),
    id_local        VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS configuracoes (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) REFERENCES tenants(tenant_id),
    usuario_id      BIGINT REFERENCES usuarios(id),
    chave           VARCHAR(128) NOT NULL,
    valor           JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, usuario_id, chave)
);

CREATE TABLE IF NOT EXISTS sync_log (
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

CREATE TABLE IF NOT EXISTS audit_log (
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

CREATE INDEX IF NOT EXISTS idx_analises_tenant_data ON analises(tenant_id, data_analise DESC);
CREATE INDEX IF NOT EXISTS idx_resultados_risk ON resultados_ia(tenant_id, risk_level);
CREATE INDEX IF NOT EXISTS idx_sync_log_tenant ON sync_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_colaboradores_tenant ON colaboradores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes_acesso(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relatorios_tenant ON relatorios(tenant_id, created_at DESC);

-- Role "ergosense" é opcional (só existe se POSTGRES_USER=ergosense).
-- Em Docker com POSTGRES_USER=postgres o GRANT antigo quebrava o initdb.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ergosense') THEN
    GRANT ALL ON ALL TABLES IN SCHEMA public TO ergosense;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ergosense;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ergosense;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ergosense;
  END IF;
END $$;
