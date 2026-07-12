import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, pool } from '../src/db.js';
import { migrateExistingOrganizationalData } from '../src/services/orgUtils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(
  path.resolve(__dirname, '../../../docs/database/migrations/014-organizational-structure.sql'),
  'utf8',
);

await query(sql);
console.log('Migration 014-organizational-structure aplicada.');

const result = await migrateExistingOrganizationalData(query);
console.log(
  `Migração de dados: ${result.migratedTenants} empresas, ${result.migratedCollabs} colaboradores, ${result.migratedRisks} riscos vinculados.`,
);

await pool.end();
