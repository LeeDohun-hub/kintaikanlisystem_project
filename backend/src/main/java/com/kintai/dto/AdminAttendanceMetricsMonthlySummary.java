package com.kintai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAttendanceMetricsMonthlySummary {

    private Integer totalWorkMinutes;
    private Integer totalOvertimeMinutes;
    private Integer totalHolidayWorkMinutes;
    private Integer totalNightWorkMinutes;

    /** 月次疲労ポイント（残業合計に45h超過ペナルティを含む） */
    private Double fatiguePointsMonthly;

    /** 月次疲労指数 */
    private Double fatigueIndexMonthly;
}
