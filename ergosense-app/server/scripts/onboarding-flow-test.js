/**
 * Teste de integração — fluxo completo onboarding tenant (API)
 * Executar com API + Postgres ativos: npm run test:onboarding
 */
import { generateSync } from 'otplib';

const API = process.env.API_URL ?? 'http://localhost:3001';
const ADMIN_EMAIL = process.env.E2E_GLOBAL_EMAIL ?? 'admin@ergosense.com.br';
const ADMIN_PASSWORD = process.env.E2E_GLOBAL_PASSWORD ?? 'admin1234';

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

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(options.headers ?? {}) },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? `HTTP ${res.status} ${path}`);
  }
  return body.data ?? body;
}

function totpFromUrl(otpauthUrl) {
  const secret = new URL(otpauthUrl).searchParams.get('secret');
  if (!secret) throw new Error('secret ausente');
  return generateSync({ secret });
}

async function main() {
  const stamp = Date.now();
  const email = `integration-${stamp}@test.ergosense.local`;
  const company = `Integration Co ${stamp}`;
  const cnpj = generateValidCnpj();
  const password = `IntegTest${stamp}!`;

  console.log('1. Solicitar cadastro…');
  const created = await api('/api/public/tenant-request', {
    method: 'POST',
    body: JSON.stringify({
      razaoSocial: company,
      nomeFantasia: company,
      cnpj,
      segmento: 'Tecnologia',
      quantidadeFuncionarios: 10,
      responsavelNome: 'Admin Integration',
      email,
      telefone: '11988887777',
      plano: 'STARTER',
    }),
  });
  console.log(`   protocolo=${created.protocolo} id=${created.id}`);

  console.log('2. Login admin global…');
  const admin = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (admin.mfaRequired) throw new Error('Admin exige MFA — desabilite para CI ou configure TOTP');
  const token = admin.accessToken;

  console.log('3. Aprovar solicitação…');
  const list = await api(`/api/admin/tenant-requests?status=PENDENTE&search=${encodeURIComponent(company)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const req = list.find((r) => String(r.id) === String(created.id));
  if (!req) throw new Error('Solicitação não encontrada na listagem');

  const approved = await api(`/api/admin/tenant-requests/${req.id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
  const activationToken = approved.activationToken;
  console.log(`   tenantId=${approved.tenantId}`);

  console.log('4. Preview + ativar conta (MFA)…');
  const preview = await api(`/api/auth/activate-account/preview?token=${encodeURIComponent(activationToken)}`);
  const mfaCode = totpFromUrl(preview.otpauthUrl);
  await api('/api/auth/activate-account', {
    method: 'POST',
    body: JSON.stringify({
      token: activationToken,
      password,
      confirmPassword: password,
      mfaCode,
    }),
  });

  console.log('5. Login tenant admin + MFA…');
  const login = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!login.mfaRequired) throw new Error('Esperava MFA após ativação');
  const loginMfa = totpFromUrl(preview.otpauthUrl);
  const session = await api('/api/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ mfaToken: login.mfaToken, code: loginMfa }),
  });
  if (!session.accessToken) throw new Error('Sessão sem accessToken');

  console.log('OK — fluxo onboarding completo via API');
}

main().catch((err) => {
  console.error('FALHA:', err.message);
  process.exit(1);
});
