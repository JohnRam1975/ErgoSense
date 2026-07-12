package io.ergosense.service;

import io.ergosense.dto.*;
import io.ergosense.repository.AnaliseRepository;
import io.ergosense.sync.SyncProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SyncService {

    private final SyncProcessor syncProcessor;
    private final AnaliseRepository analiseRepository;

    @Transactional
    public SyncPushResponse push(SyncPushRequest request) {
        Map<String, Long> mappings = new HashMap<>();
        int processed = 0;
        int errors = 0;

        for (SyncBatchItem item : request.batch()) {
            try {
                Long serverId = syncProcessor.process(item, request.tenantId());
                mappings.put(item.idLocal().toString(), serverId);
                processed++;
            } catch (Exception e) {
                errors++;
            }
        }

        return new SyncPushResponse(mappings, processed, errors);
    }

    public SyncPullResponse pull(String tenantId, Instant since, String entities) {
        Map<String, List<Map<String, Object>>> result = new HashMap<>();
        // Implementar delta por entidade
        return new SyncPullResponse(Instant.now(), result);
    }
}
