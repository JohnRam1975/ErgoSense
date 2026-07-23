import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertProductionSecrets } from '../config/productionGuard.js';

const strong = 'a'.repeat(40) + 'Xy9!';

function baseConfig(over = {}) {
  return {
    nodeEnv: 'production',
    jwt: { accessSecret: strong, refreshSecret: strong + 'r' },
    db: { password: strong },
    observability: { metricsToken: strong },
    mfa: { enabled: true },
    storage: { driver: 'database', accessKey: '', secretKey: '' },
    security: { corsOrigins: 'https://ergosense.example.com' },
    ...over,
  };
}

describe('assertProductionSecrets', () => {
  it('permite config forte em produção', () => {
    assert.doesNotThrow(() =>
      assertProductionSecrets(baseConfig(), {
        MFA_ENCRYPTION_KEY: strong,
        MFA_PENDING_SECRET: strong + 'p',
      }),
    );
  });

  it('bloqueia JWT fraco', () => {
    assert.throws(
      () =>
        assertProductionSecrets(
          baseConfig({ jwt: { accessSecret: 'change-me-access-secret-min-32-chars', refreshSecret: strong } }),
          { MFA_ENCRYPTION_KEY: strong, MFA_PENDING_SECRET: strong },
        ),
      /JWT_ACCESS_SECRET/,
    );
  });

  it('ignora em development', () => {
    assert.doesNotThrow(() =>
      assertProductionSecrets(baseConfig({ nodeEnv: 'development', jwt: { accessSecret: 'x', refreshSecret: 'y' } })),
    );
  });
});
