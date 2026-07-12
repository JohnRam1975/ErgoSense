package io.ergosense.sync;

import io.ergosense.dto.SyncBatchItem;

public interface SyncProcessor {
    Long process(SyncBatchItem item, String tenantId);
}
