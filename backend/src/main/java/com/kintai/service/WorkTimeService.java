package com.kintai.service;

import com.kintai.dto.LoginResponse;
import com.kintai.dto.WorkTimeCreateRequest;
import com.kintai.dto.WorkTimeResponse;
import com.kintai.dto.mapper.WorkTimeMapper;
import com.kintai.entity.Employee;
import com.kintai.entity.WorkTime;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.WorkTimeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkTimeService {

    private final WorkTimeRepository workTimeRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional
    public WorkTimeResponse create(Long userId, WorkTimeCreateRequest req) {
        if (req.getWorkDate() == null || req.getStartTime() == null || req.getEndTime() == null) {
            throw new IllegalArgumentException("근무일, 시작·종료 시각은 필수입니다.");
        }
        int breakMins = req.getBreakMinutes() != null ? req.getBreakMinutes() : 0;
        if (breakMins < 0 || breakMins > 24 * 60) {
            throw new IllegalArgumentException("휴식 시간(분)이 올바르지 않습니다.");
        }
        int workMins = computeWorkMinutes(req.getStartTime(), req.getEndTime(), breakMins);
        WorkTime entity = WorkTime.builder()
                .employeeId(userId)
                .workDate(req.getWorkDate())
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .breakMinutes(breakMins)
                .workMinutes(workMins)
                .build();
        workTimeRepository.save(entity);
        Employee emp = employeeRepository.findById(userId).orElse(null);
        return WorkTimeMapper.toResponse(entity, emp);
    }

    public List<WorkTimeResponse> listByMonth(String month, LoginResponse user) {
        YearMonth yearMonth = YearMonth.parse(month);
        var from = yearMonth.atDay(1);
        var to = yearMonth.atEndOfMonth();

        List<WorkTime> list;
        if ("ADMIN".equals(user.getRole())) {
            list = workTimeRepository.findForMonth(from, to);
        } else {
            list = workTimeRepository.findForEmployeeMonth(user.getId(), from, to);
        }

        Set<Long> empIds = list.stream().map(WorkTime::getEmployeeId).collect(Collectors.toSet());
        Map<Long, Employee> empMap = employeeRepository.findAllById(empIds).stream()
                .collect(Collectors.toMap(Employee::getEmployeeId, e -> e, (a, b) -> a));

        return list.stream()
                .map(w -> WorkTimeMapper.toResponse(w, empMap.get(w.getEmployeeId())))
                .collect(Collectors.toList());
    }

    private static int computeWorkMinutes(LocalTime start, LocalTime end, int breakMinutes) {
        int startM = start.getHour() * 60 + start.getMinute();
        int endM = end.getHour() * 60 + end.getMinute();
        return Math.max(0, endM - startM - breakMinutes);
    }
}
