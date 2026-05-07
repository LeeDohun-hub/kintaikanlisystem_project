package com.kintai.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class VacationProxySubmitRequest {
    /** 申請対象の社員ID */
    private Long employeeId;
    private String vacationType;
    private LocalDate vacationDate;
    private LocalDate vacationStartDate;
    private LocalDate vacationEndDate;
    private String reason;
    private String retroReason;
}
