/**
 * HTTP helpers para scripts de auditoria P4
 */
import 'dotenv/config';

export const BASE = process.env.API_URL ?? process.env.AUDIT_API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
export const TENANT = process.env.AUDIT_TENANT ?? 'acme';
export const OTHER_TENANT = process.env.OTHER_TENANT ?? 'acme2';

export const AUDIT_EMAIL = process.env.AUDIT_EMAIL ?? 'auditor@ergosense.test';
export const AUDIT_PASS = process.env.AUDIT_PASS ?? 'AuditTest!2026';
export const GLOBAL_EMAIL = process.env.E2E_GLOBAL_EMAIL ?? 'ergosense@dejohn.com.br';
export const GLOBAL_PASS = process.env.E2E_GLOBAL_PASSWORD ?? '@Ergo!2026/Adm';
export const LEGACY_EMAIL = process.env.AUDIT_LEGACY_EMAIL ?? AUDIT_EMAIL;
export const LEGACY_PASS = process.env.AUDIT_LEGACY_PASS ?? AUDIT_PASS;

const SENSITIVE = /password|secret|refreshToken|token_hash|private_key/i;

export async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function login(email, password, retries = 6) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 429) {
      await sleep(2000 * (i + 1));
      continue;
    }
    if (!res.ok) return null;
    return body.accessToken ?? body.data?.accessToken ?? null;
  }
  return null;
}

export async function request(method, path, { token, body, tenantId, headers: extra = {}, retries = 2 } = {}) {
  let last = { status: 0, ms: 0, json: null, text: '', error: 'no attempt' };
  for (let attempt = 0; attempt <= retries; attempt++) {
    let url = `${BASE}${path}`;
    if (method === 'GET' && !path.includes('?') && tenantId !== false) {
      url += `${path.includes('?') ? '&' : '?'}tenantId=${tenantId ?? TENANT}`;
    }
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
    };
    if (token) opts.headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) opts.body = JSON.stringify(body);
    const start = Date.now();
    try {
      const res = await fetch(url, opts);
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
      last = { status: res.status, ms: Date.now() - start, json, text };
      if (res.status > 0) return last;
    } catch (err) {
      last = { status: 0, ms: Date.now() - start, error: err.message, json: null, text: '' };
    }
    if (attempt < retries) await sleep(200 * (attempt + 1));
  }
  return last;
}

export function hasSensitiveLeak(text, routePath = '') {
  if (!text) return false;
  if (routePath === '/api/openapi.json' || routePath === '/api/docs') return false;
  if (SENSITIVE.test(text)) {
    const lower = text.toLowerCase();
    // Valores reais vazados — não nomes de campo em schema OpenAPI
    if (/"password"\s*:\s*"[^"]{1,}/i.test(text)) return true;
    if (lower.includes('refresh_token') && /refresh_token["\s]*:\s*["'][^"']+/.test(lower)) return true;
  }
  return false;
}

export function schemaOk(json, status) {
  if (status === 204) return true;
  if (!json || typeof json !== 'object') return status >= 200 && status < 300;
  if ('success' in json) return typeof json.success === 'boolean';
  if ('error' in json || 'message' in json) return true;
  return true;
}
