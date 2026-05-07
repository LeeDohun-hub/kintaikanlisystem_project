package com.kintai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "vacation_audit_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VacationAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    @Column(name = "vacation_request_id", nullable = false)
    private Long vacationRequestId;

    @Column(name = "actor_id", nullable = false)
    private Long actorId;

    @Column(name = "actor_name", nullable = false, length = 50)
    private String actorName;

    @Column(name = "applicant_id", nullable = false)
    private Long applicantId;

    @Column(name = "applicant_name", nullable = false, length = 50)
    private String applicantName;

    /** SUBMITTED / APPROVED / APPROVED_PENDING_PROOF / REJECTED / PROOF_UPLOADED / PROOF_VERIFIED / PROXY_SUBMITTED */
    @Column(nullable = false, length = 32)
    private String action;

    @Column(name = "old_status", length = 24)
    private String oldStatus;

    @Column(name = "new_status", length = 24)
    private String newStatus;

    @Column(name = "is_retroactive", nullable = false)
    @Builder.Default
    private boolean retroactive = false;

    @Column(name = "is_proxy", nullable = false)
    @Builder.Default
    private boolean proxy = false;

    @Column(length = 500)
    private String detail;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
