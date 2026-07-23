/**
 * Smoke: AET automática após POST /api/analyses
 * Uso: node ergosense-app/server/scripts/smoke-aet-auto.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');

function loadEnv(p) {
  try {
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch { /* */ }
}
loadEnv(resolve(ROOT, 'infra/.env'));

const BASE = process.env.FUNC_BASE_URL ?? 'http://127.0.0.1:8090';
const EMAIL = process.env.E2E_EMAIL ?? 'auditor@ergosense.test';
const PASS = process.env.E2E_PASSWORD ?? 'AuditTest!2026';

async function main() {
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  }).then((r) => r.json());
  const token = login.data?.accessToken ?? login.accessToken;
  if (!token) throw new Error('login falhou');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const stamp = Date.now();
  const collab = await fetch(`${BASE}/api/collaborators`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ nome: `Smoke AET ${stamp}`, matricula: `SA${stamp}`, setor: 'Produção', consent: true }),
  }).then((r) => r.json());
  const collabId = collab.data?.id ?? collab.id;

  const an = await fetch(`${BASE}/api/analyses`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      collaboratorId: collabId,
      activity: 'Smoke AET auto',
      mode: 'complete',
      score: 70,
      riskLevel: 'medio',
      synced: true,
    }),
  });
  const body = await an.json();
  const data = body.data ?? body;
  console.log('HTTP', an.status, JSON.stringify(data));
  if (!an.ok || !data.aetProcessId) {
    console.error('FAIL: esperava aetProcessId');
    process.exit(1);
  }
  console.log('PASS AET auto processId=', data.aetProcessId, 'report=', data.aetReportGenerated);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
