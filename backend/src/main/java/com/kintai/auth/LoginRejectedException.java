package com.kintai.auth;

import lombok.Getter;

@Getter
public class LoginRejectedException extends RuntimeException {

    private final LoginFailureCode failureCode;
    private final Long employeeId;

    public LoginRejectedException(LoginFailureCode failureCode, Long employeeId) {
        super(failureCode.name());
        this.failureCode = failureCode;
        this.employeeId = employeeId;
    }
}
