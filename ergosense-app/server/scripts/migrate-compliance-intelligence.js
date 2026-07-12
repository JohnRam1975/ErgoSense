/**
 * Aplica migration 017 — Compliance Intelligence v2
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, pool } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, '../../../docs/database/migrations/017-compliance-intelligence-v2.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

await query(sql);
console.log('Migration 017-compliance-intelligence-v2 aplicada.');
await pool.end();
