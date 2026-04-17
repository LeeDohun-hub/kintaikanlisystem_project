package com.kintai.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class VacationSubmitRequest {
    /** FULL | HALF_AM | HALF_PM */
    private String vacationType;
    private LocalDate vacationDate;
    /** 申請理由（任意） */
    private String reason;
}
