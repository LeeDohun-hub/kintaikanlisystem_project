package com.kintai.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class EmployeeInviteEmailPatchRequest {

    @NotBlank(message = "メールアドレスを入力してください。")
    @Email(message = "メールアドレスの形式が正しくありません。")
    @Size(max = 254)
    private String inviteEmail;
}
