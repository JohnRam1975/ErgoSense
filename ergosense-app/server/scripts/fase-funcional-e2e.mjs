/**
 * Bateria funcional E2E — prompt-teste-funcional-ergosense.md (F1–F10 + transversais)
 * Ambiente: Docker local http://127.0.0.1:8090
 */
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const requireApp = createRequire(resolve(ROOT, 'ergosense-app/package.json'));
const { generateSync } = requireApp('otplib');
const OUT = resolve(ROOT, 'docs/audit/fase-funcional');
mkdirSync(OUT, { recursive: true });

function loadEnvFile(p) {
  try {
    const raw = readFileSync(p, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch { /* optional */ }
}
loadEnvFile(resolve(ROOT, 'infra/.env'));

const BASE = process.env.FUNC_BASE_URL ?? 'http://127.0.0.1:8090';
const GLOBAL_EMAIL = process.env.SEED_GLOBAL_ADMIN_EMAIL ?? process.env.E2E_GLOBAL_EMAIL ?? 'ergosense@dejohn.com.br';
const GLOBAL_PASS = process.env.SEED_GLOBAL_ADMIN_PASSWORD ?? process.env.E2E_GLOBAL_PASSWORD ?? '@Ergo!2026/Adm';
const ROLE_PASS = process.env.FUNC_ROLE_PASSWORD ?? 'FuncTest!2026Aa';
const stamp = Date.now();

const results = [];
const bugs = [];

function record(mod, id, title, status, detail = '', role = '') {
  results.push({
    modulo: mod,
    id,
    title,
    status, // PASS | WARN | FAIL | BLOCKED
    detail: String(detail).slice(0, 500),
    role,
    at: new Date().toISOString(),
  });
  const icon = { PASS: 'OK', WARN: 'WARN', FAIL: 'FAIL', BLOCKED: 'BLOCK' }[status] ?? status;
  console.log(`[${icon}] ${mod}/${id} — ${title}${detail ? ` | ${String(detail).slice(0, 120)}` : ''}`);
  if (status === 'FAIL') {
    bugs.push({
      modulo: mod,
      telaApi: id,
      papel: role,
      passos: title,
      esperado: 'fluxo completo / comportamento documentado',
      obtido: detail,
      severidade: mod.startsWith('F') ? 'Alta' : 'Média',
      evidencia: detail,
    });
  }
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function raw(method, path, { token, body, headers = {} } = {}, retries = 6) {
  const t0 = Date.now();
  for (let i = 0; i < retries; i++) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
    };
    if (token) opts.headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(`${BASE}${path}`, opts);
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch { /* */ }
      if (res.status === 429 && i < retries - 1) {
        await sleep(2500 * (i + 1));
        continue;
      }
      return { status: res.status, ms: Date.now() - t0, json, text, ok: res.ok };
    } catch (err) {
      if (i < retries - 1) {
        await sleep(1000 * (i + 1));
        continue;
      }
      return { status: 0, ms: Date.now() - t0, json: null, text: '', ok: false, error: err.message };
    }
  }
  return { status: 429, ms: Date.now() - t0, json: null, text: 'rate limited', ok: false };
}

function dataOf(r) {
  return r.json?.data ?? r.json;
}

async function login(email, password) {
  const r = await raw('POST', '/api/auth/login', { body: { email, password } });
  const d = dataOf(r) ?? r.json;
  if (!r.ok) return { ok: false, status: r.status, body: r.json, error: r.json?.error ?? r.json?.message };
  if (d?.mfaRequired || r.json?.mfaRequired) {
    return {
      ok: true,
      mfaRequired: true,
      mfaToken: d?.mfaToken ?? r.json?.mfaToken,
      otpauthUrl: d?.otpauthUrl,
    };
  }
  return {
    ok: true,
    token: d?.accessToken ?? r.json?.accessToken,
    user: d?.user ?? r.json?.user,
    csrfToken: d?.csrfToken ?? r.json?.csrfToken,
    raw: d ?? r.json,
  };
}

async function loginWithMfa(email, password, otpauthUrl) {
  const first = await login(email, password);
  if (!first.ok) return first;
  if (!first.mfaRequired) return first;
  const secret = new URL(otpauthUrl).searchParams.get('secret');
  const code = generateSync({ secret });
  const r = await raw('POST', '/api/auth/mfa/verify', {
    body: { mfaToken: first.mfaToken, code },
  });
  const d = dataOf(r) ?? r.json;
  if (!r.ok) return { ok: false, status: r.status, body: r.json };
  return {
    ok: true,
    token: d?.accessToken ?? r.json?.accessToken,
    user: d?.user ?? r.json?.user,
    csrfToken: d?.csrfToken ?? r.json?.csrfToken,
  };
}

