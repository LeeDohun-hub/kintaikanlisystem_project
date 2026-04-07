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
    private Integer workMinutes;
}
