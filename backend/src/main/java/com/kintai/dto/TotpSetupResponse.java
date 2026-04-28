package com.kintai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TotpSetupResponse {
    private String secret;
    private String qrUri;
    /** 有効化 API で同じリクエストに含めるワンタイムトークン */
    private String setupToken;
}
