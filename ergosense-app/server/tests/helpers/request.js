import request from 'supertest';
import { getApp } from '../setup/testDb.js';

export function http() {
  return request(getApp());
}

export async function login(email, password) {
  const res = await http().post('/api/auth/login').send({ email, password });
  return res;
}

export function authHeader(token, csrfToken) {
  const headers = { Authorization: `Bearer ${token}` };
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  return headers;
}

export async function loginSession(email, password) {
  const res = await login(email, password);
  const body = res.body?.data ?? res.body;
  return {
    res,
    token: body.accessToken,
    csrf: body.csrfToken,
    cookies: res.headers['set-cookie'],
    body,
  };
}

export function withAuth(token, csrf) {
  return {
    get: (url) => http().get(url).set(authHeader(token, csrf)),
    post: (url) => http().post(url).set(authHeader(token, csrf)),
    put: (url) => http().put(url).set(authHeader(token, csrf)),
    patch: (url) => http().patch(url).set(authHeader(token, csrf)),
    delete: (url) => http().delete(url).set(authHeader(token, csrf)),
  };
}

export function assertNoSensitiveLeak(body) {
  const raw = JSON.stringify(body).toLowerCase();
  if (raw.includes('senha_hash') || raw.includes('refresh_secret')) {
    throw new Error('Vazamento sensível na resposta');
  }
}
