package com.kintai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "직원 코드를 입력해 주세요.")
    @Size(max = 20, message = "직원 코드는 20자 이하여야 합니다.")
    private String employeeCode;

    @NotBlank(message = "이름을 입력해 주세요.")
    @Size(max = 100, message = "이름은 100자 이하여야 합니다.")
    private String name;

    @NotBlank(message = "비밀번호를 입력해 주세요.")
    @Size(min = 4, max = 100, message = "비밀번호는 4자 이상 100자 이하여야 합니다.")
    private String password;

    /** 선택. 빈 값은 무시합니다. */
    @Size(max = 100, message = "이메일은 100자 이하여야 합니다.")
    private String email;
}
