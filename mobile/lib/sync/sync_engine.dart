import '../core/constants/sync_status.dart';

/// Motor de sincronização offline-first
/// SQLite → Queue → API REST → PostgreSQL
class SyncEngine {
  SyncEngine(this._queue, this._api, this._db, this._connectivity);

  final SyncQueue _queue;
  final SyncApiClient _api;
  final AppDatabase _db;
  final ConnectivityService _connectivity;

  /// Executado por WorkManager em background
  Future<SyncResult> syncAll({required String tenantId}) async {
    if (!await _connectivity.hasConnection) {
      return SyncResult.skipped('Sem conexão');
    }

    final pending = await _queue.getPending(tenantId);
    if (pending.isEmpty) return SyncResult.success(0);

    var synced = 0;
    for (final item in pending) {
      try {
        await _pushItem(item);
        await _queue.markSynced(item.idLocal);
        synced++;
      } catch (e) {
        await _queue.scheduleRetry(item.idLocal, e.toString());
      }
    }

    final delta = await _api.pull(tenantId, since: await _db.lastSyncTimestamp(tenantId));
    await _db.mergeDelta(delta);

    return SyncResult.success(synced);
  }

  Future<void> _pushItem(SyncQueueItem item) async {
    final response = await _api.push(batch: [item.toPayload()]);
    await _db.applyServerIds(response.mappings);
  }
}

// Interfaces — implementar com drift + dio
abstract class SyncQueue {
  Future<List<SyncQueueItem>> getPending(String tenantId);
  Future<void> markSynced(String idLocal);
  Future<void> scheduleRetry(String idLocal, String error);
}

abstract class SyncApiClient {
  Future<PushResponse> push({required List<Map<String, dynamic>> batch});
  Future<Map<String, dynamic>> pull(String tenantId, {required DateTime since});
}

abstract class AppDatabase {
  Future<DateTime> lastSyncTimestamp(String tenantId);
  Future<void> mergeDelta(Map<String, dynamic> delta);
  Future<void> applyServerIds(Map<String, int> mappings);
}

abstract class ConnectivityService {
  Future<bool> get hasConnection;
}

class SyncQueueItem {
  SyncQueueItem({
    required this.idLocal,
    required this.entity,
    required this.operation,
    required this.payload,
  });
  final String idLocal;
  final String entity;
  final String operation;
  final Map<String, dynamic> payload;
  Map<String, dynamic> toPayload() => {
        'entity': entity,
        'operation': operation,
        'idLocal': idLocal,
        'data': payload,
      };
}

class SyncResult {
  SyncResult._(this.synced, this.message);
  final int synced;
  final String? message;
  factory SyncResult.success(int n) => SyncResult._(n, null);
  factory SyncResult.skipped(String msg) => SyncResult._(0, msg);
}

class PushResponse {
  PushResponse(this.mappings);
  final Map<String, int> mappings;
}
