/**
 * Aplica migration 016 — AET Corporativo
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, pool } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, '../../../docs/database/migrations/016-aet-corporate.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

await query(sql);
console.log('Migration 016-aet-corporate aplicada.');
await pool.end();
