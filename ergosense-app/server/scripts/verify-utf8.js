import 'dotenv/config';
import { query, pool } from '../src/db.js';

await query(`UPDATE setores SET nome = $1, updated_at = NOW() WHERE id = 9`, ['Produção']);
await query(`UPDATE tenants SET industria = $1, updated_at = NOW() WHERE tenant_id = $2`, [
  'Construção Civil',
  'construtora_beta',
]);

const t = await query(`SELECT tenant_id, industria FROM tenants WHERE tenant_id = 'construtora_beta'`);
const s = await query(`SELECT id, nome FROM setores WHERE tenant_id = 'construtora_beta'`);

console.log(JSON.stringify({ tenant: t.rows[0], setores: s.rows }, null, 2));
await pool.end();
