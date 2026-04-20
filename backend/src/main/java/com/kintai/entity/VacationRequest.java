package com.kintai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "vacation_request")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VacationRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id")
    private Long requestId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Enumerated(EnumType.STRING)
    @Column(name = "vacation_type", nullable = false, length = 10)
    private VacationType vacationType;

    @Column(name = "vacation_date", nullable = false)
    private LocalDate vacationDate;

    @Column(length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private VacationStatus status = VacationStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private Employee approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /** 申請中のみキャンセル可能。本人チェック込み */
    public void assertCancellableBy(Long employeeId) {
        if (!employee.getEmployeeId().equals(employeeId)) {
            throw new IllegalArgumentException("他の社員の申請はキャンセルできません。");
        }
        if (status != VacationStatus.PENDING) {
            throw new IllegalArgumentException("申請中の休暇申請のみキャンセルできます。");
        }
    }

    public void applyApproval(Employee approver, String notPendingMessage) {
        assertPending(notPendingMessage);
        this.status = VacationStatus.APPROVED;
        this.approvedBy = approver;
        this.approvedAt = LocalDateTime.now();
        this.rejectReason = null;
    }

    public void applyRejection(Employee approver, String rejectReason, String notPendingMessage) {
        assertPending(notPendingMessage);
        this.status = VacationStatus.REJECTED;
        this.approvedBy = approver;
        this.approvedAt = LocalDateTime.now();
        this.rejectReason = rejectReason;
    }

    private void assertPending(String notPendingMessage) {
        if (status != VacationStatus.PENDING) {
            throw new IllegalArgumentException(notPendingMessage);
        }
    }
}
