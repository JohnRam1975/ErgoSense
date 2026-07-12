package io.ergosense.repository;

import io.ergosense.entity.Analise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AnaliseRepository extends JpaRepository<Analise, Long> {
    List<Analise> findByTenantIdAndDeletedAtIsNull(String tenantId);
    Optional<Analise> findByTenantIdAndIdLocalMobile(String tenantId, UUID idLocalMobile);
}
