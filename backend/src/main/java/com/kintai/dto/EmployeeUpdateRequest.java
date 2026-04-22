package com.kintai.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 従業員マスター更新用。パスワード・確認は未入力のときは変更しません。
 */
@Data
public class EmployeeUpdateRequest {

    private String employeeCode;
    private String employeeName;
    private String department;
    private String inviteEmail;
    private BigDecimal hourlyCost;
    private Integer activeFlag;

    /** 入社日（年休付与の起算日） */
    private LocalDate hireDate;

    private String loginId;
    private String password;
    private String confirmPassword;
    private String role;
}
