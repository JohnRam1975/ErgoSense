/** Carregado via --import antes dos módulos da app (CSRF off em integração). */
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.CSRF_ENABLED = 'false';
process.env.MFA_ENABLED = process.env.MFA_ENABLED ?? 'false';
process.env.RATE_LIMIT_SKIP_DEV = 'true';
process.env.CACHE_ENABLED = 'true';
