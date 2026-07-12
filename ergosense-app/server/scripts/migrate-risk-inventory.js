/**
 * Aplica migration 005 — Inventário de Riscos NR-01
 * Uso: npm run migrate:risk-inventory (na pasta server)
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, pool } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, '../../../docs/database/migrations/005-risk-inventory.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

await query(sql);
console.log('Migration 005-risk-inventory aplicada.');
await pool.end();
