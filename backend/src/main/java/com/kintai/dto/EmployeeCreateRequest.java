package com.kintai.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class EmployeeCreateRequest {

    private String employeeCode;
    private String employeeName;
    private String department;
    private BigDecimal hourlyCost;
    /** 1: 유효, 0: 무효 */
    private Integer activeFlag;
}

