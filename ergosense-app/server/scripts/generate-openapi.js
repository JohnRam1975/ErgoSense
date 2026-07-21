/**
 * Gera OpenAPI 3.0 a partir dos arquivos de rotas.
 * Uso: node scripts/generate-openapi.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesDir = path.join(__dirname, '../src/routes');
const outPath = path.join(__dirname, '../src/openapi/openapi.json');

const TAG_MAP = {
  auth: 'Autenticação',
  tenant: 'Tenants',
  core: 'Core',
  risk: 'Inventário de Riscos',
  gro: 'GRO',
  pgr: 'PGR',
  psico: 'Psicossocial',
  aet: 'AET',
  sst: 'SST',
  esocial: 'eSocial',
  compliance: 'Compliance',
  org: 'Organização',
  denuncia: 'Denúncias',
  criteria: 'Critérios',
  system: 'Sistema',
  ai: 'IA Expert',
  mfa: 'MFA',
  admin: 'Admin',
  support: 'Suporte',
  public: 'Público',
};

function inferTag(routePath) {
  const segment = routePath.split('/')[2] ?? 'core';
  return TAG_MAP[segment] ?? segment;
}

function inferSummary(method, routePath) {
  return `${method.toUpperCase()} ${routePath}`;
}

function scanRoutes() {
  const paths = {};
  const files = fs.readdirSync(routesDir).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
    const regex = /app\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const method = match[1].toLowerCase();
      const routePath = match[2];
      if (!routePath.startsWith('/api/')) continue;

      paths[routePath] ??= {};
      paths[routePath][method] = {
        tags: [inferTag(routePath)],
        summary: inferSummary(method, routePath),
        security: routePath.includes('/auth/login') || routePath.includes('/psico/public') || routePath.includes('/denuncias/public')
          ? []
          : [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Sucesso' },
          400: { description: 'Requisição inválida' },
          401: { description: 'Não autenticado' },
          403: { description: 'Sem permissão' },
          429: { description: 'Rate limit' },
          500: { description: 'Erro interno' },
        },
      };

      if (['post', 'put', 'patch'].includes(method)) {
        paths[routePath][method].requestBody = {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        };
      }
    }
  }

  // Rotas inline em index.js
  const indexContent = fs.readFileSync(path.join(__dirname, '../src/index.js'), 'utf8');
  const indexRegex = /app\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;
  let indexMatch;
  while ((indexMatch = indexRegex.exec(indexContent)) !== null) {
    const method = indexMatch[1].toLowerCase();
    const routePath = indexMatch[2];
    if (!routePath.startsWith('/api/')) continue;
    paths[routePath] ??= {};
    paths[routePath][method] = {
      tags: [inferTag(routePath)],
      summary: inferSummary(method, routePath),
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Sucesso' } },
    };
  }

  return paths;
}

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'ErgoSense API',
    version: '1.0.0',
    description: 'API REST multi-tenant para SST, ergonomia, GRO, PGR, AET, psicossocial, eSocial e compliance.',
  },
  servers: [{ url: '/api', description: 'Gateway relativo' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          accessToken: { type: 'string' },
          expiresIn: { type: 'integer' },
          user: { type: 'object' },
        },
      },
    },
  },
  paths: scanRoutes(),
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(spec, null, 2));
console.log(`OpenAPI gerado: ${Object.keys(spec.paths).length} paths → ${outPath}`);
