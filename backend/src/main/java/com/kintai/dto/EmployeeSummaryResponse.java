package com.kintai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeSummaryResponse {

    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private String department;
    /** 招待メール送付先（未登録者向け） */
    private String inviteEmail;
    private BigDecimal hourlyCost;
    private Integer activeFlag;
    private LocalDate hireDate;

    private String loginId;
    private String role;
    private String photoFilename;
}
