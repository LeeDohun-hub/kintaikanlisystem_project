package com.kintai.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RegisterRequest {

    @NotBlank(message = "직원 코드를 입력하세요.")
    @Size(max = 20, message = "직원 코드는 20자 이하입니다.")
    private String employeeCode;

    @NotBlank(message = "이름을 입력하세요.")
    @Size(max = 50, message = "이름은 50자 이하입니다.")
    private String name;

    @Size(max = 50, message = "소속은 50자 이하입니다.")
    private String department;

    @DecimalMin(value = "0.0", inclusive = true, message = "시급은 0 이상이어야 합니다.")
    @DecimalMax(value = "999999.99", message = "시급이 너무 큽니다.")
    private BigDecimal hourlyCost;

    @NotBlank(message = "비밀번호를 입력하세요.")
    @Size(min = 4, max = 100, message = "비밀번호는 4~100자입니다.")
    private String password;

    @NotBlank(message = "비밀번호 확인을 입력하세요.")
    private String confirmPassword;
}
