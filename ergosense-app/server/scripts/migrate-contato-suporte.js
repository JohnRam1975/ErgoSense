import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { query, pool } from '../src/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, '../../../docs/database/migrations/022-contato-suporte.sql'), 'utf8');
await query(sql);
console.log('Migration 022-contato-suporte OK');
await pool.end();
