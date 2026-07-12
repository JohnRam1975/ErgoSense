import { http, HttpResponse, delay } from 'msw';

const json = (data: unknown, init?: ResponseInit) =>
  HttpResponse.json(data as Record<string, unknown>, init);

export const defaultHandlers = [
  http.get('*/api/health', () => json({ ok: true })),

  http.post('*/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (body.email === 'mfa@test.com') {
      return json({
        success: true,
        data: {
          mfaRequired: true,
          mfaToken: 'mfa-token-123',
          user: { email: body.email, name: 'MFA User' },
        },
      });
    }
    if (body.email === 'blocked@test.com') {
      return json({ error: 'Tenant bloqueado' }, { status: 403 });
    }
    if (body.password === 'wrongpass1') {
      return json({ message: 'Credenciais inválidas' }, { status: 401 });
    }
    return json({
      success: true,
      data: {
        user: {
          email: body.email ?? 'user@test.com',
          name: 'Test User',
          role: 'ERGONOMISTA',
          company: 'Test Co',
          location: 'HQ',
          tenantId: 'tenant-1',
        },
        accessToken: 'access-token-abc',
        expiresIn: 3600,
        csrfToken: 'csrf-token-xyz',
      },
    });
  }),

  http.post('*/api/auth/mfa/verify', async ({ request }) => {
    const body = (await request.json()) as { mfaToken?: string; code?: string };
    if (body.code === '000000') {
      return json({ message: 'Código expirado' }, { status: 401 });
    }
    if (body.code !== '123456') {
      return json({ error: 'Código inválido' }, { status: 400 });
    }
    return json({
      user: {
        email: 'mfa@test.com',
        name: 'MFA User',
        role: 'OPERADOR',
        company: 'Test Co',
        location: 'HQ',
        tenantId: 'tenant-1',
      },
      accessToken: 'access-after-mfa',
      expiresIn: 3600,
      csrfToken: 'csrf-after-mfa',
    });
  }),

  http.post('*/api/auth/logout', () => json({ ok: true })),

  http.post('*/api/auth/refresh', () =>
    json({ accessToken: 'refreshed-token', csrfToken: 'refreshed-csrf' }),
  ),

  http.get('*/api/tenants', () =>
    json([{ id: 'tenant-1', name: 'Test Co', industry: 'Mining' }]),
  ),

  http.get('*/api/admin/tenants', () => json([])),
  http.get('*/api/tenant/metadata', () => json([])),
  http.get('*/api/support/active', () => json([])),

  http.get('*/api/analyses/*/video', () =>
    HttpResponse.arrayBuffer(new ArrayBuffer(8), {
      headers: { 'Content-Type': 'video/mp4' },
    }),
  ),

  http.get('*/api/*', ({ request }) => {
    const url = new URL(request.url);
    return json({ ok: true, path: url.pathname });
  }),

  http.post('*/api/*', () => json({ ok: true })),
  http.put('*/api/*', () => json({ ok: true })),
  http.patch('*/api/*', () => json({ ok: true })),
  http.delete('*/api/*', () => json({ ok: true })),
];

export const slowHandler = http.get('*/api/psico/dashboard', async () => {
  await delay(50);
  return json({ total: 0 });
});

export const errorHandlers = {
  unauthorized: http.get('*/api/protected', () => json({ error: 'Unauthorized' }, { status: 401 })),
  forbidden: http.get('*/api/forbidden', () => json({ error: 'Forbidden' }, { status: 403 })),
  notFound: http.get('*/api/missing', () => json({ error: 'Not found' }, { status: 404 })),
  serverError: http.get('*/api/broken', () => json({ error: 'Internal' }, { status: 500 })),
  networkError: http.get('*/api/network-fail', () => HttpResponse.error()),
};
