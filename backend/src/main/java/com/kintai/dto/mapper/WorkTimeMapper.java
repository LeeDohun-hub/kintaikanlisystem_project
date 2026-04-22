package com.kintai.dto.mapper;

import com.kintai.dto.WorkTimeResponse;
import com.kintai.entity.Employee;
import com.kintai.entity.WorkTime;
import com.kintai.util.WorkTimeFormatUtil;

public final class WorkTimeMapper {

    private WorkTimeMapper() {}

    public static WorkTimeResponse toResponse(WorkTime w, Employee emp, int cumulativeMinutesInMonth) {
        if (w == null) {
            return null;
        }
        int daily = w.getWorkMinutes() != null ? w.getWorkMinutes() : 0;
        return WorkTimeResponse.builder()
                .workId(w.getWorkId())
                .employeeId(w.getEmployeeId())
                .employeeCode(emp != null ? emp.getEmployeeCode() : null)
                .employeeName(emp != null ? emp.getEmployeeName() : null)
                .workDate(w.getWorkDate())
                .startTime(w.getStartTime())
                .endTime(w.getEndTime())
                .breakMinutes(w.getBreakMinutes())
                .isHoliday(w.isHoliday())
                .workMinutes(daily)
                .dailyWorkHm(WorkTimeFormatUtil.minutesToHm(daily))
                .cumulativeWorkHm(WorkTimeFormatUtil.minutesToHm(cumulativeMinutesInMonth))
                .remarks(w.getRemarks())
                .build();
    }
}
