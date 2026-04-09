package com.kintai.service;

import com.kintai.dto.ImportAttendanceResponse;
import com.kintai.entity.BatchImportHistory;
import com.kintai.entity.Employee;
import com.kintai.entity.WorkTime;
import com.kintai.repository.BatchImportHistoryRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.WorkTimeRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AttendanceImportService {

    private static final Logger log = LoggerFactory.getLogger(AttendanceImportService.class);

    private final EmployeeRepository employeeRepository;
    private final WorkTimeRepository workTimeRepository;
    private final BatchImportHistoryRepository batchImportHistoryRepository;

    /**
     * 713 상세설계 기준:
     * - MultipartFile 수신
     * - Apache POI로 Excel 읽기
     * - 행 단위 검증(직원ID 존재, 날짜/시각, 시작<종료)
     * - DB 일괄 등록
     * - 결과 반환 + batch_import_history 기록
     *
     * 엑셀 포맷(가정, 1행 헤더):
     * A: 社員ID (employee_id 또는 employee_code)
     * B: 勤務日 (YYYY-MM-DD 또는 Excel 날짜)
     * C: 開始時刻 (HH:mm 또는 Excel time)
     * D: 終了時刻 (HH:mm 또는 Excel time)
     * E: 休憩 — 分(整数)、または H:MM (例 1:00)、または Excel の時刻セル
     * F: 備考 (任意)
     */
    @Transactional
    public ImportAttendanceResponse importExcel(MultipartFile file) {
        log.info("[IMPORT] start fileName={}, size={}", file != null ? file.getOriginalFilename() : null, file != null ? file.getSize() : -1);

        List<ImportAttendanceResponse.RowError> errors = new ArrayList<>();
        List<WorkTime> toSave = new ArrayList<>();

        int success = 0;
        int rowNumForMsg = 0;

        try (InputStream in = file.getInputStream(); Workbook wb = WorkbookFactory.create(in)) {
            Sheet sheet = wb.getNumberOfSheets() > 0 ? wb.getSheetAt(0) : null;
            if (sheet == null) {
                throw new IllegalArgumentException("엑셀 시트가 비어 있습니다.");
            }

            int last = sheet.getLastRowNum();
            Set<String> seenInFile = new HashSet<>();
            for (int r = 1; r <= last; r++) { // r=0 header
                Row row = sheet.getRow(r);
                rowNumForMsg = r + 1; // 엑셀 행번호는 1-base
                if (row == null) continue;

                try {
                    ParsedRow parsed = parseRow(row);

                    // 한 직원은 하루 1건만 입력(시간 무관): 파일 내부 + DB 중복 모두 차단
                    String key = parsed.employeeId() + "|" + parsed.workDate();
                    if (!seenInFile.add(key)) {
                        throw new IllegalArgumentException("기존에 중복된 근무일자 데이터가 있습니다.");
                    }
                    if (workTimeRepository.existsByEmployeeIdAndWorkDate(parsed.employeeId(), parsed.workDate())) {
                        throw new IllegalArgumentException("기존에 중복된 근무일자 데이터가 있습니다.");
                    }

                    int workMinutes = computeWorkMinutes(parsed.start(), parsed.end(), parsed.breakMinutes());
                    WorkTime wt = WorkTime.builder()
                            .employeeId(parsed.employeeId())
                            .workDate(parsed.workDate())
                            .startTime(parsed.start())
                            .endTime(parsed.end())
                            .breakMinutes(parsed.breakMinutes())
                            .workMinutes(workMinutes)
                            .remarks(parsed.remarks())
                            .build();
                    toSave.add(wt);
                    success++;
                } catch (RuntimeException ex) {
                    log.warn("[IMPORT] row {} invalid: {}", rowNumForMsg, ex.getMessage());
                    errors.add(ImportAttendanceResponse.RowError.builder()
                            .row(rowNumForMsg)
                            .message(ex.getMessage() != null ? ex.getMessage() : "エラー")
                            .build());
                }
            }

            if (!toSave.isEmpty()) {
                workTimeRepository.saveAll(toSave);
            }
        } catch (Exception ex) {
            // 파일 자체 문제는 전체 실패로 기록
            log.error("[IMPORT] failed", ex);
            errors.add(ImportAttendanceResponse.RowError.builder()
                    .row(rowNumForMsg == 0 ? 0 : rowNumForMsg)
                    .message(ex.getMessage() != null ? ex.getMessage() : "取込失敗")
                    .build());
        }

        int errorCount = errors.size();
        String status = errorCount == 0 ? "SUCCESS" : "ERROR";
        String errMsg = errorCount == 0 ? null : ("errorCount=" + errorCount);

        batchImportHistoryRepository.save(BatchImportHistory.builder()
                .fileName(file != null ? safeFileName(file.getOriginalFilename()) : "unknown")
                .status(status)
                .errorMessage(errMsg)
                .build());

        log.info("[IMPORT] end success={}, errors={}", success, errorCount);
        return ImportAttendanceResponse.builder()
                .successCount(success)
                .errorCount(errorCount)
                .errors(errors)
                .build();
    }

    private record ParsedRow(Long employeeId, LocalDate workDate, LocalTime start, LocalTime end, int breakMinutes, String remarks) {}

    private ParsedRow parseRow(Row row) {
        Long employeeId = resolveEmployeeId(readCellString(row, 0));
        if (employeeId == null) {
            throw new IllegalArgumentException("社員ID不正");
        }
        LocalDate workDate = readCellDate(row, 1);
        LocalTime start = readCellTime(row, 2);
        LocalTime end = readCellTime(row, 3);
        int breakMinutes = readBreakMinutes(row, 4);
        String remarks = truncateRemarks(readCellString(row, 5));

        if (workDate == null || start == null || end == null) {
            throw new IllegalArgumentException("日付／時刻形式不正");
        }
        if (!start.isBefore(end)) {
            throw new IllegalArgumentException("開始＜終了");
        }
        if (breakMinutes < 0 || breakMinutes > 24 * 60) {
            throw new IllegalArgumentException("休憩時間不正");
        }
        return new ParsedRow(employeeId, workDate, start, end, breakMinutes, remarks);
    }

    private static int computeWorkMinutes(LocalTime start, LocalTime end, int breakMinutes) {
        int startM = start.getHour() * 60 + start.getMinute();
        int endM = end.getHour() * 60 + end.getMinute();
        return Math.max(0, endM - startM - breakMinutes);
    }

    private Long resolveEmployeeId(String raw) {
        if (raw == null) return null;
        String v = raw.trim();
        if (v.isBlank()) return null;
        // numeric -> employee_id
        if (v.matches("^\\d+$")) {
            long id = Long.parseLong(v);
            return employeeRepository.existsById(id) ? id : null;
        }
        // otherwise treat as employee_code
        Employee emp = employeeRepository.findByEmployeeCode(v).orElse(null);
        return emp != null ? emp.getEmployeeId() : null;
    }

    private static String readCellString(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return null;
        return switch (c.getCellType()) {
            case STRING -> c.getStringCellValue();
            case NUMERIC -> {
                double d = c.getNumericCellValue();
                long l = (long) d;
                yield String.valueOf(l);
            }
            case BOOLEAN -> String.valueOf(c.getBooleanCellValue());
            case FORMULA -> c.getCellFormula();
            default -> null;
        };
    }

    private static int readBreakMinutes(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) {
            return 0;
        }
        try {
            return switch (c.getCellType()) {
                case NUMERIC -> {
                    if (DateUtil.isCellDateFormatted(c)) {
                        LocalTime t = c.getLocalDateTimeCellValue().toLocalTime();
                        yield t.getHour() * 60 + t.getMinute();
                    }
                    double v = c.getNumericCellValue();
                    if (v > 0 && v < 1.0) {
                        int totalSeconds = (int) Math.round(v * 24 * 60 * 60);
                        yield totalSeconds / 60;
                    }
                    yield (int) Math.round(v);
                }
                case STRING -> parseBreakMinutesString(c.getStringCellValue().trim());
                case FORMULA -> {
                    CellType rt = c.getCachedFormulaResultType();
                    if (rt == CellType.NUMERIC) {
                        if (DateUtil.isCellDateFormatted(c)) {
                            LocalTime t = c.getLocalDateTimeCellValue().toLocalTime();
                            yield t.getHour() * 60 + t.getMinute();
                        }
                        yield (int) Math.round(c.getNumericCellValue());
                    }
                    if (rt == CellType.STRING) {
                        yield parseBreakMinutesString(c.getStringCellValue().trim());
                    }
                    yield 0;
                }
                default -> 0;
            };
        } catch (RuntimeException ex) {
            return 0;
        }
    }

    private static int parseBreakMinutesString(String s) {
        if (s == null || s.isBlank()) {
            return 0;
        }
        if (s.matches("^\\d+:\\d{2}$")) {
            String[] p = s.split(":");
            int h = Integer.parseInt(p[0]);
            int m = Integer.parseInt(p[1]);
            return h * 60 + m;
        }
        return Integer.parseInt(s.trim());
    }

    private static String truncateRemarks(String raw) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim();
        if (t.isEmpty()) {
            return null;
        }
        return t.length() > 500 ? t.substring(0, 500) : t;
    }

    private static LocalDate readCellDate(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return null;
        if (c.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(c)) {
            return c.getLocalDateTimeCellValue().toLocalDate();
        }
        if (c.getCellType() == CellType.STRING) {
            String s = c.getStringCellValue().trim();
            if (s.isBlank()) return null;
            try {
                return LocalDate.parse(s, DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (DateTimeParseException ex) {
                return null;
            }
        }
        return null;
    }

    private static LocalTime readCellTime(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return null;
        if (c.getCellType() == CellType.NUMERIC) {
            // Excel time as fraction of a day
            if (DateUtil.isCellDateFormatted(c)) {
                return c.getLocalDateTimeCellValue().toLocalTime().withSecond(0).withNano(0);
            }
            double v = c.getNumericCellValue();
            if (v >= 0 && v < 1) {
                int totalSeconds = (int) Math.round(v * 24 * 60 * 60);
                int hh = totalSeconds / 3600;
                int mm = (totalSeconds % 3600) / 60;
                return LocalTime.of(Math.min(23, hh), Math.min(59, mm));
            }
        }
        if (c.getCellType() == CellType.STRING) {
            String s = c.getStringCellValue().trim();
            if (s.isBlank()) return null;
            // allow HH:mm or HH:mm:ss
            try {
                if (s.length() == 5) return LocalTime.parse(s, DateTimeFormatter.ofPattern("HH:mm"));
                return LocalTime.parse(s);
            } catch (DateTimeParseException ex) {
                return null;
            }
        }
        return null;
    }

    private static String safeFileName(String name) {
        if (name == null) return "unknown";
        return name.length() > 100 ? name.substring(0, 100) : name;
    }
}

