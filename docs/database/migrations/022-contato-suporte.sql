-- Formulário de contato com o suporte ErgoSense

CREATE TABLE IF NOT EXISTS contato_suporte (
    id              BIGSERIAL PRIMARY KEY,
    protocolo       VARCHAR(32) NOT NULL UNIQUE,
    nome            VARCHAR(200) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    telefone        VARCHAR(64),
    empresa         VARCHAR(255),
    assunto         VARCHAR(120) NOT NULL,
    mensagem        TEXT NOT NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'NOVO',
    ip              VARCHAR(64),
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contato_suporte_created ON contato_suporte(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contato_suporte_status ON contato_suporte(status);
