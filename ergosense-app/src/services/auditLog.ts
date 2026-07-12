/**
 * Módulo 19 — Auditoria e rastreabilidade
 */
export interface AuditEntry {
  id: string;
  userId: string;
  userEmail: string;
  tenantId: string;
  entity: string;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'export' | 'login';
  field?: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
  ip?: string;
}

const STORAGE_KEY = 'ergosense_audit_log';

export function appendAuditLog(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
  const full: AuditEntry = {
    ...entry,
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: AuditEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift(full);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 500)));
  } catch {
    /* quota */
  }
  return full;
}

export function logAnalysisAudit(
  userEmail: string,
  tenantId: string,
  analysisId: string,
  action: AuditEntry['action'],
): AuditEntry {
  return appendAuditLog({
    userId: userEmail,
    userEmail,
    tenantId,
    entity: 'analysis',
    entityId: analysisId,
    action,
  });
}

export function getAuditLogs(tenantId?: string, limit = 100): AuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: AuditEntry[] = raw ? JSON.parse(raw) : [];
    return (tenantId ? list.filter((e) => e.tenantId === tenantId) : list).slice(0, limit);
  } catch {
    return [];
  }
}
