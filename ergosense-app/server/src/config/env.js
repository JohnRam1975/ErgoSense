/**
 * Configuração centralizada — nada fixo no código (12-factor / K8s ConfigMap+Secret).
 */
import dotenv from 'dotenv';

dotenv.config();

function env(key, fallback = undefined) {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
}

function envInt(key, fallback) {
  const n = Number(env(key));
  return Number.isFinite(n) ? n : fallback;
}

function envBool(key, fallback = false) {
  const v = env(key);
  if (v === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

export const config = {
  nodeEnv: env('NODE_ENV', 'development'),
  port: envInt('PORT', 3001),
  logLevel: env('LOG_LEVEL', 'info'),

  db: {
    host: env('PGHOST', 'localhost'),
    port: envInt('PGPORT', 5432),
    database: env('PGDATABASE', 'ergosense'),
    user: env('PGUSER', 'ergosense'),
    password: env('PGPASSWORD', ''),
    poolMax: envInt('PGPOOL_MAX', 20),
    poolIdleMs: envInt('PGPOOL_IDLE_MS', 30000),
  },

  redis: {
    url: env('REDIS_URL'),
    enabled: envBool('REDIS_ENABLED', false),
  },

  cache: {
    enabled: envBool('CACHE_ENABLED', true),
    defaultTtlSec: envInt('CACHE_DEFAULT_TTL_SEC', 60),
  },

  session: {
    enabled: envBool('SESSION_REDIS_ENABLED', envBool('REDIS_ENABLED', false)),
    ttlSec: envInt('SESSION_TTL_SEC', 7 * 24 * 3600),
  },

  rabbitmq: {
    url: env('RABBITMQ_URL'),
    enabled: envBool('RABBITMQ_ENABLED', false),
    prefetch: envInt('RABBITMQ_PREFETCH', 5),
  },

  storage: {
    driver: env('STORAGE_DRIVER', 'database'),
    bucket: env('STORAGE_BUCKET', 'ergosense-media'),
    endpoint: env('STORAGE_ENDPOINT'),
    region: env('STORAGE_REGION', 'us-east-1'),
    accessKey: env('STORAGE_ACCESS_KEY'),
    secretKey: env('STORAGE_SECRET_KEY'),
    publicBaseUrl: env('STORAGE_PUBLIC_BASE_URL'),
  },

  security: {
    corsOrigins: env('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173'),
    rateLimitWindowMs: envInt('RATE_LIMIT_WINDOW_MS', 60_000),
    rateLimitMax: envInt('RATE_LIMIT_MAX', 120),
    loginRateLimitMax: envInt('LOGIN_RATE_LIMIT_MAX', 10),
    criticalRateLimitMax: envInt('CRITICAL_RATE_LIMIT_MAX', 30),
    rateLimitSkipDev: envBool('RATE_LIMIT_SKIP_DEV', true),
    trustProxy: envBool('TRUST_PROXY', false),
    csrfEnabled: envBool('CSRF_ENABLED', true),
    csrfCookieName: env('CSRF_COOKIE_NAME', 'ergosense_csrf'),
    refreshCookieName: env('REFRESH_COOKIE_NAME', 'ergosense_refresh'),
  },

  jwt: {
    accessSecret: env('JWT_ACCESS_SECRET', env('JWT_SECRET', 'dev-access-secret-change-in-production')),
    refreshSecret: env('JWT_REFRESH_SECRET', env('JWT_SECRET', 'dev-refresh-secret-change-in-production')),
    accessTtlSec: envInt('JWT_ACCESS_TTL_SEC', 900),
    refreshTtlSec: envInt('JWT_REFRESH_TTL_SEC', 7 * 24 * 3600),
  },

  mfa: {
    enabled: envBool('MFA_ENABLED', true),
    encryptionKey: env('MFA_ENCRYPTION_KEY', env('JWT_ACCESS_SECRET', 'dev-mfa-key-change-in-production')),
    pendingSecret: env('MFA_PENDING_SECRET', env('JWT_REFRESH_SECRET', 'dev-mfa-pending-change-in-production')),
  },

  tenancy: {
    headerTenantId: env('TENANT_HEADER', 'x-tenant-id'),
    enforceIsolation: envBool('TENANT_ENFORCE', true),
  },

  observability: {
    metricsEnabled: envBool('METRICS_ENABLED', true),
    metricsToken: env('METRICS_TOKEN', ''),
    tracingEnabled: envBool('TRACING_ENABLED', true),
    serviceName: env('SERVICE_NAME', 'ergosense-api'),
  },

  public: {
    appUrl: env('APP_PUBLIC_URL', env('CORS_ORIGINS', 'http://localhost:5173').split(',')[0]),
  },

  support: {
    contactEmail: env('SUPPORT_CONTACT_EMAIL', 'ergosense.suporte@dejohn.com.br'),
  },
};

export function isProduction() {
  return config.nodeEnv === 'production';
}

export { assertProductionSecrets } from './productionGuard.js';
