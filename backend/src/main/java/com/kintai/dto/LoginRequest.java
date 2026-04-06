package com.kintai.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String employeeCode;
    private String password;
}
