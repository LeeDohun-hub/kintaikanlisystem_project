package com.kintai.dto;

import lombok.Data;

@Data
public class TotpVerifyRequest {
    private String totpCode;
    /** GET /totp/setup で返却されたトークン（推奨。無い場合はセッション属性にフォールバック） */
    private String setupToken;
}
