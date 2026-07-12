package io.ergosense.sync;

import io.ergosense.dto.SyncBatchItem;
import io.ergosense.entity.Analise;
import io.ergosense.repository.AnaliseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class DefaultSyncProcessor implements SyncProcessor {

    private final AnaliseRepository analiseRepository;

    @Override
    public Long process(SyncBatchItem item, String tenantId) {
        return switch (item.entity()) {
            case "analises" -> processAnalise(item, tenantId);
            default -> throw new UnsupportedOperationException("Entity: " + item.entity());
        };
    }

    private Long processAnalise(SyncBatchItem item, String tenantId) {
        return analiseRepository
                .findByTenantIdAndIdLocalMobile(tenantId, item.idLocal())
                .map(Analise::getId)
                .orElseGet(() -> {
                    Map<String, Object> d = item.data();
                    Analise a = Analise.builder()
                            .tenantId(tenantId)
                            .idLocalMobile(item.idLocal())
                            .atividade((String) d.get("atividade"))
                            .modo((String) d.getOrDefault("modo", "offline"))
                            .dataAnalise(LocalDate.parse((String) d.get("dataAnalise")))
                            .horaAnalise(LocalTime.parse((String) d.get("horaAnalise")))
                            .colaboradorId(((Number) d.get("colaboradorId")).longValue())
                            .build();
                    return analiseRepository.save(a).getId();
                });
    }
}
