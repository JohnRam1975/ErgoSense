import 'dotenv/config';
import { query, pool } from '../src/db.js';

await query(`
  INSERT INTO tenants (tenant_id, nome, industria, schema_name, icone, cor, ativo)
  VALUES ('ergosense', 'ErgoSense Platform', 'Plataforma SaaS', 'ergosense_platform', '🌐', 'cyan', TRUE)
  ON CONFLICT (tenant_id) DO NOTHING
`);
await query(`
  INSERT INTO usuarios (tenant_id, email, senha_hash, nome, perfil, cargo, localizacao, ativo)
  VALUES (
    'ergosense', 'admin@ergosense.com.br',
    crypt('admin1234', gen_salt('bf')),
    'Administrador Global', 'ADMIN_GLOBAL', 'Admin Global', 'Brasil', TRUE
  )
  ON CONFLICT (tenant_id, email) DO UPDATE SET
    senha_hash = EXCLUDED.senha_hash,
    perfil = EXCLUDED.perfil,
    updated_at = NOW()
`);
console.log('Global admin: admin@ergosense.com.br / admin1234');
await pool.end();
