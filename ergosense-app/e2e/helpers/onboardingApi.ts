import { generateSync } from 'otplib';

const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:3001';

type ApiBody<T> = T & { success?: boolean; data?: T };

async function apiJson<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> {
  const { token, ...fetchOptions } = options ?? {};
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });
  const body = (await res.json()) as ApiBody<T> & { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
  }
  if (body.success === true && body.data !== undefined) return body.data as T;
  return body as T;
}

/** Gera CNPJ válido (filial 0001) para testes E2E */
export function generateValidCnpj(): string {
  const n: number[] = [];
  for (let i = 0; i < 8; i++) n.push(Math.floor(Math.random() * 9));
  n.push(0, 0, 0, 1);
  const check = (digits: number[], weights: number[]) => {
    const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  n.push(check(n, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  n.push(check(n, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  const d = n.join('');
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function totpFromOtpAuthUrl(otpauthUrl: string): string {
  const url = new URL(otpauthUrl);
  const secret = url.searchParams.get('secret');
  if (!secret) throw new Error('secret ausente em otpauthUrl');
  return generateSync({ secret });
}

export async function submitTenantRequestApi(payload: {
  razaoSocial: string;
  cnpj: string;
  email: string;
  responsavelNome: string;
  telefone: string;
}) {
  return apiJson<{ id: string; protocolo: string }>('/api/public/tenant-request', {
    method: 'POST',
    body: JSON.stringify({
      razaoSocial: payload.razaoSocial,
      nomeFantasia: payload.razaoSocial,
      cnpj: payload.cnpj,
      segmento: 'Tecnologia',
      quantidadeFuncionarios: 25,
      responsavelNome: payload.responsavelNome,
      email: payload.email,
      telefone: payload.telefone,
      plano: 'STARTER',
    }),
  });
}

export async function loginApi(email: string, password: string) {
  const result = await apiJson<{
    accessToken?: string;
    mfaRequired?: boolean;
    mfaToken?: string;
    user?: { email: string; name: string; role?: string };
  }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (result.mfaRequired) {
    return { mfaRequired: true as const, mfaToken: result.mfaToken!, user: result.user! };
  }
  return { mfaRequired: false as const, accessToken: result.accessToken!, user: result.user! };
}

export async function verifyMfaApi(mfaToken: string, code: string) {
  return apiJson<{ accessToken: string }>('/api/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ mfaToken, code }),
  });
}

export async function listTenantRequests(token: string, search: string) {
  return apiJson<Array<{ id: string; email: string; status: string; protocolo: string }>>(
    `/api/admin/tenant-requests?status=PENDENTE&search=${encodeURIComponent(search)}`,
    { token },
  );
}

export async function approveTenantRequestApi(token: string, requestId: string) {
  return apiJson<{
    activationToken: string;
    activationUrl: string;
    adminEmail: string;
    tenantId?: string;
  }>(`/api/admin/tenant-requests/${requestId}/approve`, {
    method: 'POST',
    token,
    body: JSON.stringify({}),
  });
}

export async function getTenantRequestApi(token: string, requestId: string) {
  return apiJson<{ tenantId?: string; status: string; email: string }>(
    `/api/admin/tenant-requests/${requestId}`,
    { token },
  );
}

export async function getActivationPreviewApi(activationToken: string) {
  return apiJson<{ email: string; otpauthUrl: string; companyName: string }>(
    `/api/auth/activate-account/preview?token=${encodeURIComponent(activationToken)}`,
  );
}

export async function activateAccountApi(data: {
  token: string;
  password: string;
  mfaCode: string;
}) {
  return apiJson<{ email: string }>('/api/auth/activate-account', {
    method: 'POST',
    body: JSON.stringify({
      token: data.token,
      password: data.password,
      confirmPassword: data.password,
      mfaCode: data.mfaCode,
    }),
  });
}
