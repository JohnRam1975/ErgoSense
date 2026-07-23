/**
 * Corrige gaps da bateria funcional (API):
 * - inventário NR-01 com evidência + vínculo análise
 * - retry em 429 (rate limit público)
 * - denúncia pública ASSEDIO_MORAL + tenantId
 *
 * Uso: node ergosense-app/server/scripts/fase-funcional-fixes.mjs
 * Env: FUNC_BASE_URL, SEED_GLOBAL_ADMIN_* (via infra/.env)
 */
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const requireApp = createRequire(resolve(ROOT, 'ergosense-app/package.json'));
const { generateSync } = requireApp('otplib');

function loadEnvFile(p) {
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
loadEnvFile(resolve(ROOT, 'infra/.env'));

const BASE = process.env.FUNC_BASE_URL ?? 'http://127.0.0.1:8090';
const GLOBAL_EMAIL = process.env.SEED_GLOBAL_ADMIN_EMAIL ?? 'ergosense@dejohn.com.br';
const GLOBAL_PASS = process.env.SEED_GLOBAL_ADMIN_PASSWORD ?? process.env.E2E_GLOBAL_PASSWORD ?? '@Ergo!2026/Adm';
const OUT = resolve(ROOT, 'docs/audit/fase-funcional');
mkdirSync(OUT, { recursive: true });

const results = [];

function log(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${id} — ${detail}`);
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function raw(method, path, { token, body } = {}, retries = 5) {
  for (let i = 0; i < retries; i++) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE}${path}`, opts);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* */ }
    if (res.status === 429) {
      await sleep(2000 * (i + 1));
      continue;
    }
    return { status: res.status, ok: res.ok, json, text };
  }
  return { status: 429, ok: false, json: null, text: 'rate limited' };
}

function dataOf(r) {
  return r.json?.data ?? r.json;
}

