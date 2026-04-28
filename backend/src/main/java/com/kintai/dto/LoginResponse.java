package com.kintai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private Long id;
    private String employeeCode;
    private String name;
    private String role;
    private String status;

    /** true: TOTP コード入力が必要（設定済み） */
    @Builder.Default
    private boolean requireTotp = false;

    /** true: 初回 2FA セットアップが必要（未設定） */
    @Builder.Default
    private boolean requireTotpSetup = false;

    /** requireTotpSetup=true 時のみセット */
    private String setupSecret;
    private String setupQrUri;
    private String setupToken;
}
