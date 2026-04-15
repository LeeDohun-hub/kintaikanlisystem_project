package com.kintai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeSummaryResponse {

    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private String department;
    private BigDecimal hourlyCost;
    private Integer activeFlag;

    private String loginId;
    private String role;
}
