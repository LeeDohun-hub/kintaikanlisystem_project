package com.kintai.service;

import com.kintai.dto.MonthlyStatisticsResponse;
import com.kintai.entity.Employee;
import com.kintai.entity.WorkTime;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.WorkTimeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StatisticsService {

    private final WorkTimeRepository workTimeRepository;
    private final EmployeeRepository employeeRepository;

    public MonthlyStatisticsResponse monthly(String month) {
        YearMonth yearMonth = YearMonth.parse(month);
        var from = yearMonth.atDay(1);
        var to = yearMonth.atEndOfMonth();
        List<WorkTime> rows = workTimeRepository.findForMonth(from, to);

        Map<Long, Integer> sumByEmp = new HashMap<>();
        long total = 0;
        for (WorkTime w : rows) {
            int m = w.getWorkMinutes() != null ? w.getWorkMinutes() : 0;
            sumByEmp.merge(w.getEmployeeId(), m, Integer::sum);
            total += m;
        }

        List<MonthlyStatisticsResponse.ByEmployee> list = new ArrayList<>();
        for (Map.Entry<Long, Integer> e : sumByEmp.entrySet()) {
            Employee emp = employeeRepository.findById(e.getKey()).orElse(null);
            list.add(MonthlyStatisticsResponse.ByEmployee.builder()
                    .employeeId(e.getKey())
                    .employeeCode(emp != null ? emp.getEmployeeCode() : null)
                    .employeeName(emp != null ? emp.getEmployeeName() : null)
                    .totalWorkMinutes(e.getValue())
                    .build());
        }
        list.sort(Comparator.comparing(MonthlyStatisticsResponse.ByEmployee::getEmployeeCode,
                Comparator.nullsLast(String::compareTo)));

        return MonthlyStatisticsResponse.builder()
                .month(month)
                .totalWorkMinutes(total)
                .byEmployee(list)
                .build();
    }

    /** スタッフ用：本人の月次集計 */
    public MonthlyStatisticsResponse monthlyForEmployee(String month, Long employeeId) {
        YearMonth yearMonth = YearMonth.parse(month);
        var from = yearMonth.atDay(1);
        var to = yearMonth.atEndOfMonth();
        List<WorkTime> rows = workTimeRepository.findForEmployeeMonth(employeeId, from, to);

        long total = 0;
        for (WorkTime w : rows) {
            int m = w.getWorkMinutes() != null ? w.getWorkMinutes() : 0;
            total += m;
        }
        Employee emp = employeeRepository.findById(employeeId).orElse(null);
        List<MonthlyStatisticsResponse.ByEmployee> list = new ArrayList<>();
        list.add(MonthlyStatisticsResponse.ByEmployee.builder()
                .employeeId(employeeId)
                .employeeCode(emp != null ? emp.getEmployeeCode() : null)
                .employeeName(emp != null ? emp.getEmployeeName() : null)
                .totalWorkMinutes((int) total)
                .build());
        return MonthlyStatisticsResponse.builder()
                .month(month)
                .totalWorkMinutes(total)
                .byEmployee(list)
                .build();
    }
}
