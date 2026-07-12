-- =============================================================================
-- ErgoSense SaaS — Schema PostgreSQL v1.0
-- Multitenancy · NR-17 · IA · Laudos · eSocial · Auditoria · LGPD
-- Executar: psql -U postgres -d ergosense -f ergosense-saas-schema-v1.sql
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Extensões
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- -----------------------------------------------------------------------------
-- 1. Tipos enumerados (domínios de negócio)
-- -----------------------------------------------------------------------------
CREATE TYPE tenant_plano AS ENUM ('GRATUITO', 'PROFISSIONAL', 'ENTERPRISE');
CREATE TYPE tenant_status AS ENUM ('ATIVO', 'INATIVO', 'SUSPENSO', 'CANCELADO');
CREATE TYPE user_tipo AS ENUM (
  'SUPER_ADMIN', 'ADMIN_TENANT', 'ERGONOMISTA', 'TECNICO_SST',
  'GESTOR', 'VISUALIZADOR', 'COLABORADOR'
);
CREATE TYPE avaliacao_tipo AS ENUM (
  'POSTURA_IMAGEM', 'POSTURA_VIDEO', 'CARGA_MANUAL', 'AMBIENTAL',
  'QUESTIONARIO', 'INTEGRADA', 'NR17', 'AET', 'REAVALIACAO'
);
CREATE TYPE avaliacao_status AS ENUM (
  'RASCUNHO', 'EM_PROCESSAMENTO', 'CONCLUIDA', 'REVISAO_HUMANA',
  'APROVADA', 'ARQUIVADA', 'CANCELADA'
);
CREATE TYPE risco_nivel AS ENUM (
  'DESPREZIVEL', 'BAIXO', 'ACEITAVEL', 'ATENCAO', 'MODERADO',
  'ALTO', 'CRITICO', 'MUITO_ALTO'
);
CREATE TYPE midia_tipo AS ENUM ('FOTO', 'VIDEO', 'FRAME_EXTRAIDO', 'PDF', 'OUTRO');
CREATE TYPE midia_origem AS ENUM ('CAMERA_CELULAR', 'UPLOAD_WEB', 'API', 'SINCRONIZACAO_MOBILE');
CREATE TYPE processamento_status AS ENUM (
  'PENDENTE', 'EM_FILA', 'PROCESSANDO', 'CONCLUIDO', 'ERRO', 'CANCELADO'
);
CREATE TYPE laudo_status AS ENUM ('RASCUNHO', 'EM_REVISAO', 'EMITIDO', 'ASSINADO', 'INVALIDADO');
CREATE TYPE recomendacao_origem AS ENUM (
  'IA', 'METODO_ERGONOMICO', 'ERGONOMISTA', 'NR17', 'AMBIENTAL', 'QUESTIONARIO', 'SISTEMA'
);
CREATE TYPE prioridade AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE');
CREATE TYPE plano_acao_status AS ENUM (
  'ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO', 'ATRASADO', 'CANCELADO'
);
CREATE TYPE esocial_status AS ENUM (
  'RASCUNHO', 'VALIDADO', 'ENVIADO', 'ACEITO', 'REJEITADO', 'ERRO'
);
CREATE TYPE risco_ambiental_tipo AS ENUM ('RUIDO', 'CALOR', 'ILUMINACAO', 'VIBRACAO', 'UMIDADE', 'OUTRO');
CREATE TYPE sexo_tipo AS ENUM ('M', 'F', 'OUTRO', 'NAO_INFORMADO');
CREATE TYPE config_valor_tipo AS ENUM ('STRING', 'INTEGER', 'BOOLEAN', 'JSON', 'DECIMAL');
CREATE TYPE auditoria_acao AS ENUM (
  'CREATE', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'RESTORE', 'LOGIN', 'LOGOUT',
  'EXPORT', 'ASSINATURA', 'ENVIO_ESOCIAL', 'PROCESSAMENTO_IA'
);
CREATE TYPE kim_tipo AS ENUM ('EMPURRAR_PUXAR', 'LEVANTAR_SEGURAR_CARREGAR');

-- -----------------------------------------------------------------------------
-- 2. Função genérica updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 3. TENANTS (empresas)
-- -----------------------------------------------------------------------------
CREATE TABLE tenants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social      VARCHAR(255) NOT NULL,
  nome_fantasia     VARCHAR(255),
  cnpj              VARCHAR(14),
  email             CITEXT NOT NULL,
  telefone          VARCHAR(32),
  plano             tenant_plano NOT NULL DEFAULT 'GRATUITO',
  limite_usuarios   INTEGER NOT NULL DEFAULT 5 CHECK (limite_usuarios > 0),
  status            tenant_status NOT NULL DEFAULT 'ATIVO',
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT uq_tenants_email UNIQUE (email)
);

COMMENT ON TABLE tenants IS 'Empresas clientes do SaaS ErgoSense (isolamento multitenancy).';

CREATE UNIQUE INDEX uq_tenants_cnpj ON tenants(cnpj) WHERE cnpj IS NOT NULL;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. USUÁRIOS E RBAC
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  nome              VARCHAR(255) NOT NULL,
  email             CITEXT NOT NULL,
  senha_hash        VARCHAR(255) NOT NULL,
  cargo             VARCHAR(255),
  tipo_usuario      user_tipo NOT NULL DEFAULT 'TECNICO_SST',
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_login      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
);

COMMENT ON TABLE users IS 'Usuários autenticados vinculados a um tenant.';

CREATE INDEX idx_users_tenant ON users(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

CREATE TABLE roles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  nome              VARCHAR(64) NOT NULL,
  descricao         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_roles_tenant_nome UNIQUE (tenant_id, nome)
);

COMMENT ON TABLE roles IS 'Perfis de permissão customizáveis por empresa.';

CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON roles FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

CREATE TABLE permissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo            VARCHAR(64) NOT NULL UNIQUE,
  descricao         TEXT NOT NULL,
  modulo            VARCHAR(64) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE permissions IS 'Catálogo global de permissões do sistema.';

CREATE TABLE role_permissions (
  role_id           UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id     UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id           UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);

-- -----------------------------------------------------------------------------
-- 5. ESTRUTURA ORGANIZACIONAL
-- -----------------------------------------------------------------------------
CREATE TABLE setores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  nome              VARCHAR(255) NOT NULL,
  descricao         TEXT,
  responsavel       VARCHAR(255),
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT uq_setores_tenant_nome UNIQUE (tenant_id, nome)
);