function cpf() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9));
  const dig = (arr, f) => {
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += arr[i] * (f - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  n.push(dig(n, 10));
  n.push(dig(n, 11));
  return n.join('');
}

function cnpj() {
  const n = [];
  for (let i = 0; i < 8; i++) n.push(Math.floor(Math.random() * 9));
  n.push(0, 0, 0, 1);
  const check = (digits, weights) => {
    const sum = digits.reduce((a, d, i) => a + d * weights[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  n.push(check(n, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  n.push(check(n, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  const d = n.join('');
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

async function main() {
  const stamp = Date.now();
  const password = `Fix${stamp}!Aa`;
  const email = `fix.inv.${stamp}@teste.local`;

  const loginG = await raw('POST', '/api/auth/login', { body: { email: GLOBAL_EMAIL, password: GLOBAL_PASS } });
  const gTok = dataOf(loginG)?.accessToken ?? loginG.json?.accessToken;
  if (!gTok) throw new Error('login global falhou');

  const req = await raw('POST', '/api/public/tenant-request', {
    body: {
      tipoCadastro: 'EMPRESA',
      razaoSocial: `Fix Inv ${stamp}`,
      nomeFantasia: `Fix Inv ${stamp}`,
      cnpj: cnpj(),
      segmento: 'Indústria',
      quantidadeFuncionarios: 10,
      responsavelNome: 'Admin Fix',
      email,
      telefone: '11999998888',
      plano: 'PROFESSIONAL',
      password,
      confirmPassword: password,
    },
  });
  log('tenant-request', req.ok, `HTTP ${req.status}`);
  const created = dataOf(req);

  const ap = await raw('POST', `/api/admin/tenant-requests/${created.id}/approve`, { token: gTok, body: {} });
  const approved = dataOf(ap);
  log('approve', ap.ok, `tenant=${approved?.tenantId}`);

  const preview = await raw('GET', `/api/auth/activate-account/preview?token=${encodeURIComponent(approved.activationToken)}`);
  const pv = dataOf(preview);
  const secret = new URL(pv.otpauthUrl).searchParams.get('secret');
  await raw('POST', '/api/auth/activate-account', {
    body: { token: approved.activationToken, mfaCode: generateSync({ secret }) },
  });
  await raw('POST', `/api/admin/tenants/${encodeURIComponent(approved.tenantId)}/grant-access`, {
    token: gTok,
    body: { confirm: true, paymentNote: 'fix' },
  });

  const login1 = await raw('POST', '/api/auth/login', { body: { email, password } });
  const mfaTok = dataOf(login1)?.mfaToken ?? login1.json?.mfaToken;
  const sess = await raw('POST', '/api/auth/mfa/verify', {
    body: { mfaToken: mfaTok, code: generateSync({ secret }) },
  });
  const token = dataOf(sess)?.accessToken ?? sess.json?.accessToken;
  log('login-tenant', Boolean(token), 'mfa ok');

  const collab = await raw('POST', '/api/collaborators', {
    token,
    body: { nome: 'Colab Fix', name: 'Colab Fix', matricula: `F${stamp}`, setor: 'Produção', consent: true },
  });
  const collabId = dataOf(collab)?.id;

  const an = await raw('POST', '/api/analyses', {
    token,
    body: {
      collaboratorId: collabId,
      activity: 'Montagem',
      atividade: 'Montagem',
      setor: 'Produção',
      sector: 'Produção',
      mode: 'complete',
      score: 70,
      riskLevel: 'medio',
      synced: true,
    },
  });
  const analysisId = dataOf(an)?.id ?? an.json?.id ?? an.json?.data?.id;
  log('analysis', an.ok && Boolean(analysisId), `HTTP ${an.status} id=${analysisId} ${an.text.slice(0, 120)}`);

  const aet = await raw('POST', '/api/aet/processos', {
    token,
    body: { title: `AET Fix ${stamp}`, setor: 'Produção' },
  });
  const aetId = dataOf(aet)?.id ?? aet.json?.id;
  log('aet', aet.ok || Boolean(aetId), `id=${aetId}`);

  const inv = await raw('POST', '/api/risk-inventory', {
    token,
    body: {
      tipo: 'ERGONOMICO',
      type: 'ERGONOMICO',
      title: `Risco Fix ${stamp}`,
      probability: 3,
      severity: 4,
      generatingSource: 'Linha montagem',
      hazard: 'Postura forçada',
      consequence: 'Lombalgia',
      exposureDuration: '4h/dia',
      exposureFrequency: 'diária',
      exposureIntensity: 'moderada',
      homogeneousExposureGroup: 'GHE Montagem',
      exposedWorkersCount: 5,
      controlMeasures: 'Pausas e rodízio',
      evidences: [{ tipo: 'FOTO', descricao: 'Registro posto de trabalho — teste funcional' }],
      evidencias: [{ tipo: 'FOTO', descricao: 'Registro posto de trabalho — teste funcional' }],
      analysisId: analysisId ? Number(analysisId) : undefined,
      analiseId: analysisId ? Number(analysisId) : undefined,
      aetProcessId: aetId ? Number(aetId) : undefined,
      aetProcessoId: aetId ? Number(aetId) : undefined,
    },
  });
  log('inventario-nr01', inv.ok, `HTTP ${inv.status} ${inv.text.slice(0, 180)}`);

  const den = await raw('POST', '/api/denuncias/public', {
    body: {
      tenantId: approved.tenantId,
      type: 'ASSEDIO_MORAL',
      tipo: 'ASSEDIO_MORAL',
      modality: 'ANONIMA',
      modalidade: 'ANONIMA',
      lgpdConsent: true,
      lgpdConsentimento: true,
      description: `Denúncia fix ${stamp}`,
      descricao: `Denúncia fix ${stamp}`,
      anonymous: true,
    },
  });
  log('denuncia-public', den.ok, `HTTP ${den.status} ${den.text.slice(0, 120)}`);

  const auto = await raw('POST', '/api/public/tenant-request', {
    body: {
      tipoCadastro: 'AUTONOMO',
      razaoSocial: `Auto Fix ${stamp}`,
      cpf: cpf(),
      segmento: 'Consultoria',
      responsavelNome: 'Auto',
      email: `auto.fix.${stamp}@teste.local`,
      telefone: '11988887777',
      logradouro: 'Rua A',
      numero: '1',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01001000',
      password,
      confirmPassword: password,
    },
  });
  log('autonomo-429-retry', auto.ok, `HTTP ${auto.status}`);

  writeFileSync(resolve(OUT, 'fase-funcional-fixes.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
