package com.kintai.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class WorkTimeResponse {

    /** work_time.work_id */
    private Long workId;

    private Long employeeId;
    private String employeeCode;
    private String employeeName;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate workDate;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime startTime;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime endTime;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonFormat(pattern = "HH:mm")
    private LocalTime outingStartTime;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonFormat(pattern = "HH:mm")
    private LocalTime outingEndTime;

    private Integer breakMinutes;

    /** 休日勤務日（管理者用・表示用） */
    private boolean isHoliday;

    /** 日次実労働（分）— 集計・API 互換用 */
    private Integer workMinutes;

    /** 実労働 当日 (H:MM) */
    private String dailyWorkHm;

    /** 実労働 累計 (H:MM, 当該月・社員基準) */
    private String cumulativeWorkHm;

    /** 備考（null のとき JSON でもキーを返しフロントが空欄と区別可能） */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    private String remarks;
}
