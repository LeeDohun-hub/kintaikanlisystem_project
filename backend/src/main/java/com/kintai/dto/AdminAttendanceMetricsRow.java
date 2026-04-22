package com.kintai.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 管理者向け勤怠派生指標（1行）。一般社員 API には含めない。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAttendanceMetricsRow {

    private Long workId;
    private Long employeeId;
    private String employeeCode;
    private String employeeName;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate workDate;

    private boolean holiday;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime startTime;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime endTime;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime clockIn;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime clockOut;

    private Integer breakMinutes;

    /** 実働（分）— clock から算出 */
    private Integer workMinutes;

    /** 残業（8h超） */
    private Integer overtimeMinutes;

    /** 休日労働（分）— is_holiday の日の実働 */
    private Integer holidayWorkMinutes;

    /** 深夜労働（22:00–05:00） */
    private Integer nightWorkMinutes;

    /** 日次重み付きポイント（月45h閾値なし） */
    private Double fatiguePointsDaily;

    /** 日次疲労指数 = fatiguePointsDaily / standardMonthlyMinutes * 100 */
    private Double fatigueIndexDaily;
}
