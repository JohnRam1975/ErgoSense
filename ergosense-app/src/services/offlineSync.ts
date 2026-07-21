/**
 * Fila offline local — análises que falharam ao salvar na API.
 */
const OFFLINE_QUEUE_KEY = 'ergosense_offline_queue';

export interface OfflineQueueItem {
  id: string;
  type: 'analysis';
  payload: unknown;
  createdAt: string;
}

export function queueOfflineAnalysis(payload: unknown): OfflineQueueItem {
  const item: OfflineQueueItem = {
    id: `off-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'analysis',
    payload,
    createdAt: new Date().toISOString(),
  };
  const list = getOfflineQueue();
  list.push(item);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(list));
  return item;
}

export function getOfflineQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function removeOfflineQueueItem(id: string): void {
  const list = getOfflineQueue().filter((i) => i.id !== id);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(list));
}

export function clearOfflineQueue(): void {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

/** Wi-Fi only: se Network Information API indicar cellular, bloqueia. */
export function isAllowedNetworkForSync(wifiOnly: boolean): boolean {
  if (!wifiOnly) return true;
  const conn = (navigator as Navigator & {
    connection?: { type?: string; effectiveType?: string; saveData?: boolean };
  }).connection;
  if (!conn) return navigator.onLine;
  if (conn.type === 'cellular') return false;
  if (conn.type === 'wifi' || conn.type === 'ethernet') return true;
  // Sem type explícito: confia em online (navegadores desktop)
  return navigator.onLine;
}
