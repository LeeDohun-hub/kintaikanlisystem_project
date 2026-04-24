package com.kintai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryResponse {
    private Long employeeId;
    private String employeeName;
    private String department;
    private String status;
    /** プロフィール写真ありのときファイル名（フロントは /api/employees/{id}/photo を表示） */
    private String photoFilename;
}
