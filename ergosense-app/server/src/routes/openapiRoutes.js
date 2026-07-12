/**
 * OpenAPI 3.0 + Swagger UI
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = path.join(__dirname, '../openapi/openapi.json');

let cachedSpec = null;

function loadSpec() {
  if (cachedSpec) return cachedSpec;
  if (fs.existsSync(SPEC_PATH)) {
    cachedSpec = JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8'));
    return cachedSpec;
  }
  cachedSpec = { openapi: '3.0.3', info: { title: 'ErgoSense API', version: '1.0.0' }, paths: {} };
  return cachedSpec;
}

const SWAGGER_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>ErgoSense API — Swagger</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css"/>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ url: '/api/openapi.json', dom_id: '#swagger-ui', deepLinking: true });
  </script>
</body>
</html>`;

export function registerOpenApiRoutes(app) {
  app.get('/api/openapi.json', (_req, res) => {
    res.json(loadSpec());
  });

  app.get('/api/docs', (_req, res) => {
    res.type('html').send(SWAGGER_HTML);
  });
}
