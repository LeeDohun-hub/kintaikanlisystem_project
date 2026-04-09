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

    private Integer breakMinutes;

    /** 일 실근무(분) — 집계·API 호환용 */
    private Integer workMinutes;

    /** 실근무 当日 (H:MM) */
    private String dailyWorkHm;

    /** 실근무 累計 (H:MM, 해당 월·직원 기준) */
    private String cumulativeWorkHm;

    /** 備考 (null 이면 JSON 에서도 키를 내려 프론트가 빈 칸과 구분 가능) */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    private String remarks;
}
