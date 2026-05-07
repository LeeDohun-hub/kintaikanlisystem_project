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
    @Column(name = "vacation_type", nullable = false, length = 40)
    private VacationType vacationType;

    @Column(name = "vacation_date", nullable = false)
    private LocalDate vacationDate;

    @Column(length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    @Builder.Default
    private VacationStatus status = VacationStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private Employee approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    /** 添付ファイル保存パス */
    @Column(name = "attachment_path", length = 255)
    private String attachmentPath;

    /** 添付ファイルの元のファイル名（表示用） */
    @Column(name = "attachment_name", length = 255)
    private String attachmentName;

    /** 過去日付の遡及申請かどうか */
    @Column(name = "is_retroactive", nullable = false)
    @Builder.Default
    private boolean retroactive = false;

    /** 遡及申請の事由（遡及申請の場合は必須） */
    @Column(name = "retro_reason", length = 500)
    private String retroReason;

    /** 証明書の提出期限（遡及 + 証明必要な場合に設定） */
    @Column(name = "proof_due_date")
    private LocalDate proofDueDate;

    /** 管理者が代理申請した場合の管理者 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proxy_submitter_id")
    private Employee proxySubmitter;

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
        this.status     = VacationStatus.APPROVED;
        this.approvedBy = approver;
        this.approvedAt = LocalDateTime.now();
        this.rejectReason = null;
    }

    /** 証明書待ち承認（遡及 + proofRequired かつ未添付の場合） */
    public void applyApprovalPendingProof(Employee approver, LocalDate dueDate, String notPendingMessage) {
        assertPending(notPendingMessage);
        this.status       = VacationStatus.APPROVED_PENDING_PROOF;
        this.approvedBy   = approver;
        this.approvedAt   = LocalDateTime.now();
        this.rejectReason = null;
        this.proofDueDate = dueDate;
    }

    /** 証明書確認 → 最終承認 */
    public void applyProofVerification(Employee verifier) {
        if (status != VacationStatus.APPROVED_PENDING_PROOF) {
            throw new IllegalArgumentException("証明書の確認が必要な申請のみ実行できます。");
        }
        if (attachmentPath == null) {
            throw new IllegalArgumentException("証明書がまだアップロードされていません。");
        }
        this.status     = VacationStatus.APPROVED;
        this.approvedBy = verifier;
        this.approvedAt = LocalDateTime.now();
    }

    public void applyRejection(Employee approver, String rejectReason, String notPendingMessage) {
        assertPending(notPendingMessage);
        this.status       = VacationStatus.REJECTED;
        this.approvedBy   = approver;
        this.approvedAt   = LocalDateTime.now();
        this.rejectReason = rejectReason;
    }

    private void assertPending(String notPendingMessage) {
        if (status != VacationStatus.PENDING) {
            throw new IllegalArgumentException(notPendingMessage);
        }
    }
}
