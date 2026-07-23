/**
 * Helpers compartilhados para trilhas de auditoria (histórico).
 */
export function historyUserId(user) {
  return user?.id ?? null;
}

export function historyUserName(user) {
  return user?.name || user?.email || null;
}

export function historyDetailsJson(details) {
  return details == null ? null : JSON.stringify(details);
}
