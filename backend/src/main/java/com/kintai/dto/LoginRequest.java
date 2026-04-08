package com.kintai.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String employeeCode;
    private String password;
    /** ADMIN | EMPLOYEE (로그인 화면 라디오 선택) */
    private String role;
}
