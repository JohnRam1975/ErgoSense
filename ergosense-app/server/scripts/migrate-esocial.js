import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, pool } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.resolve(__dirname, '../../../docs/database/migrations/011-esocial.sql'), 'utf8');
await query(sql);
console.log('Migration 011-esocial aplicada.');
await pool.end();
