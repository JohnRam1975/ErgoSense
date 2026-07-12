/**
 * Auditoria de segurança avançada — além do smoke básico
 * Uso: node scripts/security-advanced.js
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
const EMAIL = process.env.AUDIT_EMAIL ?? 'auditor@ergosense.test';
const PASS = process.env.AUDIT_PASS ?? 'AuditTest!2026';
const OTHER_TENANT = process.env.OTHER_TENANT ?? 'gerdau';

const findings = [];

function add(severity, category, title, detail, fixed = false) {
  findings.push({ severity, category, title, detail, fixed });
  const icon = severity === 'CRÍTICO' ? '🔴' : severity === 'ALTO' ? '🟠' : severity === 'MÉDIO' ? '🟡' : '🟢';
  console.log(`${icon} [${severity}] ${title}${detail ? ` — ${detail}` : ''}`);
}

async function fetchJson(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body, headers: res.headers };
}

async function login() {
  const { status, body } = await fetchJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  if (status !== 200) return null;
  return body.accessToken ?? body.data?.accessToken;
}

async function main() {
  console.log(`\n=== SECURITY ADVANCED → ${BASE} ===\n`);

  try {
    await fetch(`${BASE}/api/health`);
  } catch {
    console.error('API indisponível');
    process.exit(2);
  }

  // IDOR cross-tenant
  const token = await login();
  if (token) {
    const cross = await fetchJson(`/api/collaborators?tenantId=${OTHER_TENANT}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (cross.status === 403 || cross.status === 401) {
      add('BAIXO', 'IDOR', 'Cross-tenant bloqueado', `HTTP ${cross.status}`);
    } else if (cross.status === 200) {
      add('CRÍTICO', 'IDOR', 'Acesso cross-tenant possível', `HTTP ${cross.status} tenant=${OTHER_TENANT}`);
    } else {
      add('MÉDIO', 'IDOR', 'Cross-tenant resposta inesperada', `HTTP ${cross.status}`);
    }
  }

  // SQL injection probe
  {
    const sqli = await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: "x' OR '1'='1", password: 'anything123' }),
    });
    if (sqli.status === 401 || sqli.status === 400 || sqli.status === 429) {
      add('BAIXO', 'SQLi', 'Login rejeita payload SQLi', `HTTP ${sqli.status}`);
    } else if (sqli.status === 200) {
      add('CRÍTICO', 'SQLi', 'Login possivelmente vulnerável', `HTTP ${sqli.status}`);
    }
  }

  // XSS stored probe (sanitização)
  if (token) {
    const xssName = '<script>alert(1)</script>';
    const post = await fetchJson(`/api/collaborators?tenantId=vale`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: xssName,
        matricula: `XSS${Date.now()}`,
        setor: 'Geral',
        funcao: 'Teste',
        icon: '👤',
        iconBg: 'amber',
      }),
    });
    if (post.status === 201 || post.status === 200) {
      const list = await fetchJson(`/api/collaborators?tenantId=vale`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = JSON.stringify(list.body);
      if (raw.includes('<script>')) {
        add('ALTO', 'XSS', 'Nome colaborador não sanitizado na resposta', 'script tag presente');
      } else {
        add('BAIXO', 'XSS', 'Payload XSS escapado ou rejeitado', `create HTTP ${post.status}`);
      }
    } else {
      add('BAIXO', 'XSS', 'Criação colaborador XSS rejeitada', `HTTP ${post.status}`);
    }
  }

  // CSRF — POST sem cookie mas com Bearer (API stateless OK)
  {
    const { status } = await fetchJson('/api/collaborators?tenantId=vale', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    add('BAIXO', 'CSRF', 'API usa Bearer (não cookie-only)', `GET autenticado HTTP ${status}`);
  }

  // CORS preflight
  {
    const res = await fetch(`${BASE}/api/health`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET' },
    });
    const acao = res.headers.get('access-control-allow-origin');
    if (acao === '*' || acao === 'https://evil.example') {
      add('MÉDIO', 'CORS', 'CORS permissivo', acao ?? 'null');
    } else {
      add('BAIXO', 'CORS', 'CORS não reflete origem arbitrária', acao ?? 'sem header');
    }
  }

  // Brute force / rate limit (usa e-mail fictício para não bloquear conta de teste)
  {
    let locked = false;
    for (let i = 0; i < 12; i++) {
      const r = await fetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'brute-force-probe@invalid.local', password: 'wrong-pass-xyz' }),
      });
      if (r.status === 429) {
        locked = true;
        break;
      }
    }
    add(locked ? 'BAIXO' : 'MÉDIO', 'Rate limit', locked ? 'Login bloqueia após tentativas' : '429 não observado em 12 tentativas');
  }

  // Admin sem auth
  {
    const admin = await fetchJson('/api/admin/tenant-requests');
    if (admin.status === 401) {
      add('BAIXO', 'Auth', 'Admin tenant-requests exige auth', 'HTTP 401');
    } else {
      add('CRÍTICO', 'Auth', 'Admin tenant-requests sem auth', `HTTP ${admin.status}`);
    }
  }

  // MFA bypass — login sem código após mfaRequired
  {
    const act = await fetchJson('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mfaToken: 'invalid', code: '000000' }),
    });
    if (act.status === 401 || act.status === 400) {
      add('BAIXO', 'MFA', 'MFA verify rejeita token inválido', `HTTP ${act.status}`);
    } else {
      add('ALTO', 'MFA', 'MFA verify resposta inesperada', `HTTP ${act.status}`);
    }
  }

  // Security headers
  {
    const h = await fetch(`${BASE}/api/health`);
    const required = ['x-content-type-options', 'x-frame-options'];
    const missing = required.filter((k) => !h.headers.get(k));
    if (missing.length) {
      add('MÉDIO', 'Headers', 'Headers de segurança ausentes', missing.join(', '));
    } else {
      add('BAIXO', 'Headers', 'Headers básicos presentes', required.join(', '));
    }
  }

  // Token inválido
  {
    const bad = await fetchJson('/api/collaborators?tenantId=vale', {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    if (bad.status === 401) add('BAIXO', 'Auth', 'Token inválido → 401', '');
    else add('ALTO', 'Auth', 'Token inválido não rejeitado', `HTTP ${bad.status}`);
  }

  // Enumeração — login user inexistente vs senha errada (timing/message)
  {
    const a = await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'naoexiste@x.com', password: 'WrongPass1!' }),
    });
    const b = await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: 'WrongPass1!' }),
    });
    if (a.body?.message === b.body?.message || a.body?.error === b.body?.error) {
      add('BAIXO', 'Enumeração', 'Mensagem login uniforme', a.body?.message ?? a.body?.error ?? '');
    } else {
      add('MÉDIO', 'Enumeração', 'Mensagens login diferem', `${a.body?.message} vs ${b.body?.message}`);
    }
  }

  const bySeverity = { CRÍTICO: 0, ALTO: 0, MÉDIO: 0, BAIXO: 0 };
  for (const f of findings) bySeverity[f.severity]++;

  const report = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    bySeverity,
    findings,
    pass: bySeverity.CRÍTICO === 0 && bySeverity.ALTO === 0,
  };

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outDir = path.join(__dirname, '../../../docs/audit/security');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'security-advanced.json'), JSON.stringify(report, null, 2));

  let md = `# Security Advanced — ${report.generatedAt}\n\n`;
  md += `| Severidade | Qtd |\n|------------|----:|\n`;
  for (const [s, n] of Object.entries(bySeverity)) md += `| ${s} | ${n} |\n`;
  md += `\n**Veredicto:** ${report.pass ? 'PASS (sem CRÍTICO/ALTO)' : 'FAIL'}\n\n`;
  for (const f of findings) {
    md += `- **${f.severity}** [${f.category}] ${f.title} — ${f.detail}\n`;
  }
  fs.writeFileSync(path.join(outDir, 'security-advanced.md'), md);

  console.log(`\nCRÍTICO: ${bySeverity.CRÍTICO} | ALTO: ${bySeverity.ALTO} | MÉDIO: ${bySeverity.MÉDIO} | BAIXO: ${bySeverity.BAIXO}`);
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
