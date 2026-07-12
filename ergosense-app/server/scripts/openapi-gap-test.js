/**
 * Valida OpenAPI vs rotas implementadas
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanAllRoutes } from './lib/routeScanner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '../../..');
const openapiPath = path.join(__dirname, '../src/openapi/openapi.json');
const outDir = path.join(repoRoot, 'docs/audit/openapi');

function routeKey(method, p) {
  return `${method.toUpperCase()} ${p}`;
}

function main() {
  if (!fs.existsSync(openapiPath)) {
    console.error('OpenAPI não encontrado');
    process.exit(2);
  }

  const spec = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
  const openapiOps = [];
  for (const [p, methods] of Object.entries(spec.paths ?? {})) {
    for (const m of Object.keys(methods)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(m)) openapiOps.push(routeKey(m, p));
    }
  }

  const routes = scanAllRoutes();
  const routeKeys = new Set(routes.map((r) => routeKey(r.method, r.path)));
  const openapiSet = new Set(openapiOps);
  const undocumented = routes.filter((r) => !openapiSet.has(routeKey(r.method, r.path)));
  const orphanDocs = openapiOps.filter((k) => !routeKeys.has(k));

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'openapi-gap.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), undocumented, orphanOpenapi: orphanDocs }, null, 2),
  );

  let md = `# OpenAPI Gap Report — P4\n\nGerado: ${new Date().toISOString()}\n\n`;
  md += `| Rotas | ${routes.length} | OpenAPI ops | ${openapiOps.length} | Undocumented | ${undocumented.length} | Orphan | ${orphanDocs.length} |\n\n`;
  if (undocumented.length) {
    md += `## Rotas sem OpenAPI\n\n| Método | Rota | Tag |\n|--------|------|-----|\n`;
    for (const r of undocumented) md += `| ${r.method} | \`${r.path}\` | ${r.tag} |\n`;
  } else md += `## ✅ Todas as rotas documentadas\n`;
  fs.writeFileSync(path.join(outDir, 'OPENAPI-GAP-2026-07-01.md'), md);
  console.log(`Gap: ${undocumented.length} undocumented`);
  process.exit(undocumented.length ? 1 : 0);
}

main();
