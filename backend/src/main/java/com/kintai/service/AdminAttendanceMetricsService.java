package com.kintai.service;

import com.kintai.dto.AdminAttendanceMetricsMonthlySummary;
import com.kintai.dto.AdminAttendanceMetricsResponse;
import com.kintai.dto.AdminAttendanceMetricsRow;
import com.kintai.entity.Employee;
import com.kintai.entity.WorkTime;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.WorkTimeRepository;
import com.kintai.util.AttendanceMetricsCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminAttendanceMetricsService {

    private static final int DEFAULT_STANDARD_MONTHLY_MINUTES = 9600;

    private final WorkTimeRepository workTimeRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional(readOnly = true)
    public AdminAttendanceMetricsResponse build(String month, Long employeeId, Integer standardMonthlyMinutes) {
        int std = standardMonthlyMinutes != null ? standardMonthlyMinutes : DEFAULT_STANDARD_MONTHLY_MINUTES;
        if (std <= 0) {
            throw new IllegalArgumentException("standardMonthlyMinutes は正の整数である必要があります。");
        }
        YearMonth ym = YearMonth.parse(month);
        var from = ym.atDay(1);
        var to = ym.atEndOfMonth();

        List<WorkTime> list = employeeId != null
                ? workTimeRepository.findForEmployeeMonth(employeeId, from, to)
                : workTimeRepository.findForMonth(from, to);

        Map<Long, Employee> empCache = new HashMap<>();
        List<AdminAttendanceMetricsRow> rows = new ArrayList<>();
        int totalWork = 0;
        int totalOvertime = 0;
        int totalHolidayWork = 0;
        int totalNight = 0;

        for (WorkTime w : list) {
            LocalDateTime clockIn = AttendanceMetricsCalculator.clockIn(w.getWorkDate(), w.getStartTime());
            LocalDateTime clockOut = AttendanceMetricsCalculator.clockOut(
                    w.getWorkDate(), w.getStartTime(), w.getEndTime());
            int br = w.getBreakMinutes() != null ? w.getBreakMinutes() : 0;
            boolean isHol = w.isHoliday() || isWeekend(w.getWorkDate());
            int workM = AttendanceMetricsCalculator.workMinutes(clockIn, clockOut, br);
            int ot = AttendanceMetricsCalculator.overtimeMinutes(workM);
            int hw = AttendanceMetricsCalculator.holidayWorkMinutes(isHol, workM);
            int nw = AttendanceMetricsCalculator.nightWorkMinutes(clockIn, clockOut);
            double fpDay = AttendanceMetricsCalculator.fatiguePointsDaily(ot, hw, nw);
            double idxDay = AttendanceMetricsCalculator.fatigueIndex(fpDay, std);

            Employee e = empCache.computeIfAbsent(w.getEmployeeId(), id -> employeeRepository.findById(id).orElse(null));

            rows.add(AdminAttendanceMetricsRow.builder()
                    .workId(w.getWorkId())
                    .employeeId(w.getEmployeeId())
                    .employeeCode(e != null ? e.getEmployeeCode() : null)
                    .employeeName(e != null ? e.getEmployeeName() : null)
                    .workDate(w.getWorkDate())
                    .holiday(isHol)
                    .startTime(w.getStartTime())
                    .endTime(w.getEndTime())
                    .clockIn(clockIn)
                    .clockOut(clockOut)
                    .breakMinutes(br)
                    .workMinutes(workM)
                    .overtimeMinutes(ot)
                    .holidayWorkMinutes(hw)
                    .nightWorkMinutes(nw)
                    .fatiguePointsDaily(round4(fpDay))
                    .fatigueIndexDaily(round4(idxDay))
                    .build());

            totalWork += workM;
            totalOvertime += ot;
            totalHolidayWork += hw;
            totalNight += nw;
        }

        double fpMonth = AttendanceMetricsCalculator.fatiguePointsMonthly(
                totalOvertime, totalHolidayWork, totalNight);
        double idxMonth = AttendanceMetricsCalculator.fatigueIndex(fpMonth, std);

        AdminAttendanceMetricsMonthlySummary summary = AdminAttendanceMetricsMonthlySummary.builder()
                .totalWorkMinutes(totalWork)
                .totalOvertimeMinutes(totalOvertime)
                .totalHolidayWorkMinutes(totalHolidayWork)
                .totalNightWorkMinutes(totalNight)
                .fatiguePointsMonthly(round4(fpMonth))
                .fatigueIndexMonthly(round4(idxMonth))
                .build();

        return AdminAttendanceMetricsResponse.builder()
                .month(month)
                .standardMonthlyMinutes(std)
                .rows(rows)
                .summary(summary)
                .build();
    }

    private static double round4(double v) {
        return Math.round(v * 10000.0) / 10000.0;
    }

    private static boolean isWeekend(java.time.LocalDate d) {
        if (d == null) return false;
        DayOfWeek w = d.getDayOfWeek();
        return w == DayOfWeek.SATURDAY || w == DayOfWeek.SUNDAY;
    }
}
