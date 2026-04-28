package com.kintai.auth;

/**
 * ログイン失敗時に login_attempt.failure_code に保存する値。
 */
public enum LoginFailureCode {
    BLANK_LOGIN_ID,
    UNKNOWN_LOGIN_ID,
    ACCOUNT_INACTIVE,
    BAD_PASSWORD,
    ROLE_MISMATCH,
    INVALID_TOTP
}
