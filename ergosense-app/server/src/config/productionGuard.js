/**
 * Fail-closed em produção: secrets fracos / ausentes não sobem o serviço.
 */
const WEAK = /change-me|change_in_production|dev-access|dev-refresh|dev-mfa|TROCAR_|your_password|ergosense_change_me|min_32_chars|example|password123|secret123/i;

function isWeak(value) {
  if (value == null) return true;
  const s = String(value).trim();
  if (s.length < 32) return true;
  return WEAK.test(s);
}

/**
 * @param {import('./env.js').config} config
 * @param {NodeJS.ProcessEnv} [env]
 */
export function assertProductionSecrets(config, env = process.env) {
  if (config.nodeEnv !== 'production') return;

  const errors = [];

  if (isWeak(config.jwt.accessSecret)) {
    errors.push('JWT_ACCESS_SECRET ausente/fraco (mín. 32 chars, sem placeholder)');
  }
  if (isWeak(config.jwt.refreshSecret)) {
    errors.push('JWT_REFRESH_SECRET ausente/fraco (mín. 32 chars, sem placeholder)');
  }
  const pgPass = String(config.db.password ?? '').trim();
  if (!pgPass || pgPass.length < 16 || WEAK.test(pgPass)) {
    errors.push('PGPASSWORD ausente/fraco (mín. 16 chars, sem placeholder)');
  }
  if (!config.observability.metricsToken || String(config.observability.metricsToken).length < 24) {
    errors.push('METRICS_TOKEN obrigatório em produção (mín. 24 chars)');
  }

  if (config.mfa.enabled) {
    const mfaKey = env.MFA_ENCRYPTION_KEY || '';
    const mfaPending = env.MFA_PENDING_SECRET || '';
    if (isWeak(mfaKey)) {
      errors.push('MFA_ENCRYPTION_KEY obrigatório quando MFA_ENABLED=true');
    }
    if (isWeak(mfaPending)) {
      errors.push('MFA_PENDING_SECRET obrigatório quando MFA_ENABLED=true');
    }
  }

  if (config.storage.driver === 'minio' || config.storage.driver === 's3') {
    if (!config.storage.accessKey || !config.storage.secretKey) {
      errors.push('STORAGE_ACCESS_KEY/STORAGE_SECRET_KEY obrigatórios para storage externo');
    }
    if (isWeak(config.storage.secretKey)) {
      errors.push('STORAGE_SECRET_KEY fraco');
    }
  }

  if (config.security.corsOrigins.includes('localhost') || config.security.corsOrigins.includes('127.0.0.1')) {
    errors.push('CORS_ORIGINS não deve apontar para localhost em produção');
  }

  if (errors.length) {
    const msg = `Produção bloqueada:\n- ${errors.join('\n- ')}`;
    throw new Error(msg);
  }
}
