import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { query, pool } from '../src/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, '../../../docs/database/migrations/002-support-access.sql'), 'utf8');
await query(sql);
await query(`UPDATE tenants SET plano = 'Enterprise' WHERE tenant_id = 'vale'`);
console.log('Migration 002-support-access OK');
await pool.end();
