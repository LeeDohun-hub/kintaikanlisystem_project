package com.kintai.service;

import com.kintai.dto.LoginResponse;
import com.kintai.dto.WorkTimeCreateRequest;
import com.kintai.dto.WorkTimeResponse;
import com.kintai.dto.mapper.WorkTimeMapper;
import com.kintai.entity.Employee;
import com.kintai.entity.WorkTime;
import com.kintai.entity.WorkTimeOuting;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.WorkTimeRepository;
import com.kintai.repository.WorkTimeOutingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
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
    private final WorkTimeOutingRepository workTimeOutingRepository;

    @Transactional
    public WorkTimeResponse create(Long userId, WorkTimeCreateRequest req) {
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
        validateOutingAgainstWork(req.getStartTime(), req.getEndTime(), req.getOutingStartTime(), req.getOutingEndTime());
        String remarks = req.getRemarks() != null ? req.getRemarks().trim() : null;
        if (remarks != null && remarks.isEmpty()) {
            remarks = null;
        }

        // 同一勤務日の2回目以降の保存を許可（上書き + 外出区間は追加）
        WorkTime persisted = workTimeRepository.findFirstByEmployeeIdAndWorkDateOrderByWorkIdAsc(userId, req.getWorkDate())
                .orElseGet(() -> WorkTime.builder()
                        .employeeId(userId)
                        .workDate(req.getWorkDate())
                        .build());

        persisted.setHoliday(Boolean.TRUE.equals(req.getIsHoliday()));
        persisted.setStartTime(req.getStartTime());
        persisted.setEndTime(req.getEndTime());
        persisted.setBreakMinutes(breakMins);
        persisted.setRemarks(remarks);

        // 互換用: 最後に入力された外出時刻は work_time にも保持（表示/編集用途）
        persisted.setOutingStartTime(req.getOutingStartTime());
        persisted.setOutingEndTime(req.getOutingEndTime());

        // work_minutes は NOT NULL のため初回 flush 前に仮算出（work_id 未取得時はリクエスト単一区間のみ）
        int outingBeforeFlush = persisted.getWorkId() == null
                ? outingMinutesFromSingleInterval(req.getOutingStartTime(), req.getOutingEndTime())
                : totalOutingMinutes(persisted);
        persisted.setWorkMinutes(computeWorkMinutes(req.getStartTime(), req.getEndTime(), breakMins, outingBeforeFlush));

        workTimeRepository.saveAndFlush(persisted);

        // 外出区間（開始・終了が揃っている場合のみ）を追加
        if (req.getOutingStartTime() != null && req.getOutingEndTime() != null) {
            appendOutingSegment(persisted, req.getOutingStartTime(), req.getOutingEndTime());
        }

        // 外出合計を控除して実働を再計算
        int outingMinutes = totalOutingMinutes(persisted);
        int workMins = computeWorkMinutes(req.getStartTime(), req.getEndTime(), breakMins, outingMinutes);
        persisted.setWorkMinutes(workMins);
        workTimeRepository.saveAndFlush(persisted);

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

                validateOutingAgainstWork(
                        req.getStartTime(), req.getEndTime(), req.getOutingStartTime(), req.getOutingEndTime());

                String remarks = req.getRemarks() != null ? req.getRemarks().trim() : null;
                if (remarks != null && remarks.isEmpty()) {
                    remarks = null;
                }
                if (remarks != null && remarks.length() > 500) {
                    throw new IllegalArgumentException("備考は500文字以下です。");
                }

                int outingMinutesForCompute = 0;

                var existing = workTimeRepository.findFirstByEmployeeIdAndWorkDateOrderByWorkIdAsc(userId, req.getWorkDate());
                if (existing.isPresent()) {
                    if (!overwriteExisting) {
                        throw new IllegalArgumentException("同一勤務日のデータが既に登録されています。");
                    }
                    WorkTime w = existing.get();
                    w.setHoliday(Boolean.TRUE.equals(req.getIsHoliday()));
                    w.setStartTime(req.getStartTime());
                    w.setEndTime(req.getEndTime());
                    w.setOutingStartTime(req.getOutingStartTime());
                    w.setOutingEndTime(req.getOutingEndTime());
                    w.setBreakMinutes(breakMins);
                    w.setRemarks(remarks);
                    // bulk は「上書き」扱い: その日の外出区間を入れ替える
                    workTimeOutingRepository.deleteByWorkId(w.getWorkId());
                    if (req.getOutingStartTime() != null && req.getOutingEndTime() != null) {
                        appendOutingSegment(w, req.getOutingStartTime(), req.getOutingEndTime());
                    }
                    outingMinutesForCompute = totalOutingMinutes(w);
                    w.setWorkMinutes(computeWorkMinutes(req.getStartTime(), req.getEndTime(), breakMins, outingMinutesForCompute));
                    updated++;
                } else {
                    // work_minutes は NOT NULL のため初回 INSERT 前に仮算出（create() と同様、work_id 未取得時は単一区間のみ控除）
                    int outingBeforeFlush = outingMinutesFromSingleInterval(req.getOutingStartTime(), req.getOutingEndTime());
                    int initialWorkMins = computeWorkMinutes(req.getStartTime(), req.getEndTime(), breakMins, outingBeforeFlush);
                    WorkTime newEntity = WorkTime.builder()
                            .employeeId(userId)
                            .workDate(req.getWorkDate())
                            .isHoliday(Boolean.TRUE.equals(req.getIsHoliday()))
                            .startTime(req.getStartTime())
                            .endTime(req.getEndTime())
                            .outingStartTime(req.getOutingStartTime())
                            .outingEndTime(req.getOutingEndTime())
                            .breakMinutes(breakMins)
                            .workMinutes(initialWorkMins)
                            .remarks(remarks)
                            .build();
                    // insert は flush 後に work_id が必要（外出区間 FK）
                    toInsert.add(newEntity);
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
            workTimeRepository.flush();
            // insert 行の外出区間を作成 & 実働を再計算
            for (WorkTime w : toInsert) {
                if (w.getWorkId() == null) continue;
                if (w.getOutingStartTime() != null && w.getOutingEndTime() != null) {
                    appendOutingSegment(w, w.getOutingStartTime(), w.getOutingEndTime());
                }
                int outingMinutes = totalOutingMinutes(w);
                int workMins = computeWorkMinutes(w.getStartTime(), w.getEndTime(), w.getBreakMinutes() != null ? w.getBreakMinutes() : 0, outingMinutes);
                w.setWorkMinutes(workMins);
            }
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
        validateOutingAgainstWork(req.getStartTime(), req.getEndTime(), req.getOutingStartTime(), req.getOutingEndTime());
        String remarks = req.getRemarks() != null ? req.getRemarks().trim() : null;
        if (remarks != null && remarks.isEmpty()) {
            remarks = null;
        }
        w.setWorkDate(req.getWorkDate());
        w.setHoliday(Boolean.TRUE.equals(req.getIsHoliday()));
        w.setStartTime(req.getStartTime());
        w.setEndTime(req.getEndTime());
        w.setOutingStartTime(req.getOutingStartTime());
        w.setOutingEndTime(req.getOutingEndTime());
        w.setBreakMinutes(breakMins);
        w.setRemarks(remarks);
        workTimeRepository.saveAndFlush(w);

        // update は「上書き」扱い: その日の外出区間を入れ替える
        workTimeOutingRepository.deleteByWorkId(w.getWorkId());
        if (req.getOutingStartTime() != null && req.getOutingEndTime() != null) {
            appendOutingSegment(w, req.getOutingStartTime(), req.getOutingEndTime());
        }
        int outingMinutes = totalOutingMinutes(w);
        w.setWorkMinutes(computeWorkMinutes(req.getStartTime(), req.getEndTime(), breakMins, outingMinutes));
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

    private static int outingMinutesFromSingleInterval(LocalTime outingStart, LocalTime outingEnd) {
        if (outingStart != null && outingEnd != null && outingEnd.isAfter(outingStart)) {
            return (int) Duration.between(outingStart, outingEnd).toMinutes();
        }
        return 0;
    }

    private static int computeWorkMinutes(
            LocalTime start, LocalTime end, int breakMinutes, int outingMinutes) {
        int gross = (int) Duration.between(start, end).toMinutes();
        int br = Math.max(0, breakMinutes);
        int out = Math.max(0, outingMinutes);
        return Math.max(0, gross - br - out);
    }

    /**
     * 外出は勤務開始・終了の範囲内。
     */
    private static void validateOutingAgainstWork(
            LocalTime workStart, LocalTime workEnd, LocalTime outingStart, LocalTime outingEnd) {
        if (outingStart == null && outingEnd == null) {
            return;
        }
        if (outingEnd != null && outingStart == null) {
            throw new IllegalArgumentException("外出開始時刻を入力してください。");
        }
        if (outingStart != null && outingEnd == null) {
            if (outingStart.isBefore(workStart) || !outingStart.isBefore(workEnd)) {
                throw new IllegalArgumentException("外出開始は勤務開始より後かつ勤務終了より前である必要があります。");
            }
            return;
        }
        if (!outingStart.isBefore(outingEnd)) {
            throw new IllegalArgumentException("外出開始は外出終了より前である必要があります。");
        }
        if (outingStart.isBefore(workStart) || outingEnd.isAfter(workEnd)) {
            throw new IllegalArgumentException("外出時間は勤務開始・終了の範囲内で入力してください。");
        }
    }

    private void appendOutingSegment(WorkTime workTime, LocalTime outingStart, LocalTime outingEnd) {
        if (workTime == null || workTime.getWorkId() == null) {
            return;
        }
        if (outingStart == null || outingEnd == null) {
            return;
        }
        if (!outingStart.isBefore(outingEnd)) {
            throw new IllegalArgumentException("外出開始は外出終了より前である必要があります。");
        }
        // 既存と同一の区間は二重登録しない（連打/再保存対策）
        boolean exists = workTimeOutingRepository.existsByWorkIdAndStartTimeAndEndTime(
                workTime.getWorkId(), outingStart, outingEnd);
        if (exists) {
            return;
        }
        workTimeOutingRepository.save(WorkTimeOuting.builder()
                .workId(workTime.getWorkId())
                .startTime(outingStart)
                .endTime(outingEnd)
                .build());
    }

    private int totalOutingMinutes(WorkTime w) {
        if (w == null || w.getWorkId() == null) {
            return 0;
        }
        long sum = workTimeOutingRepository.sumOutingMinutesByWorkId(w.getWorkId());
        int fromSegments = (int) Math.min(Integer.MAX_VALUE, Math.max(0, sum));
        if (fromSegments > 0) {
            return fromSegments;
        }
        // 互換: 区間テーブルが空の既存データは work_time の単一区間から計算
        if (w.getOutingStartTime() != null && w.getOutingEndTime() != null && w.getOutingEndTime().isAfter(w.getOutingStartTime())) {
            return (int) Duration.between(w.getOutingStartTime(), w.getOutingEndTime()).toMinutes();
        }
        return 0;
    }
}
