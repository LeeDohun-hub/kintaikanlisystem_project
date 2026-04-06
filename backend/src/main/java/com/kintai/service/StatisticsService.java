package com.kintai.service;

import com.kintai.entity.Attendance;
import com.kintai.entity.Employee;
import com.kintai.entity.UnitPrice;
import com.kintai.repository.AttendanceRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.UnitPriceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StatisticsService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final UnitPriceRepository unitPriceRepository;

    public Map<String, Object> getMonthlySummary(String month) {
        List<Attendance> all = attendanceRepository.findAllByOrderByWorkDateDesc().stream()
                .filter(a -> a.getWorkDate().toString().startsWith(month))
                .collect(Collectors.toList());

        List<Employee> employees = employeeRepository.findAll().stream()
                .filter(e -> e.getRole() == Employee.Role.EMPLOYEE)
                .collect(Collectors.toList());

        List<Map<String, Object>> employeeStats = new ArrayList<>();
        double grandRevenue = 0;

        for (Employee emp : employees) {
            List<Attendance> empAtt = all.stream()
                    .filter(a -> a.getEmployee().getId().equals(emp.getId()))
                    .collect(Collectors.toList());

            double totalHours = empAtt.stream().mapToDouble(Attendance::getWorkHours).sum();
            totalHours = Math.round(totalHours * 10.0) / 10.0;
            int workDays = empAtt.size();

            // 가동률: 총 근무시간 / (영업일 기준 160h/월) * 100
            double utilizationRate = totalHours > 0 ? Math.round((totalHours / 160.0) * 1000.0) / 10.0 : 0.0;

            Optional<UnitPrice> unitPriceOpt = unitPriceRepository.findByEmployeeIdAndMonth(emp.getId(), month);
            BigDecimal unitPrice = unitPriceOpt.map(UnitPrice::getPrice)
                    .orElse(emp.getUnitPrice() != null ? emp.getUnitPrice() : BigDecimal.ZERO);

            BigDecimal revenue = unitPrice.multiply(BigDecimal.valueOf(totalHours));
            grandRevenue += revenue.doubleValue();

            Map<String, Object> empData = new LinkedHashMap<>();
            empData.put("employeeId", emp.getId());
            empData.put("employeeName", emp.getName());
            empData.put("employeeCode", emp.getEmployeeCode());
            empData.put("workDays", workDays);
            empData.put("totalHours", totalHours);
            empData.put("utilizationRate", utilizationRate);
            empData.put("revenue", revenue);
            employeeStats.add(empData);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("month", month);
        result.put("employees", employeeStats);
        result.put("totalRevenue", grandRevenue);
        return result;
    }
}
