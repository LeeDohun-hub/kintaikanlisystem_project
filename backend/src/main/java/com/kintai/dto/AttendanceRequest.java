package com.kintai.dto;

import com.kintai.entity.Attendance.WorkType;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class AttendanceRequest {
    private Long employeeId; // 관리자가 특정 직원 지정 시 사용
    private LocalDate workDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer breakMinutes;
    private WorkType workType;
    private String comment;
    private Long projectId;
}
