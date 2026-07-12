import 'dotenv/config';
import { query, pool } from '../src/db.js';
import { repairPortugueseText } from '../src/textEncoding.js';

async function fixTable(table, idField, textFields) {
  const { rows } = await query(`SELECT * FROM ${table} WHERE deleted_at IS NULL OR deleted_at IS NOT NULL`);
  let fixed = 0;
  for (const row of rows) {
    const updates = {};
    for (const field of textFields) {
      const raw = row[field];
      if (typeof raw !== 'string') continue;
      const repaired = repairPortugueseText(raw);
      if (repaired !== raw) updates[field] = repaired;
    }
    if (Object.keys(updates).length === 0) continue;
    const sets = Object.keys(updates).map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = [row[idField], ...Object.values(updates)];
    await query(`UPDATE ${table} SET ${sets}, updated_at = NOW() WHERE ${idField} = $1`, values);
    console.log(`Corrigido ${table}#${row[idField]}:`, updates);
    fixed += 1;
  }
  return fixed;
}

const tenantFixed = await fixTable('tenants', 'tenant_id', ['nome', 'industria']);
const setorFixed = await fixTable('setores', 'id', ['nome']);
const colabFixed = await fixTable('colaboradores', 'id', ['nome', 'cargo', 'turno']);
const userFixed = await fixTable('usuarios', 'id', ['nome', 'cargo', 'localizacao']);

console.log('UTF-8 fix concluído.', { tenantFixed, setorFixed, colabFixed, userFixed });
await pool.end();
