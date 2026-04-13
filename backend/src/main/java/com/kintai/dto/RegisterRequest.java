package com.kintai.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RegisterRequest {

    @NotBlank(message = "社員コードを入力してください。")
    @Size(max = 20, message = "社員コードは20文字以下です。")
    private String employeeCode;

    @NotBlank(message = "氏名を入力してください。")
    @Size(max = 50, message = "氏名は50文字以下です。")
    private String name;

    @Size(max = 50, message = "所属は50文字以下です。")
    private String department;

    @DecimalMin(value = "0.0", inclusive = true, message = "時給は0以上である必要があります。")
    @DecimalMax(value = "999999.99", message = "時給が大きすぎます。")
    private BigDecimal hourlyCost;

    /** ADMIN | EMPLOYEE */
    @NotBlank(message = "区分を選択してください。")
    private String role;

    @NotBlank(message = "パスワードを入力してください。")
    @Size(min = 4, max = 100, message = "パスワードは4〜100文字です。")
    private String password;

    @NotBlank(message = "パスワード（確認）を入力してください。")
    private String confirmPassword;
}
