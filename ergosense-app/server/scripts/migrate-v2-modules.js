/**
 * Migração V2 — métodos ergonômicos, distâncias, objetos, vídeo, antropometria, ambientais, auditoria, eSocial
 */
import { pool } from '../src/db.js';

const SQL = `
CREATE TABLE IF NOT EXISTS metodo_ergonomico_resultado (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  analise_id VARCHAR(64) NOT NULL,
  metodo VARCHAR(64) NOT NULL,
  json_entrada JSONB,
  json_saida JSONB,
  versao_norma VARCHAR(32),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medicao_distancia (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  analise_id VARCHAR(64),
  tipo VARCHAR(32) NOT NULL,
  cm NUMERIC(8,2),
  metodo VARCHAR(32),
  confianca NUMERIC(4,3),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS objeto_detectado (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  analise_id VARCHAR(64),
  classe VARCHAR(32),
  bbox JSONB,
  confianca NUMERIC(4,3),
  frame_id INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_analise (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  analise_id VARCHAR(64) NOT NULL,
  url TEXT,
  frames_processados INT,
  resumo_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS antropometria_colaborador (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  colaborador_id VARCHAR(64) NOT NULL,
  altura_cm NUMERIC(6,2),
  peso_kg NUMERIC(6,2),
  sexo CHAR(1),
  idade INT,
  percentis_json JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ambiental_medicao (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  analise_id VARCHAR(64),
  ruido_db NUMERIC(6,2),
  ibutg NUMERIC(6,2),
  lux NUMERIC(8,2),
  json_extra JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auditoria_log (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  usuario_email VARCHAR(255),
  entidade VARCHAR(64),
  entidade_id VARCHAR(64),
  acao VARCHAR(32),
  diff_json JSONB,
  ip VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS esocial_export (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  analise_id VARCHAR(64),
  evento VARCHAR(16),
  xml_path TEXT,
  status VARCHAR(32) DEFAULT 'gerado',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE analises ADD COLUMN IF NOT EXISTS v2_report_json JSONB;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS altura_cm NUMERIC(6,2);
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS peso_kg NUMERIC(6,2);
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS sexo CHAR(1);
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS idade INT;
`;

async function main() {
  await pool.query(SQL);
  console.log('Migração V2 concluída.');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
