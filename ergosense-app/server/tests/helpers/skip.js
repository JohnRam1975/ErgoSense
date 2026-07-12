import { isIntegrationReady, integrationSkipReason } from '../setup/testDb.js';

/** Retorna false se o teste foi skipped (DB indisponível). */
export function guardIntegration(t) {
  if (!isIntegrationReady()) {
    t.skip(integrationSkipReason());
    return false;
  }
  return true;
}

/** @deprecated use guardIntegration(t) no início do teste */
export function skipIfNoDb(t) {
  return guardIntegration(t);
}
