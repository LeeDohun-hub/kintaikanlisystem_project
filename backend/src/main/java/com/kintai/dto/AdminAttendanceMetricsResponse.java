package com.kintai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAttendanceMetricsResponse {

    private String month;
    private Integer standardMonthlyMinutes;
    private List<AdminAttendanceMetricsRow> rows;
    private AdminAttendanceMetricsMonthlySummary summary;
}
