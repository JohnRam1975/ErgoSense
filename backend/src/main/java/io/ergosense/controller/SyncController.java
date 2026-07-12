package io.ergosense.controller;

import io.ergosense.dto.SyncPullResponse;
import io.ergosense.dto.SyncPushRequest;
import io.ergosense.dto.SyncPushResponse;
import io.ergosense.service.SyncService;
import io.ergosense.tenant.TenantContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/sync")
@RequiredArgsConstructor
public class SyncController {

    private final SyncService syncService;

    @PostMapping("/push")
    @PreAuthorize("hasAnyRole('ERGONOMISTA','ADMIN_EMPRESA','ADMIN_GLOBAL')")
    public ResponseEntity<SyncPushResponse> push(@Valid @RequestBody SyncPushRequest request) {
        TenantContext.requireTenant(request.tenantId());
        return ResponseEntity.ok(syncService.push(request));
    }

    @GetMapping("/pull")
    @PreAuthorize("hasAnyRole('ERGONOMISTA','ADMIN_EMPRESA','ADMIN_GLOBAL','SUPERVISOR')")
    public ResponseEntity<SyncPullResponse> pull(
            @RequestParam Instant since,
            @RequestParam(defaultValue = "colaboradores,setores,analises") String entities) {
        return ResponseEntity.ok(syncService.pull(TenantContext.getTenantId(), since, entities));
    }
}
