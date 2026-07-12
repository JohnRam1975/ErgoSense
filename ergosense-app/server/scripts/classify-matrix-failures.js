/**
 * Classifica falhas da matriz anterior (v1) para relatório de continuação
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRouteContract, classifyFailure } from './lib/routeContracts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const matrixPath = path.join(__dirname, '../../../docs/audit/endpoints/endpoint-matrix.json');
const outPath = path.join(__dirname, '../../../docs/audit/endpoints/endpoint-matrix-v1-classification.json');

if (!fs.existsSync(matrixPath)) {
  console.error('Matriz não encontrada');
  process.exit(1);
}

const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const classified = [];

for (const r of Object.values(matrix.routes)) {
  const route = { method: r.method, path: r.path, auth: r.auth ?? 'bearer', adminGlobal: r.adminGlobal ?? false };
  const contract = getRouteContract(route);
  for (const [check, result] of Object.entries(r.checks)) {
    if (result.ok !== true && result.ok !== 'skip') {
      classified.push({
        method: r.method,
        path: r.path,
        check,
        detail: result.detail,
        ...classifyFailure(route, check, result.detail, contract),
      });
    }
  }
}

const summary = {};
for (const c of classified) summary[c.classification] = (summary[c.classification] ?? 0) + 1;

fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), total: classified.length, summary, items: classified }, null, 2));
console.log('Classificação v1:', summary);