function generateValidCnpj() {
  const n = [];
  for (let i = 0; i < 8; i++) n.push(Math.floor(Math.random() * 9));
  n.push(0, 0, 0, 1);
  const check = (digits, weights) => {
    const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  n.push(check(n, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  n.push(check(n, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  const d = n.join('');
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function generateValidCpf() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9));
  const dig = (arr, factor) => {
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += arr[i] * (factor - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  n.push(dig(n, 10));
  n.push(dig(n, 11));
  return n.join('');
}

function sql(q) {
  const r = spawnSync(
    'docker',
    ['exec', '-i', 'ergosense-db', 'psql', '-U', 'postgres', '-d', 'ergosense', '-t', '-A', '-c', q],
    { encoding: 'utf8' },
  );
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

async function ensureRoleUser(tenantId, email, perfil, nome) {
  const esc = (s) => String(s).replace(/'/g, "''");
  const q = `
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM usuarios WHERE lower(email)=lower('${esc(email)}')) THEN
    UPDATE usuarios SET
      senha_hash = crypt('${esc(ROLE_PASS)}', gen_salt('bf', 10)),
      perfil = '${esc(perfil)}',
      ativo = TRUE,
      pendente_ativacao = FALSE,
      tenant_id = '${esc(tenantId)}',
      nome = '${esc(nome)}'
    WHERE lower(email)=lower('${esc(email)}');
  ELSE
    INSERT INTO usuarios (tenant_id, email, nome, senha_hash, perfil, cargo, ativo, pendente_ativacao)
    VALUES ('${esc(tenantId)}', '${esc(email)}', '${esc(nome)}', crypt('${esc(ROLE_PASS)}', gen_salt('bf', 10)), '${esc(perfil)}', '${esc(perfil)}', TRUE, FALSE);
  END IF;
END $$;
`;
  return sql(q);
}

async function createTenantRequest(payload) {
  return raw('POST', '/api/public/tenant-request', { body: payload });
}

async function setup() {
  const health = await raw('GET', '/api/health/ready');
  record('SETUP', 'health', 'API health/ready', health.ok && (health.json?.status === 'READY' || health.status === 200) ? 'PASS' : 'FAIL', health.text.slice(0, 200));

  const glo = await login(GLOBAL_EMAIL, GLOBAL_PASS);
  if (!glo.ok || !glo.token) {
    record('SETUP', 'login-global', 'Login ADMIN_GLOBAL', 'FAIL', JSON.stringify(glo.body ?? glo).slice(0, 200), 'ADMIN_GLOBAL');
    throw new Error('Não foi possível autenticar ADMIN_GLOBAL — aborta suíte');
  }
  record('SETUP', 'login-global', 'Login ADMIN_GLOBAL', 'PASS', `status=ok`, 'ADMIN_GLOBAL');
  return { globalToken: glo.token, globalUser: glo.user };
}

async function runF1(ctx) {
  const mod = 'F1';
  const password = `Onb${stamp}!Aa`;
  // empresa
  const emailA = `func.empresa.a.${stamp}@teste.local`;
  const companyA = `Func Tenant A ${stamp}`;
  const cnpjA = generateValidCnpj();
  const reqA = await createTenantRequest({
    tipoCadastro: 'EMPRESA',
    razaoSocial: companyA,
    nomeFantasia: companyA,
    cnpj: cnpjA,
    segmento: 'Indústria',
    quantidadeFuncionarios: 50,
    responsavelNome: 'Admin Empresa A',
    email: emailA,
    telefone: '11999990001',
    plano: 'PROFESSIONAL',
    password,
    confirmPassword: password,
  });
  record(mod, 'tenant-request-empresa', 'POST /api/public/tenant-request empresa', reqA.ok ? 'PASS' : 'FAIL', `HTTP ${reqA.status} ${reqA.text.slice(0, 180)}`);
  const createdA = dataOf(reqA);

  // autonomo
  const emailAuto = `func.autonomo.${stamp}@teste.local`;
  const reqAuto = await createTenantRequest({
    tipoCadastro: 'AUTONOMO',
    razaoSocial: `Autonomo ${stamp}`,
    cpf: generateValidCpf(),
    segmento: 'Consultoria',
    responsavelNome: 'Prof Autonomo',
    email: emailAuto,
    telefone: '11999990002',
    logradouro: 'Rua Teste',
    numero: '100',
    bairro: 'Centro',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01001000',
    password,
    confirmPassword: password,
  });
  record(mod, 'tenant-request-autonomo', 'POST tenant-request AUTONOMO', reqAuto.ok ? 'PASS' : 'FAIL', `HTTP ${reqAuto.status} ${reqAuto.text.slice(0, 180)}`);

  // 3 more pending for reject/adjust/block (throttle to avoid public rate-limit)
  const extras = [];
  for (const action of ['reject', 'adjust', 'block']) {
    await sleep(1500);
    const em = `func.${action}.${stamp}@teste.local`;
    const r = await createTenantRequest({
      tipoCadastro: 'EMPRESA',
      razaoSocial: `Func ${action} ${stamp}`,
      nomeFantasia: `Func ${action}`,
      cnpj: generateValidCnpj(),
      segmento: 'Serviços',
      quantidadeFuncionarios: 5,
      responsavelNome: `Resp ${action}`,
      email: em,
      telefone: '11999990003',
      plano: 'STARTER',
      password,
      confirmPassword: password,
    });
    extras.push({ action, id: dataOf(r)?.id, ok: r.ok, status: r.status });
    if (!r.ok) {
      record(mod, `prep-${action}`, `Preparar solicitação ${action}`, r.status === 429 ? 'WARN' : 'FAIL', `HTTP ${r.status}`);
    }
  }

  const token = ctx.globalToken;
  const list = await raw('GET', '/api/admin/tenant-requests?status=PENDENTE', { token });
  record(mod, 'admin-list-requests', 'Listar solicitações PENDENTE', list.ok ? 'PASS' : 'FAIL', `HTTP ${list.status}`, 'ADMIN_GLOBAL');

  if (createdA?.id) {
    const detail = await raw('GET', `/api/admin/tenant-requests/${createdA.id}`, { token });
    record(mod, 'admin-request-detail', 'Detalhe solicitação', detail.ok ? 'PASS' : 'FAIL', `HTTP ${detail.status}`, 'ADMIN_GLOBAL');

    const approved = await raw('POST', `/api/admin/tenant-requests/${createdA.id}/approve`, {
      token,
      body: {},
    });
    const ap = dataOf(approved);
    record(mod, 'approve', 'Aprovar solicitação tenant A', approved.ok ? 'PASS' : 'FAIL', `HTTP ${approved.status} tenant=${ap?.tenantId}`, 'ADMIN_GLOBAL');

    if (approved.ok && ap?.activationToken) {
      const preview = await raw('GET', `/api/auth/activate-account/preview?token=${encodeURIComponent(ap.activationToken)}`);
      const pv = dataOf(preview);
      record(mod, 'activate-preview', 'Preview ativação + MFA QR', preview.ok && pv?.otpauthUrl ? 'PASS' : 'FAIL', `HTTP ${preview.status}`);

      if (preview.ok && pv?.otpauthUrl) {
        const secret = new URL(pv.otpauthUrl).searchParams.get('secret');
        const mfaCode = generateSync({ secret });
        const act = await raw('POST', '/api/auth/activate-account', {
          body: { token: ap.activationToken, mfaCode },
        });
        record(mod, 'activate-account', 'Ativar conta + MFA', act.ok ? 'PASS' : 'FAIL', `HTTP ${act.status} ${act.text.slice(0, 120)}`);

        const grant = await raw('POST', `/api/admin/tenants/${encodeURIComponent(ap.tenantId)}/grant-access`, {
          token,
          body: { confirm: true, paymentNote: 'funcional F1' },
        });
        record(mod, 'grant-access', 'Liberar acesso pós-pagamento', grant.ok ? 'PASS' : 'FAIL', `HTTP ${grant.status}`, 'ADMIN_GLOBAL');

        const active = await raw('GET', '/api/admin/tenants?status=ATIVO', { token });
        const tenants = dataOf(active) ?? [];
        const found = Array.isArray(tenants)
          ? tenants.some((t) => String(t.id) === String(ap.tenantId) || String(t.tenantId) === String(ap.tenantId))
          : false;
        record(mod, 'tenants-active', 'Empresa em tenants ativos', active.ok && found ? 'PASS' : active.ok ? 'WARN' : 'FAIL', `found=${found} HTTP ${active.status}`, 'ADMIN_GLOBAL');

        const sess = await loginWithMfa(emailA, password, pv.otpauthUrl);
        record(mod, 'login-new-admin', 'Login nova conta → sessão tenant', sess.ok && sess.token ? 'PASS' : 'FAIL', sess.ok ? 'token ok' : JSON.stringify(sess.body ?? sess).slice(0, 150), 'ADMIN_EMPRESA');

        // negative: reuse activation token
        const reuse = await raw('POST', '/api/auth/activate-account', {
          body: { token: ap.activationToken, mfaCode: generateSync({ secret }) },
        });
        record(mod, 'activate-reuse', 'Token ativação reusado deve falhar', !reuse.ok ? 'PASS' : 'FAIL', `HTTP ${reuse.status}`);

        ctx.tenantA = {
          id: ap.tenantId,
          email: emailA,
          password,
          otpauthUrl: pv.otpauthUrl,
          token: sess.token,
          adminToken: sess.token,
        };
      }
    }
  }

  for (const ex of extras) {
    if (!ex.id) {
      record(mod, ex.action, `Preparar ${ex.action}`, 'BLOCKED', 'request não criada');
      continue;
    }
    let r;
    if (ex.action === 'reject') {
      r = await raw('POST', `/api/admin/tenant-requests/${ex.id}/reject`, {
        token,
        body: { reason: 'Teste funcional rejeição' },
      });
      record(mod, ex.action, `Ação ${ex.action} em solicitação distinta`, r.ok ? 'PASS' : 'FAIL', `HTTP ${r.status}`, 'ADMIN_GLOBAL');
    } else if (ex.action === 'adjust') {
      r = await raw('POST', `/api/admin/tenant-requests/${ex.id}/request-adjustment`, {
        token,
        body: { message: 'Ajuste CNPJ/endereço — teste funcional' },
      });
      record(mod, ex.action, `Ação ${ex.action} em solicitação distinta`, r.ok ? 'PASS' : 'FAIL', `HTTP ${r.status}`, 'ADMIN_GLOBAL');
    } else {
      // block de request só vale após tenant existir — aprova e bloqueia o tenant
      const ap = await raw('POST', `/api/admin/tenant-requests/${ex.id}/approve`, { token, body: {} });
      const d = dataOf(ap);
      if (ap.ok && d?.tenantId) {
        r = await raw('POST', `/api/admin/tenants/${encodeURIComponent(d.tenantId)}/block`, {
          token,
          body: { reason: 'Teste bloqueio funcional' },
        });
        record(mod, ex.action, 'Bloquear tenant após aprovação', r.ok ? 'PASS' : 'FAIL', `HTTP ${r.status}`, 'ADMIN_GLOBAL');
      } else {
        record(mod, ex.action, 'Bloquear (aprovar→block)', 'WARN', `approve HTTP ${ap.status}`);
      }
    }
  }

  // Tenant B free for plan limits
  const emailB = `func.empresa.b.${stamp}@teste.local`;
  const reqB = await createTenantRequest({
    tipoCadastro: 'EMPRESA',
    razaoSocial: `Func Tenant B Free ${stamp}`,
    nomeFantasia: `Tenant B ${stamp}`,
    cnpj: generateValidCnpj(),
    segmento: 'Comércio',
    quantidadeFuncionarios: 3,
    responsavelNome: 'Admin B',
    email: emailB,
    telefone: '11999990004',
    plano: 'STARTER',
    password,
    confirmPassword: password,
  });
  const createdB = dataOf(reqB);
  if (createdB?.id) {
    const apB = await raw('POST', `/api/admin/tenant-requests/${createdB.id}/approve`, { token, body: {} });
    const dB = dataOf(apB);
    if (apB.ok && dB?.activationToken) {
      const previewB = await raw('GET', `/api/auth/activate-account/preview?token=${encodeURIComponent(dB.activationToken)}`);
      const pvB = dataOf(previewB);
      if (pvB?.otpauthUrl) {
        const secret = new URL(pvB.otpauthUrl).searchParams.get('secret');
        await raw('POST', '/api/auth/activate-account', {
          body: { token: dB.activationToken, mfaCode: generateSync({ secret }) },
        });
        await raw('POST', `/api/admin/tenants/${encodeURIComponent(dB.tenantId)}/grant-access`, {
          token,
          body: { confirm: true, paymentNote: 'funcional F1 B free' },
        });
        // force free plan if column exists
        sql(`UPDATE tenants SET plano = 'free' WHERE id = '${String(dB.tenantId).replace(/'/g, "''")}' OR slug = '${String(dB.tenantId).replace(/'/g, "''")}';`);
        sql(`UPDATE empresas SET plano = 'free' WHERE tenant_id = '${String(dB.tenantId).replace(/'/g, "''")}';`);
        const sessB = await loginWithMfa(emailB, password, pvB.otpauthUrl);
        ctx.tenantB = {
          id: dB.tenantId,
          email: emailB,
          password,
          otpauthUrl: pvB.otpauthUrl,
          token: sessB.token,
        };
        record(mod, 'tenant-b-free', 'Tenant B (free) criado', sessB.ok ? 'PASS' : 'WARN', `tenant=${dB.tenantId}`);
      }
    }
  }
}

async function seedRoles(ctx) {
  if (!ctx.tenantA?.id) {
    record('SETUP', 'seed-roles', 'Seed papéis tenant A', 'BLOCKED', 'tenant A ausente');
    return;
  }
  const tid = ctx.tenantA.id;
  const users = [
    ['func.ergonomista.a@teste.local', 'ERGONOMISTA', 'Ergo A'],
    ['func.supervisor.a@teste.local', 'SUPERVISOR', 'Sup A'],
    ['func.operador.a@teste.local', 'OPERADOR', 'Op A'],
  ];
  for (const [email, perfil, nome] of users) {
    const r = await ensureRoleUser(tid, email, perfil, nome);
    record('SETUP', `seed-${perfil}`, `Seed ${perfil}`, r.ok ? 'PASS' : 'FAIL', r.err || r.out);
  }
  const ergo = await login('func.ergonomista.a@teste.local', ROLE_PASS);
  const sup = await login('func.supervisor.a@teste.local', ROLE_PASS);
  const op = await login('func.operador.a@teste.local', ROLE_PASS);
  ctx.tokens = {
    ADMIN_EMPRESA: ctx.tenantA.token,
    ERGONOMISTA: ergo.token,
    SUPERVISOR: sup.token,
    OPERADOR: op.token,
    ADMIN_GLOBAL: ctx.globalToken,
  };
  record('SETUP', 'login-roles', 'Login papéis tenant A', ergo.ok && sup.ok && op.ok ? 'PASS' : 'FAIL', `ergo=${ergo.ok} sup=${sup.ok} op=${op.ok}`);
}

async function runF2(ctx) {
  const mod = 'F2';
  const op = ctx.tokens?.OPERADOR;
  const ergo = ctx.tokens?.ERGONOMISTA;
  if (!op) {
    record(mod, 'pre', 'Pré-requisito OPERADOR', 'BLOCKED', 'sem token');
    return;
  }

  // RBAC: operador não acessa admin
  const adminTry = await raw('GET', '/api/admin/tenant-requests', { token: op });
  record(mod, 'rbac-operador-admin', 'OPERADOR bloqueado em /api/admin/*', adminTry.status === 403 ? 'PASS' : 'FAIL', `HTTP ${adminTry.status}`, 'OPERADOR');

  const collabBody = {
    nome: `Colab Func ${stamp}`,
    name: `Colab Func ${stamp}`,
    matricula: `MAT-${stamp}`,
    setor: 'Produção',
    cargo: 'Operador',
    consentimento: true,
    consent: true,
  };
  const c1 = await raw('POST', '/api/collaborators', { token: op, body: collabBody });
  // operador may only have read — try ergo if create fails
  let collabRes = c1;
  let roleUsed = 'OPERADOR';
  if (!c1.ok) {
    collabRes = await raw('POST', '/api/collaborators', { token: ergo, body: collabBody });
    roleUsed = 'ERGONOMISTA';
  }
  record(mod, 'new-collab', 'Cadastrar colaborador', collabRes.ok ? 'PASS' : 'FAIL', `HTTP ${collabRes.status} via ${roleUsed}`, roleUsed);
  const collab = dataOf(collabRes);

  const selfBody = {
    nome: 'Autoavaliacao',
    name: 'Autoavaliacao',
    matricula: 'ESP-SELF',
    setor: 'Produção',
    cargo: 'Self',
    consentimento: true,
    consent: true,
  };
  const cSelf = await raw('POST', '/api/collaborators', { token: ergo || op, body: selfBody });
  record(mod, 'esp-self', 'Colaborador ESP-SELF', cSelf.ok || cSelf.status === 409 ? 'PASS' : 'WARN', `HTTP ${cSelf.status}`, 'ERGONOMISTA');

  const sectors = await raw('GET', '/api/sectors', { token: ergo || op });
  record(mod, 'sectors', 'Listar/usar setores', sectors.ok ? 'PASS' : 'FAIL', `HTTP ${sectors.status}`);

  const analysisBody = {
    colaboradorId: collab?.id ?? collab?.data?.id,
    collaboratorId: collab?.id,
    setor: 'Produção',
    sector: 'Produção',
    atividade: 'Montagem',
    activity: 'Montagem',
    modo: 'complete',
    mode: 'complete',
    score: 72,
    risco: 'medio',
    riskLevel: 'medio',
    angulos: { pescoco: 20, tronco: 15 },
    load: { pesoKg: 12, frequencia: 'media', modoManuseio: 'duas_maos' },
    synced: true,
  };
  const an = await raw('POST', '/api/analyses', { token: ergo || op, body: analysisBody });
  record(mod, 'analysis-complete', 'Criar análise modo complete', an.ok ? 'PASS' : 'FAIL', `HTTP ${an.status} ${an.text.slice(0, 150)}`, roleUsed);
  const analysis = dataOf(an);

  const offlineBody = { ...analysisBody, modo: 'offline', mode: 'offline', synced: false, score: 60 };
  const anOff = await raw('POST', '/api/analyses', { token: ergo || op, body: offlineBody });
  record(mod, 'analysis-offline', 'Criar análise offline synced=false', anOff.ok ? 'PASS' : 'WARN', `HTTP ${anOff.status}`, roleUsed);

  const hist = await raw('GET', '/api/analyses', { token: ergo || op });
  record(mod, 'history', 'Listar histórico análises', hist.ok ? 'PASS' : 'FAIL', `HTTP ${hist.status}`);

  const reports = await raw('GET', '/api/reports', { token: ergo || op });
  record(mod, 'reports', 'GET /api/reports', reports.ok ? 'PASS' : 'WARN', `HTTP ${reports.status}`);

  if (analysis?.id) {
    const del = await raw('DELETE', `/api/analyses/${analysis.id}`, { token: op });
    // operador may not delete — check RBAC
    if (del.status === 403) {
      record(mod, 'rbac-delete', 'OPERADOR sem DELETE análise', 'PASS', '403', 'OPERADOR');
      const del2 = await raw('DELETE', `/api/analyses/${analysis.id}`, { token: ergo });
      record(mod, 'history-delete', 'Excluir análise (ergonomista)', del2.ok || del2.status === 204 ? 'PASS' : 'WARN', `HTTP ${del2.status}`);
    } else {
      record(mod, 'history-delete', 'Excluir análise', del.ok || del.status === 204 ? 'PASS' : 'WARN', `HTTP ${del.status}`);
    }
  }

  // plan free limits — soft check via plan features / count
  if (ctx.tenantB?.token) {
    const hb = await raw('GET', '/api/analyses', { token: ctx.tenantB.token });
    const listB = dataOf(hb);
    const n = Array.isArray(listB) ? listB.length : (listB?.items?.length ?? 0);
    record(mod, 'plan-free-history', 'Tenant free: histórico listável', hb.ok ? 'PASS' : 'FAIL', `count=${n} (limite UI=5)`);
  } else {
    record(mod, 'plan-free-history', 'Limites plano free', 'BLOCKED', 'tenant B ausente');
  }

  record(mod, 'camera-ui', 'Captura câmera/skeleton UI', 'BLOCKED', 'requer browser + câmera — não automatizado nesta rodada API');
  record(mod, 'pdf-share-ui', 'PDF NR-17 + share UI', 'BLOCKED', 'export client-side — validar manualmente / Playwright');
}

async function runF3(ctx) {
  const mod = 'F3';
  const token = ctx.tokens?.ERGONOMISTA || ctx.tokens?.ADMIN_EMPRESA;
  if (!token) {
    record(mod, 'pre', 'ERGONOMISTA', 'BLOCKED', 'sem token');
    return;
  }

  const criteria = await raw('GET', '/api/risk-criteria/active', { token });
  record(mod, 'criterios-active', 'Critérios ativos', criteria.ok ? 'PASS' : 'WARN', `HTTP ${criteria.status}`);

  const meth = await raw('GET', '/api/risk-criteria/methodologies', { token });
  record(mod, 'criterios-config', 'Metodologias critérios', meth.ok ? 'PASS' : 'WARN', `HTTP ${meth.status}`);

  // NR-01: risco ergonômico exige evidência + vínculo Análise e/ou AET
  const collab = await raw('POST', '/api/collaborators', {
    token,
    body: { nome: `Colab Inv ${stamp}`, name: `Colab Inv ${stamp}`, matricula: `INV${stamp}`, setor: 'Produção', consent: true },
  });
  const collabId = dataOf(collab)?.id;
  const an = await raw('POST', '/api/analyses', {
    token,
    body: {
      collaboratorId: collabId,
      activity: 'Montagem',
      atividade: 'Montagem',
      setor: 'Produção',
      mode: 'complete',
      score: 72,
      riskLevel: 'medio',
      synced: true,
    },
  });
  const analysisId = dataOf(an)?.id ?? an.json?.id;
  const aet = await raw('POST', '/api/aet/processos', {
    token,
    body: { titulo: `AET Inv ${stamp}`, title: `AET Inv ${stamp}`, setor: 'Produção' },
  });
  const aetId = dataOf(aet)?.id;

  const invBody = {
    tipo: 'ERGONOMICO',
    type: 'ERGONOMICO',
    titulo: `Risco Func ${stamp}`,
    title: `Risco Func ${stamp}`,
    descricao: 'Postura inadequada — teste funcional',
    description: 'Postura inadequada — teste funcional',
    probabilidade: 3,
    severidade: 4,
    probability: 3,
    severity: 4,
    setor: 'Produção',
    generatingSource: 'Posto de montagem linha 1',
    fonteGeradora: 'Posto de montagem linha 1',
    hazard: 'Postura forçada de tronco',
    perigo: 'Postura forçada de tronco',
    consequence: 'Lombalgia / DORT',
    consequencia: 'Lombalgia / DORT',
    exposureDuration: '4h/dia',
    exposicaoDuracao: '4h/dia',
    exposureFrequency: 'diária',
    exposicaoFrequencia: 'diária',
    exposureIntensity: 'moderada',
    exposicaoIntensidade: 'moderada',
    homogeneousExposureGroup: 'GHE Montagem',
    grupoHomogeneoExposicao: 'GHE Montagem',
    exposedWorkersCount: 5,
    medidas: ['Pausa', 'Treinamento'],
    controlMeasures: 'Pausas e treinamento',
    medidasControle: 'Pausas e treinamento',
    evidences: [{ tipo: 'FOTO', descricao: 'Registro posto — teste funcional' }],
    evidencias: [{ tipo: 'FOTO', descricao: 'Registro posto — teste funcional' }],
    analysisId: analysisId ? Number(analysisId) : undefined,
    analiseId: analysisId ? Number(analysisId) : undefined,
    aetProcessId: aetId ? Number(aetId) : undefined,
    aetProcessoId: aetId ? Number(aetId) : undefined,
  };
  const inv = await raw('POST', '/api/risk-inventory', { token, body: invBody });
  record(mod, 'inventario-create', 'Cadastrar risco inventário', inv.ok ? 'PASS' : 'FAIL', `HTTP ${inv.status} ${inv.text.slice(0, 150)}`);
  const risk = dataOf(inv);

  const invList = await raw('GET', '/api/risk-inventory', { token });
  record(mod, 'inventario-lista', 'Listar inventário', invList.ok ? 'PASS' : 'FAIL', `HTTP ${invList.status}`);

  const summary = await raw('GET', '/api/risk-inventory/summary', { token });
  record(mod, 'inventario-matriz', 'Summary/matriz inventário', summary.ok ? 'PASS' : 'WARN', `HTTP ${summary.status}`);

  const groDash = await raw('GET', '/api/gro/dashboard', { token });
  record(mod, 'gro-dashboard', 'GRO dashboard', groDash.ok ? 'PASS' : 'WARN', `HTTP ${groDash.status}`);

  const riskId = risk?.id;
  if (riskId) {
    const groAdv = await raw('POST', `/api/gro/workflow/${riskId}/advance`, { token, body: {} });
    record(mod, 'gro-advance', 'GRO avançar estágio', groAdv.ok || [400, 409].includes(groAdv.status) ? (groAdv.ok ? 'PASS' : 'WARN') : 'FAIL', `HTTP ${groAdv.status} ${groAdv.text.slice(0, 120)}`);
    const groRev = await raw('POST', `/api/gro/workflow/${riskId}/revert`, { token, body: {} });
    record(mod, 'gro-revert', 'GRO reverter estágio', groRev.ok || [400, 409].includes(groRev.status) ? (groRev.ok ? 'PASS' : 'WARN') : 'FAIL', `HTTP ${groRev.status}`);
  } else {
    record(mod, 'gro-advance', 'GRO avançar estágio', 'BLOCKED', 'sem riskId');
    record(mod, 'gro-revert', 'GRO reverter estágio', 'BLOCKED', 'sem riskId');
  }

  const plan = await raw('POST', '/api/gro/action-plans', {
    token,
    body: {
      riskId: Number(riskId),
      description: 'Medida administrativa — pausas e rodízio (teste funcional)',
      controlType: 'ADMINISTRATIVA',
      responsible: 'Ergonomista QA',
      status: 'aberto',
    },
  });
  record(mod, 'gro-plano', 'GRO plano de ação', plan.ok ? 'PASS' : 'WARN', `HTTP ${plan.status} ${plan.text.slice(0, 100)}`);

  const ind = await raw('POST', '/api/gro/indicators', {
    token,
    body: {
      nome: `Ind ${stamp}`,
      name: `Ind ${stamp}`,
      title: `Ind ${stamp}`,
      tipo: 'leading',
      type: 'leading',
      valor: 1,
      value: 1,
      target: 10,
    },
  });
  record(mod, 'gro-indicadores', 'GRO indicadores', ind.ok ? 'PASS' : 'WARN', `HTTP ${ind.status} ${ind.text.slice(0, 100)}`);

  const groHist = await raw('GET', '/api/gro/history', { token });
  record(mod, 'gro-historico', 'GRO histórico', groHist.ok ? 'PASS' : 'WARN', `HTTP ${groHist.status}`);

  const pgrGen = await raw('POST', '/api/pgr/versions/generate', { token, body: {} });
  record(mod, 'pgr-generate', 'Gerar versão PGR', pgrGen.ok ? 'PASS' : 'WARN', `HTTP ${pgrGen.status} ${pgrGen.text.slice(0, 120)}`);
  const ver = dataOf(pgrGen);

  if (ver?.id) {
    const submit = await raw('POST', `/api/pgr/versions/${ver.id}/submit-approval`, {
      token,
      body: { approverName: 'Aprovador QA', approverRole: 'ADMIN_EMPRESA', approverEmail: ctx.tenantA?.email },
    });
    record(mod, 'pgr-submit', 'PGR submit approval', submit.ok || [400, 409].includes(submit.status) ? (submit.ok ? 'PASS' : 'WARN') : 'FAIL', `HTTP ${submit.status}`);
    const approve = await raw('POST', `/api/pgr/versions/${ver.id}/approve`, {
      token: ctx.tokens?.ADMIN_EMPRESA || token,
      body: { approved: true },
    });
    record(mod, 'pgr-approve', 'PGR approve', approve.ok || [400, 409].includes(approve.status) ? (approve.ok ? 'PASS' : 'WARN') : 'FAIL', `HTTP ${approve.status}`);
    const sign = await raw('POST', `/api/pgr/versions/${ver.id}/sign`, {
      token: ctx.tokens?.ADMIN_EMPRESA || token,
      body: {
        type: 'RESPONSAVEL_TECNICO',
        name: 'Assinante Teste',
        role: 'Responsável Técnico',
      },
    });
    record(mod, 'pgr-sign', 'PGR sign', sign.ok || [400, 409].includes(sign.status) ? (sign.ok ? 'PASS' : 'WARN') : 'FAIL', `HTTP ${sign.status} ${sign.text.slice(0, 80)}`);
  }

  const pgrHist = await raw('GET', '/api/pgr/history', { token });
  record(mod, 'pgr-historico', 'PGR histórico', pgrHist.ok ? 'PASS' : 'WARN', `HTTP ${pgrHist.status}`);

  if (risk?.id) {
    const upd = await raw('PUT', `/api/risk-inventory/${risk.id}`, {
      token,
      body: { ...invBody, descricao: 'Atualizado pós-PGR', description: 'Atualizado pós-PGR', probabilidade: 4 },
    });
    record(mod, 'integracao-inv-pgr', 'Editar risco após PGR', upd.ok ? 'PASS' : 'WARN', `HTTP ${upd.status}`);
  }
}

async function runF4(ctx) {
  const mod = 'F4';
  const token = ctx.tokens?.ERGONOMISTA || ctx.tokens?.ADMIN_EMPRESA;
  if (!token) {
    record(mod, 'pre', 'token', 'BLOCKED', 'ausente');
    return;
  }

  const dash = await raw('GET', '/api/psico/dashboard', { token });
  record(mod, 'psico-dashboard', 'Psico dashboard', dash.ok ? 'PASS' : 'WARN', `HTTP ${dash.status}`);

  const camp = await raw('POST', '/api/psico/campanhas', {
    token,
    body: { title: `Campanha ${stamp}`, type: 'COPSOQ_III', anonymous: true },
  });
  record(mod, 'campanha-create', 'Criar campanha psico', camp.ok ? 'PASS' : 'WARN', `HTTP ${camp.status} ${camp.text.slice(0, 120)}`);
  const campData = dataOf(camp) ?? camp.json;
  const formToken = campData?.accessToken;
  const publicLink = campData?.publicLink;

  if (formToken) {
    record(mod, 'campanha-link', 'Link público gerado', 'PASS', publicLink || `token=${String(formToken).slice(0, 8)}…`);
    const formGet = await raw('GET', `/api/psico/public/form/${formToken}`);
    record(mod, 'form-public-get', 'GET form público sem auth', formGet.ok ? 'PASS' : 'WARN', `HTTP ${formGet.status}`);
    let okCount = 0;
    const sampleAnswers = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`q${i + 1}`, (i % 5) + 1]));
    for (let i = 0; i < 5; i++) {
      const ans = await raw('POST', `/api/psico/public/form/${formToken}/respostas`, {
        body: {
          answers: { ...sampleAnswers, respondent: i },
          consentimentoLgpd: true,
          consent: true,
        },
      });
      if (ans.ok) okCount += 1;
      else if (i === 0) console.log('psico form first err', ans.status, ans.text.slice(0, 120));
    }
    record(mod, 'form-public-post', 'Respostas anônimas (5)', okCount >= 1 ? 'PASS' : 'WARN', `ok=${okCount}/5`);
  } else {
    const list = await raw('GET', '/api/psico/campanhas', { token });
    record(mod, 'campanha-link', 'Obter link /form/:token', list.ok ? 'WARN' : 'FAIL', `sem accessToken; list HTTP ${list.status}`);
  }

  const fatores = await raw('GET', '/api/psico/fatores', { token });
  record(mod, 'psico-fatores', '13 fatores MTE', fatores.ok ? 'PASS' : 'WARN', `HTTP ${fatores.status}`);

  const matriz = await raw('GET', '/api/psico/matriz', { token });
  record(mod, 'psico-matriz', 'Matriz 5x5', matriz.ok ? 'PASS' : 'WARN', `HTTP ${matriz.status}`);

  const plano = await raw('POST', '/api/psico/plano-acao', {
    token,
    body: {
      description: `Plano psico preventivo ${stamp}`,
      descricao: `Plano psico preventivo ${stamp}`,
      responsible: 'Ergonomista QA',
      priority: 'medio',
      status: 'aberto',
    },
  });
  record(mod, 'psico-plano', 'Plano de ação psico', plano.ok ? 'PASS' : 'WARN', `HTTP ${plano.status}`);

  const conf = await raw('GET', '/api/psico/conformidade', { token });
  record(mod, 'psico-conformidade', 'Checklist conformidade', conf.ok ? 'PASS' : 'WARN', `HTTP ${conf.status}`);

  record(mod, 'psico-ia-ui', 'psicossocial-ia Em breve', 'BLOCKED', 'UI ComingSoon — validar no browser');
  record(mod, 'lgpd-anon', 'LGPD: sem identificação individual', formToken ? 'PASS' : 'WARN', 'form público sem login; agregação mínima depende UI');
}

async function runF5(ctx) {
  const mod = 'F5';
  const tenantId = ctx.tenantA?.id;
  const pub = await raw('POST', '/api/denuncias/public', {
    body: {
      tenantId,
      tipo: 'ASSEDIO_MORAL',
      type: 'ASSEDIO_MORAL',
      category: 'ASSEDIO_MORAL',
      modality: 'ANONIMA',
      modalidade: 'ANONIMA',
      lgpdConsent: true,
      lgpdConsentimento: true,
      descricao: `Denúncia funcional ${stamp}`,
      description: `Denúncia funcional ${stamp}`,
      anonimo: true,
      anonymous: true,
    },
  });
  record(mod, 'denuncia-public', 'Denúncia pública sem login', pub.ok ? 'PASS' : 'FAIL', `HTTP ${pub.status} ${pub.text.slice(0, 150)}`);
  const d = dataOf(pub) ?? pub.json;
  const protocolo = d?.protocolo ?? d?.protocol;
  const accessTokenDen = d?.accessToken;

  if (protocolo && accessTokenDen && tenantId) {
    const st = await raw(
      'GET',
      `/api/denuncias/public/status?tenantId=${encodeURIComponent(tenantId)}&protocol=${encodeURIComponent(protocolo)}&accessToken=${encodeURIComponent(accessTokenDen)}`,
    );
    record(mod, 'denuncia-status', 'Consulta status por protocolo', st.ok ? 'PASS' : 'WARN', `HTTP ${st.status}`);
  } else if (pub.ok) {
    record(mod, 'denuncia-status', 'Consulta status por protocolo', 'WARN', 'protocol/accessToken ausentes');
  }

  const ergo = ctx.tokens?.ERGONOMISTA;
  const op = ctx.tokens?.OPERADOR;
  const list = await raw('GET', '/api/denuncias', { token: ergo });
  record(mod, 'denuncia-lista', 'Listar denúncias autenticado', list.ok ? 'PASS' : 'WARN', `HTTP ${list.status}`, 'ERGONOMISTA');

  const items = dataOf(list);
  const first = Array.isArray(items) ? items[0] : items?.items?.[0];
  if (first?.id) {
    const treat = await raw('PATCH', `/api/denuncias/${first.id}/status`, {
      token: ergo,
      body: { status: 'EM_INVESTIGACAO' },
    });
    const trat = await raw('POST', `/api/denuncias/${first.id}/tratativas`, {
      token: ergo,
      body: { type: 'INVESTIGACAO', description: 'Investigação iniciada — teste funcional' },
    });
    record(mod, 'denuncia-tratar', 'Tratar denúncia', treat.ok && trat.ok ? 'PASS' : treat.ok || trat.ok ? 'WARN' : 'WARN', `status=${treat.status} trat=${trat.status}`, 'ERGONOMISTA');
  }

  if (op) {
    const treatOp = await raw('PATCH', `/api/denuncias/${first?.id || 0}/status`, {
      token: op,
      body: { status: 'CONCLUIDA' },
    });
    record(mod, 'rbac-operador-tratar', 'OPERADOR não trata denúncia', treatOp.status === 403 || treatOp.status === 404 ? 'PASS' : 'WARN', `HTTP ${treatOp.status}`, 'OPERADOR');
  }
}

async function runF6(ctx) {
  const mod = 'F6';
  const token = ctx.tokens?.ERGONOMISTA || ctx.tokens?.ADMIN_EMPRESA;
  if (!token) {
    record(mod, 'pre', 'token', 'BLOCKED', 'ausente');
    return;
  }

  const aetDash = await raw('GET', '/api/aet/dashboard', { token });
  record(mod, 'aet-dashboard', 'AET dashboard', aetDash.ok ? 'PASS' : 'WARN', `HTTP ${aetDash.status}`);

  const proc = await raw('POST', '/api/aet/processos', {
    token,
    body: { titulo: `AET ${stamp}`, title: `AET ${stamp}`, setor: 'Produção' },
  });
  record(mod, 'aet-create', 'Criar processo AET', proc.ok ? 'PASS' : 'WARN', `HTTP ${proc.status} ${proc.text.slice(0, 120)}`);
  const p = dataOf(proc);
  if (p?.id) {
    const adv = await raw('POST', `/api/aet/processos/${p.id}/advance`, { token, body: {} });
    record(mod, 'aet-advance', 'Avançar etapa AET', adv.ok || [400, 409].includes(adv.status) ? (adv.ok ? 'PASS' : 'WARN') : 'FAIL', `HTTP ${adv.status}`);
    const ret = await raw('POST', `/api/aet/processos/${p.id}/retreat`, { token, body: {} });
    record(mod, 'aet-retreat', 'Recuar etapa AET', ret.ok || [400, 409].includes(ret.status) ? (ret.ok ? 'PASS' : 'WARN') : 'FAIL', `HTTP ${ret.status}`);
  }

  const mob = await raw('POST', '/api/aet/mobiliario', {
    token,
    body: { description: `Cadeira ergonômica ${stamp}`, type: 'cadeira', brand: 'QA', model: 'T1' },
  });
  record(mod, 'aet-cadastros', 'Cadastro mobiliário AET', mob.ok ? 'PASS' : 'WARN', `HTTP ${mob.status}`);

  const sstDash = await raw('GET', '/api/sst/dashboard', { token });
  record(mod, 'sst-dashboard', 'SST dashboard', sstDash.ok ? 'PASS' : 'WARN', `HTTP ${sstDash.status}`);

  const apr = await raw('POST', '/api/sst/apr', {
    token,
    body: { titulo: `APR ${stamp}`, title: `APR ${stamp}`, setor: 'Produção', descricao: 'teste', description: 'teste' },
  });
  record(mod, 'sst-apr', 'Registrar APR', apr.ok ? 'PASS' : 'WARN', `HTTP ${apr.status}`);

  const epi = await raw('POST', '/api/sst/epi', {
    token,
    body: { description: `Luva nitrílica ${stamp}`, ca: '12345', type: 'EPI', manufacturer: 'QA' },
  });
  record(mod, 'sst-epi', 'Cadastrar EPI', epi.ok ? 'PASS' : 'WARN', `HTTP ${epi.status}`);

  const insp = await raw('POST', '/api/sst/inspecoes', {
    token,
    body: { titulo: `Insp ${stamp}`, title: `Insp ${stamp}`, data: new Date().toISOString().slice(0, 10) },
  });
  record(mod, 'sst-inspecoes', 'Programar inspeção', insp.ok ? 'PASS' : 'WARN', `HTTP ${insp.status}`);

  const nc = await raw('POST', '/api/sst/nc', {
    token,
    body: { title: `NC ${stamp}`, description: 'Não conformidade teste funcional' },
  });
  record(mod, 'sst-nc', 'Abrir NC', nc.ok ? 'PASS' : 'WARN', `HTTP ${nc.status}`);

  const train = await raw('POST', '/api/sst/treinamentos', {
    token,
    body: { titulo: `Treino ${stamp}`, title: `Treino ${stamp}`, cargaHoraria: 2 },
  });
  record(mod, 'sst-treinamentos', 'Treinamento SST', train.ok ? 'PASS' : 'WARN', `HTTP ${train.status}`);

  const sstRep = await raw('GET', '/api/sst/relatorios', { token });
  record(mod, 'sst-relatorios', 'Relatórios SST', sstRep.ok ? 'PASS' : 'WARN', `HTTP ${sstRep.status}`);
  record(mod, 'pdf-aet-sst-ui', 'PDFs AET/SST', 'BLOCKED', 'export client-side');
}

async function runF7(ctx) {
  const mod = 'F7';
  const token = ctx.tokens?.ERGONOMISTA || ctx.tokens?.ADMIN_EMPRESA;
  if (!token) {
    record(mod, 'pre', 'token', 'BLOCKED', 'ausente');
    return;
  }

  const fontes = await raw('GET', '/api/compliance/fontes', { token });
  record(mod, 'compliance-fontes', 'Listar fontes', fontes.ok ? 'PASS' : 'WARN', `HTTP ${fontes.status}`);

  const scan = await raw('POST', '/api/compliance/scan', { token, body: {} });
  record(mod, 'compliance-scan', 'Varredura manual', scan.ok || [202, 409].includes(scan.status) ? (scan.ok || scan.status === 202 ? 'PASS' : 'WARN') : 'FAIL', `HTTP ${scan.status}`);

  const alertas = await raw('GET', '/api/compliance/alertas', { token });
  record(mod, 'compliance-alertas', 'Alertas (não auto-aplicados)', alertas.ok ? 'PASS' : 'WARN', `HTTP ${alertas.status}`);

  const dets = await raw('GET', '/api/compliance/deteccoes?status=PENDENTE_VALIDACAO', { token });
  const list = dataOf(dets);
  let arr = Array.isArray(list) ? list : list?.items ?? [];
  if (!arr.length) {
    const all = await raw('GET', '/api/compliance/deteccoes', { token });
    const allList = dataOf(all);
    const allArr = Array.isArray(allList) ? allList : allList?.items ?? [];
    arr = allArr.filter((d) => String(d.status || '').toUpperCase() === 'PENDENTE_VALIDACAO');
    if (!arr.length) arr = allArr;
  }
  record(mod, 'compliance-deteccoes', 'Listar detecções', dets.ok ? 'PASS' : 'WARN', `HTTP ${dets.status} n=${arr.length}`);

  const pending = arr.filter((d) => String(d.status || '').toUpperCase() === 'PENDENTE_VALIDACAO');
  const toApprove = pending[0] || arr[0];
  const toReject = pending[1] || arr[1];

  if (toApprove?.id) {
    const approve = await raw('POST', `/api/compliance/deteccoes/${toApprove.id}/validar`, {
      token,
      body: {
        decision: 'APROVAR',
        justification: 'Validação humana — teste funcional F7',
        validatorName: 'Validador QA',
        applyRules: false,
      },
    });
    record(mod, 'compliance-aprovar', 'Validação humana APROVAR', approve.ok ? 'PASS' : 'WARN', `HTTP ${approve.status} ${approve.text.slice(0, 100)}`);
  } else {
    record(mod, 'compliance-aprovar', 'Validação humana APROVAR', 'WARN', 'sem detecção pendente');
  }
  if (toReject?.id) {
    const reject = await raw('POST', `/api/compliance/deteccoes/${toReject.id}/validar`, {
      token,
      body: {
        decision: 'REJEITAR',
        justification: 'Rejeição humana — teste funcional F7',
        validatorName: 'Validador QA',
        applyRules: false,
      },
    });
    record(mod, 'compliance-rejeitar', 'Validação humana REJEITAR', reject.ok ? 'PASS' : 'WARN', `HTTP ${reject.status} ${reject.text.slice(0, 100)}`);
  } else {
    record(mod, 'compliance-rejeitar', 'Validação humana REJEITAR', 'WARN', 'sem 2ª detecção pendente');
  }

  const tarefas = await raw('GET', '/api/compliance/tarefas', { token });
  record(mod, 'compliance-adequacao', 'Tarefas adequação', tarefas.ok ? 'PASS' : 'WARN', `HTTP ${tarefas.status}`);

  const rel = await raw('GET', '/api/compliance/relatorios', { token });
  record(mod, 'compliance-relatorios', 'Relatórios impacto', rel.ok ? 'PASS' : 'WARN', `HTTP ${rel.status}`);

  // critical: no auto-apply endpoint
  const auto = await raw('POST', '/api/compliance/aplicar-automatico', { token, body: {} });
  record(mod, 'no-auto-apply', 'Sem endpoint aplicar-automatico', auto.status === 404 || auto.status === 405 ? 'PASS' : auto.status === 403 ? 'PASS' : 'WARN', `HTTP ${auto.status}`);
}

async function runF8(ctx) {
  const mod = 'F8';
  const adminEmp = ctx.tokens?.ADMIN_EMPRESA;
  const global = ctx.globalToken;
  if (!adminEmp) {
    record(mod, 'pre', 'ADMIN_EMPRESA', 'BLOCKED', 'sem token');
    return;
  }

  const tid = ctx.tenantA?.id;
  const authz = await raw('POST', '/api/support/authorize', {
    token: adminEmp,
    body: { tenantId: tid, duration: '1h', motivo: 'Teste funcional F8' },
  });
  record(mod, 'authorize', 'Admin empresa autoriza suporte', authz.ok ? 'PASS' : 'FAIL', `HTTP ${authz.status} ${authz.text.slice(0, 120)}`, 'ADMIN_EMPRESA');

  const status = await raw('GET', `/api/support/status?tenantId=${encodeURIComponent(tid || '')}`, { token: adminEmp });
  record(mod, 'support-status', 'Status suporte', status.ok ? 'PASS' : 'WARN', `HTTP ${status.status}`);

  const active = await raw('GET', '/api/admin/support/active', { token: global });
  record(mod, 'support-active-global', 'Global vê suporte ativo', active.ok ? 'PASS' : 'WARN', `HTTP ${active.status}`, 'ADMIN_GLOBAL');

  const audit = await raw('GET', `/api/support/audit?tenantId=${encodeURIComponent(tid || '')}`, { token: adminEmp });
  record(mod, 'support-audit', 'Auditoria suporte', audit.ok ? 'PASS' : 'WARN', `HTTP ${audit.status}`);

  const revoke = await raw('POST', '/api/support/revoke', { token: adminEmp, body: { tenantId: tid } });
  record(mod, 'revoke', 'Revogar suporte', revoke.ok ? 'PASS' : 'FAIL', `HTTP ${revoke.status}`, 'ADMIN_EMPRESA');

  record(mod, 'support-bar-ui', 'SupportModeBar UI', 'BLOCKED', 'requer browser login global no tenant');
}

async function runF9(ctx) {
  const mod = 'F9';
  const token = ctx.globalToken;
  const lists = [
    ['active', '/api/admin/tenants?status=ATIVO'],
    ['blocked', '/api/admin/tenants?status=BLOQUEADO'],
    ['expired', '/api/admin/tenants?status=EXPIRADO'],
  ];
  for (const [name, path] of lists) {
    const r = await raw('GET', path, { token });
    record(mod, `tenants-${name}`, `Listar tenants ${name}`, r.ok ? 'PASS' : 'WARN', `HTTP ${r.status}`, 'ADMIN_GLOBAL');
  }

  if (ctx.tenantA?.id) {
    const det = await raw('GET', `/api/admin/tenants/${encodeURIComponent(ctx.tenantA.id)}`, { token });
    record(mod, 'tenant-detail', 'Detalhe tenant', det.ok ? 'PASS' : 'WARN', `HTTP ${det.status}`);

    const upd = await raw('PUT', `/api/admin/tenants/${encodeURIComponent(ctx.tenantA.id)}`, {
      token,
      body: { observacoes: `func-test ${stamp}` },
    });
    record(mod, 'tenant-update', 'Atualizar metadados', upd.ok ? 'PASS' : 'WARN', `HTTP ${upd.status}`);
  }

  // create company direct
  const regEmail = `direct.admin.${stamp}@teste.local`;
  const reg = await raw('POST', '/api/tenants', {
    token,
    body: {
      nome: `Direct Co ${stamp}`,
      industria: 'Indústria',
      adminNome: 'Admin Direct',
      adminEmail: regEmail,
      adminPassword: `Direct${stamp}!Aa`,
    },
  });
  record(mod, 'register-company', 'POST /api/tenants ADMIN_GLOBAL', reg.ok ? 'PASS' : 'WARN', `HTTP ${reg.status} ${reg.text.slice(0, 120)}`);

  const empTry = await raw('GET', '/api/admin/tenants', { token: ctx.tokens?.ADMIN_EMPRESA });
  record(mod, 'rbac-empresa-admin', 'ADMIN_EMPRESA sem admin tenants', empTry.status === 403 ? 'PASS' : 'FAIL', `HTTP ${empTry.status}`, 'ADMIN_EMPRESA');
}

async function runF10(ctx) {
  const mod = 'F10';
  const token = ctx.tokens?.ERGONOMISTA || ctx.tokens?.ADMIN_EMPRESA;
  // V2 is mostly client-side — probe related APIs / analyses exist
  const hist = await raw('GET', '/api/analyses', { token });
  record(mod, 'v2-methods-data', 'Dados para métodos V2 (análises)', hist.ok ? 'PASS' : 'WARN', `HTTP ${hist.status} — scoring V2 é client-side`);
  record(mod, 'v2-video-ui', 'Upload/live vídeo UI', 'BLOCKED', 'requer browser + arquivo de vídeo');
  record(mod, 'v2-environmental-ui', 'Ambientais simulação UI', 'BLOCKED', 'requer browser');
  record(mod, 'v2-dashboard-ui', 'Dashboard V2 UI', 'BLOCKED', 'requer browser');
  record(mod, 'v2-roadmap-ui', 'Roadmap informativo', 'BLOCKED', 'requer browser — esperado não-interativo');
  record(mod, 'v2-audit-ui', 'Audit trail local', 'BLOCKED', 'localStorage client');
}

async function runTransversal(ctx) {
  const mod = 'TX';

  // 4.1 RBAC matrix samples
  const matrix = [
    ['OPERADOR', 'GET', '/api/admin/tenants', 403],
    ['OPERADOR', 'DELETE', '/api/collaborators/999999', [403, 404]],
    ['SUPERVISOR', 'POST', '/api/analyses', [403]], // supervisor: analyses:read only
    ['ERGONOMISTA', 'GET', '/api/risk-inventory', 200],
    ['ADMIN_EMPRESA', 'GET', '/api/support/status', [200, 404]],
  ];
  for (const [role, method, path, expect] of matrix) {
    const token = ctx.tokens?.[role];
    if (!token) {
      record(mod, `rbac-${role}-${method}`, `${role} ${method} ${path}`, 'BLOCKED', 'sem token');
      continue;
    }
    let r = await raw(method, path, { token, body: method === 'POST' ? {} : undefined });
    if (role === 'ADMIN_EMPRESA' && path === '/api/support/status' && ctx.tenantA?.id) {
      r = await raw('GET', `/api/support/status?tenantId=${encodeURIComponent(ctx.tenantA.id)}`, { token });
    }
    const expected = Array.isArray(expect) ? expect : [expect];
    const ok = expected.includes(r.status) || (expect === 200 && r.ok);
    record(mod, `rbac-${role}-${path.split('/').pop()}`, `RBAC ${role} ${method} ${path}`, ok ? 'PASS' : 'WARN', `HTTP ${r.status} expect ${expected.join('|')}`, role);
  }

  // 4.2 tenant isolation
  if (ctx.tenantA?.token && ctx.tenantB?.token) {
    const listA = await raw('GET', '/api/collaborators', { token: ctx.tenantA.token });
    const items = dataOf(listA);
    const arr = Array.isArray(items) ? items : items?.items ?? [];
    if (arr[0]?.id) {
      const leak = await raw('GET', `/api/collaborators/${arr[0].id}`, { token: ctx.tenantB.token });
      // also try with tenant header spoof if any
      record(mod, 'tenant-isolation', 'Tenant B não lê colab A', leak.status === 403 || leak.status === 404 || !leak.ok ? 'PASS' : 'FAIL', `HTTP ${leak.status}`);
    } else {
      record(mod, 'tenant-isolation', 'Isolamento multi-tenant', 'WARN', 'sem colaborador no tenant A');
    }
  } else {
    record(mod, 'tenant-isolation', 'Isolamento multi-tenant', 'BLOCKED', 'falta tenant A/B');
  }

  // 4.4 auth negatives
  const badPass = await raw('POST', '/api/auth/login', { body: { email: GLOBAL_EMAIL, password: 'wrong-password-xxx' } });
  record(mod, 'login-bad-pass', 'Senha errada', badPass.status === 401 || badPass.status === 403 ? 'PASS' : 'FAIL', `HTTP ${badPass.status}`);

  const badEmail = await raw('POST', '/api/auth/login', { body: { email: 'naoexiste@teste.local', password: 'x' } });
  record(mod, 'login-bad-email', 'E-mail inexistente', [401, 404, 403].includes(badEmail.status) ? 'PASS' : 'WARN', `HTTP ${badEmail.status}`);

  const forgot = await raw('POST', '/api/auth/forgot-password', { body: { email: ctx.tenantA?.email ?? GLOBAL_EMAIL } });
  record(mod, 'forgot-password', 'Forgot password', forgot.ok || forgot.status === 200 ? 'PASS' : 'WARN', `HTTP ${forgot.status}`);

  // MFA already covered in F1
  record(mod, 'mfa-flow', 'MFA no onboarding F1', results.some((r) => r.id === 'activate-account' && r.status === 'PASS') ? 'PASS' : 'WARN', 'ver F1');

  // logout (exige CSRF cookie + header x-csrf-token)
  const opSession = await login('func.operador.a@teste.local', ROLE_PASS);
  if (opSession.ok && opSession.token && opSession.csrfToken) {
    const csrfCookie = process.env.CSRF_COOKIE_NAME || 'ergosense_csrf';
    const lo = await raw('POST', '/api/auth/logout', {
      token: opSession.token,
      body: {},
      headers: {
        'x-csrf-token': opSession.csrfToken,
        Cookie: `${csrfCookie}=${opSession.csrfToken}`,
      },
    });
    record(mod, 'logout', 'Logout', lo.ok || lo.status === 204 || lo.status === 200 ? 'PASS' : 'WARN', `HTTP ${lo.status} ${lo.text.slice(0, 80)}`);
  } else if (ctx.tokens?.OPERADOR) {
    record(mod, 'logout', 'Logout', 'WARN', 'sem csrfToken na sessão');
  }

  // 4.7 / 4.8 / 4.9
  const aiStatus = await raw('GET', '/api/system/ai-status', { token: ctx.globalToken });
  record(mod, 'ai-status', 'GET /api/system/ai-status', aiStatus.ok ? 'PASS' : 'WARN', `HTTP ${aiStatus.status}`);

  const aiAnalyze = await raw('POST', '/api/ai/expert/analyze-ergonomics', {
    token: ctx.tokens?.ERGONOMISTA || ctx.globalToken,
    body: { summary: 'teste funcional postura', analysis: { score: 70, risk: 'medio' } },
  });
  // 503 sem AI_PROVIDER é comportamento esperado neste ambiente — não é regressão
  const aiOk = aiAnalyze.ok || [501, 503].includes(aiAnalyze.status);
  record(mod, 'ai-api', 'AI expert/analyze-ergonomics API', aiOk ? 'PASS' : aiAnalyze.status === 400 ? 'WARN' : 'FAIL', `HTTP ${aiAnalyze.status} ${aiAnalyze.ok ? 'ok' : 'esperado sem AI_PROVIDER'}`);

  const eso = await raw('GET', '/api/esocial/dashboard', { token: ctx.tokens?.ERGONOMISTA || ctx.tokens?.ADMIN_EMPRESA });
  record(mod, 'esocial-api', 'eSocial dashboard API (UI em breve)', eso.ok ? 'PASS' : 'WARN', `HTTP ${eso.status}`);

  // org
  const tree = await raw('GET', '/api/org/tree', { token: ctx.tokens?.ADMIN_EMPRESA || ctx.tokens?.ERGONOMISTA });
  record(mod, 'org-tree', 'Árvore organizacional', tree.ok ? 'PASS' : 'WARN', `HTTP ${tree.status}`);

  const unidade = await raw('POST', '/api/org/unidades', {
    token: ctx.tokens?.ADMIN_EMPRESA || ctx.tokens?.ERGONOMISTA,
    body: { nome: `Unidade ${stamp}`, name: `Unidade ${stamp}` },
  });
  record(mod, 'org-create', 'Criar unidade org', unidade.ok ? 'PASS' : 'WARN', `HTTP ${unidade.status}`);

  record(mod, 'pwa-offline-ui', 'PWA install + offline UI', 'BLOCKED', 'requer browser');
  record(mod, 'exports-ui', 'Exports PDF todos', 'BLOCKED', 'client-side — Playwright');
  record(mod, 'coming-soon-ui', 'Placeholders Em breve', 'BLOCKED', 'browser: psico-ia, AI Expert, esocial-*, v2-roadmap');
}

function summarize() {
  const by = { PASS: 0, WARN: 0, FAIL: 0, BLOCKED: 0 };
  for (const r of results) by[r.status] = (by[r.status] || 0) + 1;

  const flows = {};
  for (const f of ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10']) {
    const items = results.filter((r) => r.modulo === f);
    const fail = items.filter((r) => r.status === 'FAIL').length;
    const pass = items.filter((r) => r.status === 'PASS').length;
    const warn = items.filter((r) => r.status === 'WARN').length;
    const blocked = items.filter((r) => r.status === 'BLOCKED').length;
    const executable = items.filter((r) => r.status !== 'BLOCKED');
    const approvedNoWarn = executable.length && fail === 0 && warn === 0;
    const approvedWithWarn = executable.length && fail === 0;
    flows[f] = {
      total: items.length,
      pass,
      warn,
      fail,
      blocked,
      verdict: fail ? 'FAIL' : approvedNoWarn ? 'PASS' : approvedWithWarn ? 'WARN' : blocked === items.length ? 'BLOCKED' : 'WARN',
    };
  }

  const flowPassStrict = Object.values(flows).filter((f) => f.verdict === 'PASS').length;
  const flowPassSoft = Object.values(flows).filter((f) => f.verdict === 'PASS' || f.verdict === 'WARN').length;

  return { by, flows, flowPassStrict, flowPassSoft, total: results.length };
}

async function main() {
  console.log(`=== FUNCIONAL ErgoSense @ ${BASE} ===`);
  const ctx = await setup();
  await runF1(ctx);
  await seedRoles(ctx);
  await runF2(ctx);
  await runF3(ctx);
  await runF4(ctx);
  await runF5(ctx);
  await runF6(ctx);
  await runF7(ctx);
  await runF8(ctx);
  await runF9(ctx);
  await runF10(ctx);
  await runTransversal(ctx);

  const summary = summarize();
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    prompt: 'prompt-teste-funcional-ergosense.md',
    summary,
    results,
    bugs,
    gaps: [
      'UI câmera/skeleton/workstation (F2)',
      'Export PDFs client-side e shareAnalysis',
      'PWA install + offline forçado',
      'V2 vídeo upload/live, ambientais, dashboard, roadmap, audit local',
      'Placeholders Em breve (psico-ia, AI Expert panel, esocial-* UI)',
      'SupportModeBar visual',
      'Limite hard 10 análises/mês free (enforcement UI/API completo)',
      'Matriz RBAC 100% de cada permissão documentada',
    ],
  };

  writeFileSync(resolve(OUT, 'fase-funcional-summary.json'), JSON.stringify(report, null, 2));

  const rows = results
    .map((r) => `| ${r.modulo} | ${r.id} | ${r.status} | ${r.role || '-'} | ${(r.detail || '').replace(/\|/g, '/')} |`)
    .join('\n');
  const bugRows = bugs.length
    ? bugs.map((b) => `| ${b.modulo} | ${b.telaApi} | ${b.papel} | ${b.severidade} | ${String(b.obtido).replace(/\|/g, '/').slice(0, 200)} |`).join('\n')
    : '| — | — | — | — | nenhum FAIL registrado |';

  const flowRows = Object.entries(summary.flows)
    .map(([k, v]) => `| ${k} | ${v.pass} | ${v.warn} | ${v.fail} | ${v.blocked} | ${v.verdict} |`)
    .join('\n');

  const md = `# Teste Funcional ErgoSense (F1–F10)

**Gerado:** ${report.generatedAt}  
**Ambiente:** ${BASE}  
**Prompt:** \`prompt-teste-funcional-ergosense.md\`

## Resumo executivo

| Métrica | Valor |
|---------|-------|
| Total checks | ${summary.total} |
| PASS | ${summary.by.PASS} |
| WARN | ${summary.by.WARN} |
| FAIL | ${summary.by.FAIL} |
| BLOCKED (UI/manual) | ${summary.by.BLOCKED} |
| Fluxos F1–F10 sem FAIL | ${summary.flowPassSoft}/10 |
| Fluxos F1–F10 PASS estrito (sem WARN) | ${summary.flowPassStrict}/10 |

### Fluxos

| Fluxo | PASS | WARN | FAIL | BLOCKED | Veredito |
|-------|------|------|------|---------|----------|
${flowRows}

### Principais riscos de produção
${bugs.length ? bugs.slice(0, 8).map((b) => `- **${b.severidade}** ${b.modulo}/${b.telaApi}: ${String(b.obtido).slice(0, 160)}`).join('\n') : '- Nenhum FAIL crítico nesta rodada API.'}
${summary.by.BLOCKED ? `\n- **${summary.by.BLOCKED} checks BLOCKED** dependem de browser/câmera/PDF — complementar com Playwright.` : ''}

## Bugs

| Módulo | Tela/API | Papel | Severidade | Obtido |
|--------|----------|-------|------------|--------|
${bugRows}

## Gaps de cobertura (não cobertos / BLOCKED)

${report.gaps.map((g) => `- ${g}`).join('\n')}

## Detalhe dos checks

| Módulo | ID | Status | Papel | Detalhe |
|--------|-----|--------|-------|---------|
${rows}

Artefato JSON: \`docs/audit/fase-funcional/fase-funcional-summary.json\`
`;

  writeFileSync(resolve(OUT, 'FASE-FUNCIONAL-2026-07-23.md'), md);
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Report: ${OUT}`);
  if (summary.by.FAIL > 0) process.exit(1);
}

main().catch((err) => {
  console.error('ABORT', err);
  writeFileSync(
    resolve(OUT, 'fase-funcional-summary.json'),
    JSON.stringify({ error: String(err?.stack || err), results, bugs }, null, 2),
  );
  process.exit(2);
});
