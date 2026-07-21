import 'dotenv/config';
import { query, pool } from '../src/db.js';

const email = process.env.SEED_GLOBAL_ADMIN_EMAIL || 'ergosense@dejohn.com.br';
const password = process.env.SEED_GLOBAL_ADMIN_PASSWORD || '@Ergo!2026/Adm';
const nome = process.env.SEED_GLOBAL_ADMIN_NAME || 'Administrador Global';
const legacyEmail = 'admin@ergosense.com.br';

await query(`
  INSERT INTO tenants (tenant_id, nome, industria, schema_name, icone, cor, ativo)
  VALUES ('ergosense', 'ErgoSense Platform', 'Plataforma SaaS', 'ergosense_platform', '🌐', 'cyan', TRUE)
  ON CONFLICT (tenant_id) DO NOTHING
`);

// Migra admin legado → novo e-mail (se existir)
await query(
  `UPDATE usuarios
   SET email = $1, updated_at = NOW()
   WHERE tenant_id = 'ergosense' AND email = $2 AND NOT EXISTS (
     SELECT 1 FROM usuarios WHERE tenant_id = 'ergosense' AND email = $1
   )`,
  [email, legacyEmail],
);

await query(
  `
  INSERT INTO usuarios (tenant_id, email, senha_hash, nome, perfil, cargo, localizacao, ativo)
  VALUES (
    'ergosense', $1,
    crypt($2, gen_salt('bf')),
    $3, 'ADMIN_GLOBAL', 'Admin Global', 'Brasil', TRUE
  )
  ON CONFLICT (tenant_id, email) DO UPDATE SET
    senha_hash = EXCLUDED.senha_hash,
    perfil = EXCLUDED.perfil,
    nome = EXCLUDED.nome,
    ativo = TRUE,
    updated_at = NOW()
`,
  [email, password, nome],
);

// Desativa legado se ainda existir com e-mail antigo
await query(
  `UPDATE usuarios SET ativo = FALSE, updated_at = NOW()
   WHERE tenant_id = 'ergosense' AND email = $1 AND $1 <> $2`,
  [legacyEmail, email],
);

console.log(`Global admin: ${email}`);
await pool.end();
