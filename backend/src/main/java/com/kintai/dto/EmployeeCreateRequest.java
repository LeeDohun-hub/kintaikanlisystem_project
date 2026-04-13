package com.kintai.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class EmployeeCreateRequest {

    private String employeeCode;
    private String employeeName;
    private String department;
    private BigDecimal hourlyCost;
    /** 1: 有効, 0: 無効 */
    private Integer activeFlag;
}

