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
    private String vacationType;   // FULL | HALF_AM | HALF_PM
    private LocalDate vacationDate;
    private String reason;
    private String status;         // PENDING | APPROVED | REJECTED
    private Long approvedById;
    private String approvedByName;
    private LocalDateTime approvedAt;
    private String rejectReason;
    private LocalDateTime createdAt;
}
