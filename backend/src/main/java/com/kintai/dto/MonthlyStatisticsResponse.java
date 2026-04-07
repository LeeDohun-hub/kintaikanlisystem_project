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
public class MonthlyStatisticsResponse {

    private String month;
    private long totalWorkMinutes;
    private List<ByEmployee> byEmployee;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ByEmployee {
        private Long employeeId;
        private String employeeCode;
        private String employeeName;
        private int totalWorkMinutes;
    }
}
