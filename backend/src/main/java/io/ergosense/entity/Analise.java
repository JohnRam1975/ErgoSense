package io.ergosense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "analises")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Analise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private String tenantId;

    @Column(name = "colaborador_id", nullable = false)
    private Long colaboradorId;

    @Column(name = "setor_id")
    private Long setorId;

    @Column(nullable = false)
    private String atividade;

    @Column(nullable = false, length = 16)
    private String modo;

    private String observacoes;

    @Column(name = "data_analise", nullable = false)
    private LocalDate dataAnalise;

    @Column(name = "hora_analise", nullable = false)
    private LocalTime horaAnalise;

    @Column(name = "id_local_mobile")
    private UUID idLocalMobile;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
