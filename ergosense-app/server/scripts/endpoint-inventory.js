/**
 * Gera inventário completo de endpoints (JSON + Markdown)
 * Uso: node scripts/endpoint-inventory.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanAllRoutes } from './lib/routeScanner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../../../docs/audit/endpoints');
const openapiPath = path.join(__dirname, '../src/openapi/openapi.json');

const routes = scanAllRoutes();
let openapiOps = [];
if (fs.existsSync(openapiPath)) {
  const spec = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
  for (const [p, methods] of Object.entries(spec.paths ?? {})) {
    for (const m of Object.keys(methods)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(m)) {
        openapiOps.push(`${m.toUpperCase()} ${p}`);
      }
    }
  }
}

const routeKeys = new Set(routes.map((r) => `${r.method} ${r.path}`));
const openapiSet = new Set(openapiOps);
const undocumented = routes.filter((r) => !openapiSet.has(`${r.method} ${r.path}`));
const orphanDocs = openapiOps.filter((k) => !routeKeys.has(k));

const byTag = {};
for (const r of routes) {
  byTag[r.tag] ??= [];
  byTag[r.tag].push(r);
}

const inventory = {
  generatedAt: new Date().toISOString(),
  totals: {
    routes: routes.length,
    openapiOperations: openapiOps.length,
    public: routes.filter((r) => r.auth === 'public').length,
    protected: routes.filter((r) => r.auth === 'bearer').length,
    adminGlobal: routes.filter((r) => r.adminGlobal).length,
    undocumented: undocumented.length,
    orphanOpenapi: orphanDocs.length,
  },
  byTag: Object.fromEntries(
    Object.entries(byTag).map(([tag, list]) => [tag, list.length]),
  ),
  routes,
  gaps: { undocumented, orphanOpenapi: orphanDocs },
};

fs.mkdirSync(outDir, { recursive: true });
const jsonPath = path.join(outDir, 'endpoint-inventory.json');
fs.writeFileSync(jsonPath, JSON.stringify(inventory, null, 2));

let md = `# Inventário de Endpoints — ErgoSensePro\n\n`;
md += `Gerado em: ${inventory.generatedAt}\n\n`;
md += `| Métrica | Valor |\n|---------|------:|\n`;
md += `| Rotas registradas | ${inventory.totals.routes} |\n`;
md += `| Operações OpenAPI | ${inventory.totals.openapiOperations} |\n`;
md += `| Públicas | ${inventory.totals.public} |\n`;
md += `| Protegidas (Bearer) | ${inventory.totals.protected} |\n`;
md += `| Admin global | ${inventory.totals.adminGlobal} |\n`;
md += `| Sem documentação OpenAPI | ${inventory.totals.undocumented} |\n`;
md += `| OpenAPI órfão (sem rota) | ${inventory.totals.orphanOpenapi} |\n\n`;

md += `## Por tag\n\n| Tag | Endpoints |\n|-----|----------:|\n`;
for (const [tag, n] of Object.entries(inventory.byTag).sort((a, b) => b[1] - a[1])) {
  md += `| ${tag} | ${n} |\n`;
}

md += `\n## Rotas (${routes.length})\n\n`;
md += `| Método | Rota | Auth | Tag | Arquivo |\n|--------|------|------|-----|--------|\n`;
for (const r of routes) {
  md += `| ${r.method} | \`${r.path}\` | ${r.auth} | ${r.tag} | ${r.sourceFile} |\n`;
}

if (undocumented.length) {
  md += `\n## Rotas sem OpenAPI (${undocumented.length})\n\n`;
  for (const r of undocumented.slice(0, 50)) {
    md += `- ${r.method} ${r.path}\n`;
  }
  if (undocumented.length > 50) md += `\n… e mais ${undocumented.length - 50}\n`;
}

const mdPath = path.join(outDir, 'endpoint-inventory.md');
fs.writeFileSync(mdPath, md);

console.log(`Inventário: ${routes.length} rotas → ${jsonPath}`);
console.log(`Markdown: ${mdPath}`);
