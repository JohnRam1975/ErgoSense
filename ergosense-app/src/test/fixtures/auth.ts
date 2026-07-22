import type { ApiLoginSuccess } from '../../api/client';

export const mockLoginSuccess: ApiLoginSuccess = {
  user: {
    email: 'ergo@test.com',
    name: 'Ergonomista Test',
    role: 'ERGONOMISTA',
    company: 'Acme Ergonomia',
    location: 'São Paulo',
    tenantId: 'acme',
  },
  accessToken: 'test-jwt-token',
  expiresIn: 3600,
  csrfToken: 'test-csrf',
};

export const mockGlobalAdminLogin: ApiLoginSuccess = {
  ...mockLoginSuccess,
  user: {
    ...mockLoginSuccess.user,
    email: 'admin@ergosense.com',
    role: 'ADMIN_GLOBAL',
    tenantId: 'global',
  },
};
