/**
 * Aplica migration 003 — colunas JSON de avaliação de carga em resultados_ia.
 * Uso: npm run migrate:load (na pasta server)
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, pool } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, '../../../docs/database/migrations/003-load-assessment.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

await query(sql);
console.log('Migration 003-load-assessment aplicada.');
await pool.end();
