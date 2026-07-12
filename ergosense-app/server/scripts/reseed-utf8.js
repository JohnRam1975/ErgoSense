import 'dotenv/config';
import { query, pool } from '../src/db.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedPath = join(__dirname, '../../../docs/database/postgresql-seed.sql');
const seed = readFileSync(seedPath, 'utf8');

/** Reaplica inserts do seed com UTF-8 correto (ON CONFLICT atualiza). */
const statements = seed
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.startsWith('INSERT INTO'));

for (const stmt of statements) {
  if (!stmt) continue;
  try {
    await query(stmt);
  } catch (err) {
    console.warn('Skip:', err.message?.slice(0, 80));
  }
}

await query(`UPDATE tenants SET industria = $1, updated_at = NOW() WHERE tenant_id = $2`, [
  'Construção Civil',
  'construtora_beta',
]);

const rows = await query(`
  SELECT tenant_id, nome, industria, icone FROM tenants
  WHERE deleted_at IS NULL ORDER BY nome
`);
console.log(JSON.stringify(rows.rows, null, 2));
await pool.end();
