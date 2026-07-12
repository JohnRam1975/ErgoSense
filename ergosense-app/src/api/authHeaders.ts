import type { UserSession } from '../types';

let accessToken: string | null = null;
let csrfToken: string | null = null;

export function setApiAuthSession(_session: UserSession | null) {
  if (!_session) {
    accessToken = null;
    csrfToken = null;
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function getApiAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  return headers;
}
