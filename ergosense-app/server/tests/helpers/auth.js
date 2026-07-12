import { signAccessToken } from '../../src/auth/jwt.js';

export function malformedToken() {
  return 'not.a.valid.jwt.token';
}

export function expiredLikeToken() {
  return signAccessToken({
    id: 999999,
    email: 'ghost@test.com',
    name: 'Ghost',
    role: 'ERGONOMISTA',
    company: 'Ghost',
    location: '',
    tenantId: 'itest-active',
  });
}
