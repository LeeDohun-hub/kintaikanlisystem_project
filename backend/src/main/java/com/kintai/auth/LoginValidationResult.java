package com.kintai.auth;

import com.kintai.dto.LoginResponse;

public record LoginValidationResult(
        LoginResponse user,
        boolean totpRequired,
        String totpSecret,
        boolean totpSetupRequired
) {}
