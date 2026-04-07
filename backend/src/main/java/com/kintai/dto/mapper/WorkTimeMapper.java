package com.kintai.dto.mapper;

import com.kintai.dto.WorkTimeResponse;
import com.kintai.entity.Employee;
import com.kintai.entity.WorkTime;

public final class WorkTimeMapper {

    private WorkTimeMapper() {}

    public static WorkTimeResponse toResponse(WorkTime w, Employee emp) {
        if (w == null) {
            return null;
        }
        return WorkTimeResponse.builder()
                .workId(w.getWorkId())
                .employeeId(w.getEmployeeId())
                .employeeCode(emp != null ? emp.getEmployeeCode() : null)
                .employeeName(emp != null ? emp.getEmployeeName() : null)
                .workDate(w.getWorkDate())
                .startTime(w.getStartTime())
                .endTime(w.getEndTime())
                .breakMinutes(w.getBreakMinutes())
                .workMinutes(w.getWorkMinutes())
                .build();
    }
}
