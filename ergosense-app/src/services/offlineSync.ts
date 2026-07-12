/**
 * Módulo 18 — Sincronização offline (PWA / mobile bridge)
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
    id: `off-${Date.now()}`,
    type: 'analysis',
    payload,
    createdAt: new Date().toISOString(),
  };
  const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
  const list: OfflineQueueItem[] = raw ? JSON.parse(raw) : [];
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

export function clearOfflineQueue(): void {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}
