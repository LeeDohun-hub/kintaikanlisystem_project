package com.kintai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "직원 코드를 입력하세요.")
    @Size(max = 32, message = "직원 코드는 32자 이하입니다.")
    private String employeeCode;

    @NotBlank(message = "이름을 입력하세요.")
    @Size(max = 100, message = "이름은 100자 이하입니다.")
    private String name;

    @NotBlank(message = "비밀번호를 입력하세요.")
    @Size(min = 4, max = 100, message = "비밀번호는 4~100자입니다.")
    private String password;

    @NotBlank(message = "비밀번호 확인을 입력하세요.")
    private String confirmPassword;
}
