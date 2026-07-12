import { describe, expect, it, beforeEach } from 'vitest';
import {
  setAccessToken,
  getAccessToken,
  setCsrfToken,
  getCsrfToken,
  getApiAuthHeaders,
  setApiAuthSession,
} from '../authHeaders';

describe('authHeaders', () => {
  beforeEach(() => {
    setApiAuthSession(null);
    setAccessToken(null);
    setCsrfToken(null);
  });

  it('getAccessToken retorna null inicialmente', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('setAccessToken persiste token', () => {
    setAccessToken('jwt-token-abc');
    expect(getAccessToken()).toBe('jwt-token-abc');
  });

  it('getApiAuthHeaders inclui Authorization', () => {
    setAccessToken('my-jwt');
    expect(getApiAuthHeaders()).toEqual({ Authorization: 'Bearer my-jwt' });
  });

  it('getApiAuthHeaders inclui CSRF quando presente', () => {
    setAccessToken('my-jwt');
    setCsrfToken('csrf-xyz');
    expect(getApiAuthHeaders()).toEqual({
      Authorization: 'Bearer my-jwt',
      'X-CSRF-Token': 'csrf-xyz',
    });
  });

  it('setApiAuthSession(null) limpa tokens', () => {
    setAccessToken('x');
    setCsrfToken('y');
    setApiAuthSession(null);
    expect(getAccessToken()).toBeNull();
    expect(getCsrfToken()).toBeNull();
  });
});
