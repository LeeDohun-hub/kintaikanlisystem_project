package com.kintai.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class EmployeeCreateRequest {

    private String employeeCode;
    private String employeeName;
    private String department;
    /** 招待メール送付先（任意。未登録登録時に保存可） */
    private String inviteEmail;
    private BigDecimal hourlyCost;
    /** 1: 有効, 0: 無効 */
    private Integer activeFlag;

    /** 入社日（年休付与の起算日） */
    private LocalDate hireDate;

    /** ログインID（社員コードとは別。空白不可） */
    private String loginId;
    /** 平文（8桁数字） */
    private String password;
    private String confirmPassword;
    /** ADMIN | EMPLOYEE */
    private String role;
}

