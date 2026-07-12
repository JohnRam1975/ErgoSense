import 'dotenv/config';
import { query, pool } from '../src/db.js';

await query(`
  INSERT INTO usuarios (tenant_id, email, senha_hash, nome, perfil, cargo, localizacao, ativo)
  VALUES (
    'vale', 'admin@vale.com.br',
    crypt('admin1234', gen_salt('bf')),
    'João Silva', 'ADMIN_EMPRESA', 'Administrador', 'Carajás', TRUE
  )
  ON CONFLICT (tenant_id, email) DO UPDATE SET
    senha_hash = EXCLUDED.senha_hash, perfil = EXCLUDED.perfil, updated_at = NOW()
`);
console.log('Tenant admin Vale: admin@vale.com.br / admin1234');
await pool.end();
