package com.kintai.dto;

import lombok.Data;

@Data
public class LoginRequest {
    /** ログインID（社員マスタで登録した値） */
    private String loginId;
    private String password;
    /** ADMIN | EMPLOYEE（ログイン画面のラジオ選択） */
    private String role;
}