COMMENT ON TABLE setores IS 'Setores / departamentos da empresa.';

CREATE INDEX idx_setores_tenant ON setores(tenant_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_setores_updated_at
  BEFORE UPDATE ON setores FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

CREATE TABLE funcoes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  nome              VARCHAR(255) NOT NULL,
  descricao         TEXT,
  cbo               VARCHAR(16),
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT uq_funcoes_tenant_nome UNIQUE (tenant_id, nome)
);

COMMENT ON TABLE funcoes IS 'Funções / cargos (CBO opcional).';

CREATE INDEX idx_funcoes_tenant ON funcoes(tenant_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_funcoes_updated_at
  BEFORE UPDATE ON funcoes FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

CREATE TABLE colaboradores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  setor_id          UUID REFERENCES setores(id),
  funcao_id         UUID REFERENCES funcoes(id),
  nome              VARCHAR(255) NOT NULL,
  matricula         VARCHAR(64) NOT NULL,
  cpf               VARCHAR(11),
  data_nascimento   DATE,
  sexo              sexo_tipo DEFAULT 'NAO_INFORMADO',
  altura_cm         NUMERIC(5,2) CHECK (altura_cm IS NULL OR altura_cm BETWEEN 100 AND 250),
  peso_kg           NUMERIC(5,2) CHECK (peso_kg IS NULL OR peso_kg BETWEEN 30 AND 300),
  consentimento_lgpd BOOLEAN NOT NULL DEFAULT FALSE,
  consentimento_em  TIMESTAMPTZ,
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT uq_colaboradores_tenant_matricula UNIQUE (tenant_id, matricula)
);

COMMENT ON TABLE colaboradores IS 'Trabalhadores avaliados (dados pessoais — LGPD).';

