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

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
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
        if (workTimeRepository.existsByEmployeeIdAndWorkDate(userId, req.getWorkDate())) {
            throw new IllegalArgumentException("기존에 중복된 근무일자 데이터가 있습니다.");
        }
        int breakMins = req.getBreakMinutes() != null ? req.getBreakMinutes() : 0;
        if (breakMins < 0 || breakMins > 24 * 60) {
            throw new IllegalArgumentException("휴식 시간(분)이 올바르지 않습니다.");
        }
        if (!req.getStartTime().isBefore(req.getEndTime())) {
            throw new IllegalArgumentException("시작 시각은 종료 시각보다 이전이어야 합니다.");
        }
        int workMins = computeWorkMinutes(req.getStartTime(), req.getEndTime(), breakMins);
        String remarks = req.getRemarks() != null ? req.getRemarks().trim() : null;
        if (remarks != null && remarks.isEmpty()) {
            remarks = null;
        }
        WorkTime entity = WorkTime.builder()
                .employeeId(userId)
                .workDate(req.getWorkDate())
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .breakMinutes(breakMins)
                .workMinutes(workMins)
                .remarks(remarks)
                .build();
        workTimeRepository.saveAndFlush(entity);
        WorkTime persisted = workTimeRepository.findById(entity.getWorkId()).orElse(entity);
        Employee emp = employeeRepository.findById(userId).orElse(null);
        int cumulative = cumulativeMinutesThrough(userId, persisted);
        return WorkTimeMapper.toResponse(persisted, emp, cumulative);
    }

    @Transactional
    public WorkTimeResponse update(Long ownerEmployeeId, Long workId, WorkTimeCreateRequest req) {
        if (req.getWorkDate() == null || req.getStartTime() == null || req.getEndTime() == null) {
            throw new IllegalArgumentException("근무일, 시작·종료 시각은 필수입니다.");
        }
        WorkTime w = loadOwnedOrThrow(workId, ownerEmployeeId);
        if (workTimeRepository.existsByEmployeeIdAndWorkDateAndWorkIdNot(ownerEmployeeId, req.getWorkDate(), workId)) {
            throw new IllegalArgumentException("기존에 중복된 근무일자 데이터가 있습니다.");
        }
        int breakMins = req.getBreakMinutes() != null ? req.getBreakMinutes() : 0;
        if (breakMins < 0 || breakMins > 24 * 60) {
            throw new IllegalArgumentException("휴식 시간(분)이 올바르지 않습니다.");
        }
        if (!req.getStartTime().isBefore(req.getEndTime())) {
            throw new IllegalArgumentException("시작 시각은 종료 시각보다 이전이어야 합니다.");
        }
        int workMins = computeWorkMinutes(req.getStartTime(), req.getEndTime(), breakMins);
        String remarks = req.getRemarks() != null ? req.getRemarks().trim() : null;
        if (remarks != null && remarks.isEmpty()) {
            remarks = null;
        }
        w.setWorkDate(req.getWorkDate());
        w.setStartTime(req.getStartTime());
        w.setEndTime(req.getEndTime());
        w.setBreakMinutes(breakMins);
        w.setWorkMinutes(workMins);
        w.setRemarks(remarks);
        workTimeRepository.saveAndFlush(w);
        WorkTime persisted = workTimeRepository.findById(w.getWorkId()).orElse(w);
        Employee emp = employeeRepository.findById(ownerEmployeeId).orElse(null);
        int cumulative = cumulativeMinutesThrough(ownerEmployeeId, persisted);
        return WorkTimeMapper.toResponse(persisted, emp, cumulative);
    }

    @Transactional
    public void delete(Long ownerEmployeeId, Long workId) {
        WorkTime w = loadOwnedOrThrow(workId, ownerEmployeeId);
        workTimeRepository.delete(w);
    }

    private WorkTime loadOwnedOrThrow(Long workId, Long ownerEmployeeId) {
        WorkTime w = workTimeRepository.findById(workId)
                .orElseThrow(() -> new IllegalArgumentException("근무 기록을 찾을 수 없습니다."));
        if (!w.getEmployeeId().equals(ownerEmployeeId)) {
            throw new IllegalArgumentException("본인의 근무 기록만 변경할 수 있습니다.");
        }
        return w;
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

        List<WorkTime> ordered = new ArrayList<>(list);
        ordered.sort(Comparator
                .comparing(WorkTime::getWorkDate)
                .thenComparing(WorkTime::getEmployeeId)
                .thenComparing(WorkTime::getStartTime)
                .thenComparing(w -> w.getWorkId() != null ? w.getWorkId() : 0L));

        Map<Long, Integer> cumulativeByEmployee = new HashMap<>();
        List<WorkTimeResponse> out = new ArrayList<>();
        for (WorkTime w : ordered) {
            int daily = w.getWorkMinutes() != null ? w.getWorkMinutes() : 0;
            int cum = cumulativeByEmployee.merge(w.getEmployeeId(), daily, Integer::sum);
            out.add(WorkTimeMapper.toResponse(w, empMap.get(w.getEmployeeId()), cum));
        }
        return out;
    }

    /**
     * 해당 월에서 직원별 누계(분): 동일 정렬 기준으로 현재 행까지 합산.
     */
    private int cumulativeMinutesThrough(Long employeeId, WorkTime current) {
        YearMonth ym = YearMonth.from(current.getWorkDate());
        LocalDate from = ym.atDay(1);
        LocalDate to = ym.atEndOfMonth();
        List<WorkTime> rows = workTimeRepository.findForEmployeeMonth(employeeId, from, to);
        rows.sort(Comparator
                .comparing(WorkTime::getWorkDate)
                .thenComparing(WorkTime::getStartTime)
                .thenComparing(w -> w.getWorkId() != null ? w.getWorkId() : 0L));
        int sum = 0;
        Long targetId = current.getWorkId();
        for (WorkTime w : rows) {
            sum += w.getWorkMinutes() != null ? w.getWorkMinutes() : 0;
            if (targetId != null && targetId.equals(w.getWorkId())) {
                break;
            }
        }
        return sum;
    }

    private static int computeWorkMinutes(LocalTime start, LocalTime end, int breakMinutes) {
        int startM = start.getHour() * 60 + start.getMinute();
        int endM = end.getHour() * 60 + end.getMinute();
        return Math.max(0, endM - startM - breakMinutes);
    }
}
