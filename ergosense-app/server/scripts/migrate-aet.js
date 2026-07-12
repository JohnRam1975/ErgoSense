/**
 * Aplica migration 009 — AET Ergonomia
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, pool } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, '../../../docs/database/migrations/009-aet-ergonomia.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

await query(sql);
console.log('Migration 009-aet-ergonomia aplicada.');
await pool.end();
