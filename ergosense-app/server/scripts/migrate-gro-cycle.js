/**
 * Aplica migration 006 — Ciclo GRO completo
 * Uso: npm run migrate:gro (na pasta server)
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, pool } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, '../../../docs/database/migrations/006-gro-cycle.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

await query(sql);
console.log('Migration 006-gro-cycle aplicada.');
await pool.end();
