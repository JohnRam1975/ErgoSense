package io.ergosense.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record SyncPushRequest(
        @NotBlank String tenantId,
        @NotBlank String deviceId,
        @NotEmpty List<@Valid SyncBatchItem> batch
) {}

public record SyncBatchItem(
        @NotBlank String entity,
        @NotBlank String operation,
        @NotNull UUID idLocal,
        Map<String, Object> data,
        Instant updatedAt
) {}

public record SyncPushResponse(
        Map<String, Long> idMappings,
        int processed,
        int errors
) {}

public record SyncPullResponse(
        Instant serverTimestamp,
        Map<String, List<Map<String, Object>>> entities
) {}
