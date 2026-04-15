package com.kintai.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginAttemptRowResponse {

    private Long attemptId;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime attemptedAt;

    private String loginId;
    /** 社員が特定できた場合のみ（一覧の職員名・所属用） */
    private String employeeName;
    private String department;
    private boolean success;
    private String failureCode;
    private Long employeeId;
    private String ipAddress;
}
