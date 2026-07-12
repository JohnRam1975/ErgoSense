/**
 * Aplica migration 008 — Psicossocial
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, pool } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, '../../../docs/database/migrations/008-psicossocial.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

await query(sql);
console.log('Migration 008-psicossocial aplicada.');
await pool.end();
