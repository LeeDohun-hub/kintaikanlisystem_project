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

    /** ログインID（社員コードとは別。空白不可） */
    private String loginId;
    /** 平文（8桁数字） */
    private String password;
    private String confirmPassword;
    /** ADMIN | EMPLOYEE */
    private String role;
}

