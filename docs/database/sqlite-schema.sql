-- ErgoSense AI — SQLite Schema (Mobile Offline)
-- Versão: 1.0.0
-- Padrão: id_local (UUID), id_servidor (nullable), tenant_id, sync_status

PRAGMA foreign_keys = ON;

-- ============================================================
-- ENUMS (aplicados na camada Dart)
-- sync_status: PENDING | SYNCED | ERROR
-- risk_level: BAIXO | MEDIO | ALTO | CRITICO
-- ============================================================

CREATE TABLE IF NOT EXISTS configuracoes (
    id_local          TEXT PRIMARY KEY,
    chave             TEXT NOT NULL,
    valor             TEXT,
    tenant_id         TEXT,
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER NOT NULL,
    deleted_at        INTEGER,
    sync_status       TEXT NOT NULL DEFAULT 'SYNCED',
    UNIQUE(chave, tenant_id)
);

CREATE TABLE IF NOT EXISTS empresas (
    id_local          TEXT PRIMARY KEY,
    id_servidor       INTEGER,
    tenant_id         TEXT NOT NULL UNIQUE,
    nome              TEXT NOT NULL,
    industria         TEXT,
    schema_name       TEXT,
    ativo             INTEGER NOT NULL DEFAULT 1,
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER NOT NULL,
    deleted_at        INTEGER,
    sync_status       TEXT NOT NULL DEFAULT 'SYNCED'
);

CREATE TABLE IF NOT EXISTS usuarios (
    id_local          TEXT PRIMARY KEY,
    id_servidor       INTEGER,
    tenant_id         TEXT NOT NULL,
    email             TEXT NOT NULL,
    nome              TEXT NOT NULL,
    perfil            TEXT NOT NULL, -- ADMIN_GLOBAL|ADMIN_EMPRESA|ERGONOMISTA|SUPERVISOR|OPERADOR
    token_hash        TEXT,
    refresh_token     TEXT,
    ultimo_login      INTEGER,
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER NOT NULL,
    deleted_at        INTEGER,
    sync_status       TEXT NOT NULL DEFAULT 'SYNCED'
);

CREATE TABLE IF NOT EXISTS setores (
    id_local          TEXT PRIMARY KEY,
    id_servidor       INTEGER,
    tenant_id         TEXT NOT NULL,
    nome              TEXT NOT NULL,
    descricao         TEXT,
    score_medio       REAL,
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER NOT NULL,
    deleted_at        INTEGER,
    sync_status       TEXT NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS colaboradores (
    id_local          TEXT PRIMARY KEY,
    id_servidor       INTEGER,
    tenant_id         TEXT NOT NULL,
    setor_id_local    TEXT NOT NULL REFERENCES setores(id_local),
    nome              TEXT NOT NULL,
    matricula         TEXT NOT NULL,
    cargo             TEXT,
    turno             TEXT,
    data_nascimento   TEXT,
    consentimento_lgpd INTEGER NOT NULL DEFAULT 0,
    consentimento_data INTEGER,
    risk_level        TEXT,
    observacoes       TEXT,
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER NOT NULL,
    deleted_at        INTEGER,
    sync_status       TEXT NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS analises (
    id_local          TEXT PRIMARY KEY,
    id_servidor       INTEGER,
    tenant_id         TEXT NOT NULL,
    colaborador_id_local TEXT NOT NULL REFERENCES colaboradores(id_local),
    setor_id_local    TEXT NOT NULL REFERENCES setores(id_local),
    atividade         TEXT NOT NULL,
    modo              TEXT NOT NULL, -- complete | offline
    observacoes       TEXT,
    data_analise      TEXT NOT NULL,
    hora_analise      TEXT NOT NULL,
    duracao_gravacao  INTEGER,
    latitude          REAL,
    longitude         REAL,
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER NOT NULL,
    deleted_at        INTEGER,
    sync_status       TEXT NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS fotos_analise (
    id_local          TEXT PRIMARY KEY,
    id_servidor       INTEGER,
    tenant_id         TEXT NOT NULL,
    analise_id_local  TEXT NOT NULL REFERENCES analises(id_local) ON DELETE CASCADE,
    caminho_local     TEXT NOT NULL,
    url_servidor      TEXT,
    mime_type         TEXT NOT NULL DEFAULT 'image/jpeg',
    tamanho_bytes     INTEGER,
    hash_sha256       TEXT,
    comprimida        INTEGER NOT NULL DEFAULT 1,
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER NOT NULL,
    deleted_at        INTEGER,
    sync_status       TEXT NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS resultados_ia (
    id_local          TEXT PRIMARY KEY,
    id_servidor       INTEGER,
    tenant_id         TEXT NOT NULL,
    analise_id_local  TEXT NOT NULL UNIQUE REFERENCES analises(id_local) ON DELETE CASCADE,
    score             INTEGER NOT NULL,
    risk_level        TEXT NOT NULL,
    rula              INTEGER,
    reba              INTEGER,
    angulo_lombar     REAL,
    angulo_ombro_d    REAL,
    angulo_pescoco    REAL,
    angulo_cotovelo   REAL,
    repeticao_min     REAL,
    landmarks_json    TEXT,
    engine            TEXT NOT NULL, -- tflite | mediapipe
    recomendacoes_json TEXT,
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER NOT NULL,
    deleted_at        INTEGER,
    sync_status       TEXT NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS sincronizacao_pendente (
    id_local          TEXT PRIMARY KEY,
    tenant_id         TEXT NOT NULL,
    entidade          TEXT NOT NULL, -- analises|colaboradores|fotos_analise|...
    entidade_id_local TEXT NOT NULL,
    operacao          TEXT NOT NULL, -- CREATE|UPDATE|DELETE
    payload_json      TEXT,
    prioridade        INTEGER NOT NULL DEFAULT 5,
    tentativas        INTEGER NOT NULL DEFAULT 0,
    max_tentativas    INTEGER NOT NULL DEFAULT 10,
    proxima_tentativa INTEGER,
    ultimo_erro       TEXT,
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER NOT NULL,
    sync_status       TEXT NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS logs (
    id_local          TEXT PRIMARY KEY,
    tenant_id         TEXT,
    nivel             TEXT NOT NULL, -- DEBUG|INFO|WARN|ERROR
    modulo            TEXT NOT NULL,
    mensagem          TEXT NOT NULL,
    dados_json        TEXT,
    created_at        INTEGER NOT NULL,
    sync_status       TEXT NOT NULL DEFAULT 'PENDING'
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_analises_tenant ON analises(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analises_sync ON analises(sync_status);
CREATE INDEX IF NOT EXISTS idx_analises_data ON analises(data_analise DESC);
CREATE INDEX IF NOT EXISTS idx_colaboradores_tenant ON colaboradores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_setor ON colaboradores(setor_id_local);
CREATE INDEX IF NOT EXISTS idx_sync_pendente_status ON sincronizacao_pendente(sync_status, proxima_tentativa);
CREATE INDEX IF NOT EXISTS idx_sync_pendente_tenant ON sincronizacao_pendente(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fotos_analise ON fotos_analise(analise_id_local);
CREATE INDEX IF NOT EXISTS idx_resultados_risk ON resultados_ia(risk_level);