CREATE INDEX idx_colaboradores_tenant ON colaboradores(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_colaboradores_setor ON colaboradores(tenant_id, setor_id);

CREATE TRIGGER trg_colaboradores_updated_at
  BEFORE UPDATE ON colaboradores FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

CREATE TABLE postos_trabalho (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  setor_id          UUID REFERENCES setores(id),
  nome              VARCHAR(255) NOT NULL,
  descricao         TEXT,
  localizacao       VARCHAR(255),
  tipo_posto        VARCHAR(64),
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT uq_postos_tenant_nome UNIQUE (tenant_id, nome)
);

COMMENT ON TABLE postos_trabalho IS 'Postos de trabalho vinculados a setores.';

CREATE INDEX idx_postos_tenant ON postos_trabalho(tenant_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_postos_updated_at
  BEFORE UPDATE ON postos_trabalho FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

CREATE TABLE atividades (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  posto_trabalho_id UUID REFERENCES postos_trabalho(id),
  nome              VARCHAR(255) NOT NULL,
  descricao         TEXT,
  frequencia        VARCHAR(64),
  duracao_minutos   INTEGER CHECK (duracao_minutos IS NULL OR duracao_minutos >= 0),
  carga_manual      BOOLEAN NOT NULL DEFAULT FALSE,
  peso_padrao_kg    NUMERIC(8,3),
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT uq_atividades_tenant_nome UNIQUE (tenant_id, nome)
);

COMMENT ON TABLE atividades IS 'Atividades ergonômicas executadas no posto.';

CREATE INDEX idx_atividades_tenant ON atividades(tenant_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_atividades_updated_at
  BEFORE UPDATE ON atividades FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. CATÁLOGO GLOBAL DE MÉTODOS ERGONÔMICOS
-- -----------------------------------------------------------------------------
CREATE TABLE metodos_ergonomicos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo            VARCHAR(64) NOT NULL UNIQUE,
  nome              VARCHAR(255) NOT NULL,
  descricao         TEXT,
  categoria         VARCHAR(64) NOT NULL,
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE metodos_ergonomicos IS 'Catálogo global de ferramentas ergonômicas (sem tenant_id).';

CREATE TRIGGER trg_metodos_updated_at
  BEFORE UPDATE ON metodos_ergonomicos FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

CREATE TABLE parametros_metodos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metodo_id         UUID NOT NULL REFERENCES metodos_ergonomicos(id) ON DELETE CASCADE,
  nome_parametro    VARCHAR(128) NOT NULL,
  valor_minimo      NUMERIC(12,4),
  valor_maximo      NUMERIC(12,4),
  unidade           VARCHAR(32),
  classificacao     VARCHAR(128) NOT NULL,
  nivel_risco       risco_nivel NOT NULL,
  acao_recomendada  TEXT,
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_param_metodo_faixa UNIQUE (metodo_id, nome_parametro, valor_minimo, valor_maximo)
);

COMMENT ON TABLE parametros_metodos IS 'Faixas de aceitabilidade e classificação por método.';

CREATE INDEX idx_parametros_metodo ON parametros_metodos(metodo_id);

CREATE TRIGGER trg_parametros_updated_at
  BEFORE UPDATE ON parametros_metodos FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. AVALIAÇÕES ERGONÔMICAS (núcleo)
-- -----------------------------------------------------------------------------
CREATE TABLE avaliacoes_ergonomicas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  colaborador_id    UUID NOT NULL REFERENCES colaboradores(id),
  setor_id          UUID REFERENCES setores(id),
  funcao_id         UUID REFERENCES funcoes(id),
  posto_trabalho_id UUID REFERENCES postos_trabalho(id),
  atividade_id      UUID REFERENCES atividades(id),
  avaliador_user_id UUID REFERENCES users(id),
  titulo            VARCHAR(255),
  descricao         TEXT,
  data_avaliacao    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo_avaliacao    avaliacao_tipo NOT NULL DEFAULT 'INTEGRADA',
  status            avaliacao_status NOT NULL DEFAULT 'RASCUNHO',
  risco_geral       risco_nivel,
  score_geral       SMALLINT CHECK (score_geral IS NULL OR score_geral BETWEEN 0 AND 100),
  conclusao_ia      TEXT,
  observacoes       TEXT,
  id_local_mobile   UUID,
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
);

CREATE UNIQUE INDEX uq_avaliacao_mobile
  ON avaliacoes_ergonomicas(tenant_id, id_local_mobile)
  WHERE id_local_mobile IS NOT NULL;

COMMENT ON TABLE avaliacoes_ergonomicas IS 'Sessão principal de avaliação ergonômica.';

CREATE INDEX idx_avaliacoes_tenant_data ON avaliacoes_ergonomicas(tenant_id, data_avaliacao DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_avaliacoes_colaborador ON avaliacoes_ergonomicas(tenant_id, colaborador_id);
CREATE INDEX idx_avaliacoes_status ON avaliacoes_ergonomicas(tenant_id, status);

CREATE TRIGGER trg_avaliacoes_updated_at
  BEFORE UPDATE ON avaliacoes_ergonomicas FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

CREATE TABLE avaliacao_metodos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID NOT NULL REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  metodo_id         UUID NOT NULL REFERENCES metodos_ergonomicos(id),
  pontuacao_final   NUMERIC(12,4),
  indice_final      NUMERIC(12,4),
  classificacao     VARCHAR(128),
  nivel_risco       risco_nivel,
  recomendacao      TEXT,
  dados_calculo_json JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_avaliacao_metodo UNIQUE (avaliacao_id, metodo_id)
);

COMMENT ON TABLE avaliacao_metodos IS 'Resultado genérico por método (JSON detalhado).';

CREATE INDEX idx_avaliacao_metodos_av ON avaliacao_metodos(tenant_id, avaliacao_id);

CREATE TRIGGER trg_avaliacao_metodos_updated_at
  BEFORE UPDATE ON avaliacao_metodos FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

-- -----------------------------------------------------------------------------
-- 8. MÍDIA E IA (visão computacional)
-- -----------------------------------------------------------------------------
CREATE TABLE midias_avaliacao (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID NOT NULL REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  tipo_midia        midia_tipo NOT NULL,
  arquivo_url       VARCHAR(1024),
  storage_key       VARCHAR(512),
  thumbnail_url     VARCHAR(1024),
  duracao_segundos  INTEGER,
  resolucao         VARCHAR(32),
  mime_type         VARCHAR(64),
  tamanho_bytes     BIGINT,
  hash_sha256       VARCHAR(64),
  origem            midia_origem NOT NULL DEFAULT 'CAMERA_CELULAR',
  status_processamento processamento_status NOT NULL DEFAULT 'PENDENTE',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

COMMENT ON TABLE midias_avaliacao IS 'Fotos e vídeos analisados (armazenamento externo S3/Azure).';

CREATE INDEX idx_midias_avaliacao ON midias_avaliacao(tenant_id, avaliacao_id);

CREATE TRIGGER trg_midias_updated_at
  BEFORE UPDATE ON midias_avaliacao FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

CREATE TABLE pontos_corporais_detectados (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  midia_id          UUID NOT NULL REFERENCES midias_avaliacao(id) ON DELETE CASCADE,
  avaliacao_id      UUID NOT NULL REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  frame_numero      INTEGER NOT NULL DEFAULT 0,
  tempo_segundo     NUMERIC(10,3) NOT NULL DEFAULT 0,
  parte_corpo       VARCHAR(64) NOT NULL,
  coordenada_x      NUMERIC(10,6) NOT NULL,
  coordenada_y      NUMERIC(10,6) NOT NULL,
  coordenada_z      NUMERIC(10,6),
  confianca         NUMERIC(5,4) CHECK (confianca BETWEEN 0 AND 1),
  modelo_ia         VARCHAR(64) NOT NULL DEFAULT 'mediapipe',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pontos_corporais_detectados IS 'Landmarks / keypoints detectados por frame.';

CREATE INDEX idx_pontos_midia_frame ON pontos_corporais_detectados(midia_id, frame_numero);
CREATE INDEX idx_pontos_avaliacao ON pontos_corporais_detectados(tenant_id, avaliacao_id);

CREATE TABLE medicoes_angulares (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID NOT NULL REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  midia_id          UUID REFERENCES midias_avaliacao(id) ON DELETE SET NULL,
  frame_numero      INTEGER NOT NULL DEFAULT 0,
  tempo_segundo     NUMERIC(10,3) NOT NULL DEFAULT 0,
  segmento_corporal VARCHAR(64) NOT NULL,
  angulo_graus      NUMERIC(8,3) NOT NULL,
  plano_movimento   VARCHAR(32),
  classificacao     VARCHAR(64),
  nivel_risco       risco_nivel,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE medicoes_angulares IS 'Ângulos articulares calculados a partir dos landmarks.';

CREATE INDEX idx_medicoes_angulares_av ON medicoes_angulares(tenant_id, avaliacao_id);

CREATE TABLE medicoes_distancia (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID NOT NULL REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  midia_id          UUID REFERENCES midias_avaliacao(id) ON DELETE SET NULL,
  frame_numero      INTEGER NOT NULL DEFAULT 0,
  tempo_segundo     NUMERIC(10,3) NOT NULL DEFAULT 0,
  origem            VARCHAR(64) NOT NULL,
  destino           VARCHAR(64) NOT NULL,
  distancia_cm      NUMERIC(10,3) NOT NULL,
  metodo_medicao    VARCHAR(64) NOT NULL DEFAULT 'visao_estimada',
  confianca         NUMERIC(5,4),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE medicoes_distancia IS 'Distâncias carga-tronco, alcance horizontal, etc.';

CREATE INDEX idx_medicoes_distancia_av ON medicoes_distancia(tenant_id, avaliacao_id);

CREATE TABLE objetos_detectados (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID NOT NULL REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  midia_id          UUID REFERENCES midias_avaliacao(id) ON DELETE SET NULL,
  frame_numero      INTEGER NOT NULL DEFAULT 0,
  tempo_segundo     NUMERIC(10,3) NOT NULL DEFAULT 0,
  tipo_objeto       VARCHAR(64) NOT NULL,
  nome_objeto       VARCHAR(255),
  coordenada_x      NUMERIC(10,6),
  coordenada_y      NUMERIC(10,6),
  largura           NUMERIC(10,3),
  altura            NUMERIC(10,3),
  confianca         NUMERIC(5,4),
  modelo_ia         VARCHAR(64),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE objetos_detectados IS 'Objetos/cargas detectados por YOLO ou similar.';

CREATE INDEX idx_objetos_avaliacao ON objetos_detectados(tenant_id, avaliacao_id);

CREATE TABLE cargas_avaliadas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID NOT NULL REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  objeto_detectado_id UUID REFERENCES objetos_detectados(id) ON DELETE SET NULL,
  descricao         VARCHAR(255),
  peso_kg           NUMERIC(8,3) NOT NULL CHECK (peso_kg > 0),
  distancia_corpo_cm NUMERIC(8,3),
  altura_inicial_cm NUMERIC(8,3),
  altura_final_cm   NUMERIC(8,3),
  deslocamento_vertical_cm NUMERIC(8,3),
  frequencia_levantamentos_min NUMERIC(8,3),
  duracao_tarefa_min INTEGER,
  qualidade_pega    VARCHAR(32),
  origem_entrada    VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cargas_avaliadas IS 'Entrada manual ou inferida de peso/distância da carga.';

CREATE INDEX idx_cargas_avaliacao ON cargas_avaliadas(tenant_id, avaliacao_id);

CREATE TRIGGER trg_cargas_updated_at
  BEFORE UPDATE ON cargas_avaliadas FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

-- -----------------------------------------------------------------------------
-- 9. RESULTADOS ESPECÍFICOS POR MÉTODO
-- -----------------------------------------------------------------------------
CREATE TABLE resultados_niosh (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID NOT NULL REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  carga_id          UUID REFERENCES cargas_avaliadas(id) ON DELETE SET NULL,
  peso_real_kg      NUMERIC(8,3) NOT NULL,
  h_cm              NUMERIC(8,3),
  v_cm              NUMERIC(8,3),
  d_cm              NUMERIC(8,3),
  a_graus           NUMERIC(8,3),
  f_lev_min         NUMERIC(8,3),
  c_qualidade_pega  NUMERIC(6,4),
  lc                NUMERIC(8,4),
  hm                NUMERIC(8,4),
  vm                NUMERIC(8,4),
  dm                NUMERIC(8,4),
  am                NUMERIC(8,4),
  fm                NUMERIC(8,4),
  cm                NUMERIC(8,4),
  rwl_kg            NUMERIC(8,3),
  li                NUMERIC(8,4),
  classificacao     VARCHAR(128),
  nivel_risco       risco_nivel,
  recomendacao      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE resultados_rula (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID NOT NULL UNIQUE REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  pontuacao_braco   SMALLINT,
  pontuacao_antebraco SMALLINT,
  pontuacao_punho   SMALLINT,
  pontuacao_pescoco SMALLINT,
  pontuacao_tronco  SMALLINT,
  pontuacao_pernas  SMALLINT,
  pontuacao_final   SMALLINT NOT NULL,
  classificacao     VARCHAR(128),
  nivel_risco       risco_nivel,
  recomendacao      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE resultados_reba (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID NOT NULL UNIQUE REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  grupo_a           SMALLINT,
  grupo_b           SMALLINT,
  pontuacao_c       SMALLINT,
  pontuacao_atividade SMALLINT,
  pontuacao_final   SMALLINT NOT NULL,
  classificacao     VARCHAR(128),
  nivel_risco       risco_nivel,
  recomendacao      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE resultados_owas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID NOT NULL UNIQUE REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  codigo_costas     SMALLINT NOT NULL,
  codigo_bracos     SMALLINT NOT NULL,
  codigo_pernas     SMALLINT NOT NULL,
  codigo_carga      SMALLINT NOT NULL,
  classe_acao       SMALLINT NOT NULL CHECK (classe_acao BETWEEN 1 AND 4),
  classificacao     VARCHAR(128),
  recomendacao      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE resultados_rosa (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID NOT NULL UNIQUE REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  cadeira           SMALLINT,
  monitor           SMALLINT,
  teclado_mouse     SMALLINT,
  telefone          SMALLINT,
  pontuacao_final   SMALLINT NOT NULL,
  classificacao     VARCHAR(128),
  nivel_risco       risco_nivel,
  recomendacao      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE resultados_kim (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID NOT NULL REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  tipo_kim          kim_tipo NOT NULL,
  pontuacao_tempo   NUMERIC(8,3),
  pontuacao_carga   NUMERIC(8,3),
  pontuacao_postura NUMERIC(8,3),
  pontuacao_condicoes NUMERIC(8,3),
  pontuacao_final   NUMERIC(8,3) NOT NULL,
  classificacao     VARCHAR(128),
  nivel_risco       risco_nivel,
  recomendacao      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_kim_av_tipo UNIQUE (avaliacao_id, tipo_kim)
);

CREATE TABLE resultados_carga_mental (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID NOT NULL REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  metodo            VARCHAR(64) NOT NULL,
  demanda_mental    NUMERIC(6,2),
  demanda_fisica    NUMERIC(6,2),
  demanda_temporal  NUMERIC(6,2),
  desempenho        NUMERIC(6,2),
  esforco           NUMERIC(6,2),
  frustracao        NUMERIC(6,2),
  pontuacao_final   NUMERIC(8,3) NOT NULL,
  classificacao     VARCHAR(128),
  nivel_risco       risco_nivel,
  recomendacao      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. RISCOS AMBIENTAIS (ruído, calor, iluminação)
-- -----------------------------------------------------------------------------
CREATE TABLE riscos_ambientais (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID NOT NULL REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  tipo_risco        risco_ambiental_tipo NOT NULL,
  valor_medido      NUMERIC(12,4) NOT NULL,
  unidade           VARCHAR(16) NOT NULL,
  limite_tolerancia NUMERIC(12,4),
  norma_referencia  VARCHAR(128),
  classificacao     VARCHAR(128),
  nivel_risco       risco_nivel,
  recomendacao      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE riscos_ambientais IS 'Ruído NR-15, calor NHO-06, iluminação NHO-11, etc.';

CREATE INDEX idx_riscos_ambientais_av ON riscos_ambientais(tenant_id, avaliacao_id, tipo_risco);

-- -----------------------------------------------------------------------------
-- 11. QUESTIONÁRIOS
-- -----------------------------------------------------------------------------
CREATE TABLE questionarios (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id),
  metodo_id         UUID REFERENCES metodos_ergonomicos(id),
  titulo            VARCHAR(255) NOT NULL,
  descricao         TEXT,
  global            BOOLEAN NOT NULL DEFAULT FALSE,
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_questionario_escopo CHECK (
    (global = TRUE AND tenant_id IS NULL) OR (global = FALSE AND tenant_id IS NOT NULL)
  )
);

CREATE TRIGGER trg_questionarios_updated_at
  BEFORE UPDATE ON questionarios FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

CREATE TABLE perguntas_questionario (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id),
  questionario_id   UUID NOT NULL REFERENCES questionarios(id) ON DELETE CASCADE,
  texto             TEXT NOT NULL,
  tipo_resposta     VARCHAR(32) NOT NULL DEFAULT 'ESCALA_1_5',
  peso              NUMERIC(6,3) NOT NULL DEFAULT 1,
  ordem             INTEGER NOT NULL DEFAULT 0,
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_perguntas_updated_at
  BEFORE UPDATE ON perguntas_questionario FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

CREATE TABLE respostas_questionario (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID NOT NULL REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  pergunta_id       UUID NOT NULL REFERENCES perguntas_questionario(id),
  colaborador_id    UUID REFERENCES colaboradores(id),
  resposta_texto    TEXT,
  resposta_numero   NUMERIC(12,4),
  pontuacao         NUMERIC(12,4),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_resposta_av_pergunta UNIQUE (avaliacao_id, pergunta_id)
);

-- -----------------------------------------------------------------------------
-- 12. LAUDOS, RECOMENDAÇÕES, PLANOS
-- -----------------------------------------------------------------------------
CREATE TABLE laudos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID NOT NULL REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  numero_laudo      VARCHAR(64) NOT NULL,
  titulo            VARCHAR(255) NOT NULL,
  conteudo_html     TEXT,
  arquivo_pdf_url   VARCHAR(1024),
  storage_key_pdf   VARCHAR(512),
  status            laudo_status NOT NULL DEFAULT 'RASCUNHO',
  responsavel_tecnico VARCHAR(255),
  registro_profissional VARCHAR(64),
  data_emissao      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT uq_laudos_numero UNIQUE (tenant_id, numero_laudo)
);

CREATE INDEX idx_laudos_tenant_status ON laudos(tenant_id, status);

CREATE TRIGGER trg_laudos_updated_at
  BEFORE UPDATE ON laudos FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

CREATE TABLE recomendacoes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID NOT NULL REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  origem            recomendacao_origem NOT NULL,
  descricao         TEXT NOT NULL,
  prioridade        prioridade NOT NULL DEFAULT 'MEDIA',
  prazo_sugerido_dias INTEGER,
  status            plano_acao_status NOT NULL DEFAULT 'ABERTO',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recomendacoes_av ON recomendacoes(tenant_id, avaliacao_id);

CREATE TRIGGER trg_recomendacoes_updated_at
  BEFORE UPDATE ON recomendacoes FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

CREATE TABLE planos_acao (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID NOT NULL REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  recomendacao_id   UUID REFERENCES recomendacoes(id) ON DELETE SET NULL,
  titulo            VARCHAR(255) NOT NULL,
  descricao         TEXT,
  responsavel       VARCHAR(255),
  prazo             DATE,
  status            plano_acao_status NOT NULL DEFAULT 'ABERTO',
  evidencia_url     VARCHAR(1024),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE TRIGGER trg_planos_updated_at
  BEFORE UPDATE ON planos_acao FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

-- -----------------------------------------------------------------------------
-- 13. eSOCIAL, ASSINATURA, ANEXOS
-- -----------------------------------------------------------------------------
CREATE TABLE eventos_esocial (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  colaborador_id    UUID REFERENCES colaboradores(id),
  avaliacao_id      UUID REFERENCES avaliacoes_ergonomicas(id) ON DELETE SET NULL,
  tipo_evento       VARCHAR(64) NOT NULL,
  codigo_evento     VARCHAR(32),
  dados_json        JSONB NOT NULL DEFAULT '{}',
  status_envio      esocial_status NOT NULL DEFAULT 'RASCUNHO',
  protocolo         VARCHAR(128),
  data_envio        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_esocial_tenant_status ON eventos_esocial(tenant_id, status_envio);

CREATE TRIGGER trg_esocial_updated_at
  BEFORE UPDATE ON eventos_esocial FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

CREATE TABLE assinaturas_digitais (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  laudo_id          UUID NOT NULL REFERENCES laudos(id) ON DELETE CASCADE,
  assinante_nome    VARCHAR(255) NOT NULL,
  assinante_email   CITEXT,
  registro_profissional VARCHAR(64),
  hash_documento    VARCHAR(128) NOT NULL,
  data_assinatura   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_assinatura     INET,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE anexos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  laudo_id          UUID REFERENCES laudos(id) ON DELETE CASCADE,
  nome_arquivo      VARCHAR(255) NOT NULL,
  tipo_arquivo      VARCHAR(64),
  arquivo_url       VARCHAR(1024),
  storage_key       VARCHAR(512),
  tamanho_bytes     BIGINT,
  hash_sha256       VARCHAR(64),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT chk_anexo_vinculo CHECK (avaliacao_id IS NOT NULL OR laudo_id IS NOT NULL)
);

-- -----------------------------------------------------------------------------
-- 14. AUDITORIA, HISTÓRICO, CONFIG, LOGS
-- -----------------------------------------------------------------------------
CREATE TABLE auditoria (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id),
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  entidade          VARCHAR(64) NOT NULL,
  entidade_id       UUID,
  acao              auditoria_acao NOT NULL,
  dados_anteriores_json JSONB,
  dados_novos_json  JSONB,
  ip                INET,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE auditoria IS 'Trilha de auditoria imutável (append-only).';

CREATE INDEX idx_auditoria_tenant_data ON auditoria(tenant_id, created_at DESC);
CREATE INDEX idx_auditoria_entidade ON auditoria(entidade, entidade_id);

CREATE TABLE historico_alteracoes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  entidade          VARCHAR(64) NOT NULL,
  entidade_id       UUID NOT NULL,
  campo             VARCHAR(64) NOT NULL,
  valor_anterior    TEXT,
  valor_novo        TEXT,
  alterado_por      UUID REFERENCES users(id) ON DELETE SET NULL,
  motivo            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE historico_alteracoes IS 'Histórico campo a campo para entidades críticas.';

CREATE INDEX idx_historico_entidade ON historico_alteracoes(tenant_id, entidade, entidade_id);

CREATE TABLE configuracoes_tenant (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  chave             VARCHAR(128) NOT NULL,
  valor             TEXT NOT NULL,
  tipo              config_valor_tipo NOT NULL DEFAULT 'STRING',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_config_tenant_chave UNIQUE (tenant_id, chave)
);

CREATE TRIGGER trg_config_updated_at
  BEFORE UPDATE ON configuracoes_tenant FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

CREATE TABLE logs_processamento_ia (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  avaliacao_id      UUID REFERENCES avaliacoes_ergonomicas(id) ON DELETE CASCADE,
  midia_id          UUID REFERENCES midias_avaliacao(id) ON DELETE CASCADE,
  modelo_ia         VARCHAR(64) NOT NULL,
  status            processamento_status NOT NULL,
  mensagem          TEXT,
  tempo_processamento_ms INTEGER,
  metadata_json     JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_ia_av ON logs_processamento_ia(tenant_id, avaliacao_id, created_at DESC);

CREATE TABLE logs_sistema (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id),
  nivel             VARCHAR(16) NOT NULL DEFAULT 'INFO',
  modulo            VARCHAR(64) NOT NULL,
  mensagem          TEXT NOT NULL,
  contexto_json     JSONB NOT NULL DEFAULT '{}',
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_sistema_tenant ON logs_sistema(tenant_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 15. Row Level Security (multitenancy no PostgreSQL)
-- -----------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes_ergonomicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY pol_users_tenant ON users
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY pol_setores_tenant ON setores
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY pol_colaboradores_tenant ON colaboradores
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY pol_avaliacoes_tenant ON avaliacoes_ergonomicas
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- -----------------------------------------------------------------------------
-- 16. SEEDS — Métodos ergonômicos
-- -----------------------------------------------------------------------------
INSERT INTO metodos_ergonomicos (codigo, nome, descricao, categoria) VALUES
  ('NIOSH', 'NIOSH / RNLE', 'Recommended Weight Limit e Lifting Index', 'CARGA_MANUAL'),
  ('OWAS', 'OWAS', 'Ovako Working Posture Analysis System', 'POSTURA'),
  ('OCRA', 'OCRA', 'Occupational Repetitive Actions', 'REPETITIVIDADE'),
  ('RULA', 'RULA', 'Rapid Upper Limb Assessment', 'POSTURA'),
  ('REBA', 'REBA', 'Rapid Entire Body Assessment', 'POSTURA'),
  ('ROSA', 'ROSA', 'Rapid Office Strain Assessment', 'ESCRITORIO'),
  ('SUZANNE_RODGERS', 'Suzanne Rodgers', 'Avaliação de postura sentada', 'POSTURA'),
  ('STRAIN_INDEX', 'Strain Index (Moore & Garg)', 'Índice de tensão para membros superiores', 'REPETITIVIDADE'),
  ('REVISED_STRAIN_INDEX', 'Revised Strain Index', 'Versão revisada do Strain Index', 'REPETITIVIDADE'),
  ('TLV_HAL', 'TLV HAL', 'Threshold Limit Value — Hand Activity Level', 'REPETITIVIDADE'),
  ('COUTO', 'Couto', 'Método de avaliação de postura', 'POSTURA'),
  ('QUESTIONARIO_BIPOLAR', 'Questionário Bipolar', 'Questionário de percepção de esforço', 'PSICOSSOCIAL'),
  ('QEC', 'QEC', 'Quick Exposure Check', 'EXPOSICAO'),
  ('LEHMANN', 'Lehmann', 'Avaliação de postura e movimento', 'POSTURA'),
  ('PLIBEL', 'PLIBEL', 'Plan for Identification and Measurement of Ergonomic Hazards', 'POSTURA'),
  ('NASA_TLX', 'NASA-TLX', 'Task Load Index — carga mental', 'PSICOSSOCIAL'),
  ('HSE_IT', 'HSE-IT', 'Health and Safety Executive — ferramentas IT', 'PSICOSSOCIAL'),
  ('ERGOS_CARGA_MENTAL', 'ERGOS Carga Mental', 'Carga mental ocupacional', 'PSICOSSOCIAL'),
  ('ANALISE_IMAGEM', 'Análise por imagem', 'Visão computacional — foto', 'IA'),
  ('ANALISE_VIDEO', 'Análise por vídeo', 'Visão computacional — vídeo', 'IA'),
  ('ANTROPOMETRIA', 'Antropometria', 'Medidas corporais e percentis', 'ANTROPOMETRIA'),
  ('KIM_EMPURRAR_PUXAR', 'KIM Empurrar/Puxar', 'Key Indicator Method — empurrar e puxar', 'CARGA_MANUAL'),
  ('KIM_LEVANTAR_SEGURAR_CARREGAR', 'KIM Levantar/Segurar/Carregar', 'Key Indicator Method — LHC', 'CARGA_MANUAL'),
  ('EPI_NR6', 'EPI NR-6', 'Equipamento de Proteção Individual', 'EPI'),
  ('CALOR_NHO06', 'Calor NHO-06', 'Exposição ao calor', 'AMBIENTAL'),
  ('RUIDO_NR15', 'Ruído NR-15', 'Exposição ao ruído', 'AMBIENTAL'),
  ('DIGITACAO', 'Digitação', 'Avaliação de atividade de digitação', 'REPETITIVIDADE'),
  ('ILUMINACAO_NHO11', 'Iluminação NHO-11', 'Níveis de iluminância', 'AMBIENTAL'),
  ('SNOOK_CIRIELLO', 'Snook & Ciriello', 'Tabelas de levantamento e empurrar/puxar', 'CARGA_MANUAL'),
  ('ESOCIAL', 'eSocial', 'Exportação de eventos SST', 'REGULATORIO')
ON CONFLICT (codigo) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 17. SEEDS — Parâmetros iniciais
-- -----------------------------------------------------------------------------
INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'LI', NULL, 1.0, 'indice', 'Aceitável', 'ACEITAVEL', 'Manter condições atuais'
FROM metodos_ergonomicos m WHERE m.codigo = 'NIOSH';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'LI', 1.01, 2.99, 'indice', 'Atenção', 'ATENCAO', 'Revisar tarefa e reduzir carga ou melhorar postura'
FROM metodos_ergonomicos m WHERE m.codigo = 'NIOSH';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'LI', 3.0, NULL, 'indice', 'Alto risco', 'ALTO', 'Intervenção imediata — redesenho da tarefa'
FROM metodos_ergonomicos m WHERE m.codigo = 'NIOSH';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 1, 2, 'pontos', 'Aceitável', 'ACEITAVEL', 'Postura aceitável'
FROM metodos_ergonomicos m WHERE m.codigo = 'RULA';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 3, 4, 'pontos', 'Investigar', 'ATENCAO', 'Investigar e planejar mudanças'
FROM metodos_ergonomicos m WHERE m.codigo = 'RULA';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 5, 6, 'pontos', 'Corrigir em breve', 'ALTO', 'Correção em curto prazo'
FROM metodos_ergonomicos m WHERE m.codigo = 'RULA';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 7, 7, 'pontos', 'Correção imediata', 'CRITICO', 'Ação imediata obrigatória'
FROM metodos_ergonomicos m WHERE m.codigo = 'RULA';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 1, 1, 'pontos', 'Desprezível', 'DESPREZIVEL', 'Sem ação'
FROM metodos_ergonomicos m WHERE m.codigo = 'REBA';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 2, 3, 'pontos', 'Baixo', 'BAIXO', 'Monitorar'
FROM metodos_ergonomicos m WHERE m.codigo = 'REBA';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 4, 7, 'pontos', 'Médio', 'MODERADO', 'Mudanças necessárias em médio prazo'
FROM metodos_ergonomicos m WHERE m.codigo = 'REBA';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 8, 10, 'pontos', 'Alto', 'ALTO', 'Mudanças necessárias em breve'
FROM metodos_ergonomicos m WHERE m.codigo = 'REBA';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 11, 15, 'pontos', 'Muito alto', 'MUITO_ALTO', 'Mudanças urgentes'
FROM metodos_ergonomicos m WHERE m.codigo = 'REBA';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'classe_acao', 1, 1, 'classe', 'Aceitável', 'ACEITAVEL', 'Manter'
FROM metodos_ergonomicos m WHERE m.codigo = 'OWAS';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'classe_acao', 2, 2, 'classe', 'Revisão futura', 'ATENCAO', 'Planejar melhorias'
FROM metodos_ergonomicos m WHERE m.codigo = 'OWAS';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'classe_acao', 3, 3, 'classe', 'Correção rápida', 'ALTO', 'Corrigir o quanto antes'
FROM metodos_ergonomicos m WHERE m.codigo = 'OWAS';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'classe_acao', 4, 4, 'classe', 'Correção imediata', 'CRITICO', 'Correção imediata'
FROM metodos_ergonomicos m WHERE m.codigo = 'OWAS';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 1, 2, 'pontos', 'Aceitável', 'ACEITAVEL', 'Estação adequada'
FROM metodos_ergonomicos m WHERE m.codigo = 'ROSA';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 3, 4, 'pontos', 'Atenção', 'ATENCAO', 'Ajustes recomendados'
FROM metodos_ergonomicos m WHERE m.codigo = 'ROSA';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 5, NULL, 'pontos', 'Intervenção necessária', 'ALTO', 'Redesenho do posto'
FROM metodos_ergonomicos m WHERE m.codigo = 'ROSA';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', NULL, 9.99, 'pontos', 'Baixo risco', 'BAIXO', 'Monitorar'
FROM metodos_ergonomicos m WHERE m.codigo IN ('KIM_EMPURRAR_PUXAR', 'KIM_LEVANTAR_SEGURAR_CARREGAR');

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 10, 24, 'pontos', 'Moderado', 'MODERADO', 'Melhorias recomendadas'
FROM metodos_ergonomicos m WHERE m.codigo IN ('KIM_EMPURRAR_PUXAR', 'KIM_LEVANTAR_SEGURAR_CARREGAR');

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 25, 49, 'pontos', 'Alto', 'ALTO', 'Intervenção prioritária'
FROM metodos_ergonomicos m WHERE m.codigo IN ('KIM_EMPURRAR_PUXAR', 'KIM_LEVANTAR_SEGURAR_CARREGAR');

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 50, NULL, 'pontos', 'Muito alto', 'MUITO_ALTO', 'Intervenção imediata'
FROM metodos_ergonomicos m WHERE m.codigo IN ('KIM_EMPURRAR_PUXAR', 'KIM_LEVANTAR_SEGURAR_CARREGAR');

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 0, 29, 'pontos', 'Baixa carga mental', 'BAIXO', 'Manter'
FROM metodos_ergonomicos m WHERE m.codigo = 'NASA_TLX';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 30, 49, 'pontos', 'Moderada', 'MODERADO', 'Monitorar equipe'
FROM metodos_ergonomicos m WHERE m.codigo = 'NASA_TLX';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 50, 69, 'pontos', 'Alta', 'ALTO', 'Reduzir demandas cognitivas'
FROM metodos_ergonomicos m WHERE m.codigo = 'NASA_TLX';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'pontuacao_final', 70, NULL, 'pontos', 'Muito alta', 'MUITO_ALTO', 'Intervenção organizacional'
FROM metodos_ergonomicos m WHERE m.codigo = 'NASA_TLX';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'exposicao_pct', NULL, 40, '%', 'Baixa exposição', 'BAIXO', 'Manter'
FROM metodos_ergonomicos m WHERE m.codigo = 'QEC';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'exposicao_pct', 41, 50, '%', 'Moderada', 'MODERADO', 'Acompanhar'
FROM metodos_ergonomicos m WHERE m.codigo = 'QEC';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'exposicao_pct', 51, 70, '%', 'Alta', 'ALTO', 'Intervir'
FROM metodos_ergonomicos m WHERE m.codigo = 'QEC';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'exposicao_pct', 70.01, NULL, '%', 'Muito alta', 'MUITO_ALTO', 'Intervenção urgente'
FROM metodos_ergonomicos m WHERE m.codigo = 'QEC';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'strain_index', NULL, 3, 'indice', 'Seguro', 'ACEITAVEL', 'Manter'
FROM metodos_ergonomicos m WHERE m.codigo = 'STRAIN_INDEX';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'strain_index', 3, 5, 'indice', 'Atenção', 'ATENCAO', 'Revisar ciclo de trabalho'
FROM metodos_ergonomicos m WHERE m.codigo = 'STRAIN_INDEX';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'strain_index', 5, 7, 'indice', 'Provável risco', 'ALTO', 'Redesenhar tarefa'
FROM metodos_ergonomicos m WHERE m.codigo = 'STRAIN_INDEX';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'strain_index', 7.01, NULL, 'indice', 'Alto risco', 'CRITICO', 'Intervenção imediata'
FROM metodos_ergonomicos m WHERE m.codigo = 'STRAIN_INDEX';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'nivel_ruido_8h', 85, 85, 'dB(A)', 'Limite 8 horas', 'ATENCAO', 'Programa de conservação auditiva'
FROM metodos_ergonomicos m WHERE m.codigo = 'RUIDO_NR15';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'nivel_ruido_4h', 90, 90, 'dB(A)', 'Limite 4 horas', 'ALTO', 'Reduzir exposição ou EPI'
FROM metodos_ergonomicos m WHERE m.codigo = 'RUIDO_NR15';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'nivel_ruido_2h', 95, 95, 'dB(A)', 'Limite 2 horas', 'ALTO', 'Controles de engenharia'
FROM metodos_ergonomicos m WHERE m.codigo = 'RUIDO_NR15';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'nivel_ruido_1h', 100, 100, 'dB(A)', 'Limite 1 hora', 'CRITICO', 'Isolamento acústico'
FROM metodos_ergonomicos m WHERE m.codigo = 'RUIDO_NR15';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'nivel_ruido_30min', 105, 105, 'dB(A)', 'Limite 30 minutos', 'CRITICO', 'Eliminar fonte ou afastar'
FROM metodos_ergonomicos m WHERE m.codigo = 'RUIDO_NR15';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'lux_escritorio', 500, NULL, 'lux', 'Escritório mínimo', 'ACEITAVEL', 'Conforme NHO-11'
FROM metodos_ergonomicos m WHERE m.codigo = 'ILUMINACAO_NHO11';

INSERT INTO parametros_metodos (metodo_id, nome_parametro, valor_minimo, valor_maximo, unidade, classificacao, nivel_risco, acao_recomendada)
SELECT m.id, 'lux_industrial', 300, 1000, 'lux', 'Área industrial', 'ATENCAO', 'Medir conforme tipo de tarefa visual'
FROM metodos_ergonomicos m WHERE m.codigo = 'ILUMINACAO_NHO11';

-- Permissões base
INSERT INTO permissions (codigo, descricao, modulo) VALUES
  ('tenant.read', 'Visualizar dados da empresa', 'tenant'),
  ('tenant.write', 'Editar configurações da empresa', 'tenant'),
  ('users.manage', 'Gerenciar usuários', 'users'),
  ('colaboradores.read', 'Listar colaboradores', 'rh'),
  ('colaboradores.write', 'Editar colaboradores', 'rh'),
  ('avaliacoes.create', 'Criar avaliações', 'avaliacoes'),
  ('avaliacoes.read', 'Visualizar avaliações', 'avaliacoes'),
  ('avaliacoes.approve', 'Aprovar laudos', 'avaliacoes'),
  ('laudos.emit', 'Emitir laudos técnicos', 'laudos'),
  ('esocial.export', 'Exportar eSocial', 'esocial'),
  ('auditoria.read', 'Consultar auditoria', 'auditoria')
ON CONFLICT (codigo) DO NOTHING;

COMMIT;

-- -----------------------------------------------------------------------------
-- 18. VIEWS — Dashboard (executar após COMMIT ou em nova transação)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_dashboard_tenant_resumo AS
SELECT
  t.id AS tenant_id,
  t.nome_fantasia,
  t.plano,
  t.status,
  COUNT(DISTINCT u.id) FILTER (WHERE u.deleted_at IS NULL AND u.ativo) AS usuarios_ativos,
  t.limite_usuarios,
  COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL) AS total_colaboradores,
  COUNT(DISTINCT a.id) FILTER (WHERE a.deleted_at IS NULL) AS total_avaliacoes,
  COUNT(DISTINCT a.id) FILTER (
    WHERE a.deleted_at IS NULL AND a.data_avaliacao >= NOW() - INTERVAL '30 days'
  ) AS avaliacoes_30_dias,
  COUNT(DISTINCT l.id) FILTER (WHERE l.deleted_at IS NULL AND l.status = 'EMITIDO') AS laudos_emitidos
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id
LEFT JOIN colaboradores c ON c.tenant_id = t.id
LEFT JOIN avaliacoes_ergonomicas a ON a.tenant_id = t.id
LEFT JOIN laudos l ON l.tenant_id = t.id
WHERE t.deleted_at IS NULL
GROUP BY t.id, t.nome_fantasia, t.plano, t.status, t.limite_usuarios;

CREATE OR REPLACE VIEW vw_avaliacoes_risco_por_setor AS
SELECT
  av.tenant_id,
  s.nome AS setor,
  av.risco_geral,
  COUNT(*) AS quantidade,
  AVG(av.score_geral) AS score_medio
FROM avaliacoes_ergonomicas av
LEFT JOIN setores s ON s.id = av.setor_id
WHERE av.deleted_at IS NULL
GROUP BY av.tenant_id, s.nome, av.risco_geral;

CREATE OR REPLACE VIEW vw_planos_acao_pendentes AS
SELECT
  p.tenant_id,
  p.id,
  p.titulo,
  p.responsavel,
  p.prazo,
  p.status,
  av.id AS avaliacao_id,
  c.nome AS colaborador
FROM planos_acao p
JOIN avaliacoes_ergonomicas av ON av.id = p.avaliacao_id
LEFT JOIN colaboradores c ON c.id = av.colaborador_id
WHERE p.deleted_at IS NULL
  AND p.status IN ('ABERTO', 'EM_ANDAMENTO', 'ATRASADO');

CREATE OR REPLACE VIEW vw_metodos_por_avaliacao AS
SELECT
  am.tenant_id,
  am.avaliacao_id,
  me.codigo AS metodo_codigo,
  me.nome AS metodo_nome,
  am.pontuacao_final,
  am.indice_final,
  am.classificacao,
  am.nivel_risco
FROM avaliacao_metodos am
JOIN metodos_ergonomicos me ON me.id = am.metodo_id;
