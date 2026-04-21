package com.kintai.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class VacationSubmitRequest {
    /** FULL | HALF_AM | HALF_PM */
    private String vacationType;
    /**
     * 単日申請の場合に使用（互換用）。
     * 新仕様では vacationStartDate / vacationEndDate を推奨。
     */
    private LocalDate vacationDate;

    /** 区間申請: 開始日（含む） */
    private LocalDate vacationStartDate;
    /** 区間申請: 終了日（含む） */
    private LocalDate vacationEndDate;
    /** 申請理由（任意） */
    private String reason;
}
