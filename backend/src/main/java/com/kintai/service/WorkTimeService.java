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
            throw new IllegalArgumentException("勤務日、開始・終了時刻は必須です。");
        }
        if (workTimeRepository.existsByEmployeeIdAndWorkDate(userId, req.getWorkDate())) {
            throw new IllegalArgumentException("同一勤務日のデータが既に登録されています。");
        }
        int breakMins = req.getBreakMinutes() != null ? req.getBreakMinutes() : 0;
        if (breakMins < 0 || breakMins > 24 * 60) {
            throw new IllegalArgumentException("休憩時間（分）が正しくありません。");
        }
        if (!req.getStartTime().isBefore(req.getEndTime())) {
            throw new IllegalArgumentException("開始時刻は終了時刻より前である必要があります。");
        }
        int workMins = computeWorkMinutes(req.getStartTime(), req.getEndTime(), breakMins);
        String remarks = req.getRemarks() != null ? req.getRemarks().trim() : null;
        if (remarks != null && remarks.isEmpty()) {
            remarks = null;
        }
        WorkTime entity = WorkTime.builder()
                .employeeId(userId)
                .workDate(req.getWorkDate())
                .isHoliday(Boolean.TRUE.equals(req.getIsHoliday()))
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .breakMinutes(breakMins)
                .workMinutes(workMins)
                .remarks(remarks)
                .build();
        workTimeRepository.saveAndFlush(entity);
        WorkTime persisted = workTimeRepository.findById(entity.getWorkId()).orElse(entity);
        Employee emp = employeeRepository.findById(userId).orElse(null);
        int cumulative = cumulativeMinutesForDay(userId, persisted.getWorkDate());
        return WorkTimeMapper.toResponse(persisted, emp, cumulative);
    }

    /**
     * 월간 표 입력(여러 날짜)을 한 번에 반영.
     * - overwriteExisting=true: 동일 날짜가 있으면 업데이트(상書き)
     * - overwriteExisting=false: 동일 날짜가 있으면 에러로 처리
     *
     * 부분 성공을 허용하며, 행별 오류를 수집하여 반환합니다.
     */
    @Transactional
    public com.kintai.dto.ImportAttendanceResponse bulkUpsert(
            Long userId,
            List<WorkTimeCreateRequest> items,
            boolean overwriteExisting
    ) {
        var errors = new ArrayList<com.kintai.dto.ImportAttendanceResponse.RowError>();
        int inserted = 0;
        int updated = 0;

        if (items == null || items.isEmpty()) {
            errors.add(com.kintai.dto.ImportAttendanceResponse.RowError.builder()
                    .row(0)
                    .message("items が空です。")
                    .build());
            return com.kintai.dto.ImportAttendanceResponse.builder()
                    .successCount(0)
                    .errorCount(errors.size())
                    .updatedExistingDays(0)
                    .errors(errors)
                    .build();
        }

        List<WorkTime> toInsert = new ArrayList<>();

        for (int i = 0; i < items.size(); i++) {
            WorkTimeCreateRequest req = items.get(i);
            int rowNo = i + 1; // 1-based
            try {
                if (req == null) {
                    throw new IllegalArgumentException("行データが空です。");
                }
                if (req.getWorkDate() == null || req.getStartTime() == null || req.getEndTime() == null) {
                    throw new IllegalArgumentException("勤務日、開始・終了時刻は必須です。");
                }

                int breakMins = req.getBreakMinutes() != null ? req.getBreakMinutes() : 0;
                if (breakMins < 0 || breakMins > 24 * 60) {
                    throw new IllegalArgumentException("休憩時間（分）が正しくありません。");
                }
                if (!req.getStartTime().isBefore(req.getEndTime())) {
                    throw new IllegalArgumentException("開始時刻は終了時刻より前である必要があります。");
                }

                String remarks = req.getRemarks() != null ? req.getRemarks().trim() : null;
                if (remarks != null && remarks.isEmpty()) {
                    remarks = null;
                }
                if (remarks != null && remarks.length() > 500) {
                    throw new IllegalArgumentException("備考は500文字以下です。");
                }

                int workMins = computeWorkMinutes(req.getStartTime(), req.getEndTime(), breakMins);

                var existing = workTimeRepository.findFirstByEmployeeIdAndWorkDateOrderByWorkIdAsc(userId, req.getWorkDate());
                if (existing.isPresent()) {
                    if (!overwriteExisting) {
                        throw new IllegalArgumentException("同一勤務日のデータが既に登録されています。");
                    }
                    WorkTime w = existing.get();
                    w.setHoliday(Boolean.TRUE.equals(req.getIsHoliday()));
                    w.setStartTime(req.getStartTime());
                    w.setEndTime(req.getEndTime());
                    w.setBreakMinutes(breakMins);
                    w.setWorkMinutes(workMins);
                    w.setRemarks(remarks);
                    updated++;
                } else {
                    toInsert.add(WorkTime.builder()
                            .employeeId(userId)
                            .workDate(req.getWorkDate())
                            .isHoliday(Boolean.TRUE.equals(req.getIsHoliday()))
                            .startTime(req.getStartTime())
                            .endTime(req.getEndTime())
                            .breakMinutes(breakMins)
                            .workMinutes(workMins)
                            .remarks(remarks)
                            .build());
                    inserted++;
                }
            } catch (RuntimeException ex) {
                errors.add(com.kintai.dto.ImportAttendanceResponse.RowError.builder()
                        .row(rowNo)
                        .message(ex.getMessage() != null ? ex.getMessage() : "行処理エラー")
                        .build());
            }
        }

        if (!toInsert.isEmpty()) {
            workTimeRepository.saveAll(toInsert);
        }

        int success = inserted + updated;
        return com.kintai.dto.ImportAttendanceResponse.builder()
                .successCount(success)
                .errorCount(errors.size())
                .updatedExistingDays(updated)
                .errors(errors)
                .build();
    }

    @Transactional
    public WorkTimeResponse update(Long ownerEmployeeId, Long workId, WorkTimeCreateRequest req) {
        if (req.getWorkDate() == null || req.getStartTime() == null || req.getEndTime() == null) {
            throw new IllegalArgumentException("勤務日、開始・終了時刻は必須です。");
        }
        WorkTime w = loadOwnedOrThrow(workId, ownerEmployeeId);
        if (workTimeRepository.existsByEmployeeIdAndWorkDateAndWorkIdNot(ownerEmployeeId, req.getWorkDate(), workId)) {
            throw new IllegalArgumentException("同一勤務日のデータが既に登録されています。");
        }
        int breakMins = req.getBreakMinutes() != null ? req.getBreakMinutes() : 0;
        if (breakMins < 0 || breakMins > 24 * 60) {
            throw new IllegalArgumentException("休憩時間（分）が正しくありません。");
        }
        if (!req.getStartTime().isBefore(req.getEndTime())) {
            throw new IllegalArgumentException("開始時刻は終了時刻より前である必要があります。");
        }
        int workMins = computeWorkMinutes(req.getStartTime(), req.getEndTime(), breakMins);
        String remarks = req.getRemarks() != null ? req.getRemarks().trim() : null;
        if (remarks != null && remarks.isEmpty()) {
            remarks = null;
        }
        w.setWorkDate(req.getWorkDate());
        w.setHoliday(Boolean.TRUE.equals(req.getIsHoliday()));
        w.setStartTime(req.getStartTime());
        w.setEndTime(req.getEndTime());
        w.setBreakMinutes(breakMins);
        w.setWorkMinutes(workMins);
        w.setRemarks(remarks);
        workTimeRepository.saveAndFlush(w);
        WorkTime persisted = workTimeRepository.findById(w.getWorkId()).orElse(w);
        Employee emp = employeeRepository.findById(ownerEmployeeId).orElse(null);
        int cumulative = cumulativeMinutesForDay(ownerEmployeeId, persisted.getWorkDate());
        return WorkTimeMapper.toResponse(persisted, emp, cumulative);
    }

    @Transactional
    public void delete(Long ownerEmployeeId, Long workId) {
        WorkTime w = loadOwnedOrThrow(workId, ownerEmployeeId);
        workTimeRepository.delete(w);
    }

    private WorkTime loadOwnedOrThrow(Long workId, Long ownerEmployeeId) {
        WorkTime w = workTimeRepository.findById(workId)
                .orElseThrow(() -> new IllegalArgumentException("勤務記録が見つかりません。"));
        if (!w.getEmployeeId().equals(ownerEmployeeId)) {
            throw new IllegalArgumentException("本人の勤務記録のみ変更できます。");
        }
        return w;
    }

    public List<WorkTimeResponse> listByMonth(String month, LoginResponse user) {
        return listByMonth(month, user, null);
    }

    /**
     * 管理者用: employeeIdFilter を指定すると、対象社員のみ返します。
     * 一般社員は employeeIdFilter を無視し本人分のみ返します。
     */
    public List<WorkTimeResponse> listByMonth(String month, LoginResponse user, Long employeeIdFilter) {
        YearMonth yearMonth = YearMonth.parse(month);
        var from = yearMonth.atDay(1);
        var to = yearMonth.atEndOfMonth();

        List<WorkTime> list;
        if ("ADMIN".equals(user.getRole())) {
            if (employeeIdFilter != null) {
                list = workTimeRepository.findForEmployeeMonth(employeeIdFilter, from, to);
            } else {
                list = workTimeRepository.findForMonth(from, to);
            }
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
     * PDF 等で特定社員のみ必要な場合に使用。
     */
    public List<WorkTimeResponse> listForEmployeeMonth(String month, Long employeeId) {
        YearMonth yearMonth = YearMonth.parse(month);
        var from = yearMonth.atDay(1);
        var to = yearMonth.atEndOfMonth();
        List<WorkTime> list = workTimeRepository.findForEmployeeMonth(employeeId, from, to);

        Employee emp = employeeRepository.findById(employeeId).orElse(null);
        Map<Long, Integer> cumulativeByEmployee = new HashMap<>();
        List<WorkTimeResponse> out = new ArrayList<>();
        for (WorkTime w : list) {
            int daily = w.getWorkMinutes() != null ? w.getWorkMinutes() : 0;
            int cum = cumulativeByEmployee.merge(employeeId, daily, Integer::sum);
            out.add(WorkTimeMapper.toResponse(w, emp, cum));
        }
        return out;
    }

    private int cumulativeMinutesForDay(Long employeeId, LocalDate workDate) {
        YearMonth ym = YearMonth.from(workDate);
        LocalDate from = ym.atDay(1);
        // 1日1件方針のため、累計は月初〜当該日までの合計で足ります。
        long sum = workTimeRepository.sumWorkMinutes(employeeId, from, workDate);
        return (int) Math.min(Integer.MAX_VALUE, Math.max(0, sum));
    }

    private static int computeWorkMinutes(LocalTime start, LocalTime end, int breakMinutes) {
        int startM = start.getHour() * 60 + start.getMinute();
        int endM = end.getHour() * 60 + end.getMinute();
        return Math.max(0, endM - startM - breakMinutes);
    }
}
