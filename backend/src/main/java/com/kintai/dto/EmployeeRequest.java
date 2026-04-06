package com.kintai.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class EmployeeRequest {
    private String employeeCode;
    private String name;
    private String password;
    private String email;
    private String role;
    private BigDecimal unitPrice;
}
