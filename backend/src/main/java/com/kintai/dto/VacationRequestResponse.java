package com.kintai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VacationRequestResponse {
    private Long requestId;
    private Long employeeId;
    private String employeeName;
    private String vacationType;
    private LocalDate vacationDate;
    private String reason;
    private String status;
    private Long approvedById;
    private String approvedByName;
    private LocalDateTime approvedAt;
    private String rejectReason;
    private LocalDateTime createdAt;
    private boolean hasAttachment;
    private String attachmentName;

    /** 遡及申請かどうか */
    private boolean retroactive;
    /** 遡及申請の事由 */
    private String retroReason;
    /** 証明書の提出期限（APPROVED_PENDING_PROOF の場合に設定） */
    private LocalDate proofDueDate;
    /** 管理者代理申請かどうか */
    private boolean proxy;
    /** 代理申請した管理者名 */
    private String proxySubmitterName;
}
