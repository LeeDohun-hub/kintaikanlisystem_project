package com.kintai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class SendMonthlyReportRequest {

    @NotBlank(message = "月は必須です。")
    @Pattern(regexp = "\\d{4}-\\d{2}", message = "月の形式が正しくありません。（YYYY-MM）")
    private String month;
}
